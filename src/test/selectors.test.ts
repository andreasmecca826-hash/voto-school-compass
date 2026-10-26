import { describe, expect, it } from "vitest";
import {
  selectDashboardAssignments,
  selectNotificationsByType,
  selectOpenInterrogazioni,
} from "@/lib/voto/selectors";

describe("Dashboard selectors", () => {
  it("seleziona e ordina i compiti di oggi e domani", () => {
    const now = new Date(2026, 9, 26);
    const assignments = [
      { id: "later", title: "Più avanti", dueDate: "2026-10-28", completed: false },
      {
        id: "tomorrow",
        title: "Domani",
        dueDate: "2026-10-27",
        dueTime: "08:00",
        completed: false,
      },
      { id: "today", title: "Oggi", dueDate: "2026-10-26", dueTime: "18:00", completed: false },
    ];

    expect(
      selectDashboardAssignments(assignments, now, (_id, remote) => remote).map((item) => item.id),
    ).toEqual(["today", "tomorrow"]);
  });

  it("mantiene i compiti scaduti non completati e ignora quelli completati", () => {
    const now = new Date(2026, 9, 26);
    const assignments = [
      { id: "open", title: "Da fare", dueDate: "2026-10-25", completed: false },
      { id: "done", title: "Fatto", dueDate: "2026-10-25", completed: true },
    ];

    expect(
      selectDashboardAssignments(assignments, now, (_id, remote) => remote).map((item) => item.id),
    ).toEqual(["open"]);
  });

  it("filtra notifiche e interrogazioni aperte con un limite", () => {
    const notifications = [
      { id: "n1", type: "note" as const, title: "Nota", read: false },
      { id: "n2", type: "notice" as const, title: "Avviso", read: false },
    ];
    const interrogazioni = [
      { id: "i1", subject: "Matematica", date: "2026-10-27", completed: false, checklist: [] },
      { id: "i2", subject: "Italiano", date: "2026-10-28", completed: true, checklist: [] },
    ];

    expect(selectNotificationsByType(notifications, "note")).toHaveLength(1);
    expect(selectOpenInterrogazioni(interrogazioni)).toEqual([interrogazioni[0]]);
  });
});
