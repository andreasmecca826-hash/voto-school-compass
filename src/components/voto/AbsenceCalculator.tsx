import { useEffect, useState } from "react";
import { loadAbsenceHoursPerDay, saveAbsenceHoursPerDay } from "@/lib/voto/absence-preferences";
import { calculateAbsencePlan } from "@/lib/voto/absence-calculator";
import { fmt } from "@/lib/voto/calc";
import { useVoto } from "@/lib/voto/store";

function numericInput(value: string): number {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

const numberLabel = (value: number) => fmt(Math.round(value * 100) / 100, 2);

export function AbsenceCalculator() {
  const { attendance } = useVoto().data;
  const [currentDaysInput, setCurrentDaysInput] = useState(String(attendance.absenceDays));
  const [currentHoursInput, setCurrentHoursInput] = useState(String(attendance.absenceHours));
  const [absenceLimitInput, setAbsenceLimitInput] = useState(String(attendance.absenceLimitHours));
  const [annualHoursInput, setAnnualHoursInput] = useState(String(attendance.annualHours));
  const [simulatedDaysInput, setSimulatedDaysInput] = useState("0");
  const [simulatedHoursInput, setSimulatedHoursInput] = useState("0");
  const [hoursPerDayInput, setHoursPerDayInput] = useState("6");
  useEffect(() => {
    setHoursPerDayInput(String(loadAbsenceHoursPerDay()));
  }, []);
  useEffect(() => {
    setCurrentDaysInput(String(attendance.absenceDays));
    setCurrentHoursInput(String(attendance.absenceHours));
    setAbsenceLimitInput(String(attendance.absenceLimitHours));
    setAnnualHoursInput(String(attendance.annualHours));
  }, [
    attendance.absenceDays,
    attendance.absenceHours,
    attendance.absenceLimitHours,
    attendance.annualHours,
  ]);
  const updateHoursPerDay = (value: string) => {
    setHoursPerDayInput(value);
    const parsed = numericInput(value);
    if (parsed > 0) saveAbsenceHoursPerDay(parsed);
  };
  const calculation = calculateAbsencePlan({
    absenceHours: numericInput(currentHoursInput),
    absenceLimitHours: numericInput(absenceLimitInput),
    annualHours: numericInput(annualHoursInput),
    // Il limite del registro è espresso in ore: convertiamo quindi i giorni
    // simulati usando le ore di lezione per giornata.
    simulatedHours:
      numericInput(simulatedHoursInput) +
      numericInput(simulatedDaysInput) * numericInput(hoursPerDayInput),
    hoursPerDay: numericInput(hoursPerDayInput),
  });
  const percent = calculation.currentAnnualPercentage;
  const currentDays = numericInput(currentDaysInput);
  const simulatedDays = numericInput(simulatedDaysInput);
  const totalDaysAfterSimulation = currentDays + simulatedDays;
  const simulatedManualHours = numericInput(simulatedHoursInput);
  const simulatedDayHours = simulatedDays * calculation.hoursPerDay;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Il registro stabilisce il limite in <strong>ore di assenza</strong>. I giorni sono mostrati
        come riferimento; per la simulazione vengono convertiti in ore usando le ore di lezione per
        giornata. Le modifiche valgono solo per questo calcolo e non cambiano i dati Supabase.
      </p>

      <section
        className="rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-xs leading-relaxed"
        aria-label="Come viene calcolato il limite"
      >
        <p className="font-semibold">Come leggere il risultato</p>
        <p className="mt-1 text-muted-foreground">
          <strong>Ore ancora disponibili</strong> = limite massimo − ore già conteggiate. Le
          giornate intere sono una stima: ore disponibili ÷ ore di lezione per giornata.
        </p>
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="absence-current-title">
        <h3 id="absence-current-title" className="text-sm font-semibold">
          Situazione attuale
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            id="absence-current-days"
            label="Giorni già assenti"
            value={currentDaysInput}
            onChange={setCurrentDaysInput}
            step="0.5"
            help="Dato informativo del registro; il limite viene verificato sulle ore."
          />
          <NumberField
            id="absence-current-hours"
            label="Ore di assenza conteggiate"
            value={currentHoursInput}
            onChange={setCurrentHoursInput}
            step="0.5"
            help="Sono queste ore che vengono confrontate con il limite."
          />
          <NumberField
            id="absence-limit-hours"
            label="Limite massimo (ore)"
            value={absenceLimitInput}
            onChange={setAbsenceLimitInput}
            step="0.5"
            help="Puoi correggerlo se il limite del tuo istituto è diverso."
          />
          <NumberField
            id="absence-annual-hours"
            label="Monte ore annuale"
            value={annualHoursInput}
            onChange={setAnnualHoursInput}
            step="0.5"
            help="Serve per calcolare la percentuale di assenze."
          />
          <Metric
            label="Limite massimo"
            value={
              calculation.hasConfiguredLimit
                ? `${numberLabel(calculation.absenceLimitHours)} h`
                : "Non impostato"
            }
          />
          <Metric
            label="Ore ancora disponibili"
            value={
              calculation.hasConfiguredLimit ? `${numberLabel(calculation.remainingHours)} h` : "—"
            }
          />
          <Metric
            label="Giornate intere stimate"
            value={
              calculation.hasConfiguredLimit ? `${calculation.fullDaysRemaining ?? "—"} gg` : "—"
            }
          />
          <Metric
            label="Monte ore annuale"
            value={calculation.annualHours > 0 ? `${numberLabel(calculation.annualHours)} h` : "—"}
          />
        </div>
        {percent !== null && (
          <p className="text-[11px] text-muted-foreground">
            Le ore attuali corrispondono al {numberLabel(percent)}% del monte ore annuale.
          </p>
        )}
        {calculation.hasConfiguredLimit && calculation.exceededHours > 0 && (
          <p role="status" className="text-xs font-medium text-danger">
            Il limite risulta già superato di {numberLabel(calculation.exceededHours)} ore.
          </p>
        )}
        {!calculation.hasConfiguredLimit && (
          <p role="status" className="text-xs text-warning">
            Non trovo un limite valido nei dati caricati: controlla la configurazione del registro.
          </p>
        )}
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="absence-simulation-title">
        <h3 id="absence-simulation-title" className="text-sm font-semibold">
          Simula nuove assenze
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Inserisci giorni e ore aggiuntive. I giorni vengono trasformati in ore: ad esempio, 2
          giorni × 6 ore = 12 ore aggiunte al conteggio.
        </p>
        <NumberField
          id="absence-extra-days"
          label="Giorni interi da aggiungere"
          value={simulatedDaysInput}
          onChange={setSimulatedDaysInput}
          step="1"
        />
        <NumberField
          id="absence-extra-hours"
          label="Ore aggiuntive da aggiungere"
          value={simulatedHoursInput}
          onChange={setSimulatedHoursInput}
          step="0.5"
        />
        <NumberField
          id="absence-hours-per-day"
          label="Ore di lezione per giornata"
          value={hoursPerDayInput}
          onChange={updateHoursPerDay}
          step="0.5"
          help="Usato per la conversione in giornate equivalenti; la preferenza resta su questo dispositivo ed è condivisa con l’assistente."
        />

        {calculation.hasConfiguredLimit && (
          <div
            aria-live="polite"
            className="rounded-xl border border-border bg-surface p-3 text-xs"
          >
            <p>
              La simulazione aggiunge {numberLabel(simulatedDayHours)} ore dai giorni e{" "}
              {numberLabel(simulatedManualHours)} ore inserite manualmente: in totale{" "}
              {numberLabel(calculation.simulatedHours)} ore aggiuntive. Avresti quindi{" "}
              {numberLabel(totalDaysAfterSimulation)} giornate e{" "}
              {numberLabel(calculation.simulatedTotalHours)} ore di assenza totali.
            </p>
            {calculation.simulatedExceededHours > 0 ? (
              <p className="mt-1 font-semibold text-danger">
                Il totale simulato supererebbe il limite di{" "}
                {numberLabel(calculation.simulatedExceededHours)} ore.
              </p>
            ) : calculation.simulatedRemainingHours === 0 ? (
              <p className="mt-1 font-semibold text-warning">
                {calculation.simulatedHours > 0
                  ? "Con questi valori raggiungeresti esattamente il limite."
                  : "Hai raggiunto esattamente il limite."}
              </p>
            ) : (
              <p className="mt-1 font-semibold text-success">
                Resteresti sotto il limite: avresti ancora{" "}
                {numberLabel(calculation.simulatedRemainingHours)} ore.
              </p>
            )}
            <p className="mt-2 text-muted-foreground">
              Dopo la simulazione resterebbero {calculation.fullDaysAfterSimulation ?? "—"} giornate
              intere
              {calculation.hoursPerDay > 0
                ? ` da ${numberLabel(calculation.hoursPerDay)} ore.`
                : "; inserisci le ore per giornata per calcolare l’equivalenza."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular">{value}</p>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  step,
  help,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  step: string;
  help?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {help && <p className="mt-1 text-[10px] text-muted-foreground">{help}</p>}
    </div>
  );
}
