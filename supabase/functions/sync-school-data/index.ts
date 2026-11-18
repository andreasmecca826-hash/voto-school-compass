const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSnapshot(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value) || !isRecord(value.student) || !isRecord(value.attendance)) return false;
  if (typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)))
    return false;
  for (const key of ["subjects", "assignments", "notifications", "diary", "attendanceEvents"]) {
    if (!Array.isArray(value[key])) return false;
  }
  return true;
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
    if (!(await isOwner(url, key, userId))) {
      return jsonResponse({ error: "Account non autorizzato." }, 403);
    }

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > 2_000_000) return jsonResponse({ error: "Snapshot troppo grande." }, 413);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2_000_000) {
      return jsonResponse({ error: "Snapshot troppo grande." }, 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return jsonResponse({ error: "Snapshot non valido." }, 400);
    }
    if (!isSnapshot(payload)) return jsonResponse({ error: "Snapshot non valido." }, 400);

    // Build the stored root from an allowlist. DidUP credentials and Supabase
    // session tokens are never accepted or written by this endpoint.
    const snapshot = {
      student: {
        name: typeof payload.student.name === "string" ? payload.student.name.slice(0, 160) : "",
        className:
          typeof payload.student.className === "string"
            ? payload.student.className.slice(0, 80)
            : "",
        schoolYear:
          typeof payload.student.schoolYear === "string"
            ? payload.student.schoolYear.slice(0, 32)
            : "",
      },
      updatedAt: payload.updatedAt,
      subjects: payload.subjects,
      assignments: payload.assignments,
      notifications: payload.notifications,
      diary: payload.diary,
      attendance: payload.attendance,
      attendanceEvents: payload.attendanceEvents,
    };

    const response = await fetch(`${url}/storage/v1/object/school-data/grades.json`, {
      method: "POST",
      headers: {
        ...adminHeaders(key, "application/json; charset=utf-8"),
        "x-upsert": "true",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(snapshot),
    });
    if (!response.ok) {
      console.error("school-data storage write failed", { status: response.status });
      return jsonResponse({ error: "Dati scolastici temporaneamente non disponibili." }, 503);
    }
    return jsonResponse({ ok: true, updatedAt: snapshot.updatedAt }, 200);
  } catch (error) {
    console.error("sync-school-data request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonResponse({ error: "Dati scolastici temporaneamente non disponibili." }, 503);
  }
});
