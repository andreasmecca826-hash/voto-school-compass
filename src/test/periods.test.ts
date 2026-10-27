import { describe, expect, it } from "vitest";
import { defaultBoundary, filterSubjectsByPeriod, schoolYearStart, validBoundary } from "../lib/voto/periods";
import { average } from "../lib/voto/calc";
import type { Subject } from "../lib/voto/types";
const subjects: Subject[] = [{ id: "math", name: "Matematica", grades: [
  { id: "a", date: "2026-12-31", value: 4, label: "4", type: "orale", weight: 1 },
  { id: "b", date: "2027-01-31", value: 6, label: "6", type: "scritto", weight: 1 },
  { id: "c", date: "2027-02-01", value: 10, label: "10", type: "orale", weight: 1 },
  { id: "old", date: "2025-10-01", value: 2, label: "2", type: "orale", weight: 1 },
] }];
describe("school periods", () => {
  it("splits quadrimesters without overlaps and recalculates means", () => {
    const config = { year: 2026, system: "quadrimesters" as const, boundary: "2027-01-31" };
    const first = filterSubjectsByPeriod(subjects, { ...config, selection: "first" });
    const second = filterSubjectsByPeriod(subjects, { ...config, selection: "second" });
    expect(first[0]?.grades.map((g) => g.id)).toEqual(["a", "b"]);
    expect(average(first[0]?.grades ?? [])).toBe(5);
    expect(average(second[0]?.grades ?? [])).toBe(10);
    expect(filterSubjectsByPeriod(subjects, { ...config, selection: "all" })[0]?.grades.length).toBe(3);
  });
  it("supports trimester and pentamester", () => {
    expect(defaultBoundary(2026, "trimester")).toBe("2026-12-31");
    const filtered = filterSubjectsByPeriod(subjects, { year: 2026, system: "trimester", selection: "second", boundary: "2026-12-31" });
    expect(filtered[0]?.grades.map((g) => g.id)).toEqual(["b", "c"]);
  });
  it("accepts a valid custom boundary only within the school year", () => {
    expect(validBoundary("2027-02-01", 2026)).toBe(true);
    expect(validBoundary("2027-02-30", 2026)).toBe(false);
    expect(validBoundary("2028-01-01", 2026)).toBe(false);
    expect(schoolYearStart("2027-01-10")).toBe(2026);
  });
});