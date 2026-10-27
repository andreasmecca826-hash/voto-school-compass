export type PomodoroMode = "focus" | "short" | "long";
export const POMODORO_SECONDS: Record<PomodoroMode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
export function nextPomodoro(mode: PomodoroMode, completed: number): { mode: PomodoroMode; completed: number } {
  if (mode !== "focus") return { mode: "focus", completed };
  const count = completed + 1;
  return { mode: count % 4 === 0 ? "long" : "short", completed: count };
}
export function wheelIndex(length: number, random: number): number | null {
  return length > 0 ? Math.min(length - 1, Math.floor(Math.max(0, random) * length)) : null;
}
export interface Flashcard { id: string; question: string; answer: string; subject: string }
export function parseFlashcards(text: string): Flashcard[] {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data) || data.length > 1000) throw new Error("File flashcard non valido (massimo 1000 carte).");
  return data.map((item: unknown, index) => {
    if (!item || typeof item !== "object") throw new Error("Carta non valida.");
    const card = item as Record<string, unknown>;
    if (typeof card["question"] !== "string" || !card["question"].trim() || typeof card["answer"] !== "string" || !card["answer"].trim()) throw new Error("Ogni carta deve contenere domanda e risposta.");
    return { id: String(index), question: card["question"].slice(0, 2000), answer: card["answer"].slice(0, 4000), subject: typeof card["subject"] === "string" ? card["subject"].slice(0, 100) : "" };
  });
}