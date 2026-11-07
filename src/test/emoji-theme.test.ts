import { describe, expect, it } from "vitest";
import {
  createEmojiThemePattern,
  DEFAULT_EMOJI_THEME_BACKGROUND_COLORS,
  MAX_EMOJI_THEME_EMOJIS,
  normalizeEmojiThemeBackgroundColors,
  normalizeEmojiThemeEmojis,
} from "@/lib/voto/emoji-theme";

describe("emoji theme", () => {
  it("estrae emoji distinte, ignora il testo e limita la selezione", () => {
    const selected = normalizeEmojiThemeEmojis("Ciao 📚 ✏️ 🎒 🌟 🎨 🎵 🌈 🐱 🍀 ❤️ 🌙");

    expect(selected).toEqual(["📚", "✏️", "🎒", "🌟", "🎨", "🎵", "🌈", "🐱"]);
    expect(selected).toHaveLength(MAX_EMOJI_THEME_EMOJIS);
  });

  it("mantiene emoji composte e scarta duplicati o valori non testuali", () => {
    expect(normalizeEmojiThemeEmojis(["👨‍👩‍👧‍👦", "👨‍👩‍👧‍👦", 42, "🇮🇹"])).toEqual(["👨‍👩‍👧‍👦", "🇮🇹"]);
  });

  it("genera un pattern SVG ripetibile o nessuno sfondo se non ci sono emoji", () => {
    const pattern = createEmojiThemePattern(["📚", "✨"]);

    expect(pattern).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(pattern).toContain(encodeURIComponent("📚"));
    expect(createEmojiThemePattern([])).toBe("none");
  });

  it("normalizza i colori di sfondo Emoji e usa il fallback per valori non sicuri", () => {
    expect(normalizeEmojiThemeBackgroundColors({ scuro: "#AABBCC", chiaro: "#123456" })).toEqual({
      scuro: "#aabbcc",
      chiaro: "#123456",
    });
    expect(normalizeEmojiThemeBackgroundColors({ scuro: "url(unsafe)" })).toEqual({
      ...DEFAULT_EMOJI_THEME_BACKGROUND_COLORS,
    });
  });
});
