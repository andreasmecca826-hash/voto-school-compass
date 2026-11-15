export type HomeModuleId =
  | "media"
  | "simulatore"
  | "presenze"
  | "compiti"
  | "interrogazioni"
  | "note"
  | "promemoria"
  | "bacheca"
  | "obiettivo"
  | "prossima-lezione"
  | "domani-a-scuola"
  | "ultimi-voti";

export type HomeModuleConfig = {
  id: HomeModuleId;
  enabled: boolean;
  scale: number;
  limit?: number;
};

export const HOME_LIMIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DEFAULT_HOME_LIMITS: Partial<Record<HomeModuleId, number>> = {
  "ultimi-voti": 5,
  interrogazioni: 3,
  note: 3,
  promemoria: 3,
  bacheca: 5,
};

export function defaultHomeModuleLimit(id: HomeModuleId): number | undefined {
  return DEFAULT_HOME_LIMITS[id];
}

export function normalizeHomeLimit(value: unknown, fallback = 5): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(10, Math.max(1, Math.round(value)));
}

export const DEFAULT_HOME_MODULES: HomeModuleConfig[] = [
  { id: "media", enabled: true, scale: 100 },
  { id: "presenze", enabled: true, scale: 100 },
  { id: "ultimi-voti", enabled: true, scale: 100, limit: 5 },
  { id: "compiti", enabled: true, scale: 100 },
  { id: "interrogazioni", enabled: true, scale: 100, limit: 3 },
  { id: "note", enabled: true, scale: 100, limit: 3 },
  { id: "promemoria", enabled: true, scale: 100, limit: 3 },
  { id: "bacheca", enabled: true, scale: 100, limit: 5 },
];

export function normalizeHomeScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 100;
  const bounded = Math.min(100, Math.max(80, value));
  return Math.round(bounded / 5) * 5;
}

export function resolveHomeModuleScale(globalScale: number, moduleScale: number): number {
  return Math.min(100, Math.max(80, (globalScale * moduleScale) / 100));
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
        ...(defaultHomeModuleLimit(id as HomeModuleId) !== undefined
          ? {
              limit: normalizeHomeLimit(config?.limit, defaultHomeModuleLimit(id as HomeModuleId)),
            }
          : {}),
      });
    }
  });

  DEFAULT_HOME_MODULES.forEach((module) => {
    if (!ids.has(module.id)) result.push(module);
  });
  return result;
}
