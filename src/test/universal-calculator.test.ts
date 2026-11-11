import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  calculateFraction,
  calculateTimeInterval,
  calculateVat,
  convertMeasurement,
  createCsv,
  evaluateScientificExpression,
} from "@/lib/voto/universal-calculator";

describe("Calcolatore universale", () => {
  it("valuta parentesi, potenze, percentuali, funzioni e gradi trigonometrice", () => {
    expect(evaluateScientificExpression("sqrt(81) + 2^3")).toBe(17);
    expect(evaluateScientificExpression("100 * 5%")).toBe(5);
    expect(evaluateScientificExpression("sin(30)")).toBeCloseTo(0.5);
    expect(evaluateScientificExpression("-2^2")).toBe(-4);
  });

  it("rifiuta input non supportati e divisione per zero", () => {
    expect(() => evaluateScientificExpression("2 / 0")).toThrow("dividere per zero");
    expect(() => evaluateScientificExpression("alert(1)")).toThrow("non supportata");
    expect(() => evaluateScientificExpression("2 + (3")).toThrow("parentesi");
  });

  it("converte unità, temperature e valute usando il tasso fornito", () => {
    expect(convertMeasurement(1500, "length", "m", "km")).toBe(1.5);
    expect(convertMeasurement(0, "temperature", "°C", "°F")).toBe(32);
    expect(convertMeasurement(10, "currency", "EUR", "USD", 1.08)).toBeCloseTo(10.8);
    expect(() => convertMeasurement(10, "currency", "EUR", "USD")).toThrow("tasso");
  });

  it("calcola intervalli anche dopo mezzanotte e sottrae la pausa", () => {
    expect(calculateTimeInterval("23:30", "01:00", 15)).toBe(75);
    expect(calculateTimeInterval("09:00", "10:30", 30)).toBe(60);
    expect(() => calculateTimeInterval("09:00", "10:00", 61)).toThrow("più lunga");
  });

  it("semplifica frazioni e conserva il segno corretto", () => {
    expect(calculateFraction(1, 2, 1, 3, "+")).toEqual({ numerator: 5, denominator: 6 });
    expect(calculateFraction(1, 2, 3, 4, "÷")).toEqual({ numerator: 2, denominator: 3 });
    expect(calculateFraction(1, -2, 1, 2, "+")).toEqual({ numerator: 0, denominator: 1 });
    expect(() => calculateFraction(1, 0, 1, 2, "+")).toThrow("zero");
  });

  it("calcola IVA e sconti con convalida degli intervalli", () => {
    expect(calculateVat(100, 22)).toEqual({ tax: 22, total: 122 });
    expect(calculateDiscount(80, 25)).toEqual({ savings: 20, finalPrice: 60 });
    expect(() => calculateVat(-1, 22)).toThrow("imponibile");
    expect(() => calculateDiscount(80, 120)).toThrow("0 e 100");
  });

  it("genera CSV con separatore locale e celle con virgolette gestite", () => {
    expect(
      createCsv(
        ["Nome", "Nota"],
        [
          ["Ada", "dice; sì"],
          ["", '"ok"'],
        ],
      ),
    ).toBe('Nome;Nota\r\nAda;"dice; sì"\r\n;"""ok"""');
  });
});
