import { KEYS, load, save } from "./storage";

export const DEFAULT_ABSENCE_HOURS_PER_DAY = 6;

export function loadAbsenceHoursPerDay(): number {
  const value = load<unknown>(KEYS.absenceHoursPerDay, DEFAULT_ABSENCE_HOURS_PER_DAY);
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_ABSENCE_HOURS_PER_DAY;
}

export function saveAbsenceHoursPerDay(value: number): boolean {
  if (!Number.isFinite(value) || value <= 0) return false;
  save(KEYS.absenceHoursPerDay, value);
  return true;
}
