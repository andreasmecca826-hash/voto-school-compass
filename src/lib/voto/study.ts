export function wheelIndex(length: number, random: number): number | null {
  return length > 0 ? Math.min(length - 1, Math.floor(Math.max(0, random) * length)) : null;
}

export const DEFAULT_WHEEL_COLORS: [string, string] = ["#FDBA74", "#6EE7B7"];

export interface WheelSettings {
  subjects: string[];
  colors: [string, string];
  subjectColors: Record<string, string>;
}

export function isWheelColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeWheelSettings(
  value: unknown,
  fallbackSubjects: string[] = [],
): WheelSettings {
  const settings = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawSubjects = Array.isArray(settings["subjects"]) ? settings["subjects"] : fallbackSubjects;
  const subjects: string[] = [];
  const seen = new Set<string>();

  for (const value of rawSubjects) {
    if (typeof value !== "string") continue;
    const subject = value.trim().replace(/\s+/g, " ").slice(0, 40).trim();
    const key = subject.toLocaleLowerCase();
    if (!subject || seen.has(key)) continue;
    seen.add(key);
    subjects.push(subject);
    if (subjects.length === 50) break;
  }

  const rawColors = Array.isArray(settings["colors"]) ? settings["colors"] : [];
  const rawSubjectColors = settings["subjectColors"];
  const subjectColors: Record<string, string> = {};
  if (
    rawSubjectColors &&
    typeof rawSubjectColors === "object" &&
    !Array.isArray(rawSubjectColors)
  ) {
    for (const [subject, color] of Object.entries(rawSubjectColors)) {
      if (subjects.includes(subject) && isWheelColor(color)) subjectColors[subject] = color;
    }
  }
  return {
    subjects,
    colors: [
      isWheelColor(rawColors[0]) ? rawColors[0] : DEFAULT_WHEEL_COLORS[0],
      isWheelColor(rawColors[1]) ? rawColors[1] : DEFAULT_WHEEL_COLORS[1],
    ],
    subjectColors,
  };
}

export function wheelTextColor(hex: string): "#171717" | "#FFFFFF" {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map(
    (index) => Number.parseInt(value.slice(index, index + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  const luminance = 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
  const darkContrast = (luminance + 0.05) / 0.05;
  const lightContrast = 1.05 / (luminance + 0.05);
  return darkContrast >= lightContrast ? "#171717" : "#FFFFFF";
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  subject: string;
}

export function parseFlashcards(text: string): Flashcard[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data) || data.length > 1000) {
    throw new Error("File flashcard non valido (massimo 1000 carte).");
  }
  return data.map((item: unknown, index) => {
    if (!item || typeof item !== "object") throw new Error("Carta non valida.");
    const card = item as Record<string, unknown>;
    if (
      typeof card["question"] !== "string" ||
      !card["question"].trim() ||
      typeof card["answer"] !== "string" ||
      !card["answer"].trim()
    ) {
      throw new Error("Ogni carta deve contenere domanda e risposta.");
    }
    return {
      id: String(index),
      question: card["question"].slice(0, 2000),
      answer: card["answer"].slice(0, 4000),
      subject: typeof card["subject"] === "string" ? card["subject"].slice(0, 100) : "",
    };
  });
}
