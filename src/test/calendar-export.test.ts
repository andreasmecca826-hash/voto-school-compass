import { describe, expect, it } from "vitest";
import { createCalendarIcs } from "@/lib/voto/calendar-export";
import type { Interrogazione } from "@/lib/voto/interrogazioni";
import type { AppNotification, Assignment } from "@/lib/voto/types";

const range = {
  from: "2026-10-28",
  to: "2026-12-31",
  include: { assignments: true, interrogazioni: true, reminders: true },
  isAssignmentDone: (_id: string, completed: boolean) => completed,
  now: new Date("2026-10-28T09:00:00.000Z"),
};

const assignments: Assignment[] = [
  {
    id: "compito 1",
    title: "Esercizi, pagina 42",
    subject: "Matematica",
    dueDate: "2026-11-02",
    dueTime: "18:00",
    completed: false,
    details: "Esercizi 1-8; portare il quaderno",
  },
  {
    id: "completato",
    title: "Già svolto",
    dueDate: "2026-11-03",
    completed: true,
  },
  {
    id: "senza-data",
    title: "Senza scadenza",
    completed: false,
  },
];

const interrogazioni: Interrogazione[] = [
  {
    id: "interrogazione-1",
    subject: "Storia",
    date: "2026-11-05",
    time: "10:30",
    notes: "Capitoli 3-5",
    completed: false,
    checklist: [],
  },
  {
    id: "interrogazione-passata",
    subject: "Italiano",
    date: "2026-11-06",
    completed: true,
    checklist: [],
  },
];

const notifications: AppNotification[] = [
  {
    id: "promemoria-1",
    type: "reminder",
    title: "Portare il modulo",
    message: "Consegnarlo in segreteria",
    subject: "Scuola",
    date: "2026-11-07",
    read: false,
  },
  {
    id: "nota-1",
    type: "note",
    title: "Nota non esportabile come promemoria",
    date: "2026-11-08",
    read: false,
  },
  {
    id: "promemoria-fuori-intervallo",
    type: "reminder",
    title: "Dopo l’intervallo",
    date: "2027-01-01",
    read: false,
  },
];

describe("createCalendarIcs", () => {
  it("esporta compiti aperti, interrogazioni da fare e promemoria entro le date selezionate", () => {
    const result = createCalendarIcs({ assignments, interrogazioni, notifications }, range);
    const localDueTime = new Date("2026-11-02T18:00:00")
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const localInterrogationTime = new Date("2026-11-05T10:30:00")
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

    expect(result.eventCount).toBe(3);
    expect(result.content).toContain("BEGIN:VCALENDAR\r\nVERSION:2.0");
    expect(result.content).toContain("SUMMARY:Compito: Esercizi\\, pagina 42");
    expect(result.content).toContain(`DTSTART:${localDueTime}`);
    expect(result.content).toContain(`DTSTART:${localInterrogationTime}`);
    expect(result.content).toContain("SUMMARY:Promemoria: Portare il modulo");
    expect(result.content).toContain(
      "DESCRIPTION:Materia: Matematica\\nEsercizi 1-8\\; portare il quaderno",
    );
    expect(result.content).not.toContain("Già svolto");
    expect(result.content).not.toContain("interrogazione-passata");
    expect(result.content).not.toContain("nota-1");
    expect(result.content).not.toContain("Dopo l’intervallo");
    expect(result.content).toContain("END:VCALENDAR\r\n");
  });

  it("rispetta le categorie selezionate e l’intervallo inclusivo", () => {
    const result = createCalendarIcs(
      { assignments, interrogazioni, notifications },
      {
        ...range,
        from: "2026-11-05",
        to: "2026-11-05",
        include: { assignments: false, interrogazioni: true, reminders: false },
      },
    );

    expect(result.eventCount).toBe(1);
    expect(result.content).toContain("SUMMARY:Interrogazione: Storia");
    expect(result.content).not.toContain("Compito:");
    expect(result.content).not.toContain("Promemoria:");
  });

  it("restituisce zero eventi senza creare un calendario vuoto", () => {
    const result = createCalendarIcs(
      { assignments, interrogazioni, notifications },
      { ...range, include: { assignments: false, interrogazioni: false, reminders: false } },
    );

    expect(result).toEqual({ content: "", eventCount: 0 });
  });

  it("rifiuta un intervallo non valido", () => {
    expect(() =>
      createCalendarIcs(
        { assignments, interrogazioni, notifications },
        { ...range, from: "2026-12-01", to: "2026-11-01" },
      ),
    ).toThrow(RangeError);
  });

  it("piega righe lunghe rispettando il limite di 75 byte UTF-8", () => {
    const longAssignment: Assignment = {
      id: "lungo",
      title: `Ripasso ${"matematica e scienze ".repeat(10)}fine`,
      dueDate: "2026-11-10",
      completed: false,
    };
    const { content } = createCalendarIcs(
      { assignments: [longAssignment], interrogazioni: [], notifications: [] },
      { ...range, include: { assignments: true, interrogazioni: false, reminders: false } },
    );

    for (const line of content.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});
