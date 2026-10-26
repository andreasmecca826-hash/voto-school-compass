import { createFileRoute } from "@tanstack/react-router";

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const DEFAULT_BUCKET = "circulars";

type MirrorBody = { sourceUrl?: unknown; path?: unknown };

type SupabaseConfig = {
  url: string;
  key: string;
  bucket: string;
};

function config(): SupabaseConfig {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const url = rawUrl
    ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}.supabase.co`).replace(/\/$/, "")
    : undefined;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("Supabase Storage non configurato sul backend.");
  return { url, key, bucket: process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function validSourceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function validPath(value: unknown): value is string {
  return typeof value === "string" && /^circulars\/[a-f0-9]{64}\.pdf$/.test(value);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readPrivatePdf(supabase: SupabaseConfig, path: string) {
  const response = await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${path}`, {
    headers: {
      authorization: `Bearer ${supabase.key}`,
      apikey: supabase.key,
    },
  });
  if (!response.ok) throw new Error("Supabase Storage ha negato l'accesso al PDF interno.");
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": "inline",
      "cache-control": "private, max-age=300",
    },
  });
}

async function mirror(sourceUrl: string, supabase: SupabaseConfig) {
  const source = await fetch(sourceUrl, { redirect: "follow" });
  if (!source.ok) throw new Error(`La sorgente PDF ha risposto con ${source.status}.`);
  const contentLength = Number(source.headers.get("content-length") || 0);
  if (contentLength > MAX_PDF_BYTES) throw new Error("Il PDF supera il limite di 25 MB.");

  const bytes = new Uint8Array(await source.arrayBuffer());
  if (bytes.byteLength > MAX_PDF_BYTES) throw new Error("Il PDF supera il limite di 25 MB.");
  const header = new TextDecoder().decode(bytes.slice(0, 5));
  if (header !== "%PDF-") throw new Error("La risorsa acquisita non è un PDF valido.");

  const path = `circulars/${await sha256(sourceUrl)}.pdf`;
  const upload = await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${path}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${supabase.key}`,
      apikey: supabase.key,
      "content-type": "application/pdf",
      "cache-control": "public, max-age=31536000, immutable",
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!upload.ok) throw new Error("Supabase Storage non ha accettato il PDF.");
  return path;
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
          console.error("circular download failed", error);
          return json({ error: "PDF non disponibile nello storage interno" }, 502);
        }
      },
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as MirrorBody;
          const supabase = config();
          const path = validPath(body.path)
            ? body.path
            : validSourceUrl(body.sourceUrl)
              ? await mirror(body.sourceUrl, supabase)
              : null;
          if (!path) return json({ error: "sourceUrl o path non valido" }, 400);
          // Il browser usa l'endpoint interno: il service role resta confinato al backend.
          return json({
            path,
            signedUrl: `/api/circulars/mirror?path=${encodeURIComponent(path)}`,
          });
        } catch (error) {
          console.error("circular mirror failed", error);
          return json(
            { error: error instanceof Error ? error.message : "Errore nel mirroring" },
            502,
          );
        }
      },
    },
  },
});
