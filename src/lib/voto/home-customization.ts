export type HomeModuleId =
  | "media"
  | "simulatore"
  | "presenze"
  | "compiti"
  | "interrogazioni"
  | "note"
  | "promemoria"
  | "bacheca"
  | "obiettivo";

export type HomeModuleConfig = { id: HomeModuleId; enabled: boolean; scale: number };

export const DEFAULT_HOME_MODULES: HomeModuleConfig[] = [
  { id: "media", enabled: true, scale: 100 },
  { id: "simulatore", enabled: true, scale: 100 },
  { id: "presenze", enabled: true, scale: 100 },
  { id: "compiti", enabled: true, scale: 100 },
  { id: "interrogazioni", enabled: true, scale: 100 },
  { id: "note", enabled: true, scale: 100 },
  { id: "promemoria", enabled: true, scale: 100 },
  { id: "bacheca", enabled: true, scale: 100 },
  { id: "obiettivo", enabled: true, scale: 100 },
];

export function normalizeHomeScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 100;
  const bounded = Math.min(120, Math.max(80, value));
  return Math.round(bounded / 5) * 5;
}

export function normalizeHomeModules(value: unknown): HomeModuleConfig[] {
  if (!Array.isArray(value)) return DEFAULT_HOME_MODULES;
  const ids = new Set<HomeModuleId>();
  const result: HomeModuleConfig[] = [];

  value.forEach((item) => {
    const config =
      typeof item === "object" && item !== null ? (item as Partial<HomeModuleConfig>) : null;
    const id = typeof item === "string" ? item : config?.id;
    if (
      typeof id === "string" &&
      DEFAULT_HOME_MODULES.some((module) => module.id === id) &&
      !ids.has(id as HomeModuleId)
    ) {
      ids.add(id as HomeModuleId);
      result.push({
        id: id as HomeModuleId,
        enabled: config?.enabled !== false,
        scale: normalizeHomeScale(config?.scale),
      });
    }
  });

  DEFAULT_HOME_MODULES.forEach((module) => {
    if (!ids.has(module.id)) result.push(module);
  });
  return result;
}
