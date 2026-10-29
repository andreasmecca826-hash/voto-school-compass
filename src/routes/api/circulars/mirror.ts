import { createFileRoute } from "@tanstack/react-router";
import { normalizeSupabaseUrl } from "@/lib/server/supabaseStorageAuth";

const DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";
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

async function signedPdfUrl(project: { url: string; key: string }, path: string) {
  const response = await fetch(`${project.url}/functions/v1/mirror-circular`, {
    method: "POST",
    headers: {
      apikey: project.key,
      Authorization: `Bearer ${project.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
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
  const signedUrl = await signedPdfUrl(project, path);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error(`storage_http_${response.status}`);
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": downloadName ? attachmentDisposition(downloadName, path) : "inline",
      "cache-control": "private, max-age=300",
    },
  });
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
