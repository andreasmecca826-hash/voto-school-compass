import { ChevronDown, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { loadAbsenceHoursPerDay, saveAbsenceHoursPerDay } from "@/lib/voto/absence-preferences";
import { calculateAbsencePlan } from "@/lib/voto/absence-calculator";
import { fmt } from "@/lib/voto/calc";
import { cn } from "@/lib/utils";
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
  const [simulatedDaysInput, setSimulatedDaysInput] = useState("");
  const [simulatedHoursInput, setSimulatedHoursInput] = useState("");
  const [hoursPerDayInput, setHoursPerDayInput] = useState("6");
  const [editCurrentData, setEditCurrentData] = useState(false);
  const [editDayLength, setEditDayLength] = useState(false);

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

  const currentDays = numericInput(currentDaysInput);
  const simulatedDays = numericInput(simulatedDaysInput);
  const simulatedManualHours = numericInput(simulatedHoursInput);
  const hoursPerDay = numericInput(hoursPerDayInput);
  const simulatedDayHours = simulatedDays * hoursPerDay;
  const simulatedHours = simulatedDayHours + simulatedManualHours;
  const calculation = calculateAbsencePlan({
    absenceHours: numericInput(currentHoursInput),
    absenceLimitHours: numericInput(absenceLimitInput),
    annualHours: numericInput(annualHoursInput),
    simulatedHours,
    hoursPerDay,
  });
  const simulationStarted = simulatedDays > 0 || simulatedManualHours > 0;
  const usagePercent = calculation.hasConfiguredLimit
    ? (calculation.absenceHours / calculation.absenceLimitHours) * 100
    : 0;
  const progressWidth = Math.min(100, Math.max(0, usagePercent));
  const annualPercent = calculation.currentAnnualPercentage;
  const totalDaysAfterSimulation = currentDays + simulatedDays;

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Il limite è espresso in ore. I dati iniziali arrivano dal registro; puoi modificarli solo
        per questa prova.
      </p>

      <section className="card-surface space-y-4 p-4" aria-labelledby="absence-current-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="absence-current-title" className="text-sm font-semibold">
              Situazione attuale
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {numberLabel(calculation.absenceHours)} ore conteggiate · {numberLabel(currentDays)}{" "}
              giorni nel registro
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Limite</p>
            <p className="tabular text-sm font-semibold">
              {calculation.hasConfiguredLimit
                ? `${numberLabel(calculation.absenceLimitHours)} h`
                : "Non impostato"}
            </p>
          </div>
        </div>

        {calculation.hasConfiguredLimit ? (
          <>
            <div
              role="progressbar"
              aria-label="Limite di assenze già utilizzato"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round(usagePercent))}
              className="h-2 overflow-hidden rounded-full bg-surface"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  usagePercent >= 90 ? "bg-danger" : "bg-primary",
                )}
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  {calculation.exceededHours > 0 ? "Limite superato di" : "Ti restano"}
                </p>
                <p
                  className={cn(
                    "tabular font-display text-3xl font-bold",
                    calculation.exceededHours > 0 ? "text-danger" : "text-foreground",
                  )}
                >
                  {numberLabel(
                    calculation.exceededHours > 0
                      ? calculation.exceededHours
                      : calculation.remainingHours,
                  )}
                  <span className="ml-1 text-base font-semibold">h</span>
                </p>
              </div>
              <p className="max-w-[45%] text-right text-xs text-muted-foreground">
                ≈ {calculation.fullDaysRemaining ?? "—"} giornate intere
                {hoursPerDay > 0 && ` da ${numberLabel(hoursPerDay)} h`}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
              <span>{numberLabel(usagePercent)}% del limite usato</span>
              {annualPercent !== null && (
                <span>{numberLabel(annualPercent)}% del monte ore annuale</span>
              )}
            </div>
          </>
        ) : (
          <p role="status" className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
            Il registro non ha fornito un limite valido. Puoi inserirlo in “Modifica dati”.
          </p>
        )}

        <button
          type="button"
          aria-expanded={editCurrentData}
          aria-controls="absence-current-fields"
          onClick={() => setEditCurrentData((open) => !open)}
          className="press inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-primary"
        >
          <Pencil className="h-3.5 w-3.5" />
          {editCurrentData ? "Nascondi dati" : "Modifica dati"}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", editCurrentData && "rotate-180")}
          />
        </button>

        {editCurrentData && (
          <div id="absence-current-fields" className="space-y-3 border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground">
              Questi valori servono solo a personalizzare il calcolo: non cambiano il registro.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                id="absence-current-days"
                label="Giorni già assenti"
                value={currentDaysInput}
                onChange={setCurrentDaysInput}
                step="0.5"
              />
              <NumberField
                id="absence-current-hours"
                label="Ore conteggiate"
                value={currentHoursInput}
                onChange={setCurrentHoursInput}
                step="0.5"
              />
              <NumberField
                id="absence-limit-hours"
                label="Limite massimo (ore)"
                value={absenceLimitInput}
                onChange={setAbsenceLimitInput}
                step="0.5"
              />
              <NumberField
                id="absence-annual-hours"
                label="Monte ore annuale"
                value={annualHoursInput}
                onChange={setAnnualHoursInput}
                step="0.5"
              />
            </div>
          </div>
        )}
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="absence-simulation-title">
        <div>
          <h3 id="absence-simulation-title" className="text-sm font-semibold">
            Fai una prova
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Quante altre assenze vuoi aggiungere? Inserisci giorni, ore o entrambi.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="absence-extra-days"
            label="Giorni in più"
            value={simulatedDaysInput}
            onChange={setSimulatedDaysInput}
            step="1"
          />
          <NumberField
            id="absence-extra-hours"
            label="Ore in più"
            value={simulatedHoursInput}
            onChange={setSimulatedHoursInput}
            step="0.5"
          />
        </div>

        <div className="rounded-lg bg-surface px-3 py-2.5">
          <button
            type="button"
            aria-expanded={editDayLength}
            aria-controls="absence-day-length"
            onClick={() => setEditDayLength((open) => !open)}
            className="press flex min-h-7 w-full items-center justify-between gap-2 text-left text-[11px] text-muted-foreground"
          >
            <span>
              1 giornata = {numberLabel(hoursPerDay)} ore
              {!editDayLength && " · cambia"}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform", editDayLength && "rotate-180")}
            />
          </button>
          {editDayLength && (
            <div id="absence-day-length" className="mt-2">
              <NumberField
                id="absence-hours-per-day"
                label="Ore di lezione per giornata"
                value={hoursPerDayInput}
                onChange={updateHoursPerDay}
                step="0.5"
                help="Salvato solo su questo dispositivo."
              />
            </div>
          )}
        </div>

        {!simulationStarted ? (
          <p className="rounded-lg bg-surface p-3 text-xs text-muted-foreground">
            Inserisci un numero per vedere come cambierebbe il totale.
          </p>
        ) : !calculation.hasConfiguredLimit ? (
          <p className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
            Prima inserisci il limite massimo in “Modifica dati”.
          </p>
        ) : (
          <div
            aria-live="polite"
            className={cn(
              "space-y-2 rounded-xl border p-3",
              calculation.simulatedExceededHours > 0
                ? "border-danger/25 bg-danger-soft/50"
                : calculation.simulatedRemainingHours === 0
                  ? "border-warning/25 bg-warning/10"
                  : "border-success/25 bg-success-soft/40",
            )}
          >
            <p className="text-xs font-semibold text-muted-foreground">Dopo la prova</p>
            <p
              className={cn(
                "text-sm font-semibold",
                calculation.simulatedExceededHours > 0
                  ? "text-danger"
                  : calculation.simulatedRemainingHours === 0
                    ? "text-warning"
                    : "text-success",
              )}
            >
              {calculation.simulatedExceededHours > 0
                ? `Supereresti il limite di ${numberLabel(calculation.simulatedExceededHours)} h`
                : calculation.simulatedRemainingHours === 0
                  ? "Raggiungeresti il limite"
                  : `Ti resterebbero ${numberLabel(calculation.simulatedRemainingHours)} h`}
            </p>
            <p className="text-xs text-muted-foreground">
              Totale: {numberLabel(calculation.simulatedTotalHours)} h su{" "}
              {numberLabel(calculation.absenceLimitHours)} h · circa{" "}
              {numberLabel(totalDaysAfterSimulation)} giorni complessivi.
            </p>
            <p className="text-[11px] text-muted-foreground">
              Le nuove assenze aggiungono {numberLabel(simulatedHours)} h al conteggio.
              {calculation.fullDaysAfterSimulation !== null &&
                ` Resterebbero circa ${calculation.fullDaysAfterSimulation} giornate intere.`}
            </p>
          </div>
        )}
      </section>
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
