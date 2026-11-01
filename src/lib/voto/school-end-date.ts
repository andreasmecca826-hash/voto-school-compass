import { KEYS, load, save } from "./storage";

function isValidIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function loadSchoolEndDate(): string | undefined {
  const value = load<unknown>(KEYS.schoolEndDate, null);
  return typeof value === "string" && isValidIsoDate(value) ? value : undefined;
}

export function saveSchoolEndDate(value: string): boolean {
  const normalized = value.trim();
  if (!isValidIsoDate(normalized)) return false;
  save(KEYS.schoolEndDate, normalized);
  return true;
}

export function clearSchoolEndDate(): void {
  save(KEYS.schoolEndDate, null);
}
