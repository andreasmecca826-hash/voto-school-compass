import { describe, expect, it } from "vitest";
import {
  notificationContentLabel,
  selectDashboardAssignments,
  selectNotificationsByType,
  selectOpenInterrogazioni,
  selectPastReminders,
  selectUpcomingReminders,
} from "@/lib/voto/selectors";

describe("Dashboard selectors", () => {
  it("classifica avvisi con allegati come Circolari e avvisi solo testuali come Comunicazioni", () => {
    const base = { type: "notice" as const, title: "Avviso", read: false };

    expect(
      notificationContentLabel({ ...base, id: "pdf", attachments: [{ name: "circolare.pdf" }] }),
    ).toBe("Circolari");
    expect(notificationContentLabel({ ...base, id: "docx", attachmentName: "modulo.docx" })).toBe(
      "Circolari",
    );
    expect(notificationContentLabel({ ...base, id: "text", message: "Solo testo" })).toBe(
      "Comunicazioni",
    );
  });

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

    expect(selectDashboardAssignments(assignments, now).map((item) => item.id)).toEqual([
      "today",
      "tomorrow",
    ]);
  });

  it("esclude i compiti di ieri e mantiene quelli di oggi e domani", () => {
    const now = new Date(2026, 9, 26);
    const assignments = [
      { id: "yesterday", title: "Ieri", dueDate: "2026-10-25", completed: false },
      { id: "today", title: "Oggi", dueDate: "2026-10-26", completed: false },
      { id: "tomorrow", title: "Domani", dueDate: "2026-10-27", completed: false },
    ];

    expect(selectDashboardAssignments(assignments, now).map((item) => item.id)).toEqual([
      "today",
      "tomorrow",
    ]);
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

  it("seleziona i promemoria futuri e limita quelli passati agli ultimi 30 giorni", () => {
    const now = new Date(2026, 9, 27);
    const notifications = [
      {
        id: "old-31",
        type: "reminder" as const,
        title: "Vecchio",
        date: "2026-09-26",
        read: false,
      },
      {
        id: "old-30",
        type: "reminder" as const,
        title: "Ultimo mese",
        date: "2026-09-27",
        read: false,
      },
      { id: "today", type: "reminder" as const, title: "Oggi", date: "2026-10-27", read: false },
      { id: "future", type: "reminder" as const, title: "Domani", date: "2026-10-28", read: false },
      { id: "unknown", type: "reminder" as const, title: "Senza data", read: false },
    ];

    expect(selectUpcomingReminders(notifications, now).map((item) => item.id)).toEqual([
      "today",
      "future",
      "unknown",
    ]);
    expect(selectPastReminders(notifications, now).map((item) => item.id)).toEqual(["old-30"]);
    expect(selectPastReminders(notifications, now, 365).map((item) => item.id)).toEqual(["old-30"]);
  });
});
