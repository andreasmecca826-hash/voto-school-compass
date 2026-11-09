import { createFileRoute } from "@tanstack/react-router";
import { normalizeSupabaseUrl } from "@/lib/server/supabaseStorageAuth";

const DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_RANGE_HEADER_LENGTH = 128;
const ATTACHMENT_REQUEST_TIMEOUT_MS = 45_000;
const SIGNED_URL_CACHE_TTL_MS = 5 * 60_000;
const MAX_SIGNED_URL_CACHE_ENTRIES = 64;
type SignedUrlCacheEntry = { url: string; expiresAt: number };
const signedUrlCache = new Map<string, SignedUrlCacheEntry>();
const validPath = (value: unknown): value is string =>
  typeof value === "string" && /^\/?circulars\/[a-f0-9]{64}\.(pdf|docx)$/.test(value);

type SignedPdfResponse = {
  path?: unknown;
  signedUrl?: unknown;
};

type ParsedByteRange = { kind: "none" } | { kind: "valid"; value: string } | { kind: "invalid" };

type ParsedContentRange = {
  start: number;
  end: number;
  total: number;
};

function config() {
  const rawUrl =
    process.env["VITE_SUPABASE_URL"]?.trim() ||
    process.env["SUPABASE_URL"]?.trim() ||
    DEFAULT_SUPABASE_URL;
  const key =
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
    process.env["VITE_SUPABASE_ANON_KEY"]?.trim() ||
    process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim() ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return { url: normalizeSupabaseUrl(rawUrl), key };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

class AttachmentTooLargeError extends Error {}

export function parseSingleByteRange(value: string | null): ParsedByteRange {
  if (value === null) return { kind: "none" };
  const normalized = value.trim();
  const match =
    normalized.length <= MAX_RANGE_HEADER_LENGTH && /^bytes=(\d*)-(\d*)$/i.exec(normalized);
  if (!match) return { kind: "invalid" };

  const start = match[1] ?? "";
  const end = match[2] ?? "";
  if (!start && !end) return { kind: "invalid" };

  const startNumber = start ? Number(start) : undefined;
  const endNumber = end ? Number(end) : undefined;
  if (
    (startNumber !== undefined && !Number.isSafeInteger(startNumber)) ||
    (endNumber !== undefined && !Number.isSafeInteger(endNumber)) ||
    (startNumber !== undefined && endNumber !== undefined && startNumber > endNumber)
  ) {
    return { kind: "invalid" };
  }

  return { kind: "valid", value: `bytes=${start}-${end}` };
}

function parseContentRange(value: string | null): ParsedContentRange | null {
  const match = value?.trim().match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  const total = Number(match[3]);
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    !Number.isSafeInteger(total) ||
    start > end ||
    end >= total
  ) {
    return null;
  }
  return { start, end, total };
}

function rangeNotSatisfiable(contentRange = "bytes */*") {
  return new Response(null, {
    status: 416,
    headers: { "accept-ranges": "bytes", "content-range": contentRange },
  });
}

async function cancelBody(body: ReadableStream<Uint8Array> | null) {
  try {
    await body?.cancel();
  } catch {
    // La risposta viene scartata comunque: non lasciare il flusso aperto.
  }
}

async function readLimitedAttachment(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_ATTACHMENT_BYTES) {
    await cancelBody(response.body);
    throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Il PDF non ha un contenuto leggibile.");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (totalBytes + value.byteLength > MAX_ATTACHMENT_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Il flusso viene annullato comunque al superamento del limite.
        }
        throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
      }
      chunks.push(value);
      totalBytes += value.byteLength;
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function limitedStream(
  body: ReadableStream<Uint8Array>,
  maxBytes: number,
  controller: AbortController,
  onFinish: () => void,
) {
  const reader = body.getReader();
  let totalBytes = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onFinish();
  };

  return new ReadableStream<Uint8Array>({
    async pull(streamController) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          finish();
          streamController.close();
          return;
        }
        if (totalBytes + value.byteLength > maxBytes) {
          try {
            await reader.cancel();
          } catch {
            // Anche se la sorgente non si annulla, interrompi la richiesta sottostante.
          }
          controller.abort();
          finish();
          streamController.error(
            new AttachmentTooLargeError("L'allegato supera il limite di 25 MB."),
          );
          return;
        }
        totalBytes += value.byteLength;
        streamController.enqueue(value);
      } catch (error) {
        controller.abort();
        finish();
        streamController.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        controller.abort();
        finish();
      }
    },
  });
}

function attachmentDisposition(value: string | null, path: string) {
  const fallback = path.split("/").at(-1) ?? "allegato";
  const filename = Array.from(value?.trim() || fallback, (char) => {
    const code = char.charCodeAt(0);
    return char === "\\" || char === "/" || char === '"' || code < 32 || code === 127 ? "_" : char;
  })
    .join("")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const ascii = filename.normalize("NFKD").replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

async function signedAttachmentUrl(
  project: { url: string; key: string },
  path: string,
  signal: AbortSignal,
) {
  const cacheKey = `${project.url}:${path}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    signedUrlCache.delete(cacheKey);
    signedUrlCache.set(cacheKey, cached);
    return new URL(cached.url);
  }
  if (cached) signedUrlCache.delete(cacheKey);

  const response = await fetch(`${project.url}/functions/v1/mirror-circular`, {
    method: "POST",
    headers: {
      apikey: project.key,
      Authorization: `Bearer ${project.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
    signal,
  });
  if (!response.ok) throw new Error(`sign_http_${response.status}`);

  const result = (await response.json()) as SignedPdfResponse;
  if (result.path !== path || typeof result.signedUrl !== "string") {
    throw new Error("signed_url_invalid");
  }
  const url = new URL(result.signedUrl);
  if (url.protocol !== "https:" || url.origin !== project.url) {
    throw new Error("signed_url_origin_invalid");
  }
  signedUrlCache.set(cacheKey, {
    url: url.toString(),
    expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS,
  });
  while (signedUrlCache.size > MAX_SIGNED_URL_CACHE_ENTRIES) {
    const oldestKey = signedUrlCache.keys().next().value;
    if (oldestKey === undefined) break;
    signedUrlCache.delete(oldestKey);
  }
  return url;
}

function responseHeaders(
  response: Response,
  path: string,
  downloadName: string | null,
  contentLength?: number,
  contentRange?: string,
) {
  const contentType = path.endsWith(".docx")
    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    : "application/pdf";
  const headers = new Headers({
    "content-type": contentType,
    "content-disposition": downloadName ? attachmentDisposition(downloadName, path) : "inline",
    "cache-control": "private, max-age=300",
    "accept-ranges": "bytes",
  });
  if (contentLength !== undefined) headers.set("content-length", String(contentLength));
  const range = contentRange ?? response.headers.get("content-range");
  if (range) headers.set("content-range", range);
  for (const name of ["etag", "last-modified"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

async function readPrivateAttachment(
  project: { url: string; key: string },
  path: string,
  downloadName?: string | null,
  rangeHeader?: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ATTACHMENT_REQUEST_TIMEOUT_MS);
  let streamOwnsTimeout = false;
  const clearTimeoutIfDone = () => clearTimeout(timeout);
  try {
    const signedUrl = await signedAttachmentUrl(project, path, controller.signal);
    const response = await fetch(signedUrl, {
      signal: controller.signal,
      ...(rangeHeader ? { headers: { Range: rangeHeader } } : {}),
    });
    if (response.status === 416) {
      const upstreamRange = response.headers.get("content-range");
      const unsatisfiedMatch = upstreamRange?.match(/^bytes \*\/(\d+)$/i);
      if (unsatisfiedMatch && Number(unsatisfiedMatch[1]) > MAX_ATTACHMENT_BYTES) {
        await cancelBody(response.body);
        throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
      }
      await cancelBody(response.body);
      const headers = new Headers({ "accept-ranges": "bytes" });
      if (unsatisfiedMatch) headers.set("content-range", `bytes */${unsatisfiedMatch[1]}`);
      return new Response(null, { status: 416, headers });
    }
    if (response.status !== 200 && response.status !== 206) {
      await cancelBody(response.body);
      throw new Error(`storage_http_${response.status}`);
    }

    const parsedRange =
      response.status === 206 ? parseContentRange(response.headers.get("content-range")) : null;
    if (response.status === 206 && !parsedRange) {
      await cancelBody(response.body);
      throw new Error("storage_content_range_invalid");
    }
    if (parsedRange && parsedRange.total > MAX_ATTACHMENT_BYTES) {
      await cancelBody(response.body);
      throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
    }

    const rawContentLength = response.headers.get("content-length");
    let contentLength: number | undefined;
    if (rawContentLength !== null) {
      const parsedLength = Number(rawContentLength);
      if (!/^\d+$/.test(rawContentLength) || !Number.isSafeInteger(parsedLength)) {
        await cancelBody(response.body);
        throw new Error("storage_content_length_invalid");
      }
      contentLength = parsedLength;
    }

    const rangeLength = parsedRange ? parsedRange.end - parsedRange.start + 1 : undefined;
    const byteLimit = rangeLength ?? MAX_ATTACHMENT_BYTES;
    if (contentLength !== undefined && contentLength > byteLimit) {
      await cancelBody(response.body);
      throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
    }
    if (rangeLength !== undefined && contentLength !== undefined && contentLength !== rangeLength) {
      await cancelBody(response.body);
      throw new Error("storage_range_length_invalid");
    }

    if (!response.body) throw new Error("Il PDF non ha un contenuto leggibile.");

    if (response.status === 200 && contentLength === undefined) {
      const bytes = await readLimitedAttachment(response);
      return new Response(bytes, {
        status: 200,
        headers: responseHeaders(response, path, downloadName ?? null, bytes.byteLength),
      });
    }

    const headers = responseHeaders(
      response,
      path,
      downloadName ?? null,
      contentLength ?? rangeLength,
      parsedRange ? (response.headers.get("content-range") ?? undefined) : undefined,
    );
    const body = limitedStream(response.body, byteLimit, controller, clearTimeoutIfDone);
    const streamedResponse = new Response(body, { status: response.status, headers });
    streamOwnsTimeout = true;
    return streamedResponse;
  } finally {
    if (!streamOwnsTimeout) clearTimeoutIfDone();
  }
}

export async function handleCircularMirrorGet(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rawPath = params.get("path");
    const path = rawPath?.replace(/^\/+/, "") ?? null;
    if (!validPath(path)) return json({ error: "Path allegato non valido" }, 400);

    const range = parseSingleByteRange(request.headers.get("range"));
    if (range.kind === "invalid") return rangeNotSatisfiable();

    const downloadName =
      params.get("download") === "1" ? (params.get("filename") ?? "circolare.pdf") : null;
    return await readPrivateAttachment(
      config(),
      path,
      downloadName,
      range.kind === "valid" ? range.value : undefined,
    );
  } catch (error) {
    if (error instanceof AttachmentTooLargeError) {
      return json({ error: error.message }, 413);
    }
    console.error("circular download failed", {
      errorType: error instanceof Error ? error.message : "UnknownError",
    });
    return json({ error: "Allegato non disponibile nello storage interno" }, 502);
  }
}

export const Route = createFileRoute("/api/circulars/mirror")({
  server: {
    handlers: {
      GET: async ({ request }) => handleCircularMirrorGet(request),
      POST: async () => json({ error: "Il download da link esterni è disabilitato." }, 410),
    },
  },
});
