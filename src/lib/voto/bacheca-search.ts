import type { AppNotification } from "./types";

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT")
    .replace(/\s+/g, " ")
    .trim();
}

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
    .filter((value): value is string => Boolean(value))
    .map(normalizeSearchText)
    .join(" ");
}

export function matchesNoticeQuery(item: AppNotification, query: string): boolean {
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);
  const searchableText = noticeSearchText(item);
  return terms.every((term) => searchableText.includes(term));
}
