import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/voto/dates";
import {
  clearSchoolEndDate,
  loadSchoolEndDate,
  saveSchoolEndDate,
} from "@/lib/voto/school-end-date";

export function SchoolEndDateTool() {
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(loadSchoolEndDate() ?? "");
  }, []);

  const updateDate = (value: string) => {
    setDate(value);
    if (value) saveSchoolEndDate(value);
    else clearSchoolEndDate();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        La data ufficiale di fine lezioni non è inclusa nei dati sincronizzati. Impostala qui per
        permettere all’assistente locale di calcolare quanto manca senza indovinare.
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
          <p role="status" className="text-xs text-success">
            Data impostata: {fmtDate(date, { day: "2-digit", month: "long", year: "numeric" })}.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Seleziona la data comunicata dalla scuola.
          </p>
        )}
      </section>

      <p className="text-[11px] text-muted-foreground">
        La data è salvata solo su questo dispositivo. Il conteggio indica giorni di calendario:
        include weekend e festività, non calcola i singoli giorni di lezione.
      </p>
      {date && (
        <p className="rounded-xl bg-primary-soft p-3 text-xs text-primary">
          Poi chiedi all’assistente: “Quanti giorni mancano alla fine della scuola?”
        </p>
      )}
    </div>
  );
}
