import { supabase } from "../supabase-auth";
import { supabaseProjectUrl, supabasePublishableKey } from "../supabase-config";
export { supabaseProjectUrl, supabasePublishableKey } from "../supabase-config";

type CapacitorRuntime = {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
  platform?: string;
};

const INTERNAL_CIRCULAR_PATH = /^circulars\/[a-f0-9]{64}\.(pdf|docx)$/;

export function isCapacitorNative() {
  if (typeof window === "undefined") return false;
  const runtime = (window as Window & { Capacitor?: CapacitorRuntime }).Capacitor;
  if (!runtime) return false;
  try {
    if (typeof runtime.isNativePlatform === "function") return runtime.isNativePlatform();
    const platform = runtime.getPlatform?.() ?? runtime.platform;
    return platform === "android" || platform === "ios";
  } catch {
    return false;
  }
}

export async function getCircularAttachmentSignedUrl(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  if (!INTERNAL_CIRCULAR_PATH.test(normalizedPath)) {
    throw new Error("Percorso allegato non valido.");
  }

  const response = await fetch(`${supabaseProjectUrl()}/functions/v1/mirror-circular`, {
    method: "POST",
    headers: await checkRequestHeaders(),
    body: JSON.stringify({ path: normalizedPath }),
  });

  let result: { error?: unknown; path?: unknown; signedUrl?: unknown };
  try {
    result = (await response.json()) as typeof result;
  } catch {
    throw new Error("Risposta non valida dal servizio degli allegati.");
  }
  if (!response.ok) {
    throw new Error(
      typeof result.error === "string" ? result.error : "Impossibile preparare l’allegato.",
    );
  }
  if (result.path !== normalizedPath || typeof result.signedUrl !== "string") {
    throw new Error("Il servizio non ha restituito un URL firmato valido.");
  }

  const signedUrl = new URL(result.signedUrl);
  if (
    signedUrl.protocol !== "https:" ||
    signedUrl.origin !== new URL(supabaseProjectUrl()).origin
  ) {
    throw new Error("L’URL firmato dell’allegato non è valido.");
  }
  return signedUrl.toString();
}

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
