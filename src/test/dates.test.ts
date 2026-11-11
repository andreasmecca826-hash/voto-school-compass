import { describe, expect, it } from "vitest";
import { fmtDate, parseEventDateTime } from "@/lib/voto/dates";

describe("fmtDate", () => {
  it("formatta correttamente una data ISO con orario come una data di calendario", () => {
    const options = { day: "2-digit", month: "short", year: "2-digit" } as const;

    expect(fmtDate("2026-10-30T21:50:50+01:00", options)).toBe(fmtDate("2026-10-30", options));
  });
});

describe("parseEventDateTime", () => {
  it("interpreta una data senza orario come mezzanotte locale", () => {
    expect(parseEventDateTime("2026-11-10")).toBe(new Date(2026, 10, 10).getTime());
  });

  it("rifiuta date impossibili e valori mancanti", () => {
    expect(parseEventDateTime("2026-02-31")).toBeNull();
    expect(parseEventDateTime(undefined)).toBeNull();
  });

  it("rispetta il fuso orario esplicito di un timestamp", () => {
    expect(parseEventDateTime("2026-11-10T09:30:00+01:00")).toBe(
      new Date("2026-11-10T08:30:00Z").getTime(),
    );
  });
});
