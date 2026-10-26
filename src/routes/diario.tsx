import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Clock3, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty, SectionTitle } from "@/components/voto/ui";
import { fmtDate } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";

export const Route = createFileRoute("/diario")({
  head: () => ({
    meta: [
      { title: "Diario — VOTO." },
      { name: "description", content: "Le attività svolte in classe dai professori." },
    ],
  }),
  component: Diario,
});

function Diario() {
  const v = useVoto();
  const [subject, setSubject] = useState("tutte");
  const subjects = useMemo(
    () =>
      [...new Set(v.data.diary.map((entry) => entry.subject).filter(Boolean) as string[])].sort(),
    [v.data.diary],
  );
  const entries = useMemo(
    () =>
      v.data.diary
        .filter((entry) => subject === "tutte" || entry.subject === subject)
        .sort((a, b) => `${b.date}${b.hour ?? ""}`.localeCompare(`${a.date}${a.hour ?? ""}`)),
    [subject, v.data.diary],
  );
  const days = useMemo(() => {
    const grouped = new Map<string, typeof entries>();
    entries.forEach((entry) =>
      grouped.set(entry.date, [...(grouped.get(entry.date) ?? []), entry]),
    );
    return [...grouped.entries()];
  }, [entries]);

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Diario</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Cosa hanno svolto i professori in classe.
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <BookOpen className="h-5 w-5" />
        </span>
      </div>
      <SectionTitle>Attività svolte</SectionTitle>
      {subjects.length > 0 && (
        <select
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="mb-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
          aria-label="Filtra per materia"
        >
          <option value="tutte">Tutte le materie</option>
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      )}
      {days.length === 0 ? (
        <Empty
          icon={<BookOpen className="h-6 w-6" />}
          title="Nessuna attività"
          text={
            v.source === "demo"
              ? "Il diario apparirà quando colleghi i dati reali del registro."
              : "Non ci sono attività per questo filtro."
          }
        />
      ) : (
        <div className="space-y-5">
          {days.map(([date, dayEntries]) => (
            <section key={date}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold capitalize">
                <CalendarDays className="h-4 w-4 text-primary" />
                {fmtDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
              <ul className="space-y-2">
                {dayEntries.map((entry) => (
                  <li key={entry.id} className="card-surface p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="font-semibold">{entry.subject || "Attività"}</p>
                          {entry.hour && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" />
                              {entry.hour}ª ora
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-foreground">
                          {entry.activity}
                        </p>
                        {entry.teacher && (
                          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <UserRound className="h-3.5 w-3.5" />
                            {entry.teacher}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
