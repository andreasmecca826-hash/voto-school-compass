import { supabase } from "../supabase-auth";
import { supabaseProjectUrl, supabasePublishableKey } from "../supabase-config";
export { supabaseProjectUrl, supabasePublishableKey } from "../supabase-config";

type CheckPayload = {
  ok?: unknown;
  status?: unknown;
  requestedAt?: unknown;
  conclusion?: unknown;
  error?: unknown;
  retryAfterSeconds?: unknown;
};

export type CircularCheckStatus = {
  status:
    | "waiting"
    | "queued"
    | "requested"
    | "waiting_for_review"
    | "in_progress"
    | "completed"
    | "unknown";
  conclusion?: string | null;
};

async function checkResponse(response: Response): Promise<CheckPayload> {
  try {
    return (await response.json()) as CheckPayload;
  } catch {
    throw new Error("Risposta non valida dal servizio di controllo.");
  }
}

async function checkRequestHeaders() {
  const key = supabasePublishableKey();
  const { data } = await supabase.auth.getSession();
  return {
    apikey: key,
    Authorization: `Bearer ${data.session?.access_token ?? key}`,
    "Content-Type": "application/json",
  };
}

const CIRCULAR_CHECK_ENDPOINT = `${supabaseProjectUrl()}/functions/v1/request-circular-check`;

export async function requestCircularCheck(): Promise<string> {
  let response: Response;
  try {
    response = await fetch(CIRCULAR_CHECK_ENDPOINT, {
      method: "POST",
      headers: await checkRequestHeaders(),
      body: "{}",
    });
  } catch {
    throw new Error("Impossibile raggiungere il servizio di controllo.");
  }

  const body = await checkResponse(response);
  if (typeof body.requestedAt === "string" && body.ok !== false) return body.requestedAt;
  if (typeof body.error === "string") {
    if (typeof body.retryAfterSeconds === "number") {
      const minutes = Math.max(1, Math.ceil(body.retryAfterSeconds / 60));
      throw new Error(
        `Il registro è stato controllato di recente. Riprova tra circa ${minutes} min.`,
      );
    }
    throw new Error(body.error);
  }
  throw new Error("Non è stato possibile avviare il controllo.");
}

export async function getCircularCheckStatus(after: string): Promise<CircularCheckStatus> {
  const url = new URL(CIRCULAR_CHECK_ENDPOINT);
  url.searchParams.set("after", after);
  let response: Response;
  try {
    response = await fetch(url, { headers: await checkRequestHeaders(), cache: "no-store" });
  } catch {
    throw new Error("Impossibile leggere lo stato del controllo.");
  }
  const body = await checkResponse(response);
  if (typeof body.error === "string") throw new Error(body.error);
  if (!response.ok || typeof body.status !== "string") {
    throw new Error("Stato del controllo non disponibile.");
  }
  return {
    status: body.status as CircularCheckStatus["status"],
    conclusion: typeof body.conclusion === "string" ? body.conclusion : null,
  };
}
