import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { average, fmt, neededGrade } from "@/lib/voto/calc";
import { useVoto } from "@/lib/voto/store";
import { BottomSheet } from "./ui";

export function SimulatorSheet({ open, onOpenChange, subjectId }: { open: boolean; onOpenChange: (o: boolean) => void; subjectId?: string }) {
  const v = useVoto();
  const subjects = v.data.subjects;
  const [sid, setSid] = useState(subjectId ?? subjects[0]?.id ?? "");
  const [target, setTarget] = useState(7);
  const [scenario, setScenario] = useState(7);

  const s = subjects.find((x) => x.id === sid) ?? subjects[0];
  const current = s ? average(s.grades) : null;

  useEffect(() => {
    if (!open) return;
    const id = subjectId ?? subjects[0]?.id ?? "";
    setSid(id);
    const sub = subjects.find((x) => x.id === id);
    const a = sub ? average(sub.grades) : null;
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
  const scenarioAvg = average(scenarioGrades, false);

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Che voto mi serve?" description="Calcola il voto necessario alla prossima verifica.">
      <label className="mb-1.5 block text-xs text-muted-foreground" htmlFor="sim-subject">Materia</label>
      <select
        id="sim-subject"
        value={s.id}
        onChange={(e) => setSid(e.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
      >
        {subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Media obiettivo</span>
        <span className="tabular font-display text-lg font-semibold">{fmt(target, 2)}</span>
      </div>
      <Slider className="mt-3" min={4} max={10} step={0.25} value={[target]} onValueChange={([x]) => setTarget(x)} aria-label="Media obiettivo" />

      <div className={cn("mt-5 rounded-2xl border p-5 text-center", res.status === "impossible" ? "border-danger/30 bg-danger-soft" : res.status === "reached" ? "border-success/30 bg-success-soft" : "border-primary/30 bg-primary-soft")}>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Media attuale {current === null ? "—" : fmt(current)} · {s.grades.length} voti
        </p>
        {res.status === "reached" ? (
          <>
            <p className="mt-2 font-display text-2xl font-semibold text-success">Obiettivo garantito</p>
            <p className="mt-1 text-xs text-muted-foreground">Qualsiasi voto ti mantiene almeno a {fmt(target)}.</p>
          </>
        ) : (
          <>
            <p className={cn("tabular mt-1 font-display text-5xl font-semibold", res.status === "impossible" ? "text-danger" : "text-primary")}>
              {fmt(res.needed, 1)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {res.status === "ok" ? "Voto minimo necessario alla prossima verifica." : "Non raggiungibile con un solo voto: serviranno più verifiche."}
            </p>
          </>
        )}
      </div>

      <div className="card-surface mt-4 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Scenario: se prendi</span>
          <span className="tabular font-display text-base font-semibold">{fmt(scenario, 2)}</span>
        </div>
        <Slider className="mt-3" min={1} max={10} step={0.25} value={[scenario]} onValueChange={([x]) => setScenario(x)} aria-label="Voto ipotetico" />
        <p className="mt-3 text-xs text-muted-foreground">
          La media diventa <span className="tabular font-semibold text-foreground">{scenarioAvg === null ? "—" : fmt(scenarioAvg)}</span>
          {current !== null && scenarioAvg !== null && (
            <span className={cn("tabular ml-1", scenarioAvg >= current ? "text-success" : "text-danger")}>
              ({scenarioAvg >= current ? "+" : ""}{fmt(scenarioAvg - current)})
            </span>
          )}
        </p>
      </div>
    </BottomSheet>
  );
}
