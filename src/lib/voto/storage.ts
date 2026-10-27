export const KEYS = {
  url: "voto.url",
  cache: "voto.cache",
  demoData: "voto.demoData",
  lastSync: "voto.lastSync",
  completions: "voto.completions",
  read: "voto.read",
  target: "voto.target",
  accent: "voto.accent",
  bg: "voto.bg",
  mode: "voto.mode",
  glass: "voto.glass",
  density: "voto.density",
  reduceMotion: "voto.reduceMotion",
  theme: "voto.theme",
  customTheme: "voto.customTheme",
  homeModules: "voto.homeModules",
  homeScale: "voto.homeScale",
  interrogazioni: "voto.interrogazioni",
} as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage pieno o non disponibile */
  }
}
