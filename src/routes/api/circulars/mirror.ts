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

async function readPrivatePdf(supabase: SupabaseConfig, path: string) {
  const response = await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${path}`, {
    headers: supabaseAuthHeaders(supabase.key),
  });
  if (!response.ok) throw new Error(`storage_http_${response.status}`);
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "inline",
      "cache-control": "private, max-age=300",
    },
  });
}

export const Route = createFileRoute("/api/circulars/mirror")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const path = new URL(request.url).searchParams.get("path");
          if (!validPath(path)) return json({ error: "path non valido" }, 400);
          return await readPrivatePdf(config(), path);
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
