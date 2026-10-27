import type { Subject } from "./types";

export type PeriodSelection = "all" | "first" | "second";
export type PeriodSystem = "quadrimesters" | "trimester";
export interface PeriodConfig {
  year: number;
  system: PeriodSystem;
  selection: PeriodSelection;
  boundary: string;
}

export function schoolYearStart(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number(date.slice(5, 7)) >= 9 ? year : year - 1;
}

export function defaultBoundary(year: number, system: PeriodSystem): string {
  return system === "quadrimesters" ? `${year + 1}-01-31` : `${year}-12-31`;
}

export function validBoundary(date: string, year: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date &&
    date >= `${year}-09-01` && date < `${year + 1}-08-31`;
}

export function filterSubjectsByPeriod(subjects: Subject[], config: PeriodConfig): Subject[] {
  const start = `${config.year}-09-01`;
  const end = `${config.year + 1}-08-31`;
  return subjects.map((subject) => ({
    ...subject,
    grades: subject.grades.filter(({ date }) => {
      const day = date.slice(0, 10);
      if (day < start || day > end) return false;
      return config.selection === "all" ||
        (config.selection === "first" ? day <= config.boundary : day > config.boundary);
    }),
  }));
}

export function periodLabels(system: PeriodSystem) {
  return system === "quadrimesters"
    ? { all: "Anno intero", first: "1° quadrimestre", second: "2° quadrimestre" }
    : { all: "Anno intero", first: "Trimestre", second: "Pentamestre" };
}