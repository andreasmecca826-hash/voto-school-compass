import type { AppNotification, VotoData } from "./types";

const INTERNAL_PDF_PATH = /^circulars\/[a-f0-9]{64}\.pdf$/;
const DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
// Publishable key: è destinata al client; non usare mai una service-role key nel browser.
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";

type SignedUrlResponse = { path?: unknown; signedUrl?: unknown };

function supabaseProjectUrl() {
  const raw = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined)?.trim();
  if (!raw) return DEFAULT_SUPABASE_URL;
  if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`;
  return raw.replace(/\/+$/, "");
}

function supabasePublishableKey() {
  return (
    (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
    (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  );
}

async function signedPdfUrl(path: string): Promise<string | null> {
  const projectUrl = supabaseProjectUrl();
  const key = supabasePublishableKey();
  try {
    const response = await fetch(`${projectUrl}/functions/v1/mirror-circular`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path }),
    });
    if (!response.ok) return null;

    const result = (await response.json()) as SignedUrlResponse;
    if (result.path !== path || typeof result.signedUrl !== "string") return null;
    const signedUrl = new URL(result.signedUrl);
    if (signedUrl.protocol !== "https:" || signedUrl.origin !== new URL(projectUrl).origin) {
      return null;
    }
    return signedUrl.toString();
  } catch {
    return null;
  }
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

function checkRequestHeaders() {
  const key = supabasePublishableKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

const CIRCULAR_CHECK_ENDPOINT = `${supabaseProjectUrl()}/functions/v1/request-circular-check`;

export async function requestCircularCheck(): Promise<string> {
  let response: Response;
  try {
    response = await fetch(CIRCULAR_CHECK_ENDPOINT, {
      method: "POST",
      headers: checkRequestHeaders(),
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
    response = await fetch(url, { headers: checkRequestHeaders(), cache: "no-store" });
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

/** Firma solo i path già caricati nello storage privato; non invia mai URL Argo al server. */
export async function mirrorCirculars(data: VotoData): Promise<VotoData> {
  const notifications = await Promise.all(
    data.notifications.map(async (notification): Promise<AppNotification> => {
      if (
        notification.type !== "notice" ||
        !notification.attachmentPath ||
        !INTERNAL_PDF_PATH.test(notification.attachmentPath)
      ) {
        return notification;
      }

      return {
        ...notification,
        attachmentUrl: (await signedPdfUrl(notification.attachmentPath)) ?? undefined,
      };
    }),
  );

  return { ...data, notifications };
}
