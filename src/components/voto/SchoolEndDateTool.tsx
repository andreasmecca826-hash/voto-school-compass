import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/voto/dates";
import {
  loadExcludeWeekends,
  loadSchoolClosures,
  saveExcludeWeekends,
  saveSchoolClosures,
  schoolDaysUntilSchoolEnd,
  type SchoolClosurePeriod,
} from "@/lib/voto/school-holidays";
import { useClock } from "@/lib/voto/store";
import {
  clearSchoolEndDate,
  loadSchoolEndDate,
  saveSchoolEndDate,
} from "@/lib/voto/school-end-date";

export function SchoolEndDateTool() {
  const [date, setDate] = useState("");
  const [closures, setClosures] = useState<SchoolClosurePeriod[]>([]);
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  const [closureStart, setClosureStart] = useState("");
  const [closureEnd, setClosureEnd] = useState("");
  const now = useClock();

  useEffect(() => {
    setDate(loadSchoolEndDate() ?? "");
    setClosures(loadSchoolClosures());
    setExcludeWeekends(loadExcludeWeekends());
  }, []);

  const updateExcludeWeekends = (checked: boolean) => {
    setExcludeWeekends(checked);
    saveExcludeWeekends(checked);
  };

  const updateDate = (value: string) => {
    setDate(value);
    if (value) saveSchoolEndDate(value);
    else clearSchoolEndDate();
  };

  const addClosure = () => {
    if (!closureStart || !closureEnd || closureStart > closureEnd) return;
    const next = [...closures, { start: closureStart, end: closureEnd }].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    if (saveSchoolClosures(next)) {
      setClosures(next);
      setClosureStart("");
      setClosureEnd("");
    }
  };

  const removeClosure = (index: number) => {
    const next = closures.filter((_, itemIndex) => itemIndex !== index);
    if (saveSchoolClosures(next)) setClosures(next);
  };

  const daysRemaining = date
    ? schoolDaysUntilSchoolEnd(date, now, closures, excludeWeekends)
    : null;
  const formattedDate = date
    ? fmtDate(date, { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        La data ufficiale di fine lezioni non è inclusa nei dati sincronizzati. Impostala qui e
        vedrai subito il conteggio aggiornato.
      </p>

      <section className="card-surface space-y-3 p-4">
        <label htmlFor="school-end-date" className="block text-sm font-semibold">
          Ultimo giorno di lezione
        </label>
        <input
          id="school-end-date"
          type="date"
          value={date}
          onChange={(event) => updateDate(event.target.value)}
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {date ? (
          <p className="text-xs text-success">Fine lezioni impostata per il {formattedDate}.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Seleziona la data comunicata dalla scuola: il conteggio apparirà qui sotto.
          </p>
        )}
      </section>

      <section className="card-surface flex items-start gap-3 p-4">
        <input
          id="school-exclude-weekends"
          type="checkbox"
          checked={excludeWeekends}
          onChange={(event) => updateExcludeWeekends(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
          role="switch"
          aria-label="Escludi sabato e domenica dal conteggio"
        />
        <div>
          <label htmlFor="school-exclude-weekends" className="block text-sm font-semibold">
            Escludi sabato e domenica
          </label>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {excludeWeekends
              ? "Attivo: il conteggio considera solo i giorni feriali."
              : "Disattivo: sabato e domenica vengono conteggiati come giorni rimanenti."}
          </p>
        </div>
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="school-closures-title">
        <div>
          <h3 id="school-closures-title" className="text-sm font-semibold">
            Festività e chiusure extra
          </h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Puoi aggiungerne più di una. Per una festività singola scegli la stessa data in “Dal” e
            “Al”; per le vacanze inserisci l’intervallo.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-muted-foreground">
            Dal
            <input
              aria-label="Inizio chiusura scolastica"
              type="date"
              value={closureStart}
              onChange={(event) => setClosureStart(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-input bg-card px-2 text-xs text-foreground"
            />
          </label>
          <label className="text-[11px] text-muted-foreground">
            Al
            <input
              aria-label="Fine chiusura scolastica"
              type="date"
              value={closureEnd}
              min={closureStart || undefined}
              onChange={(event) => setClosureEnd(event.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-input bg-card px-2 text-xs text-foreground"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addClosure}
          disabled={!closureStart || !closureEnd || closureStart > closureEnd}
          className="h-10 rounded-xl bg-primary-soft px-3 text-xs font-semibold text-primary disabled:opacity-50"
        >
          Aggiungi festività o chiusura
        </button>
        {closures.length > 0 && (
          <ul className="space-y-2" aria-label="Festività e chiusure aggiunte">
            {closures.map((period, index) => (
              <li
                key={`${period.start}-${period.end}-${index}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs"
              >
                <span>
                  {fmtDate(period.start, { day: "2-digit", month: "short", year: "numeric" })}
                  {period.start !== period.end &&
                    ` – ${fmtDate(period.end, { day: "2-digit", month: "short", year: "numeric" })}`}
                </span>
                <button
                  type="button"
                  onClick={() => removeClosure(index)}
                  aria-label={`Rimuovi festività o chiusura dal ${period.start} al ${period.end}`}
                  className="px-2 py-1 font-medium text-danger"
                >
                  Rimuovi
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {daysRemaining !== null && (
        <section
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-primary-soft p-4 text-primary"
        >
          <p className="text-xs font-medium uppercase tracking-wide">Fine scuola</p>
          <p className="mt-1 text-lg font-semibold">
            {daysRemaining > 0
              ? `Mancano ${daysRemaining} ${daysRemaining === 1 ? "giorno" : "giorni"} di lezione`
              : daysRemaining === 0
                ? "Oggi è l’ultimo giorno di scuola"
                : `La data è passata da ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "giorno" : "giorni"} di lezione`}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {excludeWeekends ? "Esclusi sabati e domeniche, " : "Inclusi sabati e domeniche, "}
            festività nazionali italiane e chiusure scolastiche extra inserite qui sopra sono
            escluse dal conteggio.
          </p>
        </section>
      )}

      <p className="text-[11px] text-muted-foreground">
        La data è salvata solo su questo dispositivo. Puoi comunque chiederla anche all’assistente
        locale quando vuoi.
      </p>
    </div>
  );
}
