import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { canResetDemoData, makeDemoData } from "./demo";
import { fetchVotoData } from "./parse";
import { getCircularCheckStatus, requestCircularCheck } from "./circulars";
import { KEYS, load, save } from "./storage";
import type { DataSource, VotoData } from "./types";
import { DEFAULT_PREPARATION, type Interrogazione } from "./interrogazioni";
import {
  DEFAULT_HOME_MODULES,
  normalizeHomeModules,
  normalizeHomeScale,
  type HomeModuleConfig,
  type HomeModuleId,
} from "./home-customization";
export type { HomeModuleConfig, HomeModuleId } from "./home-customization";

export type Accent =
  | "rosso"
  | "ambra"
  | "viola"
  | "blu"
  | "verde"
  | "azzurro"
  | "rosa"
  | "arancio"
  | "turchese"
  | "indaco"
  | "lime"
  | "oro"
  | "corallo"
  | "menta"
  | "mono";
export type Bg =
  | "nero"
  | "carbone"
  | "grafite"
  | "chiaro"
  | "rosso"
  | "oceano"
  | "notteblu"
  | "bosco"
  | "prugna"
  | "carta";
export type Mode = "chiaro" | "scuro";
export type Density = "standard" | "compact";
export type Theme =
  | "original"
  | "lavender"
  | "cybercore"
  | "brutalist"
  | "retro-os"
  | "dark-academia"
  | "glassmorphism"
  | "y2k"
  | "primavera"
  | "estate"
  | "autunno"
  | "inverno"
  | "tramonto"
  | "oro"
  | "diamante"
  | "custom";
export type CustomFont = "theme" | "sans" | "display" | "mono" | "serif";
export type CustomTheme = {
  bgDark: string;
  cardDark: string;
  surfaceDark: string;
  fgDark: string;
  mutedDark: string;
  bgLight: string;
  cardLight: string;
  surfaceLight: string;
  fgLight: string;
  mutedLight: string;
  primary: string;
  radius: number;
  font: CustomFont;
};
export const DEFAULT_CUSTOM_THEME: CustomTheme = {
  bgDark: "#12151c",
  cardDark: "#1d2330",
  surfaceDark: "#273246",
  fgDark: "#f5f7fb",
  mutedDark: "#aeb9cb",
  bgLight: "#eef2f8",
  cardLight: "#ffffff",
  surfaceLight: "#dfe7f2",
  fgLight: "#172033",
  mutedLight: "#5c6a80",
  primary: "#61a7ff",
  radius: 1,
  font: "theme",
};

function normalizeInterfaceScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 100;
  return Math.round(Math.min(120, Math.max(80, value)) / 5) * 5;
}

function normalizeInterrogazioni(value: unknown): Interrogazione[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Interrogazione =>
        !!item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.subject === "string" &&
        typeof item.date === "string",
    )
    .map((item) => ({
      ...item,
      completed: item.completed === true,
      checklist: Array.isArray(item.checklist)
        ? item.checklist
        : DEFAULT_PREPARATION.map((prep) => ({ ...prep })),
    }));
}

interface Ctx {
  ready: boolean;
  data: VotoData;
  source: DataSource;
  url: string;
  lastSync: string | null;
  loading: boolean;
  error: string | null;
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
  interrogazioni: Interrogazione[];
  isDone: (id: string, remote: boolean) => boolean;
  toggleDone: (id: string, remote: boolean) => void;
  isRead: (id: string, remote: boolean) => boolean;
  markRead: (ids: string[]) => void;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  connect: (url: string) => Promise<boolean>;
  disconnect: () => void;
  resetDemo: () => void;
  setDemoData: (data: VotoData) => void;
  setTarget: (n: number) => void;
  setAccent: (a: Accent) => void;
  setBg: (b: Bg) => void;
  setMode: (m: Mode) => void;
  setGlass: (enabled: boolean) => void;
  setDensity: (density: Density) => void;
  setReduceMotion: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  setCustomTheme: (patch: Partial<CustomTheme>) => void;
  setInterfaceScale: (scale: number) => void;
  resetCustomTheme: () => void;
  toggleHomeModule: (id: HomeModuleId) => void;
  moveHomeModule: (id: HomeModuleId, direction: -1 | 1) => void;
  setHomeScale: (scale: number) => void;
  setHomeModuleScale: (id: HomeModuleId, scale: number) => void;
  setHomeCustomization: (settings: { homeScale: number; homeModules: HomeModuleConfig[] }) => void;
  resetHomeModules: () => void;
  addInterrogazione: (item: Omit<Interrogazione, "id" | "completed" | "checklist">) => void;
  toggleInterrogazione: (id: string) => void;
  toggleInterrogazionePrep: (id: string, preparationId: string) => void;
  removeInterrogazione: (id: string) => void;
}

const VotoCtx = createContext<Ctx | null>(null);
const ClockCtx = createContext<Date | null>(null);

const EMPTY: VotoData = {
  student: {},
  subjects: [],
  assignments: [],
  notifications: [],
  diary: [],
  attendance: {
    absenceDays: 0,
    absenceHours: 0,
    delays: 0,
    earlyExits: 0,
    annualHours: 990,
    absenceLimitHours: 264,
  },
};

export function VotoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<VotoData>(EMPTY);
  const [source, setSource] = useState<DataSource>("demo");
  const [url, setUrl] = useState("");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Record<string, boolean>>({});
  const [readIds, setReadIds] = useState<Record<string, boolean>>({});
  const [target, setTargetS] = useState(8);
  const [accent, setAccentS] = useState<Accent>("rosso");
  const [bg, setBgS] = useState<Bg>("nero");
  const [mode, setModeS] = useState<Mode>("scuro");
  const [glass, setGlassS] = useState(true);
  const [density, setDensityS] = useState<Density>("standard");
  const [reduceMotion, setReduceMotionS] = useState(false);
  const [theme, setThemeS] = useState<Theme>("original");
  const [customTheme, setCustomThemeS] = useState<CustomTheme>(DEFAULT_CUSTOM_THEME);
  const [interfaceScale, setInterfaceScaleS] = useState(100);
  const [homeModules, setHomeModulesS] = useState<HomeModuleConfig[]>(DEFAULT_HOME_MODULES);
  const [homeScale, setHomeScaleS] = useState(100);
  const [interrogazioni, setInterrogazioni] = useState<Interrogazione[]>([]);
  const [now, setNow] = useState(() => new Date(0));
  const urlRef = useRef("");

  const refreshImpl = useCallback(async (u: string, silent = false) => {
    if (!u) {
      if (!silent)
        toast("Modalità demo", {
          description: "Collega un URL JSON nelle Impostazioni per dati reali.",
        });
      return false;
    }
    setLoading(true);
    try {
      const d = await fetchVotoData(u);
      const ts = new Date().toISOString();
      setData(d);
      setSource("remote");
      setLastSync(ts);
      setError(null);
      save(KEYS.cache, d);
      save(KEYS.lastSync, ts);
      if (!silent) toast.success("Dati aggiornati");
      return true;
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (!silent) toast.error("Aggiornamento non riuscito", { description: msg });
      return false;
    } finally {
      setLoading(false);
      setNow(new Date());
    }
  }, []);

  useEffect(() => {
    const u = load<string>(KEYS.url, "");
    const cache = load<VotoData | null>(KEYS.cache, null);
    urlRef.current = u;
    setUrl(u);
    setCompletions(load(KEYS.completions, {}));
    setReadIds(load(KEYS.read, {}));
    setTargetS(load(KEYS.target, 8));
    setAccentS(load(KEYS.accent, "rosso"));
    setBgS(load(KEYS.bg, "nero"));
    setModeS(load(KEYS.mode, "scuro"));
    setGlassS(load(KEYS.glass, true));
    const savedDensity = load<Density>(KEYS.density, "standard");
    setDensityS(savedDensity === "compact" ? "compact" : "standard");
    setReduceMotionS(load(KEYS.reduceMotion, false));
    const savedTheme = load<Theme>(KEYS.theme, "original");
    setThemeS(savedTheme);
    const savedCustomTheme = load<Partial<CustomTheme>>(KEYS.customTheme, {});
    setCustomThemeS({
      ...DEFAULT_CUSTOM_THEME,
      ...savedCustomTheme,
      font: savedCustomTheme.font === "sans" ? "theme" : (savedCustomTheme.font ?? "theme"),
    });
    setInterfaceScaleS(normalizeInterfaceScale(load(KEYS.interfaceScale, 100)));
    setHomeModulesS(normalizeHomeModules(load(KEYS.homeModules, DEFAULT_HOME_MODULES)));
    setHomeScaleS(normalizeHomeScale(load(KEYS.homeScale, 100)));
    setInterrogazioni(normalizeInterrogazioni(load(KEYS.interrogazioni, [])));
    setLastSync(load(KEYS.lastSync, null));
    const demoData = load<VotoData | null>(KEYS.demoData, null);
    if (u && cache && Array.isArray(cache.subjects)) {
      setData(cache);
      setSource("cache");
    } else if (!u && demoData && Array.isArray(demoData.subjects)) {
      setData(demoData);
      setSource("demo");
    } else {
      setData(makeDemoData());
      setSource("demo");
    }
    setNow(new Date());
    setReady(true);
    if (u) void refreshImpl(u, true);
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, [refreshImpl]);

  useEffect(() => {
    if (!ready || !url) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms);
      });

    void (async () => {
      let requestedAt: string;
      try {
        requestedAt = await requestCircularCheck();
      } catch {
        // Un controllo recente (cooldown 3 minuti) non blocca l'apertura né la cache.
        return;
      }

      const deadline = Date.now() + 10 * 60 * 1000;
      while (!cancelled && Date.now() < deadline) {
        await wait(5_000);
        if (cancelled) return;
        try {
          const status = await getCircularCheckStatus(requestedAt);
          if (status.status === "completed") {
            if (status.conclusion === "success" && !cancelled) {
              await refreshImpl(urlRef.current, true);
            }
            return;
          }
        } catch {
          // Problemi momentanei di polling: il prossimo controllo farà un nuovo tentativo.
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [ready, url, refreshImpl]);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.dataset["accent"] = accent;
    root.dataset["bg"] = bg;
    root.dataset["mode"] = mode;
    root.dataset["glass"] = glass ? "on" : "off";
    root.dataset["density"] = density;
    root.dataset["reduceMotion"] = reduceMotion ? "on" : "off";
    root.dataset["theme"] = theme;
    root.dataset["font"] = customTheme.font;
    root.style.fontSize = `${interfaceScale}%`;
    const custom: Record<string, string> = {
      "--custom-bg-dark": customTheme.bgDark,
      "--custom-card-dark": customTheme.cardDark,
      "--custom-surface-dark": customTheme.surfaceDark,
      "--custom-fg-dark": customTheme.fgDark,
      "--custom-muted-dark": customTheme.mutedDark,
      "--custom-bg-light": customTheme.bgLight,
      "--custom-card-light": customTheme.cardLight,
      "--custom-surface-light": customTheme.surfaceLight,
      "--custom-fg-light": customTheme.fgLight,
      "--custom-muted-light": customTheme.mutedLight,
      "--custom-primary": customTheme.primary,
      "--custom-radius": `${customTheme.radius}rem`,
      "--custom-font":
        customTheme.font === "mono"
          ? '"JetBrains Mono", monospace'
          : customTheme.font === "serif"
            ? "Georgia, serif"
            : customTheme.font === "display"
              ? '"Space Grotesk", sans-serif'
              : '"Manrope", sans-serif',
    };
    Object.entries(custom).forEach(([key, value]) => root.style.setProperty(key, value));
  }, [accent, bg, mode, glass, density, reduceMotion, theme, customTheme, interfaceScale, ready]);

  const value: Ctx = useMemo(
    () => ({
      ready,
      density,
      reduceMotion,
      data,
      source,
      url,
      lastSync,
      loading,
      error,
      target,
      accent,
      bg,
      mode,
      glass,
      theme,
      customTheme,
      interfaceScale,
      homeModules,
      homeScale,
      interrogazioni,
      isDone: (id, remote) => completions[id] ?? remote,
      toggleDone: (id, remote) =>
        setCompletions((c) => {
          const next = { ...c, [id]: !(c[id] ?? remote) };
          save(KEYS.completions, next);
          return next;
        }),
      isRead: (id, remote) => remote || !!readIds[id],
      markRead: (ids) =>
        setReadIds((r) => {
          const next = { ...r };
          ids.forEach((i) => (next[i] = true));
          save(KEYS.read, next);
          return next;
        }),
      refresh: async (opts) => {
        await refreshImpl(urlRef.current, opts?.silent);
      },
      connect: async (u) => {
        const clean = u.trim();
        const ok = await refreshImpl(clean, true);
        if (ok) {
          urlRef.current = clean;
          setUrl(clean);
          save(KEYS.url, clean);
          toast.success("Connesso", { description: "I dati remoti sono ora la tua fonte." });
        } else toast.error("Connessione non riuscita");
        return ok;
      },
      disconnect: () => {
        urlRef.current = "";
        setUrl("");
        save(KEYS.url, null);
        save(KEYS.cache, null);
        save(KEYS.lastSync, null);
        setLastSync(null);
        setError(null);
        setData(makeDemoData());
        setSource("demo");
        toast("URL rimosso", { description: "Stai visualizzando i dati demo." });
      },
      resetDemo: () => {
        if (!canResetDemoData(source, urlRef.current)) {
          toast.error("Il ripristino è disponibile solo in modalità demo.");
          return;
        }
        urlRef.current = "";
        setUrl("");
        [KEYS.url, KEYS.cache, KEYS.demoData, KEYS.lastSync, KEYS.completions, KEYS.read].forEach(
          (k) => save(k, null),
        );
        setCompletions({});
        setReadIds({});
        setLastSync(null);
        setError(null);
        setData(makeDemoData());
        setSource("demo");
        toast.success("Dati demo ripristinati");
      },
      setDemoData: (next) => {
        if (urlRef.current) return;
        setData(next);
        setSource("demo");
        setError(null);
        save(KEYS.demoData, next);
        toast.success("Dati demo aggiornati");
      },
      setTarget: (n) => {
        setTargetS(n);
        save(KEYS.target, n);
      },
      setAccent: (a) => {
        setAccentS(a);
        save(KEYS.accent, a);
      },
      setBg: (b) => {
        setBgS(b);
        save(KEYS.bg, b);
      },
      setMode: (m) => {
        setModeS(m);
        save(KEYS.mode, m);
      },
      setGlass: (enabled) => {
        setGlassS(enabled);
        save(KEYS.glass, enabled);
      },
      setDensity: (next) => {
        setDensityS(next);
        save(KEYS.density, next);
      },
      setReduceMotion: (enabled) => {
        setReduceMotionS(enabled);
        save(KEYS.reduceMotion, enabled);
      },
      setTheme: (next) => {
        setThemeS(next);
        save(KEYS.theme, next);
      },
      setCustomTheme: (patch) =>
        setCustomThemeS((current) => {
          const next = { ...current, ...patch };
          save(KEYS.customTheme, next);
          return next;
        }),
      setInterfaceScale: (scale) => {
        const next = normalizeInterfaceScale(scale);
        setInterfaceScaleS(next);
        save(KEYS.interfaceScale, next);
      },
      resetCustomTheme: () => {
        setCustomThemeS(DEFAULT_CUSTOM_THEME);
        save(KEYS.customTheme, DEFAULT_CUSTOM_THEME);
      },
      toggleHomeModule: (id) =>
        setHomeModulesS((current) => {
          const next = current.map((module) =>
            module.id === id ? { ...module, enabled: !module.enabled } : module,
          );
          save(KEYS.homeModules, next);
          return next;
        }),
      moveHomeModule: (id, direction) =>
        setHomeModulesS((current) => {
          const index = current.findIndex((module) => module.id === id);
          const targetIndex = index + direction;
          if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
          const next = [...current];
          const moved = next[index]!;
          const swapped = next[targetIndex]!;
          next[index] = swapped;
          next[targetIndex] = moved;
          save(KEYS.homeModules, next);
          return next;
        }),
      setHomeScale: (scale) => {
        const next = normalizeHomeScale(scale);
        setHomeScaleS(next);
        save(KEYS.homeScale, next);
      },
      setHomeModuleScale: (id, scale) =>
        setHomeModulesS((current) => {
          const next = current.map((module) =>
            module.id === id ? { ...module, scale: normalizeHomeScale(scale) } : module,
          );
          save(KEYS.homeModules, next);
          return next;
        }),
      setHomeCustomization: (settings) => {
        const modules = normalizeHomeModules(settings.homeModules);
        const scale = normalizeHomeScale(settings.homeScale);
        setHomeModulesS(modules);
        save(KEYS.homeModules, modules);
        setHomeScaleS(scale);
        save(KEYS.homeScale, scale);
      },
      resetHomeModules: () => {
        setHomeModulesS(DEFAULT_HOME_MODULES);
        save(KEYS.homeModules, DEFAULT_HOME_MODULES);
        setHomeScaleS(100);
        save(KEYS.homeScale, 100);
      },
      addInterrogazione: (item) =>
        setInterrogazioni((current) => {
          const next = [
            {
              ...item,
              id: crypto.randomUUID(),
              completed: false,
              checklist: DEFAULT_PREPARATION.map((prep) => ({ ...prep })),
            },
            ...current,
          ];
          save(KEYS.interrogazioni, next);
          return next;
        }),
      toggleInterrogazione: (id) =>
        setInterrogazioni((current) => {
          const next = current.map((item) =>
            item.id === id ? { ...item, completed: !item.completed } : item,
          );
          save(KEYS.interrogazioni, next);
          return next;
        }),
      toggleInterrogazionePrep: (id, preparationId) =>
        setInterrogazioni((current) => {
          const next = current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  checklist: item.checklist.map((prep) =>
                    prep.id === preparationId ? { ...prep, done: !prep.done } : prep,
                  ),
                }
              : item,
          );
          save(KEYS.interrogazioni, next);
          return next;
        }),
      removeInterrogazione: (id) =>
        setInterrogazioni((current) => {
          const next = current.filter((item) => item.id !== id);
          save(KEYS.interrogazioni, next);
          return next;
        }),
    }),
    [
      ready,
      data,
      source,
      url,
      lastSync,
      loading,
      error,
      target,
      accent,
      bg,
      mode,
      glass,
      theme,
      customTheme,
      homeModules,
      interrogazioni,
      completions,
      readIds,
      density,
      reduceMotion,
      refreshImpl,
      homeScale,
      interfaceScale,
    ],
  );

  return (
    <ClockCtx.Provider value={now}>
      <VotoCtx.Provider value={value}>{children}</VotoCtx.Provider>
    </ClockCtx.Provider>
  );
}

export function useVoto() {
  const c = useContext(VotoCtx);
  if (!c) throw new Error("useVoto fuori dal provider");
  return c;
}

export function useClock() {
  const now = useContext(ClockCtx);
  if (!now) throw new Error("useClock fuori dal provider");
  return now;
}
