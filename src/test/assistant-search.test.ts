import { describe, expect, it } from "vitest";
import { answerQuestion } from "@/lib/voto/assistant";
import { searchAssistantData } from "@/lib/voto/assistant-search";
import { emptySchedule } from "@/lib/voto/orario";
import type { Interrogazione } from "@/lib/voto/interrogazioni";
import type { VotoData } from "@/lib/voto/types";

const data: VotoData = {
  student: { name: "Demo" },
  subjects: [
    {
      id: "mate",
      name: "Matematica",
      teacher: "Rossi",
      grades: [
        {
          id: "grade-1",
          value: 7,
          label: "7",
          date: "2026-10-12",
          type: "scritto",
          weight: 1,
          comment: "Equazioni di algebra",
        },
      ],
    },
  ],
  assignments: [
    {
      id: "assignment-1",
      title: "Esercizi di algebra",
      subject: "Matematica",
      dueDate: "2026-10-30",
      completed: false,
      details: "Dal libro",
    },
  ],
  notifications: [
    {
      id: "notice-1",
      type: "notice",
      title: "Uscita didattica al museo",
      date: "2026-10-29",
      read: false,
    },
  ],
  diary: [
    {
      id: "diary-1",
      date: "2026-10-28",
      subject: "Matematica",
      activity: "Ripasso delle equazioni",
    },
  ],
  attendance: {
    absenceDays: 0,
    absenceHours: 0,
    delays: 0,
    earlyExits: 0,
    annualHours: 990,
    absenceLimitHours: 264,
  },
};

const interrogation: Interrogazione = {
  id: "exam-1",
  subject: "Scienze",
  date: "2026-11-02",
  hour: 2,
  notes: "Ripassare le cellule",
  completed: false,
  checklist: [],
};

describe("ricerca rapida locale dell’assistente", () => {
  it("trova contenuti per parola chiave in materie, compiti, circolari, diario e interrogazioni", () => {
    const algebra = searchAssistantData("cerca algebra", data);
    expect(algebra.some((item) => item.category === "Voto")).toBe(true);
    expect(algebra.some((item) => item.category === "Compito")).toBe(true);

    expect(
      searchAssistantData("trova uscita", data).some((item) => item.category === "Circolare"),
    ).toBe(true);
    expect(
      searchAssistantData("cerca equazioni", data).some((item) => item.category === "Diario"),
    ).toBe(true);
    expect(
      searchAssistantData("cerca cellule", data, [interrogation]).some(
        (item) => item.category === "Interrogazione",
      ),
    ).toBe(true);
  });

  it("normalizza gli accenti e restituisce un messaggio chiaro se non trova risultati", () => {
    expect(searchAssistantData("cerca didattica", data)[0]?.title).toContain("Uscita didattica");
    expect(answerQuestion("cerca XYZ inesistente", data, emptySchedule())).toContain(
      "Non ho trovato",
    );
  });

  it("funziona direttamente dall’assistente usando il prefisso cerca", () => {
    expect(answerQuestion("Cerca algebra", data, emptySchedule())).toContain("Esercizi di algebra");
  });

  it("non intercetta le normali domande già gestite dall’assistente", () => {
    expect(answerQuestion("Qual è la mia media generale?", data, emptySchedule())).toContain(
      "media generale",
    );
  });
});
