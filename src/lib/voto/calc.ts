import type { Grade, Subject } from "./types";

export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

export const fmt = (n: number, d = 2) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });

export function arithmeticMean(values: number[]): number | null {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

const normalizedWeight = (weight: number) => (Number.isFinite(weight) && weight > 0 ? weight : 1);

export function average(grades: Grade[], weighted = true): number | null {
  const valid = grades.filter((g) => Number.isFinite(g.value));
  if (!valid.length) return null;
  if (!weighted) return valid.reduce((s, g) => s + g.value, 0) / valid.length;
  const tw = valid.reduce((s, g) => s + normalizedWeight(g.weight), 0);
  return valid.reduce((s, g) => s + g.value * normalizedWeight(g.weight), 0) / tw;
}

/** Media generale = media delle medie (ponderate) delle materie con almeno un voto. */
export function overallAverage(subjects: Subject[]): number | null {
  const avgs = subjects.map((s) => average(s.grades)).filter((a): a is number => a !== null);
  if (!avgs.length) return null;
  return avgs.reduce((a, b) => a + b, 0) / avgs.length;
}

export function subjectStats(s: Subject) {
  const vals = s.grades.map((g) => g.value);
  const sorted = [...s.grades].sort((a, b) => a.date.localeCompare(b.date));
  const avg = average(s.grades);
  let trend: number | null = null;
  if (sorted.length >= 2) {
    const prev = average(sorted.slice(0, -1));
    if (prev !== null && avg !== null) trend = avg - prev;
  }
  return {
    avg,
    max: vals.length ? Math.max(...vals) : null,
    min: vals.length ? Math.min(...vals) : null,
    count: vals.length,
    trend,
  };
}

export type NeededResult =
  | { status: "reached"; needed: number }
  | { status: "ok"; needed: number }
  | { status: "impossible"; needed: number };

/**
 * Voto necessario alla prossima verifica.
 * Non pesata: needed = target*(n+1) - somma
 * Pesata: needed = (target*(W+w) - somma(v*p)) / w
 */
export function neededGrade(
  grades: Grade[],
  target: number,
  newWeight = 1,
  weighted = true,
): NeededResult {
  const valid = grades.filter((g) => Number.isFinite(g.value));
  const w = normalizedWeight(newWeight);
  let needed: number;
  if (weighted) {
    const W = valid.reduce((s, g) => s + normalizedWeight(g.weight), 0);
    const ws = valid.reduce((s, g) => s + g.value * normalizedWeight(g.weight), 0);
    needed = (target * (W + w) - ws) / w;
  } else {
    const n = valid.length;
    const sum = valid.reduce((s, g) => s + g.value, 0);
    needed = target * (n + 1) - sum;
  }
  if (needed <= 0) return { status: "reached", needed };
  if (needed > 10) return { status: "impossible", needed };
  return { status: "ok", needed };
}

/** Andamento cronologico della media generale (per sparkline). */
export function averageHistory(subjects: Subject[]): number[] {
  const dates = [
    ...new Set(subjects.flatMap((s) => s.grades.map((g) => g.date)).filter(Boolean)),
  ].sort();
  const out: number[] = [];
  for (const d of dates) {
    const a = overallAverage(
      subjects.map((s) => ({ ...s, grades: s.grades.filter((g) => g.date <= d) })),
    );
    if (a !== null) out.push(a);
  }
  return out;
}

export const gradeTone = (v: number | null) =>
  v === null ? "muted" : v >= 6 ? (v >= 8 ? "good" : "ok") : "bad";
