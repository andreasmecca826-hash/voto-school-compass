import { describe, expect, it } from "vitest";
import { DEFAULT_HOME_MODULES } from "@/lib/voto/home-customization";
import { parsePreferencesBackup, createPreferencesBackup } from "@/lib/voto/preferences-backup";
import { DEFAULT_CUSTOM_THEME } from "@/lib/voto/store";

const preferences = {
  target: 8.5,
  accent: "oro" as const,
  bg: "bosco" as const,
  mode: "chiaro" as const,
  glass: false,
  density: "compact" as const,
  reduceMotion: true,
  theme: "diamante" as const,
  customTheme: { ...DEFAULT_CUSTOM_THEME, primary: "#abcdef", radius: 1.2 },
  interfaceScale: 110,
  homeModules: DEFAULT_HOME_MODULES.map((module, index) => ({
    ...module,
    enabled: index !== 2,
    scale: index === 0 ? 115 : 100,
  })),
  homeScale: 90,
};

describe("preferences backup", () => {
  it("round-trips UI, theme and Home settings without unrelated app data", () => {
    const contents = createPreferencesBackup(preferences);
    const parsed = parsePreferencesBackup(contents);
    expect(parsed).toEqual(preferences);
    expect(contents).not.toContain("subjects");
    expect(contents).not.toContain("url");
  });

  it("rejects malformed JSON, another file type and unsafe custom colors", () => {
    expect(() => parsePreferencesBackup("not json")).toThrow("JSON valido");
    expect(() => parsePreferencesBackup(JSON.stringify({ app: "VOTO" }))).toThrow(
      "backup compatibile",
    );
    const invalid = JSON.parse(createPreferencesBackup(preferences)) as {
      settings: { customTheme: { primary: string } };
    };
    invalid.settings.customTheme.primary = "red; background: url(x)";
    expect(() => parsePreferencesBackup(JSON.stringify(invalid))).toThrow("colore");
  });

  it("normalizes out-of-range scales and media targets", () => {
    const file = JSON.parse(
      createPreferencesBackup({ ...preferences, target: 12, homeScale: 200 }),
    ) as {
      settings: { target: number; homeScale: number };
    };
    expect(file.settings.target).toBe(10);
    expect(file.settings.homeScale).toBe(120);
  });
});
