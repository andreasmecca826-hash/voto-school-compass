import { describe, expect, it } from "vitest";
import { emptySchedule } from "@/lib/voto/orario";
import {
  openAssignmentsForTomorrow,
  tomorrowScheduleDay,
  tomorrowSubjects,
  upcomingSchoolEvents,
} from "@/lib/voto/tomorrow-school";
import type { Interrogazione } from "@/lib/voto/interrogazioni";
import type { AppNotification, Assignment } from "@/lib/voto/types";

const makeInterrogazione = (id: string, date: string, completed = false): Interrogazione => ({
  id,
  subject: "Matematica",
  date,
  completed,
  checklist: [],
});

describe("Domani a scuola", () => {
  it("seleziona le lezioni del prossimo giorno feriale ed elimina materie duplicate", () => {
    const schedule = emptySchedule();
    schedule.venerdi = ["Italiano", "Matematica", "Italiano", ""];
    const now = new Date(2026, 9, 29, 12); // giovedì
    expect(tomorrowScheduleDay(now)?.id).toBe("venerdi");
    expect(tomorrowSubjects(schedule, now)).toEqual(["Italiano", "Matematica"]);
  });

  it("non mostra lezioni per il sabato", () => {
    const saturdayEve = new Date(2026, 9, 30, 12); // venerdì
    expect(tomorrowScheduleDay(saturdayEve)).toBeNull();
    expect(tomorrowSubjects(emptySchedule(), saturdayEve)).toEqual([]);
  });

  it("ordina i compiti aperti per scadenza e non include quelli completati", () => {
    const assignments: Assignment[] = [
      { id: "later", title: "Ricerca", dueDate: "2026-11-02", completed: false },
      { id: "done", title: "Esercizi", dueDate: "2026-10-29", completed: true },
      { id: "soon", title: "Studio", dueDate: "2026-10-30", completed: false },
      { id: "none", title: "Lettura", completed: false },
    ];
    const tasks = openAssignmentsForTomorrow(assignments, (_id, remote) => remote);
    expect(tasks.map((task) => task.id)).toEqual(["soon", "later", "none"]);
  });

  it("include interrogazioni non completate e promemoria di verifica entro sette giorni", () => {
    const notifications: AppNotification[] = [
      {
        id: "test",
        type: "reminder",
        title: "Verifica di scienze",
        date: "2026-11-03",
        read: false,
      },
      {
        id: "generic",
        type: "reminder",
        title: "Portare il modulo",
        date: "2026-11-03",
        read: false,
      },
      {
        id: "late-test",
        type: "reminder",
        title: "Verifica tardiva",
        date: "2026-11-10",
        read: false,
      },
    ];
    const events = upcomingSchoolEvents(
      [
        makeInterrogazione("soon", "2026-10-30"),
        makeInterrogazione("done", "2026-10-30", true),
        makeInterrogazione("late", "2026-11-10"),
      ],
      notifications,
      new Date(2026, 9, 29, 12),
    );
    expect(events.map((event) => event.id)).toEqual(["interrogazione-soon", "promemoria-test"]);
  });
});
