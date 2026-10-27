import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock3 } from "lucide-react";
import { useMemo } from "react";
import { Empty } from "@/components/voto/ui";
import { fmtDate } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";

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
  const reminders = useMemo(
    () =>
      v.data.notifications
        .filter((notification) => notification.type === "reminder")
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [v.data.notifications],
  );

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

      <div className="mt-5">
        {reminders.length === 0 ? (
          <Empty
            icon={<Clock3 className="h-6 w-6" />}
            title="Nessun promemoria"
            text={
              v.source === "demo"
                ? "I promemoria appariranno quando colleghi i dati reali del registro."
                : "Non risultano promemoria nei dati sincronizzati da DidUP."
            }
          />
        ) : (
          <ul className="space-y-3">
            {reminders.map((reminder) => {
              const read = v.isRead(reminder.id, reminder.read);
              return (
                <li
                  key={reminder.id}
                  className={`card-surface p-4 ${!read ? "border-primary/30" : ""}`}
                >
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
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[11px] text-muted-foreground">
                          {fmtDate(reminder.date, {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
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
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
