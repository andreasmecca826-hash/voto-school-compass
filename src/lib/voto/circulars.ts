import type { AppNotification, VotoData } from "./types";

const INTERNAL_PDF_PATH = /^circulars\/[a-f0-9]{64}\.pdf$/;

/** Usa solo PDF già acquisiti nel bucket privato; non tenta download dai link Argo. */
export async function mirrorCirculars(data: VotoData): Promise<VotoData> {
  if (typeof window === "undefined") return data;

  const notifications = data.notifications.map((notification): AppNotification => {
    if (notification.type !== "notice") return notification;
    if (!notification.attachmentPath || !INTERNAL_PDF_PATH.test(notification.attachmentPath)) {
      return notification;
    }

    return {
      ...notification,
      attachmentUrl: `/api/circulars/mirror?path=${encodeURIComponent(notification.attachmentPath)}`,
    };
  });

  return { ...data, notifications };
}
