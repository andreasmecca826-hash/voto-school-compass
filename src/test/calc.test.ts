import { describe, expect, it } from "vitest";
import { arithmeticMean, average, neededGrade } from "@/lib/voto/calc";
import type { Grade } from "@/lib/voto/types";

const g = (value: number, weight = 1): Grade => ({
  id: `g${value}-${weight}`,
  value,
  label: String(value),
  date: "2026-10-01",
  type: "orale",
  weight,
});

describe("Media aritmetica generica", () => {
  it("calcola la media semplice dei numeri inseriti", () => {
    expect(arithmeticMean([6, 7, 8])).toBe(7);
  });

  it("ignora i valori non finiti", () => {
    expect(arithmeticMean([4, Number.NaN, 6, Number.POSITIVE_INFINITY])).toBe(5);
  });

  it("restituisce null senza valori validi", () => {
    expect(arithmeticMean([])).toBeNull();
  });
});

describe("Media ponderata e voto necessario", () => {
  it("la media ponderata pesa i voti secondo il peso", () => {
    expect(average([g(4, 2), g(8, 1)])).toBeCloseTo(16 / 3);
  });

  it("il voto necessario è coerente con la media ponderata mostrata", () => {
    // Media attuale: (4*2 + 8*1) / 3 ≈ 5,33. Con obiettivo 7 e peso 1 del nuovo voto:
    const res = neededGrade([g(4, 2), g(8, 1)], 7, 1, true);
    expect(res.status).toBe("impossible");
    expect(res.needed).toBeCloseTo(7 * 4 - 16); // 12 → sopra il 10
  });

  it("voto necessario semplice con pesi tutti 1", () => {
    const res = neededGrade([g(7), g(7)], 8, 1, true);
    expect(res.status).toBe("ok");
    expect(res.needed).toBe(10);
  });

  it("normalizza i pesi non positivi allo stesso modo per media e voto necessario", () => {
    const grades = [g(5, 0), g(6, -2)];
    const current = average(grades);
    const result = neededGrade(grades, 6, 1, true);

    expect(current).toBe(5.5);
    expect(result.status).toBe("ok");
    expect(result.needed).toBe(7);
    expect(average([...grades, g(result.needed)])).toBe(6);
  });

  it("usa peso unitario anche quando il peso è non finito", () => {
    expect(average([g(5, Number.POSITIVE_INFINITY)])).toBe(5);
    expect(neededGrade([g(5, Number.POSITIVE_INFINITY)], 6).needed).toBe(7);
  });
});
