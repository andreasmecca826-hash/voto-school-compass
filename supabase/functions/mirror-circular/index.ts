const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const bucket = Deno.env.get("SUPABASE_STORAGE_BUCKET") || "circulars";
const validPath = (value: unknown): value is string =>
  typeof value === "string" && /^circulars\/[a-f0-9]{64}\.pdf$/.test(value);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeProjectUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  const normalized = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-z0-9]{20}$/i.test(trimmed)
      ? `https://${trimmed}.supabase.co`
      : `https://${trimmed}`;
  const parsed = new URL(normalized);
  if (parsed.protocol !== "https:") throw new Error("invalid_project_url");
  return parsed.origin;
}

function storageHeaders(key: string) {
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
  };
  if (
    key.split(".").length === 3 &&
    !key.startsWith("sb_secret_") &&
    !key.startsWith("sb_publishable_")
  ) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return jsonResponse({ error: "Metodo non consentito" }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "JSON non valido" }, 400);
  }
  const path = typeof body === "object" && body !== null ? (body as { path?: unknown }).path : null;
  if (!validPath(path)) return jsonResponse({ error: "Path PDF non valido" }, 400);

  const rawUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!rawUrl || !serviceKey) {
    return jsonResponse({ error: "Storage server non configurato" }, 500);
  }

  try {
    const projectUrl = normalizeProjectUrl(rawUrl);
    const objectPath = path.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(
      `${projectUrl}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath}`,
      {
        method: "POST",
        headers: storageHeaders(serviceKey),
        body: JSON.stringify({ expiresIn: 3600 }),
      },
    );
    if (!response.ok) {
      console.error("mirror-circular signing failed", { status: response.status });
      return jsonResponse({ error: "PDF non disponibile nello storage interno" }, 502);
    }

    const result = await response.json();
    const rawSignedUrl = result?.signedURL ?? result?.signedUrl;
    if (typeof rawSignedUrl !== "string") {
      return jsonResponse({ error: "URL temporaneo non disponibile" }, 502);
    }
    const signedUrl = rawSignedUrl.startsWith("http")
      ? new URL(rawSignedUrl)
      : new URL(
          `/storage/v1${rawSignedUrl.startsWith("/") ? rawSignedUrl : `/${rawSignedUrl}`}`,
          projectUrl,
        );
    if (signedUrl.protocol !== "https:" || signedUrl.origin !== projectUrl) {
      return jsonResponse({ error: "URL temporaneo non valido" }, 502);
    }
    return jsonResponse({ path, signedUrl: signedUrl.toString() });
  } catch (error) {
    console.error("mirror-circular signing failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Impossibile preparare il PDF" }, 502);
  }
});
