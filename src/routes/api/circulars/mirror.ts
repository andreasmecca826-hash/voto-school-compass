import { createFileRoute } from "@tanstack/react-router";
import { normalizeSupabaseUrl } from "@/lib/server/supabaseStorageAuth";

const DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const PDF_REQUEST_TIMEOUT_MS = 45_000;
const validPath = (value: unknown): value is string =>
  typeof value === "string" && /^circulars\/[a-f0-9]{64}\.pdf$/.test(value);

type SignedPdfResponse = {
  path?: unknown;
  signedUrl?: unknown;
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

class PdfTooLargeError extends Error {}

async function cancelBody(body: ReadableStream<Uint8Array> | null) {
  try {
    await body?.cancel();
  } catch {
    // La risposta viene scartata comunque: non lasciare il flusso aperto.
  }
}

async function readLimitedPdf(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_PDF_BYTES) {
    await cancelBody(response.body);
    throw new PdfTooLargeError("Il PDF supera il limite di 25 MB.");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Il PDF non ha un contenuto leggibile.");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (totalBytes + value.byteLength > MAX_PDF_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Il flusso viene annullato comunque al superamento del limite.
        }
        throw new PdfTooLargeError("Il PDF supera il limite di 25 MB.");
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

function attachmentDisposition(value: string | null, path: string) {
  const fallback = path.split("/").at(-1) ?? "circolare.pdf";
  const filename = Array.from(value?.trim() || fallback, (char) => {
    const code = char.charCodeAt(0);
    return char === "\\" || char === "/" || char === '"' || code < 32 || code === 127 ? "_" : char;
  })
    .join("")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  const withExtension = /\.pdf$/i.test(filename) ? filename : `${filename}.pdf`;
  const ascii = withExtension.normalize("NFKD").replace(/[^\x20-\x7e]/g, "_");
  const encoded = encodeURIComponent(withExtension).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

async function signedPdfUrl(
  project: { url: string; key: string },
  path: string,
  signal: AbortSignal,
) {
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
  return url;
}

async function readPrivatePdf(
  project: { url: string; key: string },
  path: string,
  downloadName?: string | null,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_REQUEST_TIMEOUT_MS);
  try {
    const signedUrl = await signedPdfUrl(project, path, controller.signal);
    const response = await fetch(signedUrl, { signal: controller.signal });
    if (!response.ok) {
      await cancelBody(response.body);
      throw new Error(`storage_http_${response.status}`);
    }
    const bytes = await readLimitedPdf(response);
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": downloadName ? attachmentDisposition(downloadName, path) : "inline",
        "content-length": String(bytes.byteLength),
        "cache-control": "private, max-age=300",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const Route = createFileRoute("/api/circulars/mirror")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const params = new URL(request.url).searchParams;
          const path = params.get("path");
          if (!validPath(path)) return json({ error: "path non valido" }, 400);
          const downloadName =
            params.get("download") === "1" ? (params.get("filename") ?? "circolare.pdf") : null;
          return await readPrivatePdf(config(), path, downloadName);
        } catch (error) {
          if (error instanceof PdfTooLargeError) {
            return json({ error: error.message }, 413);
          }
          console.error("circular download failed", {
            errorType: error instanceof Error ? error.message : "UnknownError",
          });
          return json({ error: "PDF non disponibile nello storage interno" }, 502);
        }
      },
      POST: async () => json({ error: "Il download da link esterni è disabilitato." }, 410),
    },
  },
});
