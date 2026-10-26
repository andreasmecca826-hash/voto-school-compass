import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "circulars";
const MAX_BYTES = 25 * 1024 * 1024;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = { sourceUrl?: unknown; path?: unknown };

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validSourceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validPath(value: unknown): value is string {
  return typeof value === "string" && /^circulars\/[a-f0-9]{64}\.pdf$/.test(value);
}

async function hash(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Metodo non consentito" }, 405);

  try {
    const body = (await request.json()) as RequestBody;
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return response({ error: "Supabase non configurato" }, 500);

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    let path: string;

    if (validPath(body.path)) {
      path = body.path;
    } else if (validSourceUrl(body.sourceUrl)) {
      const sourceUrl = new URL(body.sourceUrl);
      const source = await fetch(body.sourceUrl, { redirect: "follow" });
      if (!source.ok) {
        console.error("mirror-circular source fetch failed", {
          host: sourceUrl.host,
          status: source.status,
        });
        return response({ error: `Sorgente PDF: HTTP ${source.status}` }, 502);
      }
      const contentLength = Number(source.headers.get("content-length") ?? 0);
      if (contentLength > MAX_BYTES) {
        console.error("mirror-circular source exceeds size limit", { contentLength });
        return response({ error: "PDF oltre 25 MB" }, 413);
      }
      const bytes = new Uint8Array(await source.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) {
        console.error("mirror-circular source exceeds size limit", {
          byteLength: bytes.byteLength,
        });
        return response({ error: "PDF oltre 25 MB" }, 413);
      }
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
        console.error("mirror-circular source is not a PDF", {
          contentType: source.headers.get("content-type"),
        });
        return response({ error: "La risorsa non è un PDF valido" }, 400);
      }

      path = `circulars/${await hash(body.sourceUrl)}.pdf`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
        contentType: "application/pdf",
        upsert: true,
        cacheControl: "31536000",
      });
      if (error) {
        console.error("mirror-circular Storage upload failed", error.message);
        return response({ error: `Upload Storage: ${error.message}` }, 502);
      }
    } else {
      return response({ error: "sourceUrl o path non valido" }, 400);
    }

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      console.error("mirror-circular signed URL failed", error?.message ?? "URL non disponibile");
      return response({ error: error?.message ?? "URL firmato non disponibile" }, 502);
    }
    return response({ path, signedUrl: data.signedUrl });
  } catch (error) {
    console.error("mirror-circular unexpected failure", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return response({ error: "Errore interno durante l'importazione" }, 500);
  }
});
