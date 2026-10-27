import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useClock, useVoto } from "./store";
import { load, save } from "./storage";
import { defaultBoundary, filterSubjectsByPeriod, periodLabels, schoolYearStart, validBoundary, type PeriodConfig } from "./periods";
import type { Subject } from "./types";

const Context = createContext<{
  config: PeriodConfig;
  subjects: Subject[];
  years: number[];
  label: string;
  update: (patch: Partial<PeriodConfig>) => void;
} | null>(null);

export function SchoolPeriodsProvider({ children }: { children: ReactNode }) {
  const v = useVoto();
  const now = useClock();
  const [config, setConfig] = useState<PeriodConfig>({ year: 2026, system: "quadrimesters", selection: "all", boundary: "2027-01-31" });
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!v.ready || loaded) return;
    const year = schoolYearStart(now.toISOString());
    const saved = load<Partial<PeriodConfig>>("voto.periods", {});
    const selectedYear = Number.isInteger(saved.year) && (saved.year ?? 0) >= 2000 && (saved.year ?? 0) <= 2100 ? saved.year ?? year : year;
    const system = saved.system === "trimester" ? "trimester" : "quadrimesters";
    setConfig({ year: selectedYear, system, selection: saved.selection === "first" || saved.selection === "second" ? saved.selection : "all", boundary: validBoundary(saved.boundary ?? "", selectedYear) ? saved.boundary ?? "" : defaultBoundary(selectedYear, system) });
    setLoaded(true);
  }, [v.ready, now, loaded]);
  const subjects = useMemo(() => filterSubjectsByPeriod(v.data.subjects, config), [v.data.subjects, config]);
  const years = [...new Set([config.year, schoolYearStart(now.toISOString()), ...v.data.subjects.flatMap((s) => s.grades.map((g) => schoolYearStart(g.date)))])].filter((year) => year >= 2000).sort((a, b) => b - a);
  const update = (patch: Partial<PeriodConfig>) => setConfig((current) => {
    const next = { ...current, ...patch };
    if (patch.year !== undefined || patch.system !== undefined) next.boundary = defaultBoundary(next.year, next.system);
    if (!validBoundary(next.boundary, next.year)) return current;
    save("voto.periods", next);
    return next;
  });
  return <Context.Provider value={{ config, subjects, years, label: periodLabels(config.system)[config.selection], update }}>{children}</Context.Provider>;
}

export function useSchoolPeriods() {
  const context = useContext(Context);
  if (!context) throw new Error("SchoolPeriodsProvider mancante");
  return context;
}