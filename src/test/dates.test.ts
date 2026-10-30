import { describe, expect, it } from "vitest";
import { fmtDate } from "@/lib/voto/dates";

describe("fmtDate", () => {
  it("formatta correttamente una data ISO con orario come una data di calendario", () => {
    const options = { day: "2-digit", month: "short", year: "2-digit" } as const;

    expect(fmtDate("2026-10-30T21:50:50+01:00", options)).toBe(fmtDate("2026-10-30", options));
  });
});
