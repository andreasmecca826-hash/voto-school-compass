import type { AppNotification, VotoData } from "./types";

type MirrorResponse = { path: string; signedUrl: string };

async function postJson<T>(body: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch("/api/circulars/mirror", {
      method: "POST",
      headers: { "content-type": "application/json" },
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
