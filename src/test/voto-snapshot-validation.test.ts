import { afterEach, describe, expect, it, vi } from "vitest";
import { parseVotoData, fetchVotoData, SchemaError } from "@/lib/voto/parse";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("validazione delle risposte del registro", () => {
  it("rifiuta una collezione presente ma con il tipo sbagliato", () => {
    expect(() =>
      parseVotoData({
        subjects: [{ name: "Matematica", grades: [] }],
        notifications: { title: "non è una lista" },
      }),
    ).toThrow(SchemaError);
  });

  it("conserva la sezione avvisi se la risposta la omette", async () => {
    const previousData = parseVotoData({
      student: { name: "Studente", schoolYear: "2026/2027" },
      subjects: [{ name: "Matematica", grades: [] }],
      notifications: [{ id: "n1", type: "notice", title: "Avviso valido" }],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            student: { name: "Studente", schoolYear: "2026/2027" },
            subjects: [{ name: "Matematica", grades: [] }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(
      fetchVotoData("https://school.example/voto.json", 10_000, previousData),
    ).rejects.toThrow(/manca la sezione avvisi/);
  });

  it("non sostituisce voti validi con una lista vuota nello stesso anno", async () => {
    const previousData = parseVotoData({
      student: { name: "Studente", schoolYear: "2026/2027" },
      subjects: [
        {
          name: "Matematica",
          grades: [
            { id: "g1", value: 7, label: "7", date: "2026-10-01" },
            { id: "g2", value: 8, label: "8", date: "2026-10-05" },
            { id: "g3", value: 6, label: "6", date: "2026-10-08" },
          ],
        },
      ],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            student: { name: "Studente", schoolYear: "2026/2027" },
            subjects: [{ name: "Matematica", grades: [] }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(
      fetchVotoData("https://school.example/voto.json", 10_000, previousData),
    ).rejects.toThrow(/mantengo gli ultimi dati validi/);
  });
});
