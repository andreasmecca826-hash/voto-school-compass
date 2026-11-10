import { describe, expect, it } from "vitest";
import { buildStudyPlan } from "../lib/voto/study-planner";
import { emptySchedule } from "../lib/voto/orario";

describe("Smart Study Planner", () => {
  it("pianifica prima la scadenza più vicina e considera le lezioni", () => {
    const schedule = emptySchedule();
    schedule.lunedi = ["Matematica", "Italiano", "Inglese", "Scienze", "Storia", "Arte"];
    const plan = buildStudyPlan({
      now: new Date("2026-11-09T08:00:00"),
      schedule,
      minutesPerDay: 90,
      assignments: [
        {
          id: "late",
          title: "Ricerca",
          subject: "Storia",
          dueDate: "2026-11-13",
          completed: false,
        },
        {
          id: "soon",
          title: "Esercizi",
          subject: "Matematica",
          dueDate: "2026-11-10",
          completed: false,
        },
      ],
      interrogazioni: [],
    });

    expect(plan[0]?.tasks[0]?.title).toBe("Esercizi");
    expect(plan[0]?.availableMinutes).toBeLessThan(90);
  });

  it("include verifiche e interrogazioni con titoli distinti", () => {
    const plan = buildStudyPlan({
      now: new Date("2026-11-09T08:00:00"),
      schedule: emptySchedule(),
      minutesPerDay: 120,
      assignments: [],
      interrogazioni: [
        {
          id: "oral",
          subject: "Italiano",
          date: "2026-11-11",
          completed: false,
          checklist: [],
        },
        {
          id: "written",
          subject: "Chimica",
          date: "2026-11-12",
          notes: "Verifica di laboratorio",
          completed: false,
          checklist: [],
        },
      ],
    });
    const titles = plan.flatMap((day) => day.tasks.map((task) => task.title));
    expect(titles).toContain("Interrogazione di Italiano");
    expect(titles).toContain("Verifica di Chimica");
  });

  it("ricalcola senza attività completate e può rimandare una giornata", () => {
    const base = {
      now: new Date("2026-11-09T08:00:00"),
      schedule: emptySchedule(),
      minutesPerDay: 90,
      assignments: [{ id: "a", title: "Ripasso", dueDate: "2026-11-13", completed: false }],
      interrogazioni: [],
    };
    const first = buildStudyPlan(base);
    const task = first[0]?.tasks[0];
    expect(task).toBeTruthy();
    const completed = buildStudyPlan({ ...base, completedIds: new Set(["assignment:a"]) });
    expect(completed.flatMap((day) => day.tasks)).toHaveLength(0);
    const postponed = buildStudyPlan({ ...base, earliestDates: { "assignment:a": "2026-11-10" } });
    expect(postponed[0]?.tasks).toHaveLength(0);
    expect(postponed[1]?.tasks[0]?.title).toBe("Ripasso");
  });
});
