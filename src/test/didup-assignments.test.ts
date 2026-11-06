import { describe, expect, it } from "vitest";
import { groupDidupAssignments } from "@/lib/voto/didup-assignments";
import type { Assignment } from "@/lib/voto/types";

const sample: Assignment[] = [
  { id: "older", title: "Compito A", assignedDate: "2026-11-03", dueDate: "2026-11-10" },
  { id: "newer", title: "Compito B", assignedDate: "2026-11-05", dueDate: "2026-11-11" },
  { id: "undated", title: "Compito C", dueDate: "2026-11-12" },
  { id: "same-day", title: "Compito D", assignedDate: "2026-11-05", dueDate: "2026-11-09" },
];

describe("groupDidupAssignments", () => {
  it("raggruppa Assegnazione per data, dalla più recente, mostrando la consegna separatamente", () => {
    const groups = groupDidupAssignments(sample, "assignment");

    expect(groups.map((group) => group.label)).toEqual([
      "ASSEGNATI IL 05 NOVEMBRE",
      "ASSEGNATI IL 03 NOVEMBRE",
      "DATA DI ASSEGNAZIONE NON DISPONIBILE",
    ]);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(["same-day", "newer"]);
    expect(groups[2]?.items[0]?.id).toBe("undated");
  });

  it("mantiene il raggruppamento per materia", () => {
    const assignments: Assignment[] = [
      { id: "b", title: "B", subject: "Italiano", dueDate: "2026-11-11" },
      { id: "a", title: "A", subject: "Matematica", dueDate: "2026-11-10" },
    ];

    expect(groupDidupAssignments(assignments, "subject").map((group) => group.label)).toEqual([
      "Italiano",
      "Matematica",
    ]);
  });
});
