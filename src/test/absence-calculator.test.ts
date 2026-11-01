import { describe, expect, it } from "vitest";
import { calculateAbsencePlan } from "@/lib/voto/absence-calculator";

describe("calculateAbsencePlan", () => {
  it("calcola le ore residue e le giornate intere equivalenti", () => {
    const result = calculateAbsencePlan({
      absenceHours: 12,
      absenceLimitHours: 264,
      annualHours: 990,
      simulatedHours: 6,
      hoursPerDay: 6,
    });

    expect(result.remainingHours).toBe(252);
    expect(result.fullDaysRemaining).toBe(42);
    expect(result.simulatedTotalHours).toBe(18);
    expect(result.simulatedRemainingHours).toBe(246);
    expect(result.fullDaysAfterSimulation).toBe(41);
    expect(result.hasConfiguredLimit).toBe(true);
  });

  it("segnala il raggiungimento e il superamento del limite", () => {
    const atLimit = calculateAbsencePlan({
      absenceHours: 250,
      absenceLimitHours: 264,
      annualHours: 990,
      simulatedHours: 14,
      hoursPerDay: 6,
    });
    expect(atLimit.simulatedRemainingHours).toBe(0);
    expect(atLimit.simulatedExceededHours).toBe(0);

    const overLimit = calculateAbsencePlan({
      absenceHours: 260,
      absenceLimitHours: 264,
      annualHours: 990,
      simulatedHours: 10,
      hoursPerDay: 6,
    });
    expect(overLimit.simulatedExceededHours).toBe(6);
  });

  it("gestisce input negativi o non validi senza produrre valori negativi", () => {
    const result = calculateAbsencePlan({
      absenceHours: Number.NaN,
      absenceLimitHours: -10,
      annualHours: 0,
      simulatedHours: -5,
      hoursPerDay: 0,
    });

    expect(result.absenceHours).toBe(0);
    expect(result.absenceLimitHours).toBe(0);
    expect(result.simulatedHours).toBe(0);
    expect(result.fullDaysRemaining).toBeNull();
    expect(result.currentAnnualPercentage).toBeNull();
    expect(result.hasConfiguredLimit).toBe(false);
  });
});
