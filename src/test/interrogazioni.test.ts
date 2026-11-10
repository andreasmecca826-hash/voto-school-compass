import { describe, expect, it } from "vitest";
import { presentInterrogazione, reminderDateToIso } from "@/lib/voto/interrogazioni";

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

describe("presentInterrogazione", () => {
  it("presenta il titolo della verifica e la materia separatamente", () => {
    expect(
      presentInterrogazione({
        id: "chemistry",
        reminderId: "reminder-1",
        subject: "Chimica",
        date: "2026-11-13",
        notes: "Verifica di chimica\nStruttura dell'atomo",
        completed: false,
        checklist: [],
      }),
    ).toEqual({
      title: "Verifica di chimica",
      subject: "Chimica",
      notes: "Struttura dell'atomo",
      isVerification: true,
    });
  });

  it("mantiene la presentazione normale per un'interrogazione manuale", () => {
    expect(
      presentInterrogazione({
        id: "history",
        subject: "Storia",
        date: "2026-11-13",
        notes: "Capitoli 3-5",
        completed: false,
        checklist: [],
      }),
    ).toMatchObject({ title: "Storia", subject: "Storia", isVerification: false });
  });
});
