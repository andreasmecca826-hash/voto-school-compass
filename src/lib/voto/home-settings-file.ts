import {
  DEFAULT_HOME_MODULES,
  normalizeHomeModules,
  normalizeHomeScale,
  type HomeModuleConfig,
} from "./home-customization";

export const HOME_SETTINGS_FILE_TYPE = "voto-home-customization";
export const HOME_SETTINGS_FILE_VERSION = 1;

export type HomeCustomizationSettings = {
  homeScale: number;
  homeModules: HomeModuleConfig[];
};

type HomeSettingsFile = {
  app: "VOTO";
  type: typeof HOME_SETTINGS_FILE_TYPE;
  version: typeof HOME_SETTINGS_FILE_VERSION;
  exportedAt: string;
  settings: HomeCustomizationSettings;
};

export function createHomeSettingsFile(settings: HomeCustomizationSettings): string {
  const file: HomeSettingsFile = {
    app: "VOTO",
    type: HOME_SETTINGS_FILE_TYPE,
    version: HOME_SETTINGS_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      homeScale: normalizeHomeScale(settings.homeScale),
      homeModules: normalizeHomeModules(settings.homeModules),
    },
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

export function parseHomeSettingsFile(text: string): HomeCustomizationSettings {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Il file non contiene JSON valido.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Formato file non riconosciuto.");
  }
  const file = parsed as Record<string, unknown>;
  if (
    file["app"] !== "VOTO" ||
    file["type"] !== HOME_SETTINGS_FILE_TYPE ||
    file["version"] !== HOME_SETTINGS_FILE_VERSION
  ) {
    throw new Error(
      "Questo file non è un’esportazione compatibile delle impostazioni Home di VOTO.",
    );
  }
  if (
    typeof file["settings"] !== "object" ||
    file["settings"] === null ||
    Array.isArray(file["settings"])
  ) {
    throw new Error("Nel file manca la sezione delle impostazioni.");
  }

  const settings = file["settings"] as Record<string, unknown>;
  if (
    typeof settings["homeScale"] !== "number" ||
    !Number.isFinite(settings["homeScale"]) ||
    !Array.isArray(settings["homeModules"])
  ) {
    throw new Error("Le impostazioni Home nel file sono incomplete o non valide.");
  }

  const allowedIds = new Set(DEFAULT_HOME_MODULES.map((module) => module.id));
  const seen = new Set<string>();
  for (const item of settings["homeModules"]) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error("Uno dei moduli Home nel file non è valido.");
    }
    const module = item as Record<string, unknown>;
    if (
      typeof module["id"] !== "string" ||
      !allowedIds.has(module["id"] as HomeModuleConfig["id"]) ||
      seen.has(module["id"]) ||
      typeof module["enabled"] !== "boolean" ||
      typeof module["scale"] !== "number" ||
      !Number.isFinite(module["scale"])
    ) {
      throw new Error("Il file contiene una configurazione di modulo Home non valida.");
    }
    seen.add(module["id"] as string);
  }

  return {
    homeScale: normalizeHomeScale(settings["homeScale"]),
    homeModules: normalizeHomeModules(settings["homeModules"]),
  };
}
