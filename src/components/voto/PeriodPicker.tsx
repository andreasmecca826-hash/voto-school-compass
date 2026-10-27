import { useState } from "react";
import { CalendarRange, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { periodLabels, type PeriodSelection, type PeriodSystem } from "@/lib/voto/periods";

export function PeriodPicker() {
  const { config, update, years } = useSchoolPeriods();
  const [settings, setSettings] = useState(false);
  const labels = periodLabels(config.system);
  return <section className="my-4 space-y-2" aria-label="Periodo scolastico">
    <div className="flex items-center gap-2">
      <CalendarRange className="h-4 w-4 shrink-0 text-primary" />
      <label className="sr-only" htmlFor="school-period">Periodo</label>
      <select id="school-period" value={config.selection} onChange={(e) => update({ selection: e.target.value as PeriodSelection })} className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-xs font-semibold">
        {Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
      <select aria-label="Anno scolastico" value={config.year} onChange={(e) => update({ year: Number(e.target.value) })} className="h-10 max-w-28 rounded-lg border border-input bg-card px-2 text-xs">
        {years.map((year) => <option key={year} value={year}>{year}/{String(year + 1).slice(2)}</option>)}
      </select>
      <Button size="icon" variant="ghost" aria-label="Configura periodi" title="Configura periodi" aria-expanded={settings} onClick={() => setSettings(!settings)}><Settings2 /></Button>
    </div>
    {settings && <div className="space-y-3 border-y border-border py-3">
      <label className="block text-xs text-muted-foreground">Suddivisione
        <select value={config.system} onChange={(e) => update({ system: e.target.value as PeriodSystem })} className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm">
          <option value="quadrimesters">Due quadrimestri</option><option value="trimester">Trimestre e pentamestre</option>
        </select>
      </label>
      <label className="block text-xs text-muted-foreground">Ultimo giorno del primo periodo
        <input type="date" aria-label="Fine primo periodo" min={`${config.year}-09-01`} max={`${config.year + 1}-08-30`} value={config.boundary} onChange={(e) => update({ boundary: e.target.value })} className="mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" />
      </label>
    </div>}
  </section>;
}