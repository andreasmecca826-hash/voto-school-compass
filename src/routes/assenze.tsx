import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CalendarX2, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assenze")({
  head: () => ({
    meta: [
      { title: "Assenze — VOTO." },
      { name: "description", content: "Consulta i giorni di assenza registrati nel registro." },
    ],
  }),
  component: Assenze,
});

function formatDate(date: string) {
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function Assenze() {
  const v = useVoto();
  const isDidup = v.registryStyle === "didup";
  const absences = useMemo(
    () =>
      (v.data.attendanceEvents ?? [])
        .filter((event) => event.type === "absence")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [v.data.attendanceEvents],
  );

  return (
    <div
      className={cn(
        "min-h-dvh pb-8",
        isDidup ? "didup-page bg-black px-3 pb-[110px] text-white" : "pt-2",
      )}
    >
      <header className={cn("flex items-center gap-3", isDidup ? "pt-3" : "py-2")}>
        <Link
          to="/"
          aria-label="Torna alla dashboard"
          className={cn(
            "press flex h-10 w-10 items-center justify-center rounded-full",
            isDidup ? "text-white" : "border border-border text-foreground",
          )}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[11px] uppercase tracking-wide",
              isDidup ? "text-white/55" : "text-muted-foreground",
            )}
          >
            Presenze
          </p>
          <h1 className="truncate font-display text-2xl font-semibold">Assenze</h1>
        </div>
        <CalendarX2 className={cn("h-7 w-7", isDidup ? "text-[#e56b6f]" : "text-danger")} />
      </header>

      <section
        aria-label="Riepilogo assenze"
        className={cn(
          "mt-4 rounded-2xl border p-4",
          isDidup ? "border-white/10 bg-[#262626]" : "card-surface",
        )}
      >
        <p
          className={cn(
            "text-xs uppercase tracking-wide",
            isDidup ? "text-white/55" : "text-muted-foreground",
          )}
        >
          Giorni di assenza
        </p>
        <p
          className={cn(
            "mt-1 font-display text-4xl font-bold",
            isDidup ? "text-[#e56b6f]" : "text-danger",
          )}
        >
          {Math.round(v.data.attendance.absenceDays)}
        </p>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Giorni registrati</h2>
        <Link
          to="/eventi-appello"
          className={cn(
            "press flex items-center gap-1 text-xs font-semibold",
            isDidup ? "text-[#08a5b5]" : "text-primary",
          )}
        >
          Tutti gli eventi <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {absences.length === 0 ? (
        <section
          className={cn(
            "mt-3 rounded-2xl border p-8 text-center",
            isDidup
              ? "border-white/10 bg-[#262626] text-white/60"
              : "card-surface text-muted-foreground",
          )}
        >
          <CalendarDays className="mx-auto h-8 w-8 opacity-60" />
          <p className="mt-3 text-sm">
            Non ci sono date di assenza dettagliate nei dati sincronizzati.
          </p>
        </section>
      ) : (
        <ul className={cn("mt-3 divide-y", isDidup ? "divide-white/10" : "divide-border")}>
          {absences.map((event) => (
            <li
              key={event.id}
              className={cn(
                "flex items-center gap-3 px-2 py-4",
                isDidup ? "text-white" : "text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                  isDidup ? "bg-[#45282b] text-[#e56b6f]" : "bg-danger-soft text-danger",
                )}
              >
                <CalendarX2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold capitalize">{formatDate(event.date)}</p>
                <p
                  className={cn(
                    "mt-0.5 text-xs",
                    isDidup ? "text-white/55" : "text-muted-foreground",
                  )}
                >
                  Assenza
                  {event.justificationStatus ? ` · ${event.justificationStatus}` : " registrata"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
