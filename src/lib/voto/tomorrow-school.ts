import { DAYS, type Schedule } from "./orario";
import type { Interrogazione } from "./interrogazioni";
import type { AppNotification, Assignment } from "./types";

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function tomorrowDate(now: Date): Date {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

export function tomorrowScheduleDay(now: Date) {
  const tomorrow = tomorrowDate(now);
  const index = tomorrow.getDay() - 1;
  return index >= 0 && index < DAYS.length ? (DAYS[index] ?? null) : null;
}

export function tomorrowSubjects(schedule: Schedule, now: Date): string[] {
  const day = tomorrowScheduleDay(now);
  if (!day) return [];
  return [...new Set(schedule[day.id].map((subject) => subject.trim()).filter(Boolean))];
}

export function openAssignmentsForTomorrow(
  assignments: Assignment[],
  isDone: (id: string, completed: boolean) => boolean,
  now: Date,
): Assignment[] {
  const tomorrow = localDateKey(tomorrowDate(now));
  return assignments
    .filter(
      (assignment) =>
        assignment.dueDate?.slice(0, 10) === tomorrow &&
        !isDone(assignment.id, assignment.completed),
    )
    .sort((a, b) => {
      if (!a.dueDate) return b.dueDate ? 1 : a.title.localeCompare(b.title, "it");
      if (!b.dueDate) return -1;
      return `${a.dueDate}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate}${b.dueTime ?? ""}`);
    });
}

function isTomorrow(date: string, now: Date): boolean {
  const dateKey = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  return dateKey === localDateKey(tomorrowDate(now));
}

export type UpcomingSchoolEvent = {
  id: string;
  title: string;
  date: string;
  detail?: string;
  source: "interrogazione" | "promemoria";
};

export function upcomingSchoolEvents(
  interrogazioni: Interrogazione[],
  notifications: AppNotification[],
  now: Date,
): UpcomingSchoolEvent[] {
  const events: UpcomingSchoolEvent[] = interrogazioni
    .filter((item) => !item.completed && isTomorrow(item.date, now))
    .map((item) => ({
      id: `interrogazione-${item.id}`,
      title: item.subject,
      date: item.date,
      detail: item.notes ?? (item.hour ? `${item.hour}ª ora` : item.time),
      source: "interrogazione",
    }));

  const assessmentPattern = /verific|interrog|compito in classe|prova|test/i;
  for (const notification of notifications) {
    if (notification.type !== "reminder" || !notification.date) continue;
    const text = `${notification.title} ${notification.message ?? ""} ${notification.subject ?? ""}`;
    if (!assessmentPattern.test(text) || !isTomorrow(notification.date, now)) continue;
    events.push({
      id: `promemoria-${notification.id}`,
      title: notification.subject
        ? `${notification.title} · ${notification.subject}`
        : notification.title,
      date: notification.date,
      detail: notification.message,
      source: "promemoria",
    });
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "it"),
  );
}
