import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Printer, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "voto.studio.classroom-seating.v1";
const MIN_SIZE = 1;
const MAX_SIZE = 8;
const MIN_SPACING = 6;
const MAX_SPACING = 32;

type ClassroomPlan = {
  className: string;
  rows: number;
  desksPerRow: number;
  seatsPerDesk: number;
  spacing: number;
  centralAisle: boolean;
  assignments: Record<string, string>;
};

const DEFAULT_PLAN: ClassroomPlan = {
  className: "La mia classe",
  rows: 5,
  desksPerRow: 4,
  seatsPerDesk: 1,
  spacing: 12,
  centralAisle: false,
  assignments: {},
};

function clampSize(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(value)));
}

function clampSpacing(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_PLAN.spacing;
  const clamped = Math.max(MIN_SPACING, Math.min(MAX_SPACING, Math.round(value)));
  return Math.round(clamped / 2) * 2;
}

function loadPlan(): ClassroomPlan {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLAN;
    const value = JSON.parse(raw) as Record<string, unknown>;
    const savedAssignments = value["assignments"];
    const assignments: Record<string, string> = {};
    if (savedAssignments && typeof savedAssignments === "object") {
      for (const [key, name] of Object.entries(savedAssignments)) {
        const migratedKey = /^\d+-\d+$/.test(key) ? `${key}-0` : key;
        if (/^\d+-\d+-\d+$/.test(migratedKey) && typeof name === "string" && name.trim()) {
          assignments[migratedKey] = name.slice(0, 48);
        }
      }
    }
    return {
      className:
        typeof value["className"] === "string"
          ? value["className"].slice(0, 32)
          : DEFAULT_PLAN.className,
      rows: clampSize(value["rows"], DEFAULT_PLAN.rows),
      desksPerRow: clampSize(value["desksPerRow"], DEFAULT_PLAN.desksPerRow),
      seatsPerDesk: clampSize(value["seatsPerDesk"], DEFAULT_PLAN.seatsPerDesk) === 2 ? 2 : 1,
      spacing: clampSpacing(value["spacing"]),
      centralAisle: value["centralAisle"] === true,
      assignments,
    };
  } catch {
    return DEFAULT_PLAN;
  }
}

function seatKey(row: number, column: number, seat: number): string {
  return `${row}-${column}-${seat}`;
}

export function ClassroomSeatingTool() {
  const [plan, setPlan] = useState<ClassroomPlan>(DEFAULT_PLAN);
  const [storageReady, setStorageReady] = useState(false);
  const [roster, setRoster] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setPlan(loadPlan());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch {
      // La piantina resta modificabile anche se lo spazio locale non è disponibile.
    }
  }, [plan, storageReady]);

  const visibleSeatKeys = useMemo(
    () =>
      Array.from({ length: plan.rows }, (_, row) =>
        Array.from({ length: plan.desksPerRow }, (_, column) =>
          Array.from({ length: plan.seatsPerDesk }, (_, seat) => seatKey(row, column, seat)),
        ).flat(),
      ).flat(),
    [plan.rows, plan.desksPerRow, plan.seatsPerDesk],
  );
  const assignedCount = visibleSeatKeys.filter((key) => plan.assignments[key]?.trim()).length;
  const hasSavedNames = Object.values(plan.assignments).some((name) => name.trim());
  const freeCount = visibleSeatKeys.length - assignedCount;
  const hasAisle = plan.centralAisle && plan.desksPerRow > 1;
  const aisleAfter = Math.ceil(plan.desksPerRow / 2);
  const aisleWidth = 34;
  const deskMinWidth = plan.seatsPerDesk === 2 ? 120 : 72;
  const gridColumns = [
    "48px",
    ...Array.from({ length: plan.desksPerRow + (hasAisle ? 1 : 0) }, (_, index) =>
      hasAisle && index === aisleAfter ? `${aisleWidth}px` : `minmax(${deskMinWidth}px, 1fr)`,
    ),
  ].join(" ");
  const trackCount = 1 + plan.desksPerRow + (hasAisle ? 1 : 0);
  const gridMinWidth = `${48 + plan.desksPerRow * deskMinWidth + (hasAisle ? aisleWidth : 0) + (trackCount - 1) * plan.spacing}px`;

  function updateSeat(key: string, value: string) {
    setPlan((current) => {
      const assignments = { ...current.assignments };
      if (value.trim()) assignments[key] = value.slice(0, 48);
      else delete assignments[key];
      return { ...current, assignments };
    });
  }

  function updateSize(field: "rows" | "desksPerRow", amount: number) {
    setPlan((current) => ({
      ...current,
      [field]: Math.max(MIN_SIZE, Math.min(MAX_SIZE, current[field] + amount)),
    }));
  }

  function assignRoster() {
    const names = roster
      .split(/[\n,;]+/)
      .map((name) => name.trim())
      .filter(Boolean);
    const freeKeys = visibleSeatKeys.filter((key) => !plan.assignments[key]?.trim());
    if (!names.length) {
      setNotice("Scrivi almeno un nome per assegnare i posti.");
      return;
    }
    if (!freeKeys.length) {
      setNotice(
        "Non ci sono posti liberi: aumenta file o banchi per fila, oppure scegli il banco a 2 posti.",
      );
      return;
    }
    const count = Math.min(names.length, freeKeys.length);
    setPlan((current) => {
      const assignments = { ...current.assignments };
      for (let index = 0; index < count; index += 1) {
        const seatKey = freeKeys[index];
        const name = names[index];
        if (seatKey && name) assignments[seatKey] = name.slice(0, 48);
      }
      return { ...current, assignments };
    });
    setRoster(names.slice(count).join("\n"));
    setNotice(
      count === names.length
        ? `${count} ${count === 1 ? "nome assegnato" : "nomi assegnati"} ai posti liberi.`
        : `${count} nomi assegnati; ${names.length - count} restano nell’elenco. Aggiungi posti e riprova.`,
    );
  }

  function clearNames() {
    if (!hasSavedNames) return;
    if (!window.confirm("Vuoi rimuovere tutti i nomi dalla piantina?")) return;
    setPlan((current) => ({ ...current, assignments: {} }));
    setNotice("Nomi rimossi dalla piantina.");
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Strumento aula
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">Piantina della classe</h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
              Organizza file e banchi, poi scrivi i nomi direttamente nei posti o assegnali da un
              elenco.
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Users className="h-5 w-5" />
          </span>
        </div>
      </section>

      <section className="card-surface space-y-4 p-4" aria-label="Impostazioni della piantina">
        <label className="block text-xs font-semibold">
          Nome della classe
          <input
            value={plan.className}
            onChange={(event) =>
              setPlan((current) => ({ ...current, className: event.target.value.slice(0, 32) }))
            }
            placeholder="Es. 2ª A"
            maxLength={32}
            className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal"
            aria-label="Nome della classe"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <NumberControl
            label="File"
            value={plan.rows}
            decrement={() => updateSize("rows", -1)}
            increment={() => updateSize("rows", 1)}
          />
          <NumberControl
            label="Banchi per fila"
            value={plan.desksPerRow}
            decrement={() => updateSize("desksPerRow", -1)}
            increment={() => updateSize("desksPerRow", 1)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold">Posti per banco</p>
          <div role="group" aria-label="Posti per banco" className="grid grid-cols-2 gap-2">
            {[1, 2].map((seats) => (
              <button
                key={seats}
                type="button"
                aria-pressed={plan.seatsPerDesk === seats}
                onClick={() => setPlan((current) => ({ ...current, seatsPerDesk: seats }))}
                className={`min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                  plan.seatsPerDesk === seats
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {seats === 1 ? "Banco singolo" : "Banco a 2 posti"}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-xs font-semibold">
          <span className="flex items-center justify-between gap-3">
            <span>Spazio tra i banchi</span>
            <span className="rounded-md bg-primary-soft px-2 py-1 text-primary">
              {plan.spacing} px
            </span>
          </span>
          <input
            type="range"
            min={MIN_SPACING}
            max={MAX_SPACING}
            step={2}
            value={plan.spacing}
            onChange={(event) =>
              setPlan((current) => ({ ...current, spacing: Number(event.target.value) }))
            }
            aria-label="Spazio tra i banchi"
            className="mt-3 w-full accent-primary"
          />
          <span className="mt-1 flex justify-between text-[10px] font-normal text-muted-foreground">
            <span>Più vicini</span>
            <span>Più distanti</span>
          </span>
        </label>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm">
          <input
            type="checkbox"
            checked={plan.centralAisle}
            onChange={(event) =>
              setPlan((current) => ({ ...current, centralAisle: event.target.checked }))
            }
            className="h-4 w-4 accent-primary"
          />
          <span>Corridoio centrale</span>
        </label>
        <p className="text-[11px] leading-5 text-muted-foreground">
          Se riduci la disposizione, i nomi dei banchi fuori vista restano salvati e riappaiono se
          aggiungi di nuovo file o posti.
        </p>
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="class-roster-title">
        <div>
          <h4 id="class-roster-title" className="font-display text-base font-semibold">
            Assegna i nomi in ordine
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Incolla un elenco: un nome per riga, oppure separato da virgole. I nomi vanno nei posti
            liberi da sinistra a destra.
          </p>
        </div>
        <textarea
          value={roster}
          onChange={(event) => setRoster(event.target.value)}
          placeholder={"Es.\nGiulia Rossi\nLuca Bianchi\nSara Verdi"}
          rows={4}
          className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Elenco dei nomi da assegnare ai posti"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={assignRoster}
            disabled={!roster.trim() || freeCount === 0}
          >
            <Users className="mr-2 h-4 w-4" /> Assegna ai posti liberi
          </Button>
          <span className="text-xs text-muted-foreground">
            {freeCount} {freeCount === 1 ? "posto libero" : "posti liberi"}
          </span>
        </div>
        {notice && (
          <p role="status" aria-live="polite" className="text-xs font-medium text-primary">
            {notice}
          </p>
        )}
      </section>

      <section className="card-surface space-y-4 p-4" aria-labelledby="class-layout-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 id="class-layout-title" className="font-display text-base font-semibold">
              {plan.className.trim() || "La mia classe"}
            </h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.rows} {plan.rows === 1 ? "fila" : "file"} · {assignedCount} su{" "}
              {visibleSeatKeys.length} posti assegnati
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Stampa
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearNames}
              disabled={!hasSavedNames}
              aria-label="Rimuovi tutti i nomi dalla piantina"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-primary/30 bg-muted/30 p-3 sm:p-4">
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
            Cattedra / lavagna
          </div>
          {hasAisle && (
            <p className="mb-3 text-center text-[10px] font-semibold text-muted-foreground">
              Corsia libera tra i due gruppi di banchi
            </p>
          )}
          <div className="overflow-x-auto pb-1">
            <div
              className="grid items-stretch"
              style={{
                gridTemplateColumns: gridColumns,
                gridTemplateRows: `repeat(${plan.rows}, minmax(84px, auto))`,
                minWidth: gridMinWidth,
                gap: `${plan.spacing}px`,
              }}
            >
              {Array.from({ length: plan.rows }, (_, row) => (
                <div
                  key={`row-${row}`}
                  className="flex items-center text-[10px] font-semibold text-muted-foreground"
                  style={{ gridColumn: 1, gridRow: row + 1 }}
                >
                  Fila {row + 1}
                </div>
              ))}
              {Array.from({ length: plan.rows }, (_, row) =>
                Array.from({ length: plan.desksPerRow }, (_, column) => {
                  const deskNumber = row * plan.desksPerRow + column + 1;
                  const gridColumn = 2 + column + (hasAisle && column >= aisleAfter ? 1 : 0);
                  return (
                    <div
                      key={`desk-${row}-${column}`}
                      style={{ gridColumn, gridRow: row + 1 }}
                      className="grid min-h-[84px] content-center gap-1 rounded-lg border border-border bg-card p-2 text-center shadow-sm"
                    >
                      <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                        Banco {deskNumber}
                      </span>
                      <div
                        className={
                          plan.seatsPerDesk === 2 ? "grid grid-cols-2 gap-1" : "grid grid-cols-1"
                        }
                      >
                        {Array.from({ length: plan.seatsPerDesk }, (_, seat) => {
                          const key = seatKey(row, column, seat);
                          const seatNumber =
                            (row * plan.desksPerRow + column) * plan.seatsPerDesk + seat + 1;
                          const seatLabel =
                            plan.seatsPerDesk === 2 ? (seat === 0 ? "A" : "B") : String(seatNumber);
                          return (
                            <label key={key} className="min-w-0">
                              {plan.seatsPerDesk === 2 && (
                                <span className="mb-0.5 block text-[8px] font-semibold text-muted-foreground">
                                  Posto {seatLabel}
                                </span>
                              )}
                              <input
                                value={plan.assignments[key] ?? ""}
                                onChange={(event) => updateSeat(key, event.target.value)}
                                maxLength={48}
                                placeholder={plan.seatsPerDesk === 2 ? `Nome ${seatLabel}` : "Nome"}
                                autoComplete="off"
                                aria-label={`Nome alunno, fila ${row + 1}, banco ${deskNumber}, posto ${seatLabel}`}
                                className="min-w-0 w-full rounded bg-transparent px-0 text-center text-[11px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }),
              )}
              {hasAisle && (
                <div
                  role="img"
                  aria-label={`Corridoio centrale continuo per tutte le ${plan.rows} file`}
                  className="z-10 flex items-center justify-center rounded-md border-x-2 border-dashed border-primary/45 bg-primary/10"
                  style={{ gridColumn: aisleAfter + 2, gridRow: `1 / span ${plan.rows}` }}
                >
                  <span className="text-[8px] font-bold text-primary [writing-mode:vertical-rl]">
                    PASSAGGIO
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">
          La piantina e i nomi sono salvati solo su questo dispositivo, non vengono caricati online.
          Usa “Stampa” per salvarla o stamparla.
        </p>
      </section>
    </div>
  );
}

function NumberControl({
  label,
  value,
  decrement,
  increment,
}: {
  label: string;
  value: number;
  decrement: () => void;
  increment: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-2 text-xs font-semibold">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={decrement}
          disabled={value <= MIN_SIZE}
          aria-label={`Riduci ${label.toLocaleLowerCase("it-IT")}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-8 text-center text-base font-semibold" aria-live="polite">
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={increment}
          disabled={value >= MAX_SIZE}
          aria-label={`Aumenta ${label.toLocaleLowerCase("it-IT")}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
