import type { AppNotification, VotoData } from "./types";

type MirrorResponse = { path: string; signedUrl: string };

const DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
// Publishable keys are intended for client use; never put a service-role key here.
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";

function supabaseFunctionUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);
  if ((url && !key) || (!url && key)) return null;
  const projectUrl = url ?? DEFAULT_SUPABASE_URL;
  const publishableKey = key ?? DEFAULT_SUPABASE_PUBLISHABLE_KEY;
  return {
    url: `${projectUrl.replace(/\/$/, "")}/functions/v1/mirror-circular`,
    key: publishableKey,
  };
}

async function postJson<T>(body: Record<string, string>): Promise<T | null> {
  try {
    const supabase = supabaseFunctionUrl();
    const res = await fetch(supabase?.url ?? "/api/circulars/mirror", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(supabase ? { apikey: supabase.key, Authorization: `Bearer ${supabase.key}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Esegue il mirroring lato backend. Il link esterno resta solo una sorgente
 * di importazione e non viene mai passato al visualizzatore.
 */
export async function mirrorCirculars(data: VotoData): Promise<VotoData> {
  if (typeof window === "undefined") return data;

  const notifications = await Promise.all(
    data.notifications.map(async (notification): Promise<AppNotification> => {
      if (notification.type !== "notice") return notification;

      const result = notification.attachmentPath
        ? await postJson<MirrorResponse>({ path: notification.attachmentPath })
        : notification.attachmentUrl
          ? await postJson<MirrorResponse>({ sourceUrl: notification.attachmentUrl })
          : null;

      if (!result?.path || !result.signedUrl) return notification;
      return {
        ...notification,
        attachmentPath: result.path,
        attachmentUrl: result.signedUrl,
      };
    }),
  );

  return { ...data, notifications };
}
