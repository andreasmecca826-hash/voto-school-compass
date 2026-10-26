import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { arithmeticMean, fmt } from "@/lib/voto/calc";

type NumberEntry = { id: number; value: string };

export function GenericAverageCalculator() {
  const [entries, setEntries] = useState<NumberEntry[]>([
    { id: 0, value: "" },
    { id: 1, value: "" },
  ]);
  const [nextId, setNextId] = useState(2);
  const values = entries
    .map((entry) => entry.value.trim())
    .filter((value) => value !== "")
    .map(Number)
    .filter(Number.isFinite);
  const result = arithmeticMean(values);

  const addEntry = () => {
    setEntries((current) => [...current, { id: nextId, value: "" }]);
    setNextId((current) => current + 1);
  };

  const updateEntry = (id: number, value: string) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, value } : entry)),
    );
  };

  const removeEntry = (id: number) => {
    setEntries((current) =>
      current.length > 1 ? current.filter((entry) => entry.id !== id) : current,
    );
  };

  const clearEntries = () => {
    setEntries([{ id: nextId, value: "" }]);
    setNextId((current) => current + 1);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Inserisci i numeri che vuoi: la media semplice si aggiorna subito e non modifica i voti del
        registro.
      </p>
      {entries.map((entry, index) => (
        <div key={entry.id} className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`generic-average-${entry.id}`}>
            Numero {index + 1}
          </label>
          <input
            id={`generic-average-${entry.id}`}
            type="number"
            inputMode="decimal"
            step="any"
            value={entry.value}
            onChange={(event) => updateEntry(entry.id, event.target.value)}
            placeholder={`Numero ${index + 1}`}
            className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-sm tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            disabled={entries.length === 1}
            onClick={() => removeEntry(entry.id)}
            aria-label={`Rimuovi numero ${index + 1}`}
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addEntry}
          className="press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary"
        >
          <Plus className="h-4 w-4" /> Aggiungi numero
        </button>
        <button
          type="button"
          onClick={clearEntries}
          className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" /> Azzera
        </button>
      </div>

      <div aria-live="polite" className="card-surface flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Media semplice</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {values.length} {values.length === 1 ? "numero inserito" : "numeri inseriti"}
          </p>
        </div>
        <span className="tabular font-display text-3xl font-semibold text-primary">
          {result === null ? "—" : fmt(result, 2)}
        </span>
      </div>
    </div>
  );
}
