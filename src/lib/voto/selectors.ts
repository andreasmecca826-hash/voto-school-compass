import { daysBetween } from "./dates";
import type { AppNotification, Assignment } from "./types";
import type { Interrogazione } from "./interrogazioni";

export function selectDashboardAssignments(
  assignments: Assignment[],
  now: Date,
  isDone: (id: string, completed: boolean) => boolean = (_id, completed) => completed,
) {
  return assignments
    .filter((assignment) => {
      if (isDone(assignment.id, assignment.completed)) return false;
      if (!assignment.dueDate) return false;
      const distance = daysBetween(now, assignment.dueDate);
      return distance >= 0 && distance <= 1;
    })
    .sort((a, b) =>
      `${a.dueDate}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate}${b.dueTime ?? ""}`),
    );
}

export function selectNotificationsByType(
  notifications: AppNotification[],
  type: AppNotification["type"],
  limit = 3,
) {
  return notifications.filter((notification) => notification.type === type).slice(0, limit);
}

export function notificationContentLabel(
  notification: AppNotification,
): "Circolari" | "Comunicazioni" {
  const hasAttachment = Boolean(
    notification.attachments?.length ||
    notification.attachmentPath ||
    notification.attachmentUrl ||
    notification.attachmentName,
  );
  return hasAttachment ? "Circolari" : "Comunicazioni";
}

const GENERIC_NOTICE_TITLES = new Set([
  "avviso",
  "bacheca",
  "circolare",
  "circolari",
  "comunicazione",
  "comunicazioni",
]);

export function isGenericNoticeTitle(notification: AppNotification) {
  return (
    notification.type === "notice" &&
    GENERIC_NOTICE_TITLES.has(notification.title.trim().toLocaleLowerCase("it-IT"))
  );
}

export function notificationDisplayTitle(notification: AppNotification) {
  if (!isGenericNoticeTitle(notification)) return notification.title;
  return notificationContentLabel(notification) === "Circolari" ? "Circolare" : "Comunicazione";
}

function reminderDaysFromNow(notification: AppNotification, now: Date): number | null {
  const date = notification.date?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return daysBetween(now, date);
}

export function selectUpcomingReminders(notifications: AppNotification[], now: Date) {
  return notifications
    .filter((notification) => notification.type === "reminder")
    .filter((notification) => {
      const days = reminderDaysFromNow(notification, now);
      return days === null || days >= 0;
    })
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}

export function selectPastReminders(notifications: AppNotification[], now: Date, maxDays = 30) {
  const windowDays = Math.min(30, Math.max(0, Math.floor(maxDays)));
  return notifications
    .filter((notification) => notification.type === "reminder")
    .filter((notification) => {
      const days = reminderDaysFromNow(notification, now);
      return days !== null && days < 0 && days >= -windowDays;
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export function selectOpenInterrogazioni(interrogazioni: Interrogazione[], limit = 3) {
  return interrogazioni.filter((item) => !item.completed).slice(0, limit);
}
