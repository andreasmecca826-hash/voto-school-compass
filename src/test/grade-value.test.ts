import { describe, expect, it } from "vitest";
import { overallAverage } from "@/lib/voto/calc";
import { normalizeCachedGradeValues, parseGradeValue, parseVotoData } from "@/lib/voto/parse";

describe("Conversione dei voti con segno", () => {
  it("interpreta 7+ come 7,15 e 7- come 6,85", () => {
    expect(parseGradeValue("7+")).toBe(7.15);
    expect(parseGradeValue("7-")).toBe(6.85);
  });

  it("usa l'etichetta originale 7+ anche se il dato importato contiene il vecchio valore 7,25", () => {
    const data = parseVotoData({
      subjects: [
        {
          name: "Matematica",
          grades: [{ id: "g1", value: 7.25, label: "7+", date: "2026-10-01", type: "orale" }],
        },
      ],
    });

    expect(data.subjects[0]?.grades[0]?.value).toBe(7.15);
    expect(overallAverage(data.subjects)).toBe(7.15);
  });

  it("ripara la cache storica e aggiorna il valore usato nelle medie", () => {
    const data = parseVotoData({
      subjects: [
        {
          name: "Matematica",
          grades: [{ id: "g1", value: "7+", date: "2026-10-01", type: "orale" }],
        },
      ],
    });
    const staleCache = {
      ...data,
      subjects: data.subjects.map((subject) => ({
        ...subject,
        grades: subject.grades.map((grade) => ({ ...grade, value: 7.25 })),
      })),
    };

    const fixedCache = normalizeCachedGradeValues(staleCache);

    expect(fixedCache.subjects[0]?.grades[0]?.value).toBe(7.15);
    expect(overallAverage(fixedCache.subjects)).toBe(7.15);
    expect(staleCache.subjects[0]?.grades[0]?.value).toBe(7.25);
  });
});
