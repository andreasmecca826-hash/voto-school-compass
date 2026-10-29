import {
  DEFAULT_HOME_MODULES,
  normalizeHomeModules,
  normalizeHomeScale,
  type HomeModuleConfig,
} from "./home-customization";
import type { Accent, Bg, CustomTheme, Density, Mode, Theme } from "./store";

export const PREFERENCES_BACKUP_TYPE = "voto-preferences";
export const PREFERENCES_BACKUP_VERSION = 1;

export type PreferencesBackupSettings = {
  target: number;
  accent: Accent;
  bg: Bg;
  mode: Mode;
  glass: boolean;
  density: Density;
  reduceMotion: boolean;
  theme: Theme;
  customTheme: CustomTheme;
  interfaceScale: number;
  homeModules: HomeModuleConfig[];
  homeScale: number;
};

type PreferencesBackupFile = {
  app: "VOTO";
  type: typeof PREFERENCES_BACKUP_TYPE;
  version: typeof PREFERENCES_BACKUP_VERSION;
  exportedAt: string;
  settings: PreferencesBackupSettings;
};

const ACCENTS: Accent[] = [
  "rosso",
  "ambra",
  "viola",
  "blu",
  "verde",
  "azzurro",
  "rosa",
  "arancio",
  "turchese",
  "indaco",
  "lime",
  "oro",
  "corallo",
  "menta",
  "mono",
];
const BACKGROUNDS: Bg[] = [
  "nero",
  "carbone",
  "grafite",
  "chiaro",
  "rosso",
  "oceano",
  "notteblu",
  "bosco",
  "prugna",
  "carta",
];
const THEMES: Theme[] = [
  "original",
  "lavender",
  "cybercore",
  "brutalist",
  "retro-os",
  "dark-academia",
  "glassmorphism",
  "y2k",
  "primavera",
  "estate",
  "autunno",
  "inverno",
  "tramonto",
  "oro",
  "diamante",
  "custom",
];
const FONTS: CustomTheme["font"][] = ["theme", "sans", "display", "mono", "serif"];
const CUSTOM_THEME_COLOR_KEYS = [
  "bgDark",
  "cardDark",
  "surfaceDark",
  "fgDark",
  "mutedDark",
  "bgLight",
  "cardLight",
  "surfaceLight",
  "fgLight",
  "mutedLight",
  "primary",
] as const;

function objectValue(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

export function createPreferencesBackup(settings: PreferencesBackupSettings): string {
  const file: PreferencesBackupFile = {
    app: "VOTO",
    type: PREFERENCES_BACKUP_TYPE,
    version: PREFERENCES_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      ...settings,
      target: Math.min(10, Math.max(6, settings.target)),
      interfaceScale: Math.min(120, Math.max(80, settings.interfaceScale)),
      homeScale: normalizeHomeScale(settings.homeScale),
      homeModules: normalizeHomeModules(settings.homeModules),
      customTheme: { ...settings.customTheme },
    },
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parsePreferencesBackup(text: string): PreferencesBackupSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Il file non contiene JSON valido.");
  }
  const file = objectValue(parsed);
  if (
    file?.["app"] !== "VOTO" ||
    file["type"] !== PREFERENCES_BACKUP_TYPE ||
    file["version"] !== PREFERENCES_BACKUP_VERSION
  ) {
    throw new Error("Il file non è un backup compatibile delle preferenze VOTO.");
  }
  const settings = objectValue(file["settings"]);
  if (!settings) throw new Error("Nel file manca la sezione delle preferenze.");

  if (
    typeof settings["target"] !== "number" ||
    !Number.isFinite(settings["target"]) ||
    !isOneOf(settings["accent"], ACCENTS) ||
    !isOneOf(settings["bg"], BACKGROUNDS) ||
    !isOneOf(settings["mode"], ["chiaro", "scuro"] as const) ||
    typeof settings["glass"] !== "boolean" ||
    !isOneOf(settings["density"], ["standard", "compact"] as const) ||
    typeof settings["reduceMotion"] !== "boolean" ||
    !isOneOf(settings["theme"], THEMES) ||
    typeof settings["interfaceScale"] !== "number" ||
    !Number.isFinite(settings["interfaceScale"]) ||
    typeof settings["homeScale"] !== "number" ||
    !Number.isFinite(settings["homeScale"]) ||
    !Array.isArray(settings["homeModules"])
  ) {
    throw new Error("Il file contiene una o più preferenze mancanti o non valide.");
  }

  const customTheme = objectValue(settings["customTheme"]);
  if (!customTheme) throw new Error("Il tema personalizzato nel file non è valido.");
  for (const key of CUSTOM_THEME_COLOR_KEYS) {
    if (
      typeof customTheme[key] !== "string" ||
      !/^#[\da-f]{6}$/i.test(customTheme[key] as string)
    ) {
      throw new Error("Il file contiene un colore del tema personalizzato non valido.");
    }
  }
  if (
    typeof customTheme["radius"] !== "number" ||
    !Number.isFinite(customTheme["radius"]) ||
    !isOneOf(customTheme["font"], FONTS)
  ) {
    throw new Error("Il raggio o il font del tema personalizzato non sono validi.");
  }

  try {
    const homeModules = normalizeHomeModules(settings["homeModules"]);
    if (!homeModules.length || homeModules.length !== DEFAULT_HOME_MODULES.length) {
      throw new Error("L’elenco dei moduli Home è incompleto.");
    }
    return {
      target: Math.min(10, Math.max(6, settings["target"])),
      accent: settings["accent"],
      bg: settings["bg"],
      mode: settings["mode"],
      glass: settings["glass"],
      density: settings["density"],
      reduceMotion: settings["reduceMotion"],
      theme: settings["theme"],
      interfaceScale: Math.round(Math.min(120, Math.max(80, settings["interfaceScale"])) / 5) * 5,
      homeScale: normalizeHomeScale(settings["homeScale"]),
      homeModules,
      customTheme: {
        bgDark: customTheme["bgDark"] as string,
        cardDark: customTheme["cardDark"] as string,
        surfaceDark: customTheme["surfaceDark"] as string,
        fgDark: customTheme["fgDark"] as string,
        mutedDark: customTheme["mutedDark"] as string,
        bgLight: customTheme["bgLight"] as string,
        cardLight: customTheme["cardLight"] as string,
        surfaceLight: customTheme["surfaceLight"] as string,
        fgLight: customTheme["fgLight"] as string,
        mutedLight: customTheme["mutedLight"] as string,
        primary: customTheme["primary"] as string,
        radius: Math.min(1.5, Math.max(0.5, customTheme["radius"])),
        font: customTheme["font"],
      },
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Le impostazioni Home non sono valide.",
    );
  }
}
