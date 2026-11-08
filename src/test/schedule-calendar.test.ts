import { describe, expect, it } from "vitest";
import { emptySchedule } from "@/lib/voto/orario";
import { createScheduleCalendarIcs, getDefaultSchoolYearEnd } from "@/lib/voto/schedule-calendar";

const baseOptions = {
  fromDate: "2026-11-09",
  untilDate: "2027-06-30",
  firstLessonTime: "08:00",
  lessonMinutes: 50,
  breakMinutes: 10,
  now: new Date("2026-11-07T12:00:00.000Z"),
};

describe("createScheduleCalendarIcs", () => {
  it("esporta ogni materia compilata come evento settimanale con il giorno e la fascia oraria corretti", () => {
    const schedule = emptySchedule();
    schedule.lunedi[0] = "Matematica, algebra";
    schedule.lunedi[2] = "Scienze";
    schedule.martedi[0] = "Inglese";

    const result = createScheduleCalendarIcs(schedule, baseOptions);

    expect(result.eventCount).toBe(3);
    expect(result.content).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(result.content).toContain("DTSTART:20261109T080000\r\nDTEND:20261109T085000");
    expect(result.content).toContain("RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20270630T235959");
    expect(result.content).toContain("DTSTART:20261109T100000\r\nDTEND:20261109T105000");
    expect(result.content).toContain("DTSTART:20261110T080000");
    expect(result.content).toContain("SUMMARY:Matematica\\, algebra · 1ª ora");
    expect(result.content).toContain("END:VCALENDAR\r\n");
  });

  it("non esporta materie vuote né occorrenze che inizierebbero dopo la fine scelta", () => {
    const schedule = emptySchedule();
    schedule.lunedi[0] = "Matematica";
    schedule.venerdi[1] = "Storia";

    const result = createScheduleCalendarIcs(schedule, {
      ...baseOptions,
      fromDate: "2026-11-10",
      untilDate: "2026-11-12",
    });

    expect(result.eventCount).toBe(0);
    expect(result.content).toBe("");
  });

  it("restituisce nessun evento quando l’orario è vuoto", () => {
    expect(createScheduleCalendarIcs(emptySchedule(), baseOptions)).toEqual({
      content: "",
      eventCount: 0,
    });
  });

  it("rifiuta date, orari e durate non validi", () => {
    const schedule = emptySchedule();
    schedule.lunedi[0] = "Matematica";

    expect(() =>
      createScheduleCalendarIcs(schedule, { ...baseOptions, untilDate: "2026-10-01" }),
    ).toThrow(RangeError);
    expect(() =>
      createScheduleCalendarIcs(schedule, { ...baseOptions, firstLessonTime: "25:00" }),
    ).toThrow(RangeError);
    expect(() => createScheduleCalendarIcs(schedule, { ...baseOptions, lessonMinutes: 0 })).toThrow(
      RangeError,
    );
  });

  it("calcola la fine predefinita dell’anno scolastico", () => {
    expect(getDefaultSchoolYearEnd(new Date(2026, 10, 7))).toBe("2027-06-30");
    expect(getDefaultSchoolYearEnd(new Date(2027, 2, 1))).toBe("2027-06-30");
  });
});
