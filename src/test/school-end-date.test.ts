import { describe, expect, it } from "vitest";
import { daysUntilSchoolEnd } from "@/lib/voto/school-end-date";
import { schoolDaysUntilSchoolEnd } from "@/lib/voto/school-holidays";

describe("daysUntilSchoolEnd", () => {
  it("calcola giorni di calendario senza dipendere dall’ora corrente", () => {
    expect(daysUntilSchoolEnd("2026-01-03", new Date(2026, 0, 1, 23, 59))).toBe(2);
    expect(daysUntilSchoolEnd("2026-01-01", new Date(2026, 0, 1, 0, 1))).toBe(0);
    expect(daysUntilSchoolEnd("2025-12-31", new Date(2026, 0, 1, 12))).toBe(-1);
  });

  it("restituisce null per data mancante o non valida", () => {
    expect(daysUntilSchoolEnd(undefined, new Date(2026, 0, 1))).toBeNull();
    expect(daysUntilSchoolEnd("2026-02-30", new Date(2026, 0, 1))).toBeNull();
  });
});

describe("schoolDaysUntilSchoolEnd", () => {
  it("esclude weekend e festività nazionali italiane", () => {
    expect(schoolDaysUntilSchoolEnd("2026-01-06", new Date(2026, 0, 2, 12))).toBe(1);
    expect(schoolDaysUntilSchoolEnd("2026-04-07", new Date(2026, 3, 3, 12))).toBe(1);
  });

  it("esclude anche gli intervalli di chiusura scolastica indicati", () => {
    expect(
      schoolDaysUntilSchoolEnd("2026-01-06", new Date(2026, 0, 2, 12), [
        { start: "2026-01-05", end: "2026-01-06" },
      ]),
    ).toBe(0);
  });

  it("conta i giorni di lezione trascorsi quando la data è passata", () => {
    expect(schoolDaysUntilSchoolEnd("2026-01-02", new Date(2026, 0, 7, 12))).toBe(-2);
    expect(schoolDaysUntilSchoolEnd("2026-01-07", new Date(2026, 0, 7, 12))).toBe(0);
  });
});
