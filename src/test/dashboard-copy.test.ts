import { describe, expect, it } from "vitest";
import { countRecentOpenAssignments, dashboardMicrocopy } from "@/lib/voto/dashboard-copy";
import type { Assignment } from "@/lib/voto/types";

const assignment = (id: string, assignedDate?: string, completed = false): Assignment => ({
  id,
  title: `Compito ${id}`,
  ...(assignedDate ? { assignedDate } : {}),
  completed,
});

const isDone = (_id: string, completed: boolean) => completed;

describe("frasi contestuali del dashboard", () => {
  it("mostra una frase sui voti da leggere", () => {
    expect(
      dashboardMicrocopy(
        { average: 7, delta: null, unreadGrades: 1, unreadOther: 0, recentAssignments: 0 },
        0,
      ),
    ).toMatch(/voto/i);
  });

  it("mostra una frase sui compiti assegnati di recente", () => {
    expect(
      dashboardMicrocopy(
        { average: 7, delta: null, unreadGrades: 0, unreadOther: 0, recentAssignments: 1 },
        0,
      ),
    ).toMatch(/compito/i);
  });

  it("non segnala assenza di novità quando ci sono altre notifiche non lette", () => {
    expect(
      dashboardMicrocopy(
        { average: 7, delta: null, unreadGrades: 0, unreadOther: 2, recentAssignments: 0 },
        0,
      ),
    ).toMatch(/novità|aggiornamenti|messaggi/i);
  });

  it("varia le frasi quando non ci sono novità e mantiene la scelta per lo stesso seed", () => {
    const context = {
      average: 7,
      delta: null,
      unreadGrades: 0,
      unreadOther: 0,
      recentAssignments: 0,
    };
    const first = dashboardMicrocopy(context, 0);
    const last = dashboardMicrocopy(context, 0.99);

    expect(first).not.toBe(last);
    expect(dashboardMicrocopy(context, 0)).toBe(first);
  });

  it("conta i compiti aperti assegnati oggi o nei due giorni precedenti", () => {
    const now = new Date(2026, 10, 10, 12);
    const assignments = [
      assignment("oggi", "2026-11-10"),
      assignment("ieri", "2026-11-09"),
      assignment("due-giorni", "2026-11-08"),
      assignment("vecchio", "2026-11-06"),
      assignment("futuro", "2026-11-11"),
      assignment("svolto", "2026-11-10", true),
      assignment("senza-data"),
    ];

    expect(countRecentOpenAssignments(assignments, now, isDone)).toBe(3);
  });
});
