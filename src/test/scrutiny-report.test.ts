import { describe, expect, it } from "vitest";
import { buildDidupScrutinyRows, didupScrutinyAverage } from "@/lib/voto/scrutiny-report";
import type { Subject } from "@/lib/voto/types";

const subjects: Subject[] = [
  {
    id: "math",
    name: "Matematica",
    grades: [
      { id: "before", value: 5, label: "5", date: "2026-09-14", type: "orale", weight: 1 },
      { id: "first", value: 6, label: "6", date: "2026-09-15", type: "orale", weight: 1 },
      { id: "boundary", value: 7, label: "7", date: "2026-12-15", type: "scritto", weight: 1 },
      { id: "after", value: 9, label: "9", date: "2026-12-16", type: "orale", weight: 1 },
    ],
  },
  {
    id: "italian",
    name: "Italiano",
    grades: [
      { id: "i1", value: 6, label: "6", date: "2026-10-10", type: "orale", weight: 1 },
      { id: "i2", value: 7, label: "7", date: "2026-11-10", type: "scritto", weight: 1 },
    ],
  },
  { id: "science", name: "Scienze", grades: [] },
];

describe("DidUP scrutiny report summary", () => {
  it("includes both boundary dates and rounds each weighted subject mean", () => {
    const rows = buildDidupScrutinyRows(subjects, "2026-09-15", "2026-12-15");
    expect(rows).toEqual([
      { id: "italian", name: "Italiano", grade: 7, mean: 6.5, gradeCount: 2 },
      { id: "math", name: "Matematica", grade: 7, mean: 6.5, gradeCount: 2 },
      { id: "science", name: "Scienze", grade: null, mean: null, gradeCount: 0 },
    ]);
  });

  it("calculates the indicative mean while ignoring subjects without numeric grades", () => {
    const rows = buildDidupScrutinyRows(subjects, "2026-09-15", "2026-12-15");
    expect(didupScrutinyAverage(rows)).toBe(6.5);
    expect(
      didupScrutinyAverage([
        { id: "none", name: "Nessuno", grade: null, mean: null, gradeCount: 0 },
      ]),
    ).toBe(null);
  });

  it("uses the full supplied date range for a final report", () => {
    const rows = buildDidupScrutinyRows(subjects, "2026-09-15", "2027-08-31");
    expect(rows.find((row) => row.id === "math")).toMatchObject({
      grade: 7,
      mean: 7.333333333333333,
      gradeCount: 3,
    });
  });
});
