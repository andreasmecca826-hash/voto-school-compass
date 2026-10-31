import { describe, expect, it } from "vitest";
import { parseVotoData } from "@/lib/voto/parse";

describe("parser eventi appello", () => {
  it("normalizza tipo, data e stato e ignora record incompleti", () => {
    const parsed = parseVotoData({
      subjects: [],
      attendanceEvents: [
        {
          id: "assenza-1",
          type: "absence",
          date: "2026-10-26T00:00:00",
          justificationStatus: "Da giustificare",
        },
        { id: "ritardo-1", type: "I", date: "2026-10-25" },
        { id: "uscita-1", type: "earlyExit", date: "2026-10-24" },
        { id: "tipo-sconosciuto", type: "unknown", date: "2026-10-23" },
        { id: "senza-data", type: "absence" },
      ],
    });

    expect(parsed.attendanceEvents).toEqual([
      {
        id: "assenza-1",
        type: "absence",
        date: "2026-10-26",
        justificationStatus: "Da giustificare",
      },
      { id: "ritardo-1", type: "delay", date: "2026-10-25" },
      { id: "uscita-1", type: "earlyExit", date: "2026-10-24" },
    ]);
  });

  it("accetta i JSON legacy senza eventi appello", () => {
    expect(parseVotoData({ subjects: [] }).attendanceEvents).toEqual([]);
  });
});
