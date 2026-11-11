import { DAYS, type Schedule } from "./orario";
import type { Assignment } from "./types";
import type { Interrogazione } from "./interrogazioni";

export type StudyPlanKind = "compito" | "verifica" | "interrogazione";

export interface StudyPlanTask {
  id: string;
  sourceId: string;
  title: string;
  subject: string;
  kind: StudyPlanKind;
  dueDate?: string;
  date: string;
  minutes: number;
  completed: boolean;
}

export interface StudyPlanDay {
  date: string;
  label: string;
  availableMinutes: number;
  tasks: StudyPlanTask[];
}

export interface StudyPlanInput {
  assignments: Assignment[];
  interrogazioni: Interrogazione[];
  schedule: Schedule;
  now: Date;
  minutesPerDay: number;
  horizonDays?: number;
  completedIds?: ReadonlySet<string>;
  earliestDates?: Readonly<Record<string, string>>;
  studyStart?: string;
  studyEnd?: string;
}

const DAY_LABELS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(ISO_DATE);
  return match?.[0];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(start: string, end: string): number {
  const from = new Date(`${start}T12:00:00`).getTime();
  const to = new Date(`${end}T12:00:00`).getTime();
  return Math.round((to - from) / 86_400_000);
}

function timeMinutes(value: string | undefined, fallback: number): number {
  const match = value?.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

function lessonCount(schedule: Schedule, date: Date): number {
  const weekday = date.getDay();
  if (weekday < 1 || weekday > 5) return 0;
  const day = DAYS[weekday - 1];
  return day ? (schedule[day.id] ?? []).filter((lesson) => lesson.trim()).length : 0;
}

export function formatStudyPlanDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  return `${DAY_LABELS[date.getDay()] ?? "Giorno"} ${date.getDate()}/${date.getMonth() + 1}`;
}

export function buildStudyPlan(input: StudyPlanInput): StudyPlanDay[] {
  const horizon = Math.max(1, Math.min(14, input.horizonDays ?? 7));
  const start = new Date(input.now);
  start.setHours(12, 0, 0, 0);
  const startKey = dateKey(start);
  const windowStart = timeMinutes(input.studyStart, 14 * 60);
  const windowEnd = Math.max(windowStart + 30, timeMinutes(input.studyEnd, 15 * 60));
  const windowMinutes = windowEnd - windowStart;
  const days: StudyPlanDay[] = Array.from({ length: horizon }, (_, index) => {
    const date = addDays(start, index);
    const scheduledLessons = lessonCount(input.schedule, date);
    const availableMinutes = Math.max(
      30,
      Math.min(windowMinutes, input.minutesPerDay) - scheduledLessons * 10,
    );
    return {
      date: dateKey(date),
      label: formatStudyPlanDate(dateKey(date)),
      availableMinutes,
      tasks: [],
    };
  });
  const endKey = days.at(-1)?.date ?? startKey;
  const completed = input.completedIds ?? new Set<string>();
  const candidates: Array<StudyPlanTask & { priority: number; deadline: string }> = [];

  for (const assignment of input.assignments) {
    const isCompleted = assignment.completed || completed.has(`assignment:${assignment.id}`);
    const dueDate = parseDate(assignment.dueDate);
    if (dueDate && (daysBetween(startKey, dueDate) < 0 || daysBetween(endKey, dueDate) > 0))
      continue;
    const deadline = dueDate ?? endKey;
    candidates.push({
      id: `assignment:${assignment.id}`,
      sourceId: assignment.id,
      title: assignment.title,
      subject: assignment.subject ?? "",
      kind: "compito",
      ...(dueDate ? { dueDate } : {}),
      date: startKey,
      minutes: isCompleted ? 0 : 30,
      completed: isCompleted,
      priority: dueDate ? daysBetween(startKey, dueDate) : horizon + 2,
      deadline,
    });
  }

  for (const exam of input.interrogazioni) {
    const isCompleted = exam.completed || completed.has(`exam:${exam.id}`);
    const dueDate = parseDate(exam.date);
    if (!dueDate || daysBetween(startKey, dueDate) < 0 || daysBetween(endKey, dueDate) > 0)
      continue;
    const isVerification = /verifica/i.test(`${exam.subject} ${exam.notes ?? ""}`);
    candidates.push({
      id: `exam:${exam.id}`,
      sourceId: exam.id,
      title: isVerification ? `Verifica di ${exam.subject}` : `Interrogazione di ${exam.subject}`,
      subject: exam.subject,
      kind: isVerification ? "verifica" : "interrogazione",
      dueDate,
      date: startKey,
      minutes: isCompleted ? 0 : isVerification ? 50 : 40,
      completed: isCompleted,
      priority: Math.max(0, daysBetween(startKey, dueDate) - 1),
      deadline: dueDate,
    });
  }

  candidates.sort(
    (left, right) => left.priority - right.priority || left.title.localeCompare(right.title, "it"),
  );
  for (const candidate of candidates) {
    const deadlineIndex = Math.max(
      0,
      days.findIndex((day) => day.date >= candidate.deadline),
    );
    const lastAllowed = deadlineIndex < 0 ? days.length - 1 : deadlineIndex;
    const earliestDate = input.earliestDates?.[candidate.id];
    const earliestIndex = earliestDate
      ? Math.max(
          0,
          days.findIndex((day) => day.date >= earliestDate),
        )
      : 0;
    let selectedIndex = days.findIndex(
      (day, index) =>
        index >= earliestIndex && index <= lastAllowed && day.availableMinutes >= candidate.minutes,
    );
    if (selectedIndex < 0) selectedIndex = Math.min(lastAllowed, days.length - 1);
    const selected = days[selectedIndex];
    if (!selected) continue;
    const minutes = Math.min(candidate.minutes, Math.max(15, selected.availableMinutes));
    selected.tasks.push({ ...candidate, date: selected.date, minutes });
    selected.availableMinutes = Math.max(0, selected.availableMinutes - minutes);
  }
  return days;
}
