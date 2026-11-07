const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

async function isOwner(url: string, key: string, userId: string) {
  const response = await fetch(`${url}/rest/v1/rpc/is_school_data_owner`, {
    method: "POST",
    headers: adminHeaders(key, "application/json"),
    body: JSON.stringify({ p_user_id: userId }),
  });
  if (!response.ok) return false;
  return (await response.json()) === true;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "GET") return jsonResponse({ error: "Metodo non consentito." }, 405);

  const url = projectUrl();
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return jsonResponse({ error: "Servizio dati non configurato." }, 503);

  try {
    const userId = await authenticatedUserId(request, url, key);
    if (!userId) return jsonResponse({ error: "Sessione non valida." }, 401);
    if (!(await isOwner(url, key, userId))) {
      return jsonResponse({ error: "Account non autorizzato." }, 403);
    }

    const response = await fetch(`${url}/storage/v1/object/school-data/grades.json`, {
      headers: adminHeaders(key),
    });
    if (!response.ok) {
      console.error("school-data storage read failed", { status: response.status });
      return jsonResponse({ error: "Dati scolastici non ancora disponibili." }, 503);
    }
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (error) {
    console.error("school-data request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Dati scolastici temporaneamente non disponibili." }, 503);
  }
});
