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

export function selectOpenInterrogazioni(interrogazioni: Interrogazione[], limit = 3) {
  return interrogazioni.filter((item) => !item.completed).slice(0, limit);
}
