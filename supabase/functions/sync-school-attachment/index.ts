const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-file-sha256",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Cache-Control": "private, no-store",
};
const MAX_BYTES = 25 * 1024 * 1024;
const PDF_TYPE = "application/pdf";
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function projectUrl() {
  let raw = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  if (!raw) return null;
  while (raw.endsWith("/")) raw = raw.slice(0, -1);
  const normalized = raw.startsWith("https://")
    ? raw
    : /^[a-z0-9]{20}$/i.test(raw)
      ? `https://${raw}.supabase.co`
      : `https://${raw}`;
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

function adminHeaders(key: string, contentType?: string) {
  const headers: Record<string, string> = {
    apikey: key,
    ...(contentType ? { "Content-Type": contentType } : {}),
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

async function authenticatedUserId(request: Request, url: string, key: string) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user?.id === "string" ? user.id : null;
}

async function isOwner(url: string, key: string, userId: string) {
  const response = await fetch(`${url}/rest/v1/rpc/is_school_data_owner`, {
    method: "POST",
    headers: adminHeaders(key, "application/json"),
    body: JSON.stringify({ p_user_id: userId }),
  });
  if (!response.ok) return false;
  return (await response.json()) === true;
}

function equalHex(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Metodo non consentito." }, 405);

  const url = projectUrl();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jsonResponse({ error: "Servizio dati non configurato." }, 503);

  try {
    const userId = await authenticatedUserId(request, url, key);
    if (!userId) return jsonResponse({ error: "Sessione non valida." }, 401);
    if (!(await isOwner(url, key, userId)))
      return jsonResponse({ error: "Account non autorizzato." }, 403);

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength <= 0 || declaredLength > MAX_BYTES) {
      return jsonResponse({ error: "Dimensione allegato non valida." }, 413);
    }
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
      return jsonResponse({ error: "Dimensione allegato non valida." }, 413);
    }
    const prefix = new TextDecoder().decode(bytes.slice(0, 8));
    const isPdf = prefix.startsWith("%PDF-");
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    if (!isPdf && !isZip) return jsonResponse({ error: "Formato allegato non supportato." }, 415);

    const mime = isPdf ? PDF_TYPE : DOCX_TYPE;
    const extension = isPdf ? "pdf" : "docx";
    const declaredType = (request.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (declaredType !== mime) return jsonResponse({ error: "Tipo allegato non coerente." }, 415);
    const suppliedHash = (request.headers.get("x-file-sha256") ?? "").toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(suppliedHash))
      return jsonResponse({ error: "Hash allegato non valido." }, 400);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const actualHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    if (!equalHex(suppliedHash, actualHash))
      return jsonResponse({ error: "Hash allegato non corrispondente." }, 400);

    const bucket = (Deno.env.get("SUPABASE_STORAGE_BUCKET") || "circulars").trim();
    if (!/^[a-z0-9_-]{1,63}$/i.test(bucket))
      return jsonResponse({ error: "Bucket non configurato." }, 503);
    const path = `circulars/${actualHash}.${extension}`;
    const objectPath = path.split("/").map(encodeURIComponent).join("/");
    const stored = await fetch(
      `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath}`,
      {
        method: "POST",
        headers: {
          ...adminHeaders(key, mime),
          "x-upsert": "true",
          "Cache-Control": "private, no-store",
        },
        body: bytes,
      },
    );
    if (!stored.ok) {
      console.error("sync-school-attachment storage write failed", { status: stored.status });
      return jsonResponse({ error: "Impossibile archiviare l’allegato." }, 503);
    }
    return jsonResponse({ ok: true, path, size: bytes.byteLength }, 200);
  } catch (error) {
    console.error("sync-school-attachment request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Servizio allegati temporaneamente non disponibile." }, 503);
  }
});
