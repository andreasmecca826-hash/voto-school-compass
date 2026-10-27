import { beforeEach, describe, expect, it } from "vitest";
import {
  canSelectTheme,
  getQuestSnapshot,
  readQuestLedger,
  recordQuestActivity,
  syncQuestRewards,
} from "@/lib/voto/quest-system";

beforeEach(() => {
  localStorage.clear();
});

describe("Quest giornaliere e settimanali", () => {
  it("salva progressi reali e accredita ogni premio una sola volta per periodo", () => {
    const now = new Date(2026, 9, 27, 12);
    for (let index = 0; index < 5; index += 1) {
      recordQuestActivity("assignment_completed", new Date(now.getTime() + index * 1000));
    }

    const ledger = readQuestLedger();
    const snapshot = getQuestSnapshot(ledger, now);
    expect(snapshot.daily.find((quest) => quest.id === "daily-assignment")).toMatchObject({
      progress: 5,
      complete: true,
      claimed: true,
    });
    expect(snapshot.weekly.find((quest) => quest.id === "weekly-assignments")).toMatchObject({
      progress: 5,
      complete: true,
      claimed: true,
    });
    expect(snapshot.xp).toBe(55);
    expect(syncQuestRewards(now).xp).toBe(55);
  });

  it("azzera il contatore giornaliero al cambio data ma conserva quello settimanale", () => {
    const today = new Date(2026, 9, 27, 12);
    recordQuestActivity("focus_session", today);
    const tomorrow = new Date(2026, 9, 28, 12);
    const snapshot = getQuestSnapshot(readQuestLedger(), tomorrow);

    expect(snapshot.daily.find((quest) => quest.id === "daily-focus")?.progress).toBe(0);
    expect(snapshot.weekly.find((quest) => quest.id === "weekly-focus")?.progress).toBe(1);
    expect(snapshot.xp).toBe(15);
  });

  it("completa il ripasso flashcard solo al raggiungimento della soglia", () => {
    const now = new Date(2026, 9, 27, 12);
    recordQuestActivity("flashcard_reviewed", now);
    recordQuestActivity("flashcard_reviewed", new Date(now.getTime() + 1000));
    expect(readQuestLedger().xp).toBe(0);

    recordQuestActivity("flashcard_reviewed", new Date(now.getTime() + 2000));
    expect(readQuestLedger().xp).toBe(10);
    expect(syncQuestRewards(now).xp).toBe(10);
  });

  it("sblocca i temi ricompensa soltanto al livello previsto", () => {
    expect(canSelectTheme("oro", 399)).toBe(false);
    expect(canSelectTheme("oro", 400)).toBe(true);
    expect(canSelectTheme("diamante", 899)).toBe(false);
    expect(canSelectTheme("diamante", 900)).toBe(true);
    expect(canSelectTheme("original", 0)).toBe(true);
  });
});
