import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { makeDemoData } from "./demo";
import { fetchVotoData } from "./parse";
import { KEYS, load, save } from "./storage";
import type { DataSource, VotoData } from "./types";

export type Accent = "rosso" | "ambra" | "viola" | "blu" | "verde" | "azzurro" | "rosa" | "arancio" | "turchese" | "indaco" | "lime" | "oro" | "corallo" | "mono";
export type Bg = "nero" | "carbone" | "grafite" | "chiaro" | "notteblu" | "bosco" | "prugna" | "carta";

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
  }, [accent, bg, ready]);

  const value: Ctx = useMemo(
    () => ({
      ready, data, source, url, lastSync, loading, error, target, accent, bg, now,
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
    }),
    [ready, data, source, url, lastSync, loading, error, target, accent, bg, now, completions, readIds, refreshImpl],
  );

  return <VotoCtx.Provider value={value}>{children}</VotoCtx.Provider>;
}

export function useVoto() {
  const c = useContext(VotoCtx);
  if (!c) throw new Error("useVoto fuori dal provider");
  return c;
}
