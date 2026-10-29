import { describe, expect, it } from "vitest";
import {
  averageRoundedReport,
  normalizeManualReports,
  parseReportGrade,
  roundReportGrade,
  type ManualReportEntry,
} from "@/lib/voto/infraperiodal";

const entry = (subject: string, rawGrade: string): ManualReportEntry => ({
  id: subject,
  subject,
  rawGrade,
});

describe("scrutini infraperiodali manuali", () => {
  it("legge i voti decimali scritti con virgola o punto", () => {
    expect(parseReportGrade("6,5")).toBe(6.5);
    expect(parseReportGrade(" 7.25 ")).toBe(7.25);
  });

  it("rifiuta campi vuoti, input non numerici e voti fuori intervallo", () => {
    expect(parseReportGrade("")).toBeNull();
    expect(parseReportGrade("sei")).toBeNull();
    expect(parseReportGrade("0")).toBeNull();
    expect(parseReportGrade("10,1")).toBeNull();
  });

  it("arrotonda al voto intero più vicino e i mezzi voti per eccesso", () => {
    expect(roundReportGrade(6.49)).toBe(6);
    expect(roundReportGrade(6.5)).toBe(7);
    expect(roundReportGrade(9.99)).toBe(10);
    expect(roundReportGrade(null)).toBeNull();
  });

  it("calcola la media dei voti finali arrotondati, ignorando le righe vuote o non valide", () => {
    expect(
      averageRoundedReport([
        entry("Italiano", "6,5"),
        entry("Matematica", "7,6"),
        entry("Inglese", ""),
      ]),
    ).toBe(7.5);
    expect(averageRoundedReport([entry("Italiano", "")])).toBeNull();
  });

  it("normalizza i dati salvati e scarta record malformati", () => {
    expect(
      normalizeManualReports([
        {
          id: "report-1",
          title: "Pagella 1",
          createdAt: "2026-10-28T12:00:00.000Z",
          entries: [{ id: "it", subject: "Italiano", rawGrade: "6,5" }, { id: 1 }],
        },
        null,
      ]),
    ).toEqual([
      {
        id: "report-1",
        title: "Pagella 1",
        createdAt: "2026-10-28T12:00:00.000Z",
        entries: [{ id: "it", subject: "Italiano", rawGrade: "6,5" }],
      },
    ]);
  });
});
