import { useMemo, useState } from "react";
import { AlertCircle, CalendarDays, ChevronDown } from "lucide-react";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";
import type { AttendanceEvent } from "@/lib/voto/types";

type DayStatus = "present" | "absence" | "exception" | "future";
type CalendarDay = { date: string; day: number; status: DayStatus; event?: AttendanceEvent };
type Month = { key: string; label: string; days: CalendarDay[]; exceptionCount: number };

const MONTHS = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];
const EMPTY_EVENTS: AttendanceEvent[] = [];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isWeekday(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function createMonths(year: number, events: AttendanceEvent[], today: string): Month[] {
  const eventByDate = new Map(events.map((event) => [event.date.slice(0, 10), event]));
  return Array.from({ length: 10 }, (_, index) => {
    const monthIndex = (8 + index) % 12;
    const monthYear = index < 4 ? year : year + 1;
    const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
    const days: CalendarDay[] = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(monthYear, monthIndex, day);
      if (!isWeekday(date)) continue;
      const key = dateKey(monthYear, monthIndex, day);
      const event = eventByDate.get(key);
      const status: DayStatus =
        key > today
          ? "future"
          : event?.type === "absence"
            ? "absence"
            : event
              ? "exception"
              : "present";
      days.push({ date: key, day, status, ...(event ? { event } : {}) });
    }
    return {
      key: `${monthYear}-${String(monthIndex + 1).padStart(2, "0")}`,
      label: MONTHS[monthIndex] ?? "",
      days,
      exceptionCount: days.filter(
        (item) => item.status === "absence" || item.status === "exception",
      ).length,
    };
  });
}

const statusLabel: Record<DayStatus, string> = {
  present: "Presente",
  absence: "Assenza",
  exception: "Ritardo o uscita anticipata",
  future: "Giorno futuro",
};

export function AttendanceCalendar({ isDidup = false }: { isDidup?: boolean }) {
  const v = useVoto();
  const { config } = useSchoolPeriods();
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const events = v.data.attendanceEvents ?? EMPTY_EVENTS;
  const today = new Date().toISOString().slice(0, 10);
  const months = useMemo(
    () => createMonths(config.year, events, today),
    [config.year, events, today],
  );
  const knownAbsences = events.filter((event) => event.type === "absence").length;
  const knownExceptions = events.filter((event) => event.type !== "absence").length;

  return (
    <section
      aria-labelledby="attendance-calendar-title"
      className={cn("mt-6 space-y-3", isDidup ? "text-white" : "text-foreground")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="attendance-calendar-title"
            className="flex items-center gap-2 font-display text-lg font-semibold"
          >
            <CalendarDays className={cn("h-5 w-5", isDidup ? "text-[#08a5b5]" : "text-primary")} />
            Calendario presenze
          </h2>
          <p className={cn("mt-1 text-xs", isDidup ? "text-white/55" : "text-muted-foreground")}>
            Anno scolastico {config.year}/{config.year + 1} · solo giorni feriali
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-semibold",
            isDidup ? "bg-[#263c3f] text-[#57d4df]" : "bg-primary-soft text-primary",
          )}
        >
          {knownAbsences} assenze
        </span>
      </div>

      <div
        className={cn(
          "flex flex-wrap gap-x-3 gap-y-2 rounded-xl border p-3 text-[10px]",
          isDidup
            ? "border-white/10 bg-[#262626] text-white/65"
            : "border-border bg-surface text-muted-foreground",
        )}
      >
        <Legend color="bg-[#70b51b]" label="Presente" />
        <Legend color="bg-[#ef3125]" label="Assenza" />
        <Legend color="bg-[#f39a16]" label="Ritardo / uscita" />
        <Legend color="bg-[#aeb3b8]" label="Futuro" />
      </div>

      {!events.length && (
        <p
          className={cn(
            "rounded-xl border p-3 text-xs",
            isDidup
              ? "border-white/10 bg-[#262626] text-white/60"
              : "border-warning/20 bg-warning/10 text-warning",
          )}
        >
          Il registro non ha fornito eventi giornalieri dettagliati: i giorni verdi sono una stima
          visiva e non sostituiscono il riepilogo ufficiale.
        </p>
      )}

      <div className="space-y-2">
        {months.map((month) => {
          const expanded = openMonth === month.key;
          return (
            <div
              key={month.key}
              className={cn(
                "overflow-hidden rounded-2xl border",
                isDidup ? "border-white/10 bg-[#262626]" : "border-border bg-card",
              )}
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpenMonth(expanded ? null : month.key)}
                className="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-display text-base font-semibold">
                    {month.label}
                    {month.exceptionCount > 0 && (
                      <AlertCircle
                        className={cn("h-4 w-4", isDidup ? "text-[#f39a16]" : "text-warning")}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-[10px]",
                      isDidup ? "text-white/45" : "text-muted-foreground",
                    )}
                  >
                    {month.days.length} giorni feriali · {month.exceptionCount} eventi
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform",
                    expanded && "rotate-180",
                    isDidup ? "text-white/60" : "text-muted-foreground",
                  )}
                />
              </button>
              <div
                className="flex flex-wrap gap-[5px] px-4 pb-4"
                aria-label={`Calendario presenze ${month.label}`}
              >
                {month.days.map((item) => (
                  <span
                    key={item.date}
                    title={`${item.day} ${month.label}: ${statusLabel[item.status]}${item.event?.justificationStatus ? ` · ${item.event.justificationStatus}` : ""}`}
                    aria-label={`${item.day} ${month.label}: ${statusLabel[item.status]}`}
                    className={cn(
                      "h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm transition-transform",
                      item.status === "present" && "bg-[#70b51b]",
                      item.status === "absence" && "bg-[#ef3125]",
                      item.status === "exception" && "bg-[#f39a16]",
                      item.status === "future" && "bg-[#aeb3b8]",
                      expanded && "h-4 w-4",
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p
        className={cn("text-[10px] leading-4", isDidup ? "text-white/40" : "text-muted-foreground")}
      >
        {knownExceptions
          ? `${knownExceptions} ritardi o uscite anticipate rilevati.`
          : "I colori vengono aggiornati quando arrivano eventi dal registro."}
      </p>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      {label}
    </span>
  );
}
