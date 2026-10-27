import { useEffect, useState } from "react";
import type { Theme } from "./store";

export const QUESTS_CHANGED_EVENT = "voto:quests-changed";
const STORAGE_KEY = "voto.quests.v1";
const XP_PER_LEVEL = 100;
const MAX_EVENTS = 1500;
const EVENT_RETENTION_DAYS = 45;

export type QuestEventType = "assignment_completed" | "focus_session" | "flashcard_reviewed";
export type QuestPeriod = "daily" | "weekly";

export interface QuestEvent {
  id: string;
  type: QuestEventType;
  at: string;
}

export interface QuestLedger {
  events: QuestEvent[];
  claimed: string[];
  xp: number;
}

export interface QuestDefinition {
  id: string;
  period: QuestPeriod;
  type: QuestEventType;
  title: string;
  description: string;
  goal: number;
  reward: number;
}

export interface QuestProgress extends QuestDefinition {
  progress: number;
  complete: boolean;
  claimed: boolean;
  claimKey: string;
}

export interface QuestSnapshot {
  xp: number;
  level: number;
  xpInLevel: number;
  xpToNextLevel: number;
  levelProgress: number;
  daily: QuestProgress[];
  weekly: QuestProgress[];
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export const QUESTS: QuestDefinition[] = [
  {
    id: "daily-assignment",
    period: "daily",
    type: "assignment_completed",
    title: "Chiudi un compito",
    description: "Segna come completato almeno un compito.",
    goal: 1,
    reward: 15,
  },
  {
    id: "daily-focus",
    period: "daily",
    type: "focus_session",
    title: "Una sessione di concentrazione",
    description: "Completa una sessione Studio da 25 minuti con il Pomodoro.",
    goal: 1,
    reward: 15,
  },
  {
    id: "daily-flashcards",
    period: "daily",
    type: "flashcard_reviewed",
    title: "Ripasso lampo",
    description: "Segna come imparate 3 flashcard nello Studio Lab.",
    goal: 3,
    reward: 10,
  },
  {
    id: "weekly-assignments",
    period: "weekly",
    type: "assignment_completed",
    title: "Settimana senza arretrati",
    description: "Completa 5 compiti durante la settimana.",
    goal: 5,
    reward: 40,
  },
  {
    id: "weekly-focus",
    period: "weekly",
    type: "focus_session",
    title: "Costanza nello studio",
    description: "Completa 4 sessioni Pomodoro di concentrazione.",
    goal: 4,
    reward: 40,
  },
  {
    id: "weekly-flashcards",
    period: "weekly",
    type: "flashcard_reviewed",
    title: "Memoria allenata",
    description: "Ripassa 10 flashcard durante la settimana.",
    goal: 10,
    reward: 30,
  },
];

const EVENT_TYPES = new Set<QuestEventType>([
  "assignment_completed",
  "focus_session",
  "flashcard_reviewed",
]);

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function emptyLedger(): QuestLedger {
  return { events: [], claimed: [], xp: 0 };
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOf(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function periodKey(period: QuestPeriod, now: Date): string {
  return period === "daily" ? localDateKey(now) : localDateKey(mondayOf(now));
}

function isValidEvent(value: unknown): value is QuestEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event["id"] === "string" &&
    typeof event["type"] === "string" &&
    EVENT_TYPES.has(event["type"] as QuestEventType) &&
    typeof event["at"] === "string" &&
    Number.isFinite(new Date(event["at"]).getTime())
  );
}

export function readQuestLedger(storage: StorageLike | null = browserStorage()): QuestLedger {
  if (!storage) return emptyLedger();
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return emptyLedger();
    const value = parsed as Record<string, unknown>;
    const events = Array.isArray(value["events"])
      ? value["events"].filter(isValidEvent).slice(-MAX_EVENTS)
      : [];
    const claimed = Array.isArray(value["claimed"])
      ? [...new Set(value["claimed"].filter((item): item is string => typeof item === "string"))]
      : [];
    const xp =
      typeof value["xp"] === "number" && Number.isFinite(value["xp"])
        ? Math.max(0, Math.floor(value["xp"]))
        : 0;
    return { events, claimed, xp };
  } catch {
    return emptyLedger();
  }
}

function writeQuestLedger(ledger: QuestLedger, storage: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    // Lo spazio locale può essere disabilitato o esaurito; le quest restano utilizzabili finché l'app è aperta.
  }
}

function questProgress(definition: QuestDefinition, ledger: QuestLedger, now: Date): QuestProgress {
  const currentPeriodKey = periodKey(definition.period, now);
  const monday = mondayOf(now);
  const weekEnd = new Date(monday);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const progress = ledger.events.filter((event) => {
    if (event.type !== definition.type) return false;
    const eventDate = new Date(event.at);
    if (definition.period === "daily") return localDateKey(eventDate) === currentPeriodKey;
    return eventDate >= monday && eventDate < weekEnd;
  }).length;
  const claimKey = `${definition.id}:${currentPeriodKey}`;
  return {
    ...definition,
    progress,
    complete: progress >= definition.goal,
    claimed: ledger.claimed.includes(claimKey),
    claimKey,
  };
}

export function getQuestSnapshot(ledger: QuestLedger, now = new Date()): QuestSnapshot {
  const level = Math.floor(ledger.xp / XP_PER_LEVEL) + 1;
  const xpInLevel = ledger.xp % XP_PER_LEVEL;
  return {
    xp: ledger.xp,
    level,
    xpInLevel,
    xpToNextLevel: XP_PER_LEVEL - xpInLevel,
    levelProgress: (xpInLevel / XP_PER_LEVEL) * 100,
    daily: QUESTS.filter((quest) => quest.period === "daily").map((quest) =>
      questProgress(quest, ledger, now),
    ),
    weekly: QUESTS.filter((quest) => quest.period === "weekly").map((quest) =>
      questProgress(quest, ledger, now),
    ),
  };
}

function pruneEvents(ledger: QuestLedger, now: Date): QuestLedger {
  const cutoff = now.getTime() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const events = ledger.events
    .filter((event) => new Date(event.at).getTime() >= cutoff)
    .slice(-MAX_EVENTS);
  return events.length === ledger.events.length ? ledger : { ...ledger, events };
}

function awardCompletedQuests(ledger: QuestLedger, now: Date): QuestLedger {
  const snapshot = getQuestSnapshot(ledger, now);
  const completed = [...snapshot.daily, ...snapshot.weekly].filter(
    (quest) => quest.complete && !quest.claimed,
  );
  if (!completed.length) return ledger;
  return {
    ...ledger,
    xp: ledger.xp + completed.reduce((sum, quest) => sum + quest.reward, 0),
    claimed: [...ledger.claimed, ...completed.map((quest) => quest.claimKey)],
  };
}

function dispatchQuestChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUESTS_CHANGED_EVENT));
}

export function syncQuestRewards(
  now = new Date(),
  storage: StorageLike | null = browserStorage(),
): QuestLedger {
  const original = readQuestLedger(storage);
  const pruned = pruneEvents(original, now);
  const awarded = awardCompletedQuests(pruned, now);
  if (awarded !== original) writeQuestLedger(awarded, storage);
  return awarded;
}

export function recordQuestActivity(
  type: QuestEventType,
  now = new Date(),
  storage: StorageLike | null = browserStorage(),
): QuestLedger {
  if (!storage) return emptyLedger();
  const current = readQuestLedger(storage);
  const at = now.toISOString();
  const event: QuestEvent = {
    id: `${type}-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    at,
  };
  const next = awardCompletedQuests(
    pruneEvents({ ...current, events: [...current.events, event] }, now),
    now,
  );
  writeQuestLedger(next, storage);
  dispatchQuestChange();
  return next;
}

export function getQuestLevel(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

export function canSelectTheme(theme: Theme, xp: number): boolean {
  if (theme === "oro") return getQuestLevel(xp) >= 5;
  if (theme === "diamante") return getQuestLevel(xp) >= 10;
  return true;
}

export function useQuestProgress(now: Date): QuestSnapshot {
  const [snapshot, setSnapshot] = useState(() =>
    getQuestSnapshot({ events: [], claimed: [], xp: 0 }, now),
  );
  useEffect(() => {
    const refresh = () => setSnapshot(getQuestSnapshot(syncQuestRewards(now), now));
    refresh();
    window.addEventListener(QUESTS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(QUESTS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [now]);
  return snapshot;
}
