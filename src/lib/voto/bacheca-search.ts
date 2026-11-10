import type { AppNotification } from "./types";

export function noticeSearchText(item: AppNotification): string {
  return [
    item.title,
    item.message,
    item.extractedText,
    item.teacher,
    item.subject,
    item.attachmentName,
    ...(item.attachments ?? []).flatMap((attachment) => [attachment.name, attachment.path]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("it-IT");
}

export function matchesNoticeQuery(item: AppNotification, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase("it-IT");
  return !normalizedQuery || noticeSearchText(item).includes(normalizedQuery);
}
