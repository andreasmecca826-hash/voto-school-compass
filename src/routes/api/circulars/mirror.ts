import { createFileRoute } from "@tanstack/react-router";
import { normalizeSupabaseUrl, supabaseAuthHeaders } from "@/lib/server/supabaseStorageAuth";

const DEFAULT_BUCKET = "circulars";

type SupabaseConfig = {
  url: string;
  key: string;
  bucket: string;
};

function config(): SupabaseConfig {
  const rawUrl = process.env["SUPABASE_URL"]?.trim();
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_KEY"];
  if (!rawUrl || !key) throw new Error("Supabase Storage non configurato sul backend.");
  const url = normalizeSupabaseUrl(rawUrl);
  return { url, key, bucket: process.env["SUPABASE_STORAGE_BUCKET"] || DEFAULT_BUCKET };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validPath(value: unknown): value is string {
  return typeof value === "string" && /^circulars\/[a-f0-9]{64}\.pdf$/.test(value);
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

async function readPrivatePdf(
  supabase: SupabaseConfig,
  path: string,
  downloadName?: string | null,
) {
  const response = await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${path}`, {
    headers: supabaseAuthHeaders(supabase.key),
  });
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
