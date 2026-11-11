import { describe, expect, it } from "vitest";
import {
  countRecentOpenAssignments,
  dashboardMicrocopy,
  selectLatestDashboardEvent,
} from "@/lib/voto/dashboard-copy";
import type { AppNotification, Assignment } from "@/lib/voto/types";

const assignment = (id: string, assignedDate?: string, completed = false): Assignment => ({
  id,
  title: `Compito ${id}`,
  ...(assignedDate ? { assignedDate } : {}),
  completed,
});

const notification = (
  id: string,
  type: AppNotification["type"],
  date: string,
): AppNotification => ({
  id,
  type,
  title: id,
  date,
  read: false,
});

const isDone = (_id: string, completed: boolean) => completed;

const context = (latestEvent: ReturnType<typeof selectLatestDashboardEvent>) => ({
  average: 7,
  delta: null,
  latestEvent,
});

describe("frase della Media generale", () => {
  it("mostra l’evento più recente entro 24 ore", () => {
    const latest = selectLatestDashboardEvent(
      [notification("voto", "grade", "2026-11-10")],
      [assignment("compito", "2026-11-09")],
      new Date(2026, 10, 10, 18),
    );

    expect(latest?.kind).toBe("grade");
    expect(dashboardMicrocopy(context(latest), 0)).toMatch(/voto/i);
  });

  it("preferisce un compito più recente a un voto precedente", () => {
    const latest = selectLatestDashboardEvent(
      [notification("voto", "grade", "2026-11-09")],
      [assignment("compito", "2026-11-10")],
      new Date(2026, 10, 10, 18),
    );

    expect(latest?.kind).toBe("assignment");
    expect(dashboardMicrocopy(context(latest), 0)).toMatch(/compito/i);
  });

  it("usa una frase generica sulla media quando non accade nulla da oltre un giorno", () => {
    const latest = selectLatestDashboardEvent(
      [notification("voto-vecchio", "grade", "2026-11-08")],
      [assignment("compito-vecchio", "2026-11-08")],
      new Date(2026, 10, 10, 18),
    );

    expect(latest).toBeNull();
    expect(dashboardMicrocopy(context(latest), 0)).toMatch(/strada|media|solido|crescere|voto/i);
  });
});

describe("conteggio dei compiti recenti", () => {
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
