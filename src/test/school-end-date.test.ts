import { describe, expect, it } from "vitest";
import { daysUntilSchoolEnd } from "@/lib/voto/school-end-date";

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
