import { describe, expect, it } from "vitest";
import { nextPomodoro, POMODORO_SECONDS, parseFlashcards, wheelIndex } from "../lib/voto/study";
describe("Studio Lab", () => {
  it("offers a working Pomodoro cycle", () => {
    expect(POMODORO_SECONDS).toEqual({ focus: 1500, short: 300, long: 900 });
    expect(nextPomodoro("focus", 0)).toEqual({ mode: "short", completed: 1 });
    expect(nextPomodoro("focus", 3)).toEqual({ mode: "long", completed: 4 });
    expect(nextPomodoro("long", 4)).toEqual({ mode: "focus", completed: 4 });
  });
  it("draws only an available wheel option", () => {
    expect(wheelIndex(0, 0.2)).toBeNull();
    expect(wheelIndex(3, 0)).toBe(0);
    expect(wheelIndex(3, 0.999)).toBe(2);
  });
  it("imports usable question-answer flashcards", () => {
    expect(parseFlashcards('[{"question":"2+2?","answer":"4","subject":"Matematica"}]')[0]?.answer).toBe("4");
    expect(() => parseFlashcards('[{"question":"2+2?"}]')).toThrow();
  });
});