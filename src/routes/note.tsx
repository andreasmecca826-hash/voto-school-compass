import { createFileRoute } from "@tanstack/react-router";
import { Check, StickyNote } from "lucide-react";
import { useMemo } from "react";
import { Empty, SectionTitle } from "@/components/voto/ui";
import { fmtDate } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";

export const Route = createFileRoute("/note")({
  head: () => ({
    meta: [
      { title: "Note — VOTO." },
      { name: "description", content: "Note disciplinari e annotazioni dal registro scolastico." },
    ],
  }),
  component: Note,
});

function Note() {
  const v = useVoto();
  const notes = useMemo(
    () =>
      v.data.notifications
        .filter((notification) => notification.type === "note")
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [v.data.notifications],
  );

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Note</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Note disciplinari e annotazioni ricevute dal registro.
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <StickyNote className="h-5 w-5" />
        </span>
      </div>

      <SectionTitle>Note dal registro</SectionTitle>
      {notes.length === 0 ? (
        <Empty
          icon={<StickyNote className="h-6 w-6" />}
          title="Nessuna nota"
          text={
            v.source === "demo"
              ? "Le note appariranno quando colleghi i dati reali del registro."
              : "Non risultano note nei dati sincronizzati."
          }
        />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => {
            const read = v.isRead(note.id, note.read);
            return (
              <li key={note.id} className={`card-surface p-4 ${!read ? "border-primary/30" : ""}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <StickyNote className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-semibold">{note.title}</h2>
                      {!read && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Nuova
                        </span>
                      )}
                    </div>
                    {note.message ? (
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {note.message}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Il registro non ha fornito altri dettagli per questa nota.
                      </p>
                    )}
                    {note.subject && (
                      <p className="mt-2 text-xs text-muted-foreground">{note.subject}</p>
                    )}
                    {note.teacher && (
                      <p className="mt-1 text-xs text-muted-foreground">Docente: {note.teacher}</p>
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        {fmtDate(note.date, { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                      {!read && (
                        <button
                          type="button"
                          onClick={() => v.markRead([note.id])}
                          className="press inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold"
                        >
                          <Check className="h-3.5 w-3.5" /> Segna come letta
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
  );
}
