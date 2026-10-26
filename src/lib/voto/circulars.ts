import type { AppNotification, VotoData } from "./types";

const INTERNAL_PDF_PATH = /^circulars\/[a-f0-9]{64}\.pdf$/;
const DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
// Publishable key: è destinata al client; non usare mai una service-role key nel browser.
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";

type SignedUrlResponse = { path?: unknown; signedUrl?: unknown };

function supabaseProjectUrl() {
  const raw = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (!raw) return DEFAULT_SUPABASE_URL;
  if (/^[a-z0-9]{20}$/i.test(raw)) return `https://${raw}.supabase.co`;
  return raw.replace(/\/+$/, "");
}

function supabasePublishableKey() {
  return (
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
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
