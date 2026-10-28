import { DAYS, type DayId, type Schedule } from "./orario";

export type NextLesson = {
  subject: string;
  day: DayId;
  dayLabel: string;
  hour: number;
  date: Date;
  isToday: boolean;
};

export function getNextScheduledLesson(schedule: Schedule, now: Date): NextLesson | null {
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const weekdayIndex = date.getDay() - 1;
    if (weekdayIndex < 0 || weekdayIndex >= DAYS.length) continue;
    const day = DAYS[weekdayIndex];
    if (!day) continue;
    const lessons = schedule[day.id] ?? [];
    const hourIndex = lessons.findIndex((subject) => subject.trim().length > 0);
    if (hourIndex < 0) continue;
    return {
      subject: lessons[hourIndex]!.trim(),
      day: day.id,
      dayLabel: day.label,
      hour: hourIndex + 1,
      date,
      isToday: offset === 0,
    };
  }
  return null;
}
