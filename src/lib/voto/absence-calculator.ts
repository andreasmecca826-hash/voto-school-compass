export interface AbsenceCalculationInput {
  absenceHours: number;
  absenceLimitHours: number;
  annualHours: number;
  simulatedHours: number;
  hoursPerDay: number;
}

export interface AbsenceCalculation {
  absenceHours: number;
  absenceLimitHours: number;
  annualHours: number;
  simulatedHours: number;
  hoursPerDay: number;
  remainingHours: number;
  exceededHours: number;
  fullDaysRemaining: number | null;
  fullDaysAfterSimulation: number | null;
  currentAnnualPercentage: number | null;
  simulatedTotalHours: number;
  simulatedRemainingHours: number;
  simulatedExceededHours: number;
  hasConfiguredLimit: boolean;
}

const nonNegative = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

export function simulatedAbsenceHours(days: number, hoursPerDay: number): number {
  const wholeDays = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  return wholeDays * nonNegative(hoursPerDay);
}

export function calculateAbsencePlan(input: AbsenceCalculationInput): AbsenceCalculation {
  const absenceHours = nonNegative(input.absenceHours);
  const absenceLimitHours = nonNegative(input.absenceLimitHours);
  const annualHours = nonNegative(input.annualHours);
  const simulatedHours = nonNegative(input.simulatedHours);
  const hoursPerDay = nonNegative(input.hoursPerDay);
  const remainingHours = Math.max(0, absenceLimitHours - absenceHours);
  const simulatedTotalHours = absenceHours + simulatedHours;
  const simulatedRemainingHours = Math.max(0, absenceLimitHours - simulatedTotalHours);

  return {
    absenceHours,
    absenceLimitHours,
    annualHours,
    simulatedHours,
    hoursPerDay,
    remainingHours,
    exceededHours: Math.max(0, absenceHours - absenceLimitHours),
    fullDaysRemaining: hoursPerDay > 0 ? Math.floor(remainingHours / hoursPerDay) : null,
    fullDaysAfterSimulation:
      hoursPerDay > 0 ? Math.floor(simulatedRemainingHours / hoursPerDay) : null,
    currentAnnualPercentage: annualHours > 0 ? (absenceHours / annualHours) * 100 : null,
    simulatedTotalHours,
    simulatedRemainingHours,
    simulatedExceededHours: Math.max(0, simulatedTotalHours - absenceLimitHours),
    hasConfiguredLimit: absenceLimitHours > 0,
  };
}
