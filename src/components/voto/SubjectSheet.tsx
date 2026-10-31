import { Calculator } from "lucide-react";
import { useState } from "react";
import { fmt, subjectStats } from "@/lib/voto/calc";
import { fmtDate } from "@/lib/voto/dates";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { PeriodPicker } from "./PeriodPicker";
import type { GradeType } from "@/lib/voto/types";
import { BottomSheet, Chip, GradePill, Sparkline, SubjectMark } from "./ui";

const TYPES: (GradeType | "all")[] = ["all", "scritto", "orale", "pratico"];

export function SubjectSheet({ id, onClose, onSimulate }: { id: string | null; onClose: () => void; onSimulate: (id: string) => void }) {
  const { subjects } = useSchoolPeriods();
  const [type, setType] = useState<GradeType | "all">("all");
  const s = subjects.find((x) => x.id === id);
  const st = s ? subjectStats(s) : null;
  const grades = s ? [...s.grades].filter((g) => type === "all" || g.type === type).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const history = s
    ? [...s.grades].sort((a, b) => a.date.localeCompare(b.date)).map((_, i, arr) => {
        const sl = arr.slice(0, i + 1);
        return sl.reduce((t, g) => t + g.value * g.weight, 0) / sl.reduce((t, g) => t + g.weight, 0);
      })
    : [];

  return (
    <BottomSheet open={!!s} onOpenChange={(o) => !o && onClose()} title={s?.name ?? ""} description={s?.teacher}>
      {s && st && (
        <>
          <PeriodPicker />
          <div className="card-surface flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <SubjectMark name={s.name} color={s.color} size={44} />
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Media ponderata</p>
                <p className="tabular font-display text-3xl font-semibold">{st.avg === null ? "—" : fmt(st.avg)}</p>
              </div>
            </div>
            <Sparkline values={history} className="w-24" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[["Max", st.max], ["Min", st.min], ["Voti", st.count]].map(([l, val]) => (
              <div key={l as string} className="rounded-xl bg-card py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
                <p className="tabular font-display text-base font-semibold">{val === null ? "—" : l === "Voti" ? val : fmt(val as number, 2)}</p>
              </div>
            ))}
          </div>
          <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>{t === "all" ? "Tutti" : t.charAt(0).toUpperCase() + t.slice(1)}</Chip>
            ))}
          </div>
          <ul className="mt-3 divide-y divide-border">
            {grades.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nessun voto di questo tipo.</li>}
            {grades.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-3">
                <GradePill value={g.value} label={g.label} />
                <div className="min-w-0 flex-1">
                  {g.comment && <p className="truncate text-sm">{g.comment}</p>}
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {g.type} · {fmtDate(g.date, { day: "numeric", month: "long" })}
                  </p>
                </div>
                <span className="tabular rounded-md bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  peso {fmt(g.weight * 100, 0)}%
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onSimulate(s.id)}
            className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Calculator className="h-4 w-4" /> Che voto mi serve?
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">I voti sono in sola lettura: provengono dal file remoto.</p>
        </>
      )}
    </BottomSheet>
  );
}
