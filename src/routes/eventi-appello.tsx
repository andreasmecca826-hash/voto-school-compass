import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, CalendarX2, CheckCircle2, Clock3, LogOut } from "lucide-react";
import { useMemo, useState } from "react";
import type { AttendanceEvent, AttendanceEventType } from "@/lib/voto/types";
import { useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/eventi-appello")({
  head: () => ({
    meta: [
      { title: "Tutti gli eventi — VOTO." },
      {
        name: "description",
        content: "Consulta assenze, ritardi e uscite in una schermata personalizzata.",
      },
    ],
  }),
  component: EventiAppello,
});

type EventFilter = "all" | AttendanceEventType;

function formatDate(iso: string) {
  const parsed = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function isJustified(event: AttendanceEvent) {
  const status = event.justificationStatus?.trim().toLocaleLowerCase("it-IT");
  if (!status || status.includes("da giustificare") || status.includes("non giustificat"))
    return false;
  return (
    status.startsWith("giustificat") ||
    ["ok", "approved", "complete", "completata", "completato"].includes(status)
  );
}

const FILTERS: { value: EventFilter; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "absence", label: "Assenze" },
  { value: "delay", label: "Ritardi" },
  { value: "earlyExit", label: "Uscite" },
];

function eventMeta(type: AttendanceEventType) {
  if (type === "absence") {
    return {
      label: "Assenza",
      description: "Giorno di assenza",
      icon: CalendarX2,
      tone: "text-danger bg-danger-soft",
    };
  }
  if (type === "delay") {
    return {
      label: "Ritardo",
      description: "Ingresso in ritardo",
      icon: Clock3,
      tone: "text-warning bg-warning-soft",
    };
  }
  return {
    label: "Uscita anticipata",
    description: "Uscita registrata",
    icon: LogOut,
    tone: "text-primary bg-primary-soft",
  };
}

function EventiAppello() {
  const v = useVoto();
  const [filter, setFilter] = useState<EventFilter>("all");
  const [onlyPending, setOnlyPending] = useState(false);
  const events = useMemo(
    () => [...(v.data.attendanceEvents ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [v.data.attendanceEvents],
  );
  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          (filter === "all" || event.type === filter) && (!onlyPending || !isJustified(event)),
      ),
    [events, filter, onlyPending],
  );
  const counts = useMemo(
    () => ({
      absence: events.filter((event) => event.type === "absence").length,
      delay: events.filter((event) => event.type === "delay").length,
      earlyExit: events.filter((event) => event.type === "earlyExit").length,
    }),
    [events],
  );
  const pendingCount = events.filter((event) => !isJustified(event)).length;

  return (
    <div className="min-h-dvh pb-8">
      <header className="flex items-center gap-3 py-2">
        <Link
          to="/"
          aria-label="Torna alla dashboard"
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Presenze</p>
          <h1 className="truncate font-display text-2xl font-semibold">Tutti gli eventi</h1>
        </div>
        <CalendarDays className="h-7 w-7 text-primary" />
      </header>

      <section className="card-surface mt-4 p-4" aria-label="Riepilogo eventi">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Riepilogo personale</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Summary
            value={counts.absence || Math.round(v.data.attendance.absenceDays)}
            label="Assenze"
            tone="danger"
          />
          <Summary
            value={counts.delay || v.data.attendance.delays}
            label="Ritardi"
            tone="warning"
          />
          <Summary
            value={counts.earlyExit || v.data.attendance.earlyExits}
            label="Uscite"
            tone="primary"
          />
        </div>
      </section>

      <div
        className="mt-6 flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Filtra eventi"
      >
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={cn(
              "press shrink-0 rounded-full border px-4 py-2 text-xs font-semibold",
              filter === item.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        aria-pressed={onlyPending}
        onClick={() => setOnlyPending((current) => !current)}
        className={cn(
          "mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm",
          onlyPending ? "border-warning bg-warning-soft" : "border-border bg-card",
        )}
      >
        <span>Mostra solo da giustificare</span>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold">
          {pendingCount}
        </span>
      </button>

      <h2 className="mt-6 font-display text-lg font-semibold">Eventi registrati</h2>
      {visibleEvents.length === 0 ? (
        <section className="card-surface mt-3 p-8 text-center text-sm text-muted-foreground">
          <CalendarDays className="mx-auto h-8 w-8 opacity-60" />
          <p className="mt-3">
            {events.length === 0
              ? "Non ci sono date dettagliate negli eventi sincronizzati."
              : onlyPending
                ? "Non ci sono eventi da giustificare."
                : "Nessun evento per questo filtro."}
          </p>
        </section>
      ) : (
        <ul className="mt-3 space-y-2">
          {visibleEvents.map((event) => {
            const meta = eventMeta(event.type);
            const Icon = meta.icon;
            const justified = isJustified(event);
            return (
              <li key={event.id} className="card-surface flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    meta.tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{meta.label}</p>
                  <time
                    dateTime={event.date}
                    className="mt-0.5 block text-xs capitalize text-muted-foreground"
                  >
                    {formatDate(event.date)}
                  </time>
                  <p className="mt-1 text-[11px] text-muted-foreground">{meta.description}</p>
                </div>
                <span
                  className={cn(
                    "flex shrink-0 items-center gap-1 text-[10px] font-semibold",
                    justified ? "text-success" : "text-danger",
                  )}
                >
                  {justified ? <CheckCircle2 className="h-4 w-4" /> : null}
                  {justified ? "Giustificato" : "Da giustificare"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Summary({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "danger" | "warning" | "primary";
}) {
  const toneClass = { danger: "text-danger", warning: "text-warning", primary: "text-primary" }[
    tone
  ];
  return (
    <div className="rounded-xl bg-surface p-3 text-center">
      <p className={cn("tabular text-2xl font-bold", toneClass)}>{value}</p>
      <p className="mt-1 text-[10px] uppercase text-muted-foreground">{label}</p>
    </div>
  );
}
