import { daysBetween } from "./dates";
import type { AppNotification, Assignment } from "./types";
import type { Interrogazione } from "./interrogazioni";

export function selectDashboardAssignments(
  assignments: Assignment[],
  now: Date,
  isDone: (id: string, remote: boolean) => boolean,
) {
  return assignments
    .filter((assignment) => {
      if (!assignment.dueDate) return false;
      const distance = daysBetween(now, assignment.dueDate);
      return distance <= 1 && (distance >= 0 || !isDone(assignment.id, assignment.completed));
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
