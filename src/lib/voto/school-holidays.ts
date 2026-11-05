import { KEYS, load, save } from "./storage";

export interface SchoolClosurePeriod {
  start: string;
  end: string;
}

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidIsoDate(value: string): boolean {
  const match = value.match(ISO_DATE);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function dateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function italianNationalHolidays(year: number): Set<string> {
  const fixed = [
    `${year}-01-01`,
    `${year}-01-06`,
    `${year}-04-25`,
    `${year}-05-01`,
    `${year}-06-02`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-12-08`,
    `${year}-12-25`,
    `${year}-12-26`,
  ];
  const easterMonday = easterSunday(year);
  easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
  return new Set([...fixed, dateKey(easterMonday)]);
}

export function loadSchoolClosures(): SchoolClosurePeriod[] {
  const value = load<unknown>(KEYS.schoolClosures, []);
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SchoolClosurePeriod => {
    if (!item || typeof item !== "object") return false;
    const period = item as Record<string, unknown>;
    return (
      typeof period["start"] === "string" &&
      typeof period["end"] === "string" &&
      isValidIsoDate(period["start"]) &&
      isValidIsoDate(period["end"]) &&
      period["start"] <= period["end"]
    );
  });
}

export function saveSchoolClosures(periods: SchoolClosurePeriod[]): boolean {
  if (
    periods.some(
      (period) =>
        !isValidIsoDate(period.start) || !isValidIsoDate(period.end) || period.start > period.end,
    )
  ) {
    return false;
  }
  save(KEYS.schoolClosures, periods);
  return true;
}

export function schoolDaysUntilSchoolEnd(
  value: string | undefined,
  now: Date,
  closures: SchoolClosurePeriod[] = [],
): number | null {
  if (!value || !isValidIsoDate(value)) return null;
  const target = Date.parse(`${value}T00:00:00Z`);
  const todayKey = localDateKey(now);
  const today = Date.parse(`${todayKey}T00:00:00Z`);
  const direction = Math.sign(target - today);
  if (direction === 0) return 0;

  const holidays = new Map<number, Set<string>>();
  const isSchoolDay = (time: number): boolean => {
    const date = new Date(time);
    const weekday = date.getUTCDay();
    if (weekday === 0 || weekday === 6) return false;
    const year = date.getUTCFullYear();
    let yearHolidays = holidays.get(year);
    if (!yearHolidays) {
      yearHolidays = italianNationalHolidays(year);
      holidays.set(year, yearHolidays);
    }
    const key = dateKey(date);
    if (yearHolidays.has(key)) return false;
    return !closures.some((period) => period.start <= key && key <= period.end);
  };

  let count = 0;
  if (direction > 0) {
    for (let time = today + DAY_MS; time <= target; time += DAY_MS) {
      if (isSchoolDay(time)) count += 1;
    }
    return count;
  }
  for (let time = today; time > target; time -= DAY_MS) {
    if (isSchoolDay(time)) count += 1;
  }
  return -count;
}
