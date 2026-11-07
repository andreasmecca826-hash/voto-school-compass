export const KEYS = {
  url: "voto.url",
  displayName: "voto.displayName",
  cache: "voto.cache",
  demoData: "voto.demoData",
  demoMode: "voto.demoMode",
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
  performanceMode: "voto.performanceMode",
  theme: "voto.theme",
  registryStyle: "voto.registryStyle",
  customTheme: "voto.customTheme",
  emojiThemeEmojis: "voto.emojiThemeEmojis",
  emojiThemeBackgroundColors: "voto.emojiThemeBackgroundColors",
  homeModules: "voto.homeModules",
  homeScale: "voto.homeScale",
  homeAverageHidden: "voto.homeAverageHidden",
  interfaceScale: "voto.interfaceScale",
  interrogazioni: "voto.interrogazioni",
  infraperiodalReports: "voto.infraperiodalReports",
  schoolEndDate: "voto.schoolEndDate",
  absenceHoursPerDay: "voto.absenceHoursPerDay",
  schoolClosures: "voto.schoolClosures",
  schoolExcludeWeekends: "voto.schoolExcludeWeekends",
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
