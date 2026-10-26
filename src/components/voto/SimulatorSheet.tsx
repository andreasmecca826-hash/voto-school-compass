import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { fmt, neededGrade, subjectStats } from "@/lib/voto/calc";
import { useVoto } from "@/lib/voto/store";
import { GradePill, SubjectMark } from "./ui";
import { BottomSheet } from "./ui";

function StepLabel({ n, children }: { n: number; children: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft font-display text-[11px] font-semibold text-primary">
        {n}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>
    </div>
  );
}

export function SimulatorSheet({ open, onOpenChange, subjectId }: { open: boolean; onOpenChange: (o: boolean) => void; subjectId?: string }) {
  const v = useVoto();
  const subjects = v.data.subjects;
  const [sid, setSid] = useState(subjectId ?? subjects[0]?.id ?? "");
  const [target, setTarget] = useState(7);
  const [scenario, setScenario] = useState(7);

  const s = subjects.find((x) => x.id === sid) ?? subjects[0];
  const stats = s ? subjectStats(s) : null;
  const current = stats?.avg ?? null;

  useEffect(() => {
    if (!open) return;
    const id = subjectId ?? subjects[0]?.id ?? "";
    setSid(id);
    const sub = subjects.find((x) => x.id === id);
    const a = sub ? subjectStats(sub).avg : null;
    setTarget(a === null ? 6 : Math.min(10, Math.max(6, Math.ceil((a + 0.25) * 2) / 2)));
  }, [open, subjectId, subjects]);

  if (!s) {
    return (
      <BottomSheet open={open} onOpenChange={onOpenChange} title="Che voto mi serve?">
        <p className="text-sm text-muted-foreground">Nessuna materia disponibile.</p>
      </BottomSheet>
    );
  }

  const res = neededGrade(s.grades, target, 1, false);
  const scenarioGrades = [...s.grades, { id: "sim", value: scenario, label: "", date: "", type: "altro" as const, weight: 1 }];
  const scenarioAvg = stats ? (stats.count * (current ?? 0) + scenario) / (stats.count + 1) : null;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Che voto mi serve?" description="Calcola il voto necessario alla prossima verifica.">
      {/* Materia */}
      <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="sim-subject">Materia</label>
      <select
        id="sim-subject"
        value={s.id}
        onChange={(e) => setSid(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
      >
        {subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>

      {/* 1 · Situazione attuale */}
      <div className="card-surface mt-5 p-4">
        <StepLabel n={1}>Situazione attuale</StepLabel>
        <div className="flex items-center gap-3">
          <SubjectMark name={s.name} color={s.color} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{s.name}</p>
            <p className="text-xs text-muted-foreground">
              {stats?.count ?? 0} voti registrati
              {(stats?.max ?? null) !== null && (
                <> · min {fmt(stats!.min!, 1)} · max {fmt(stats!.max!, 1)}</>
              )}
            </p>
          </div>
          <GradePill value={current} className="text-base" />
        </div>
      </div>

      {/* 2 · Il tuo obiettivo */}
      <div className="card-surface mt-3 p-4">
        <StepLabel n={2}>Il tuo obiettivo</StepLabel>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Media che vuoi raggiungere</span>
          <span className="tabular font-display text-2xl font-semibold">{fmt(target, 2)}</span>
        </div>
        <Slider className="mt-3" min={4} max={10} step={0.25} value={[target]} onValueChange={([x]) => setTarget(x)} aria-label="Media obiettivo" />
      </div>

      {/* 3 · Risultato */}
      <div
        className={cn(
          "mt-3 rounded-2xl border p-5 text-center",
          res.status === "impossible" ? "border-danger/30 bg-danger-soft" : res.status === "reached" ? "border-success/30 bg-success-soft" : "border-primary/30 bg-primary-soft",
        )}
      >
        <StepLabel n={3}>Risultato</StepLabel>
        {res.status === "reached" ? (
          <>
            <p className="mt-2 font-display text-xl font-semibold text-success">Obiettivo già raggiunto</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Qualsiasi voto prendi, la media resta almeno {fmt(target, 2)}.
            </p>
          </>
        ) : res.status === "impossible" ? (
          <>
            <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Per raggiungere l'obiettivo devi prendere almeno
            </p>
            <p className="tabular mt-1 font-display text-5xl font-semibold text-danger">{fmt(target, 0)}+</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Non raggiungibile con un solo voto: serviranno più verifiche.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Per raggiungere l'obiettivo devi prendere almeno
            </p>
            <p className="tabular mt-1 font-display text-5xl font-semibold text-primary">{fmt(res.needed, 1)}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              alla prossima verifica in {s.name}.
            </p>
          </>
        )}
      </div>

      {/* Scenario "e se prendo…" */}
      <div className="card-surface mt-3 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">E se invece prendi…</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Voto ipotetico alla prossima verifica</span>
          <span className="tabular font-display text-base font-semibold">{fmt(scenario, 2)}</span>
        </div>
        <Slider className="mt-3" min={1} max={10} step={0.25} value={[scenario]} onValueChange={([x]) => setScenario(x)} aria-label="Voto ipotetico" />
        {scenarioAvg !== null && current !== null && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
            <span className="text-muted-foreground">La media di {s.name} diventerebbe</span>
            <span className="tabular flex items-center gap-1.5 font-semibold">
              <GradePill value={scenarioAvg} />
              <span className={cn(scenarioAvg >= current ? "text-success" : "text-danger")}>
                {scenarioAvg >= current ? "+" : ""}{fmt(scenarioAvg - current)}
              </span>
            </span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
