import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Check, ChevronDown, Clock3 } from "lucide-react";
import { useMemo } from "react";
import { Empty } from "@/components/voto/ui";
import { fmtDate } from "@/lib/voto/dates";
import { selectPastReminders, selectUpcomingReminders } from "@/lib/voto/selectors";
import { useClock, useVoto } from "@/lib/voto/store";
import { reminderDateToIso } from "@/lib/voto/interrogazioni";

export const Route = createFileRoute("/promemoria")({
  head: () => ({
    meta: [
      { title: "Promemoria — VOTO." },
      { name: "description", content: "Promemoria sincronizzati dal registro DidUP." },
    ],
  }),
  component: Promemoria,
});

function Promemoria() {
  const v = useVoto();
  const now = useClock();
  const upcoming = useMemo(
    () => selectUpcomingReminders(v.data.notifications, now),
    [now, v.data.notifications],
  );
  const past = useMemo(
    () => selectPastReminders(v.data.notifications, now, 30),
    [now, v.data.notifications],
  );
  const renderReminder = (reminder: (typeof upcoming)[number]) => {
    const read = v.isRead(reminder.id, reminder.read);
    const addedToVerifications = v.interrogazioni.some((item) => item.reminderId === reminder.id);
    return (
      <li key={reminder.id} className={`card-surface p-4 ${!read ? "border-primary/30" : ""}`}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Clock3 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{reminder.title}</h2>
              {!read && (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Nuovo
                </span>
              )}
            </div>
            {reminder.message ? (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {reminder.message}
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                DidUP non ha fornito altri dettagli per questo promemoria.
              </p>
            )}
            {reminder.subject && (
              <p className="mt-2 text-xs text-muted-foreground">{reminder.subject}</p>
            )}
            {reminder.teacher && (
              <p className="mt-1 text-xs text-muted-foreground">Docente: {reminder.teacher}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                {reminder.date
                  ? fmtDate(reminder.date, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Senza data"}
              </span>
              {!read && (
                <button
                  type="button"
                  onClick={() => v.markRead([reminder.id])}
                  className="press inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                >
                  <Check className="h-3.5 w-3.5" /> Segna come letto
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={addedToVerifications}
              onClick={() => {
                const date = reminderDateToIso(reminder.date);
                const title = reminder.title.trim();
                const subject = reminder.subject?.trim() || title || "Promemoria";
                const notes = [
                  reminder.message?.trim(),
                  !date ? "Data non specificata nel promemoria: da definire." : undefined,
                ]
                  .filter(Boolean)
                  .join("\n\n");
                v.addInterrogazione({
                  subject,
                  date: date ?? "",
                  notes: notes || undefined,
                  reminderId: reminder.id,
                });
              }}
              className="press mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary disabled:border-success/30 disabled:bg-success-soft disabled:text-success"
            >
              {addedToVerifications ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Aggiunto a Verifiche
                </>
              ) : (
                <>
                  <CalendarPlus className="h-3.5 w-3.5" /> Aggiungi a Verifiche
                </>
              )}
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Promemoria</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Promemoria sincronizzati dal registro DidUP.
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Clock3 className="h-5 w-5" />
        </span>
      </div>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold">Oggi e prossimamente</h2>
        {upcoming.length === 0 ? (
          <Empty
            icon={<Clock3 className="h-6 w-6" />}
            title="Nessun promemoria futuro"
            text={
              v.source === "demo"
                ? "I promemoria futuri appariranno quando colleghi i dati reali del registro."
                : "Non risultano promemoria futuri nei dati sincronizzati da DidUP."
            }
          />
        ) : (
          <ul className="space-y-3">{upcoming.map(renderReminder)}</ul>
        )}
      </section>

      <details className="card-surface mt-5 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold">
          <span>Promemoria passati</span>
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Ultimi 30 giorni <ChevronDown className="h-4 w-4" />
          </span>
        </summary>
        <div className="border-t border-border p-4">
          {past.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Non ci sono promemoria passati negli ultimi 30 giorni.
            </p>
          ) : (
            <ul className="space-y-3">{past.map(renderReminder)}</ul>
          )}
        </div>
      </details>
    </div>
  );
}
