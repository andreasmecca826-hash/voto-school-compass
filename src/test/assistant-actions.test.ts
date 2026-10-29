import { describe, expect, it } from "vitest";
import { getAssignmentActionIntent } from "@/lib/voto/assistant-actions";
import type { Assignment } from "@/lib/voto/types";

const assignments: Assignment[] = [
  {
    id: "homework-1",
    title: "Esercizi pagina 24",
    subject: "Matematica",
    dueDate: "2026-10-29",
    completed: false,
  },
  {
    id: "homework-2",
    title: "Ripassa il capitolo 3",
    subject: "Storia",
    dueDate: "2026-10-30",
    completed: true,
  },
  {
    id: "homework-3",
    title: "Studia il capitolo 5",
    subject: "Storia",
    dueDate: "2026-10-31",
    completed: false,
  },
];

describe("assistant task actions", () => {
  it("prepares a completion request but does not change the assignment", () => {
    const result = getAssignmentActionIntent(
      "Segna Esercizi pagina 24 come completato",
      assignments,
    );
    expect(result).toEqual({
      kind: "confirm",
      action: {
        id: "homework-1",
        title: "Esercizi pagina 24",
        subject: "Matematica",
        dueDate: "2026-10-29",
        currentCompleted: false,
        completed: true,
      },
    });
    expect(assignments[0]?.completed).toBe(false);
  });

  it("prepares reopening a task when selected by subject and asks if the subject is ambiguous", () => {
    expect(getAssignmentActionIntent("Riapri il compito di Storia", assignments)).toMatchObject({
      kind: "clarify",
      message: expect.stringContaining("più compiti compatibili"),
    });

    expect(getAssignmentActionIntent("Riapri Ripassa il capitolo 3", assignments)).toMatchObject({
      kind: "confirm",
      action: { id: "homework-2", currentCompleted: true, completed: false },
    });
    expect(
      getAssignmentActionIntent(
        "Riapri il compito Ripassa il capitolo 3 già completato",
        assignments,
      ),
    ).toMatchObject({ kind: "confirm", action: { completed: false } });
  });

  it("does not offer a second confirmation for an already satisfied state", () => {
    expect(
      getAssignmentActionIntent("Segna Ripassa il capitolo 3 come completato", assignments),
    ).toMatchObject({ kind: "already", message: expect.stringContaining("già completato") });
  });

  it("asks which state to set and ignores ordinary homework questions", () => {
    expect(getAssignmentActionIntent("Segna Esercizi pagina 24", assignments)).toMatchObject({
      kind: "clarify",
      message: expect.stringContaining("completato o riaprirlo"),
    });
    expect(getAssignmentActionIntent("Quanti compiti ho per domani?", assignments)).toBeNull();
    expect(getAssignmentActionIntent("Quali compiti ho completato?", assignments)).toBeNull();
    expect(
      getAssignmentActionIntent("Non segnare Esercizi pagina 24 come completato", assignments),
    ).toBeNull();
  });

  it("does not turn a negative report of unfinished work into a completion action", () => {
    expect(
      getAssignmentActionIntent("Non ho finito Esercizi pagina 24", assignments),
    ).toMatchObject({
      kind: "already",
      message: expect.stringContaining("già da fare"),
    });
    expect(
      getAssignmentActionIntent("Non ho svolto Esercizi pagina 24", assignments),
    ).not.toMatchObject({ kind: "confirm", action: { completed: true } });
  });

  it("asks which task when multiple titles are mentioned and keeps the most specific title", () => {
    expect(
      getAssignmentActionIntent(
        "Segna Esercizi pagina 24 e Ripassa il capitolo 3 come completati",
        assignments,
      ),
    ).toMatchObject({
      kind: "clarify",
      message: expect.stringContaining("più compiti compatibili"),
    });

    const overlappingTitles: Assignment[] = [
      { id: "short", title: "Esercizi", completed: false },
      { id: "specific", title: "Esercizi pagina 24", completed: false },
    ];
    expect(
      getAssignmentActionIntent("Segna Esercizi pagina 24 come completato", overlappingTitles),
    ).toMatchObject({ kind: "confirm", action: { id: "specific" } });
  });
});
