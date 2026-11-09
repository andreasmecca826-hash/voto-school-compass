import { describe, expect, it } from "vitest";
import {
  DEFAULT_WHEEL_COLORS,
  isWheelColor,
  normalizeWheelSettings,
  parseFlashcards,
  wheelIndex,
  wheelTextColor,
} from "../lib/voto/study";

describe("Studio Lab", () => {
  it("draws only an available wheel option", () => {
    expect(wheelIndex(0, 0.2)).toBeNull();
    expect(wheelIndex(3, 0)).toBe(0);
    expect(wheelIndex(3, 0.999)).toBe(2);
  });

  it("normalizes saved wheel subjects and falls back from invalid colors", () => {
    expect(
      normalizeWheelSettings(
        {
          subjects: ["Matematica", " matematica ", "Storia"],
          colors: ["rosso", "#12AB34"],
          subjectColors: { Matematica: "#FF0000", Geografia: "#ABCDEF", Storia: "no" },
        },
        ["Inglese"],
      ),
    ).toEqual({
      subjects: ["Matematica", "Storia"],
      colors: [DEFAULT_WHEEL_COLORS[0], "#12AB34"],
      subjectColors: { Matematica: "#FF0000" },
    });
  });

  it("validates wheel colors and selects readable label contrast", () => {
    expect(isWheelColor("#12abEF")).toBe(true);
    expect(isWheelColor("red")).toBe(false);
    expect(wheelTextColor("#FFFFFF")).toBe("#171717");
    expect(wheelTextColor("#000000")).toBe("#FFFFFF");
  });

  it("imports usable question-answer flashcards", () => {
    expect(
      parseFlashcards('[{"question":"2+2?","answer":"4","subject":"Matematica"}]')[0]?.answer,
    ).toBe("4");
    expect(() => parseFlashcards('[{"question":"2+2?"}]')).toThrow();
  });
});
