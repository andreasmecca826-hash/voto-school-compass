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

  it("non mostra description come commento voto, ma conserva i commenti espliciti e gli alias degli altri dati", () => {
    const data = parseVotoData({
      subjects: [
        {
          name: "Matematica",
          docente: "Prof.ssa Rossi",
          grades: [
            {
              id: "g1",
              value: "7+",
              date: "2026-10-01",
              type: "orale",
              description: "Testo generico che non è un commento del voto",
              prof: "Prof.ssa Bianchi",
            },
            {
              id: "g2",
              value: 8,
              date: "2026-10-02",
              type: "scritto",
              comment: "Commento presente su Argo",
            },
          ],
        },
      ],
      assignments: [
        {
          id: "a1",
          title: "Esercizi",
          description: "Pagine 20–22",
          docente: "Prof.ssa Rossi",
        },
      ],
      notifications: [
        {
          id: "n1",
          type: "note",
          title: "Nota",
          description: "Annotazione descrittiva",
          prof: "Prof.ssa Neri",
        },
      ],
    });

    expect(data.subjects[0]?.teacher).toBe("Prof.ssa Rossi");
    expect(data.subjects[0]?.grades[0]?.comment).toBeUndefined();
    expect(data.subjects[0]?.grades[0]?.teacher).toBe("Prof.ssa Bianchi");
    expect(data.subjects[0]?.grades[1]?.comment).toBe("Commento presente su Argo");
    expect(data.assignments[0]).toMatchObject({
      details: "Pagine 20–22",
      teacher: "Prof.ssa Rossi",
    });
    expect(data.notifications[0]).toMatchObject({
      message: "Annotazione descrittiva",
      teacher: "Prof.ssa Neri",
    });
  });
});
