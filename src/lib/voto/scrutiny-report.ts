import { average, arithmeticMean } from "./calc";
import type { Subject } from "./types";

export interface DidupScrutinyRow {
  id: string;
  name: string;
  grade: number | null;
  mean: number | null;
  gradeCount: number;
}

/** Deriva un riepilogo indicativo dal registro; non rappresenta i voti ufficiali dello scrutinio. */
export function buildDidupScrutinyRows(
  subjects: Subject[],
  startDate: string,
  endDate: string,
): DidupScrutinyRow[] {
  return subjects
    .map((subject) => {
      const grades = subject.grades.filter((grade) => {
        const day = grade.date.slice(0, 10);
        return day >= startDate && day <= endDate;
      });
      const subjectAverage = average(grades);
      return {
        id: subject.id,
        name: subject.name,
        grade: subjectAverage === null ? null : Math.round(subjectAverage),
        mean: subjectAverage,
        gradeCount: grades.length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "it-IT"));
}

export function didupScrutinyAverage(rows: DidupScrutinyRow[]): number | null {
  return arithmeticMean(
    rows.map((row) => row.mean).filter((mean): mean is number => mean !== null),
  );
}
