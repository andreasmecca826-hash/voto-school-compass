const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "private, no-store",
};

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
  const url = raw.startsWith("https://")
    ? raw
    : /^[a-z0-9]{20}$/i.test(raw)
      ? `https://${raw}.supabase.co`
      : `https://${raw}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.origin : null;
  } catch {
    return null;
  }
}

function adminHeaders(key: string, contentType?: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
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

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Metodo non consentito." }, 405);

  const url = projectUrl();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jsonResponse({ error: "Servizio di attivazione non configurato." }, 503);

  try {
    const userId = await authenticatedUserId(request, url, key);
    if (!userId) return jsonResponse({ error: "Sessione non valida." }, 401);

    const body = await request.json();
    const code =
      typeof body?.code === "string" ? body.code.replace(/[^a-f0-9]/gi, "").toUpperCase() : "";
    if (!/^[A-F0-9]{32}$/.test(code)) {
      return jsonResponse({ error: "Codice di attivazione non valido." }, 400);
    }

    const response = await fetch(`${url}/rest/v1/rpc/claim_school_data_access`, {
      method: "POST",
      headers: adminHeaders(key, "application/json"),
      body: JSON.stringify({ p_user_id: userId, p_claim_code_hash: await sha256(code) }),
    });
    if (!response.ok) {
      console.error("school-data claim failed", { status: response.status });
      return jsonResponse({ error: "Impossibile completare l’attivazione." }, 503);
    }
    if ((await response.json()) !== true) {
      return jsonResponse({ error: "Codice errato o già utilizzato." }, 403);
    }
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    console.error("school-data claim request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Impossibile completare l’attivazione." }, 503);
  }
});
