import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/lib/voto/assistant";
import type { VotoData } from "@/lib/voto/types";

const data: VotoData = {
  student: { name: "Demo" },
  previousAverage: 7,
  subjects: [
    {
      id: "inglese",
      name: "Inglese",
      grades: [
        { id: "g1", value: 7, label: "7", date: "2026-10-01", type: "orale", weight: 1 },
        { id: "g2", value: 7, label: "7", date: "2026-10-10", type: "scritto", weight: 1 },
      ],
    },
  ],
  assignments: [{ id: "a1", title: "Esercizi", completed: false }],
  notifications: [],
  diary: [],
  attendance: {
    absenceDays: 2,
    absenceHours: 12,
    delays: 1,
    earlyExits: 0,
    annualHours: 990,
    absenceLimitHours: 264,
  },
};

describe("Assistente locale", () => {
  it("calcola il voto necessario per una materia e un obiettivo", () => {
    expect(answerQuestion("Quanto devo prendere in Inglese per arrivare a 8?", data)).toContain(
      "almeno 10",
    );
  });

  it("risponde su media generale, compiti e assenze", () => {
    expect(answerQuestion("Qual è la mia media generale?", data)).toContain("7,00");
    expect(answerQuestion("Quanti compiti devo fare?", data)).toContain("1 compito");
    expect(answerQuestion("Quante assenze ho?", data)).toContain("2 giorni");
  });
});
