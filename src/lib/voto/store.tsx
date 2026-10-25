import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { makeDemoData } from "./demo";
import { fetchVotoData } from "./parse";
import { KEYS, load, save } from "./storage";
import type { DataSource, VotoData } from "./types";

export type Accent = "rosso" | "ambra" | "viola" | "blu" | "verde" | "azzurro" | "rosa" | "arancio" | "turchese" | "indaco" | "lime" | "oro" | "corallo" | "mono";
export type Bg = "nero" | "carbone" | "grafite" | "chiaro" | "notteblu" | "bosco" | "prugna" | "carta";
export type Mode = "chiaro" | "scuro";
export type Theme = "original" | "lavender" | "cybercore" | "brutalist" | "retro-os" | "dark-academia" | "glassmorphism" | "y2k" | "primavera" | "estate" | "autunno" | "inverno";
export type HomeModuleId = "media" | "simulatore" | "presenze" | "compiti" | "note" | "bacheca" | "obiettivo";
export type HomeModuleConfig = { id: HomeModuleId; enabled: boolean };

export const DEFAULT_HOME_MODULES: HomeModuleConfig[] = [
  { id: "media", enabled: true },
  { id: "simulatore", enabled: true },
  { id: "presenze", enabled: true },
  { id: "compiti", enabled: true },
  { id: "note", enabled: true },
  { id: "bacheca", enabled: true },
  { id: "obiettivo", enabled: true },
];

function normalizeHomeModules(value: unknown): HomeModuleConfig[] {
  if (!Array.isArray(value)) return DEFAULT_HOME_MODULES;
  const ids = new Set<HomeModuleId>();
  const result: HomeModuleConfig[] = [];
  value.forEach((item) => {
    const id = typeof item === "string" ? item : (item as HomeModuleConfig)?.id;
    if (typeof id === "string" && DEFAULT_HOME_MODULES.some((m) => m.id === id) && !ids.has(id as HomeModuleId)) {
      ids.add(id as HomeModuleId);
      result.push({ id: id as HomeModuleId, enabled: typeof item === "string" ? true : (item as HomeModuleConfig).enabled !== false });
    }
  });
  DEFAULT_HOME_MODULES.forEach((m) => { if (!ids.has(m.id)) result.push(m); });
  return result;
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
  theme: Theme;
  homeModules: HomeModuleConfig[];
  isDone: (id: string, remote: boolean) => boolean;
  toggleDone: (id: string, remote: boolean) => void;
  isRead: (id: string, remote: boolean) => boolean;
  markRead: (ids: string[]) => void;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  connect: (url: string) => Promise<boolean>;
  disconnect: () => void;
  resetDemo: () => void;
  setTarget: (n: number) => void;
  setAccent: (a: Accent) => void;
  setBg: (b: Bg) => void;
  setMode: (m: Mode) => void;
  setGlass: (enabled: boolean) => void;
  setTheme: (theme: Theme) => void;
  toggleHomeModule: (id: HomeModuleId) => void;
  moveHomeModule: (id: HomeModuleId, direction: -1 | 1) => void;
  resetHomeModules: () => void;
  now: Date;
}

const VotoCtx = createContext<Ctx | null>(null);

const EMPTY: VotoData = {
  student: {},
  subjects: [],
  assignments: [],
  notifications: [],
  attendance: { absenceDays: 0, absenceHours: 0, delays: 0, earlyExits: 0, annualHours: 990, absenceLimitHours: 247.5 },
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
  const [theme, setThemeS] = useState<Theme>("original");
  const [homeModules, setHomeModulesS] = useState<HomeModuleConfig[]>(DEFAULT_HOME_MODULES);
  const [now, setNow] = useState(() => new Date(0));
  const urlRef = useRef("");

  const refreshImpl = useCallback(async (u: string, silent = false) => {
    if (!u) {
      if (!silent) toast("Modalità demo", { description: "Collega un URL JSON nelle Impostazioni per dati reali." });
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
    setThemeS(load(KEYS.theme, "original"));
    setHomeModulesS(normalizeHomeModules(load(KEYS.homeModules, DEFAULT_HOME_MODULES)));
    setLastSync(load(KEYS.lastSync, null));
    if (u && cache && Array.isArray(cache.subjects)) {
      setData(cache);
      setSource("cache");
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
    if (!ready) return;
    const root = document.documentElement;
    root.dataset.accent = accent;
    root.dataset.bg = bg;
    root.dataset.mode = mode;
    root.dataset.glass = glass ? "on" : "off";
    root.dataset.theme = theme;
  }, [accent, bg, mode, glass, theme, ready]);

  const value: Ctx = useMemo(
    () => ({
      ready, data, source, url, lastSync, loading, error, target, accent, bg, mode, glass, theme, homeModules, now,
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
        urlRef.current = "";
        setUrl("");
        [KEYS.url, KEYS.cache, KEYS.lastSync, KEYS.completions, KEYS.read].forEach((k) => save(k, null));
        setCompletions({});
        setReadIds({});
        setLastSync(null);
        setError(null);
        setData(makeDemoData());
        setSource("demo");
        toast.success("Dati demo ripristinati");
      },
      setTarget: (n) => { setTargetS(n); save(KEYS.target, n); },
      setAccent: (a) => { setAccentS(a); save(KEYS.accent, a); },
      setBg: (b) => { setBgS(b); save(KEYS.bg, b); },
      setMode: (m) => { setModeS(m); save(KEYS.mode, m); },
      setGlass: (enabled) => { setGlassS(enabled); save(KEYS.glass, enabled); },
      setTheme: (next) => { setThemeS(next); save(KEYS.theme, next); },
      toggleHomeModule: (id) => setHomeModulesS((current) => {
        const next = current.map((module) => module.id === id ? { ...module, enabled: !module.enabled } : module);
        save(KEYS.homeModules, next);
        return next;
      }),
      moveHomeModule: (id, direction) => setHomeModulesS((current) => {
        const index = current.findIndex((module) => module.id === id);
        const targetIndex = index + direction;
        if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
        const next = [...current];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        save(KEYS.homeModules, next);
        return next;
      }),
      resetHomeModules: () => { setHomeModulesS(DEFAULT_HOME_MODULES); save(KEYS.homeModules, DEFAULT_HOME_MODULES); },
    }),
    [ready, data, source, url, lastSync, loading, error, target, accent, bg, mode, glass, theme, homeModules, now, completions, readIds, refreshImpl],
  );

  return <VotoCtx.Provider value={value}>{children}</VotoCtx.Provider>;
}

export function useVoto() {
  const c = useContext(VotoCtx);
  if (!c) throw new Error("useVoto fuori dal provider");
  return c;
}
