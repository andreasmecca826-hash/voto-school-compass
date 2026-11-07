import type { Theme } from "./store";

export type RandomThemeConfirmation = {
  theme: Theme;
  label: string;
  expectedTheme: Theme;
};

export type RandomThemeActionIntent = { kind: "confirm"; action: RandomThemeConfirmation } | null;

const COMPLETE_THEME_OPTIONS = [
  { theme: "oro", label: "Oro" },
  { theme: "diamante", label: "Diamante" },
  { theme: "tramonto", label: "Tramonto" },
  { theme: "lavender", label: "Lavender" },
  { theme: "cybercore", label: "Cybercore" },
  { theme: "brutalist", label: "Brutalist" },
  { theme: "retro-os", label: "Retro OS" },
  { theme: "windows-98", label: "Windows 98" },
  { theme: "windows-7", label: "Windows 7" },
  { theme: "dark-academia", label: "Dark Academia" },
  { theme: "glassmorphism", label: "Glassmorphism" },
  { theme: "casino", label: "Casinò" },
  { theme: "calcio", label: "Calcio" },
  { theme: "terminale", label: "Terminale" },
  { theme: "pixel-arcade", label: "Pixel Arcade" },
  { theme: "y2k", label: "Y2K" },
  { theme: "primavera", label: "Primavera" },
  { theme: "estate", label: "Estate" },
  { theme: "autunno", label: "Autunno" },
  { theme: "inverno", label: "Inverno" },
] as const satisfies readonly { theme: Theme; label: string }[];

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function getRandomCompleteThemeIntent(
  query: string,
  currentTheme: Theme,
  random: () => number = Math.random,
): RandomThemeActionIntent {
  const normalized = normalize(query.trim());
  const requestsRandomTheme =
    (normalized.includes("tema") || normalized.includes("temi")) &&
    ["casuale", "casuali", "a caso", "random"].some((term) => normalized.includes(term));
  if (!requestsRandomTheme) return null;

  const candidates = COMPLETE_THEME_OPTIONS.filter((option) => option.theme !== currentTheme);
  if (!candidates.length) return null;

  const sample = random();
  const boundedSample = Number.isFinite(sample)
    ? Math.min(Math.max(sample, 0), 1 - Number.EPSILON)
    : 0;
  const selected = candidates[Math.floor(boundedSample * candidates.length)] ?? candidates[0]!;

  return {
    kind: "confirm",
    action: {
      theme: selected.theme,
      label: selected.label,
      expectedTheme: currentTheme,
    },
  };
}
