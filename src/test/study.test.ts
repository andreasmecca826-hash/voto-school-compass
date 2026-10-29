import { describe, expect, it } from "vitest";
import { parseFlashcards, wheelIndex } from "../lib/voto/study";

describe("Studio Lab", () => {
  it("draws only an available wheel option", () => {
    expect(wheelIndex(0, 0.2)).toBeNull();
    expect(wheelIndex(3, 0)).toBe(0);
    expect(wheelIndex(3, 0.999)).toBe(2);
  });

  it("imports usable question-answer flashcards", () => {
    expect(
      parseFlashcards('[{"question":"2+2?","answer":"4","subject":"Matematica"}]')[0]?.answer,
    ).toBe("4");
    expect(() => parseFlashcards('[{"question":"2+2?"}]')).toThrow();
  });
});
