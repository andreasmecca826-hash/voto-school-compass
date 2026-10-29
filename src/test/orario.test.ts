import { beforeEach, describe, expect, it } from "vitest";
import { clearScheduleDayIfUnchanged, emptySchedule, loadSchedule } from "@/lib/voto/orario";

beforeEach(() => {
  localStorage.clear();
});

describe("conferma sicura della cancellazione dell’orario", () => {
  it("cancella le lezioni solo se sono ancora quelle mostrate nella conferma", () => {
    const schedule = emptySchedule();
    schedule.lunedi[0] = "Matematica";
    schedule.lunedi[2] = "Inglese";
    const expectedLessons = [...schedule.lunedi];

    expect(clearScheduleDayIfUnchanged(schedule, "lunedi", expectedLessons)).toBe("cleared");
    expect(loadSchedule().lunedi.every((lesson) => lesson === "")).toBe(true);
  });

  it("non cancella una nuova lezione aggiunta mentre la conferma è aperta", () => {
    const scheduleAtRequest = emptySchedule();
    scheduleAtRequest.lunedi[0] = "Matematica";
    const expectedLessons = [...scheduleAtRequest.lunedi];
    const scheduleAtConfirmation = {
      ...scheduleAtRequest,
      lunedi: [...scheduleAtRequest.lunedi],
    };
    scheduleAtConfirmation.lunedi[1] = "Fisica";

    expect(clearScheduleDayIfUnchanged(scheduleAtConfirmation, "lunedi", expectedLessons)).toBe(
      "changed",
    );
    expect(scheduleAtConfirmation.lunedi[0]).toBe("Matematica");
    expect(scheduleAtConfirmation.lunedi[1]).toBe("Fisica");
    expect(loadSchedule().lunedi.every((lesson) => lesson === "")).toBe(true);
  });

  it("non segnala una cancellazione quando il giorno era già vuoto", () => {
    const schedule = emptySchedule();
    expect(clearScheduleDayIfUnchanged(schedule, "lunedi", [...schedule.lunedi])).toBe("empty");
  });
});
