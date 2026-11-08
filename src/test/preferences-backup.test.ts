import { describe, expect, it } from "vitest";
import { DEFAULT_HOME_MODULES } from "@/lib/voto/home-customization";
import { parsePreferencesBackup, createPreferencesBackup } from "@/lib/voto/preferences-backup";
import { DEFAULT_EMOJI_THEME_BACKGROUND_COLORS } from "@/lib/voto/emoji-theme";
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
  emojiThemeEmojis: ["📚", "✏️", "🎒", "✨"],
  emojiThemeBackgroundColors: { scuro: "#34253b", chiaro: "#fff1f7" },
  customTheme: {
    ...DEFAULT_CUSTOM_THEME,
    primary: "#abcdef",
    radius: 1.2,
    backgroundImage: "data:image/webp;base64,AAAA",
  },
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

  it.each([
    "emoji",
    "sangue",
    "windows-98",
    "windows-7",
    "casino",
    "calcio",
    "terminale",
    "pixel-arcade",
  ] as const)("round-trips il tema %s", (theme) => {
    const parsed = parsePreferencesBackup(createPreferencesBackup({ ...preferences, theme }));
    expect(parsed.theme).toBe(theme);
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

  it("accepts old backups without an image and rejects unsafe background URLs", () => {
    const legacy = JSON.parse(createPreferencesBackup(preferences)) as {
      settings: {
        customTheme: { backgroundImage?: string };
        emojiThemeEmojis?: string[];
        emojiThemeBackgroundColors?: { scuro: string; chiaro: string };
      };
    };
    delete legacy.settings.customTheme.backgroundImage;
    delete legacy.settings.emojiThemeEmojis;
    delete legacy.settings.emojiThemeBackgroundColors;
    const parsed = parsePreferencesBackup(JSON.stringify(legacy));
    expect(parsed.customTheme.backgroundImage).toBe("");
    expect(parsed.emojiThemeEmojis).toEqual(["📚", "✏️", "🎒", "✨"]);
    expect(parsed.emojiThemeBackgroundColors).toEqual(DEFAULT_EMOJI_THEME_BACKGROUND_COLORS);

    const invalid = JSON.parse(createPreferencesBackup(preferences)) as {
      settings: { customTheme: { backgroundImage: string } };
    };
    invalid.settings.customTheme.backgroundImage = "data:image/svg+xml;base64,PHN2Zz4=";
    expect(() => parsePreferencesBackup(JSON.stringify(invalid))).toThrow("sfondo");

    const invalidEmojiColor = JSON.parse(createPreferencesBackup(preferences)) as {
      settings: { emojiThemeBackgroundColors: { scuro: string; chiaro: string } };
    };
    invalidEmojiColor.settings.emojiThemeBackgroundColors.scuro = "url(unsafe)";
    expect(() => parsePreferencesBackup(JSON.stringify(invalidEmojiColor))).toThrow("sfondo");
  });

  it("normalizes out-of-range scales and media targets", () => {
    const file = JSON.parse(
      createPreferencesBackup({ ...preferences, target: 12, homeScale: 200, interfaceScale: 200 }),
    ) as {
      settings: { target: number; homeScale: number; interfaceScale: number };
    };
    expect(file.settings.target).toBe(10);
    expect(file.settings.homeScale).toBe(120);
    expect(file.settings.interfaceScale).toBe(140);
    expect(parsePreferencesBackup(JSON.stringify(file)).interfaceScale).toBe(140);
  });
});
