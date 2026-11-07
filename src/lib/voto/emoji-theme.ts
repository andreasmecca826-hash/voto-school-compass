export const DEFAULT_EMOJI_THEME_EMOJIS = ["📚", "✏️", "🎒", "✨"] as const;
export const MAX_EMOJI_THEME_EMOJIS = 8;

export type EmojiThemeBackgroundColors = { scuro: string; chiaro: string };

export const DEFAULT_EMOJI_THEME_BACKGROUND_COLORS: EmojiThemeBackgroundColors = {
  scuro: "#1d192a",
  chiaro: "#fff4e9",
};

const HEX_COLOR = /^#[\da-f]{6}$/i;

export function normalizeEmojiThemeBackgroundColors(value: unknown): EmojiThemeBackgroundColors {
  const colors =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const normalize = (candidate: unknown, fallback: string) =>
    typeof candidate === "string" && HEX_COLOR.test(candidate) ? candidate.toLowerCase() : fallback;

  return {
    scuro: normalize(colors["scuro"], DEFAULT_EMOJI_THEME_BACKGROUND_COLORS.scuro),
    chiaro: normalize(colors["chiaro"], DEFAULT_EMOJI_THEME_BACKGROUND_COLORS.chiaro),
  };
}

const EMOJI_PATTERN =
  /\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\uFE0F|\p{Emoji_Modifier})?)*/gu;

export function normalizeEmojiThemeEmojis(value: unknown): string[] {
  const inputs = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const emojis = new Set<string>();

  for (const input of inputs) {
    if (typeof input !== "string") continue;
    for (const emoji of input.match(EMOJI_PATTERN) ?? []) {
      emojis.add(emoji);
      if (emojis.size >= MAX_EMOJI_THEME_EMOJIS) return [...emojis];
    }
  }

  return [...emojis];
}

export function parseEmojiThemeInput(value: string): string[] {
  return normalizeEmojiThemeEmojis(value);
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function createEmojiThemePattern(value: unknown): string {
  const emojis = normalizeEmojiThemeEmojis(value);
  if (!emojis.length) return "none";

  const positions = [
    [18, 44],
    [132, 82],
    [62, 136],
    [190, 166],
    [158, 34],
    [14, 194],
    [112, 218],
    [224, 112],
  ] as const;
  const glyphs = positions
    .map(([x, y], index) => {
      const emoji = escapeXml(emojis[index % emojis.length] ?? "");
      return `<text x="${x}" y="${y}">${emoji}</text>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><g font-family="system-ui,Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif" font-size="24" opacity="0.2">${glyphs}</g></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
