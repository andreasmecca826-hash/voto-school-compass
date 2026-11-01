import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/voto/dates";
import { useClock } from "@/lib/voto/store";
import {
  clearSchoolEndDate,
  daysUntilSchoolEnd,
  loadSchoolEndDate,
  saveSchoolEndDate,
} from "@/lib/voto/school-end-date";

export function SchoolEndDateTool() {
  const [date, setDate] = useState("");
  const now = useClock();

  useEffect(() => {
    setDate(loadSchoolEndDate() ?? "");
  }, []);

  const updateDate = (value: string) => {
    setDate(value);
    if (value) saveSchoolEndDate(value);
    else clearSchoolEndDate();
  };

  const daysRemaining = date ? daysUntilSchoolEnd(date, now) : null;
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

      {daysRemaining !== null && (
        <section
          role="status"
          aria-live="polite"
          className="rounded-2xl bg-primary-soft p-4 text-primary"
        >
          <p className="text-xs font-medium uppercase tracking-wide">Fine scuola</p>
          <p className="mt-1 text-lg font-semibold">
            {daysRemaining > 0
              ? `Mancano ${daysRemaining} ${daysRemaining === 1 ? "giorno" : "giorni"}`
              : daysRemaining === 0
                ? "Oggi è l’ultimo giorno di scuola"
                : `La data è passata da ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "giorno" : "giorni"}`}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Conteggio in giorni di calendario: include weekend e festività, non solo i giorni di
            lezione.
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
