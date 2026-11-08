import { describe, expect, it } from "vitest";
import { getRandomCompleteThemeIntent } from "@/lib/voto/assistant-theme-actions";

describe("assistant random complete theme action", () => {
  it("selects a complete preset locally and excludes the currently active theme", () => {
    expect(getRandomCompleteThemeIntent("Scegli temi completi casuali", "oro", () => 0)).toEqual({
      kind: "confirm",
      action: {
        theme: "diamante",
        label: "Diamante",
        expectedTheme: "oro",
      },
    });
  });

  it("includes Sangue among the complete presets", () => {
    expect(getRandomCompleteThemeIntent("Tema a caso", "oro", () => 0.05)).toMatchObject({
      action: { theme: "sangue", label: "Sangue" },
    });
  });

  it("selects from the end of the complete preset list when randomness is near one", () => {
    expect(getRandomCompleteThemeIntent("Tema a caso", "original", () => 0.999999)).toMatchObject({
      kind: "confirm",
      action: { theme: "inverno", label: "Inverno", expectedTheme: "original" },
    });
  });

  it("does not turn a question about the current theme into a change", () => {
    expect(getRandomCompleteThemeIntent("Che tema sto usando?", "original", () => 0)).toBeNull();
  });
});
