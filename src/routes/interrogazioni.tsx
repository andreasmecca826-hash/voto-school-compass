import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Check, Clock3, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty, SectionTitle } from "@/components/voto/ui";
import { fmtDate } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interrogazioni")({
  head: () => ({
    meta: [
      { title: "Interrogazioni — VOTO." },
      { name: "description", content: "Ricorda le prossime interrogazioni." },
    ],
  }),
  component: Interrogazioni,
});

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function Interrogazioni() {
  const v = useVoto();
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState(todayIso);
  const [hour, setHour] = useState(1);
  const [notes, setNotes] = useState("");
  const items = useMemo(
    () =>
      [...v.interrogazioni].sort(
        (a, b) =>
          Number(a.completed) - Number(b.completed) ||
          `${a.date}${a.hour ?? 0}`.localeCompare(`${b.date}${b.hour ?? 0}`),
      ),
    [v.interrogazioni],
  );

  function add() {
    const cleanSubject = subject.trim();
    if (!cleanSubject || !date) return;
    v.addInterrogazione({ subject: cleanSubject, date, hour, notes: notes.trim() || undefined });
    setSubject("");
    setHour(1);
    setNotes("");
  }

  return (
    <div className="pt-3">
      <h1 className="font-display text-2xl font-semibold">Interrogazioni</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Segna qui le prossime interrogazioni da ricordare.
      </p>

      <SectionTitle>Nuova interrogazione</SectionTitle>
      <section className="card-surface p-4">
        <label
          className="text-xs font-medium text-muted-foreground"
          htmlFor="interrogazione-materia"
        >
          Materia
        </label>
        <input
          id="interrogazione-materia"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Es. Matematica"
          className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Data
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Fascia oraria
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  {value}ª ora
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Note
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Capitoli, argomenti..."
            rows={2}
            className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={!subject.trim() || !date}
          onClick={add}
          className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Aggiungi
        </button>
      </section>

      <SectionTitle>Le tue interrogazioni</SectionTitle>
      {items.length === 0 ? (
        <Empty
          icon={<CalendarDays className="h-6 w-6" />}
          title="Nessuna interrogazione"
          text="Aggiungi una data per non dimenticarla."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const reminderDescription = item.reminderId ? item.notes?.trim() : undefined;
            const subjectLabel = item.subject.trim();
            const showSubjectLabel =
              reminderDescription &&
              subjectLabel &&
              subjectLabel.toLocaleLowerCase("it-IT") !== "promemoria" &&
              subjectLabel !== reminderDescription;

            return (
              <li
                key={item.id}
                className={cn(
                  "card-surface flex items-start gap-3 p-3.5",
                  item.completed && "opacity-55",
                )}
              >
                <button
                  type="button"
                  onClick={() => v.toggleInterrogazione(item.id)}
                  aria-label={item.completed ? "Segna come da fare" : "Segna come fatta"}
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    item.completed
                      ? "border-success bg-success-soft text-success"
                      : "border-border text-muted-foreground",
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "min-w-0 flex-1 whitespace-pre-wrap font-semibold leading-relaxed",
                        item.completed && "line-through",
                      )}
                    >
                      {reminderDescription || item.subject}
                    </p>
                    {item.reminderId && (
                      <span className="shrink-0 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary">
                        Promemoria
                      </span>
                    )}
                  </div>
                  {showSubjectLabel && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{subjectLabel}</p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {item.date ? fmtDate(item.date) : "Data da definire"}
                    </span>
                    {(item.hour || item.time) && (
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {item.hour ? `${item.hour}ª ora` : item.time}
                      </span>
                    )}
                  </div>
                  {item.notes && !item.reminderId && (
                    <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => v.removeInterrogazione(item.id)}
                  aria-label={`Elimina interrogazione di ${item.subject}`}
                  className="press rounded-lg p-2 text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
