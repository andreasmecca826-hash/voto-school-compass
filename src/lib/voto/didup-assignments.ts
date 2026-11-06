import type { Assignment } from "./types";
import { fmtDate } from "./dates";

export type DidupSort = "delivery" | "subject" | "assignment";

export interface AssignmentGroup {
  key: string;
  label: string;
  items: Assignment[];
}

export function groupDidupAssignments(
  assignments: Assignment[],
  sortBy: DidupSort,
): AssignmentGroup[] {
  const sorted = [...assignments].sort((a, b) => {
    if (sortBy === "subject") {
      return (
        (a.subject || "").localeCompare(b.subject || "", "it") ||
        (a.dueDate || "").localeCompare(b.dueDate || "")
      );
    }
    if (sortBy === "assignment") {
      return (
        (b.assignedDate || "").slice(0, 10).localeCompare((a.assignedDate || "").slice(0, 10)) ||
        (a.dueDate || "").localeCompare(b.dueDate || "") ||
        (a.subject || "").localeCompare(b.subject || "", "it")
      );
    }
    return (b.dueDate || "").localeCompare(a.dueDate || "");
  });

  const groupKey = (assignment: Assignment) => {
    if (sortBy === "subject") return assignment.subject?.trim() || "Materia non specificata";
    return (
      (sortBy === "assignment" ? assignment.assignedDate : assignment.dueDate)?.slice(0, 10) || ""
    );
  };
  const buckets = new Map<string, Assignment[]>();
  sorted.forEach((assignment) => {
    const key = groupKey(assignment);
    buckets.set(key, [...(buckets.get(key) ?? []), assignment]);
  });

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (sortBy === "subject") return a.localeCompare(b, "it");
      return b.localeCompare(a);
    })
    .map(([key, items]) => ({
      key: key || (sortBy === "assignment" ? "no-assignment-date" : "no-due-date"),
      label:
        sortBy === "subject"
          ? key
          : key
            ? `${sortBy === "assignment" ? "ASSEGNATI IL" : "DA CONSEGNARE IL"} ${fmtDate(key, {
                day: "2-digit",
                month: "long",
              }).toLocaleUpperCase("it-IT")}`
            : sortBy === "assignment"
              ? "DATA DI ASSEGNAZIONE NON DISPONIBILE"
              : "SENZA DATA DI CONSEGNA",
      items,
    }));
}
