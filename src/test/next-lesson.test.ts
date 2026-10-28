import { describe, expect, it } from "vitest";
import { emptySchedule, type Schedule } from "@/lib/voto/orario";
import { getNextScheduledLesson } from "@/lib/voto/next-lesson";

describe("next scheduled lesson", () => {
  it("selects the first filled period of today and preserves its hour number", () => {
    const schedule = emptySchedule();
    schedule.lunedi = ["", "Matematica", "Inglese", "", "", ""];
    const lesson = getNextScheduledLesson(schedule, new Date(2026, 3, 27, 7, 30));
    expect(lesson).toMatchObject({ subject: "Matematica", day: "lunedi", hour: 2, isToday: true });
  });

  it("skips empty weekdays and weekends to find the next scheduled school day", () => {
    const schedule = emptySchedule();
    schedule.lunedi[0] = "Storia";
    const lesson = getNextScheduledLesson(schedule, new Date(2026, 3, 24, 16));
    expect(lesson).toMatchObject({ subject: "Storia", day: "lunedi", hour: 1, isToday: false });
  });

  it("returns null when no school lesson is entered", () => {
    const schedule: Schedule = emptySchedule();
    expect(getNextScheduledLesson(schedule, new Date(2026, 3, 27))).toBeNull();
  });
});
