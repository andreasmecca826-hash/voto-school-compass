import { describe, expect, it } from "vitest";
import { reminderDateToIso } from "@/lib/voto/interrogazioni";

describe("reminderDateToIso", () => {
  it("keeps ISO dates and removes a time suffix", () => {
    expect(reminderDateToIso("2026-10-29T08:30:00Z")).toBe("2026-10-29");
  });

  it("converts Italian day/month/year dates", () => {
    expect(reminderDateToIso("29/10/2026")).toBe("2026-10-29");
    expect(reminderDateToIso("9.2.2027")).toBe("2027-02-09");
  });

  it("returns null for missing or impossible dates", () => {
    expect(reminderDateToIso(undefined)).toBeNull();
    expect(reminderDateToIso("31/02/2026")).toBeNull();
    expect(reminderDateToIso("domani")).toBeNull();
  });
});
