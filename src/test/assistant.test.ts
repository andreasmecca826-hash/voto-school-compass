import { describe, expect, it } from "vitest";
import { answerQuestion, scheduleDayToClear } from "@/lib/voto/assistant";
import { emptySchedule } from "@/lib/voto/orario";
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

  it("calcola la previsione dopo un voto ipotetico e riconosce un'azione", () => {
    expect(answerQuestion("Che previsione media avrò se prendo 8 in Inglese?", data)).toContain(
      "passerebbe",
    );
    expect(scheduleDayToClear("Cancella tutto l'orario di lunedì")).toBe("lunedi");
  });

  it("risponde sull'orario del giorno e sulle scadenze dei compiti", () => {
    const schedule = emptySchedule();
    schedule.lunedi[0] = "Matematica";
    schedule.lunedi[2] = "Inglese";
    const now = new Date(2026, 9, 26, 12);
    expect(answerQuestion("Che lezioni ho oggi?", data, schedule, now)).toContain(
      "1ª ora: Matematica",
    );
    expect(answerQuestion("Che lezioni ho oggi?", data, schedule, now)).toContain(
      "3ª ora: Inglese",
    );

    const dueData: VotoData = {
      ...data,
      assignments: [
        { id: "a2", title: "Tema", completed: false, dueDate: "2026-10-27" },
        { id: "a3", title: "Studio", completed: false, dueDate: "2026-10-29" },
      ],
    };
    expect(answerQuestion("Quali compiti scadono domani?", dueData, schedule, now)).toContain(
      "Tema",
    );
  });

  it("trova l'ultima circolare, l'ultimo voto e il voto più alto di una materia", () => {
    const noticeData: VotoData = {
      ...data,
      notifications: [
        {
          id: "n1",
          type: "notice",
          title: "Comunicazione elezioni",
          date: "2026-10-20",
          attachmentName: "comunicazione.pdf",
          read: false,
        },
      ],
    };
    expect(answerQuestion("Qual è l'ultima circolare?", noticeData)).toContain(
      "Comunicazione elezioni",
    );
    expect(answerQuestion("Qual è l'ultimo voto?", data)).toContain("Inglese");
    expect(answerQuestion("Qual è il voto più alto in Inglese?", data)).toContain("7,00");
  });

  it("filtra le circolari di oggi e compone un riepilogo delle novità", () => {
    const now = new Date(2026, 9, 27, 12);
    const updateData: VotoData = {
      ...data,
      notifications: [
        {
          id: "today-1",
          type: "notice",
          title: "Assemblea di classe",
          date: "2026-10-27",
          read: false,
        },
        {
          id: "today-2",
          type: "notice",
          title: "Uscita anticipata",
          date: "2026-10-27",
          read: true,
        },
        {
          id: "yesterday",
          type: "notice",
          title: "Avviso precedente",
          date: "2026-10-26",
          read: false,
        },
      ],
    };
    const todaysCirculars = answerQuestion(
      "Quali sono le nuove circolari di oggi?",
      updateData,
      emptySchedule(),
      now,
    );
    expect(todaysCirculars).toContain("Assemblea di classe");
    expect(todaysCirculars).toContain("Uscita anticipata");
    expect(todaysCirculars).not.toContain("Avviso precedente");

    const summary = answerQuestion("Quali sono le novità?", updateData, emptySchedule(), now);
    expect(summary).toContain("Ultimo voto");
    expect(summary).toContain("Assemblea di classe");
  });
});
