import { describe, expect, it } from "vitest";
import { makeDemoRaw } from "@/lib/voto/demo";

describe("dati demo", () => {
  const demo = makeDemoRaw();

  it("include un docente per ogni materia e un commento per ogni voto", () => {
    expect(demo.subjects.every((subject) => subject.teacher?.trim())).toBe(true);
    expect(
      demo.subjects.flatMap((subject) => subject.grades).every((grade) => grade.comment?.trim()),
    ).toBe(true);
  });

  it("include orario, dettagli e docente per ogni compito demo", () => {
    expect(
      demo.assignments.every(
        (assignment) =>
          assignment.dueTime?.trim() && assignment.details?.trim() && assignment.teacher?.trim(),
      ),
    ).toBe(true);
  });
});
