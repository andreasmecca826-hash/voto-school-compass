import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AttendanceEvent } from "@/lib/voto/types";
import { useVoto } from "@/lib/voto/store";

export const Route = createFileRoute("/eventi-appello")({
  head: () => ({
    meta: [
      { title: "Eventi appello — VOTO." },
      { name: "description", content: "Consulta assenze, ritardi e uscite dal registro." },
    ],
  }),
  component: EventiAppello,
});

const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const MONTH_FORMAT = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });

function localDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return new Date(year || 2000, (month || 1) - 1, day || 1);
}

function toLocalIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayIso() {
  return toLocalIso(new Date());
}

function shiftMonth(iso: string, amount: number) {
  const date = localDate(iso);
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
  return toLocalIso(target);
}

function weekFor(iso: string) {
  const monday = localDate(iso);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return toLocalIso(day);
  });
}

function eventIsJustified(event: AttendanceEvent) {
  const status = event.justificationStatus?.trim().toLocaleLowerCase("it-IT");
  if (!status || status.includes("da giustificare") || status.includes("non giustificat"))
    return false;
  return (
    status.startsWith("giustificat") ||
    ["ok", "justified", "approved", "complete", "completata", "completato"].includes(status)
  );
}

function eventLabel(event: AttendanceEvent) {
  if (event.type === "absence") return "Assenza";
  if (event.type === "delay") return "Ritardo";
  return "Uscita anticipata";
}

function eventIcon(event: AttendanceEvent) {
  if (event.type === "absence") return <LogIn className="h-6 w-6" strokeWidth={1.7} />;
  if (event.type === "delay") return <Clock3 className="h-6 w-6" strokeWidth={1.7} />;
  return <LogOut className="h-6 w-6" strokeWidth={1.7} />;
}

function eventDateLabel(iso: string) {
  return localDate(iso)
    .toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    })
    .replaceAll(".", "")
    .toLocaleUpperCase("it-IT");
}

function EventiAppello() {
  const v = useVoto();
  const events = useMemo(
    () => [...(v.data.attendanceEvents ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [v.data.attendanceEvents],
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [onlyToJustify, setOnlyToJustify] = useState(false);
  const activeDate = selectedDate ?? todayIso();

  useEffect(() => {
    if (v.ready && !selectedDate && events.length) setSelectedDate(events[0]!.date);
  }, [events, selectedDate, v.ready]);

  const week = useMemo(() => weekFor(activeDate), [activeDate]);
  const eventDates = useMemo(() => new Set(events.map((event) => event.date)), [events]);
  const pendingEvents = useMemo(() => events.filter((event) => !eventIsJustified(event)), [events]);
  const visibleEvents = onlyToJustify
    ? pendingEvents
    : events.filter((event) => event.date === activeDate);
  const studentName = (v.data.student.name || "ANDREA MARIA").toLocaleUpperCase("it-IT");
  const monthLabel = MONTH_FORMAT.format(localDate(activeDate));

  function changeMonth(amount: number) {
    setSelectedDate(shiftMonth(activeDate, amount));
  }

  return (
    <div className="didup-page mx-auto min-h-dvh w-full max-w-[480px] bg-black pb-[112px] text-white">
      <header className="flex min-h-[98px] items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
        <Link
          to="/"
          aria-label="Torna alla Home"
          className="flex h-10 w-9 shrink-0 items-center justify-start text-white/90"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={1.8} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-normal uppercase leading-tight tracking-[0.04em]">
            Eventi appello
          </h1>
          <p className="mt-1 truncate text-[12px] uppercase leading-tight text-white/90">
            {studentName}
          </p>
        </div>
        <img
          src="/didup-profile.jpg"
          alt=""
          aria-hidden="true"
          className="h-[52px] w-[52px] shrink-0 rounded-full object-cover"
        />
      </header>

      <section
        aria-label="Riepilogo presenze"
        className="mx-5 mt-5 grid grid-cols-3 gap-3 rounded-[10px] bg-[#252525] px-3 py-4"
      >
        <AttendanceCount
          value={Math.round(v.data.attendance.absenceDays)}
          label="ASS"
          tone="absence"
        />
        <AttendanceCount value={v.data.attendance.delays} label="RIT" tone="neutral" />
        <AttendanceCount value={v.data.attendance.earlyExits} label="USC" tone="neutral" />
      </section>

      <section
        aria-label="Calendario eventi"
        className="mx-5 mt-5 rounded-[10px] bg-[#252525] px-4 pb-4 pt-4"
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Mese precedente"
            onClick={() => changeMonth(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08a5b5]"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <h2 className="text-[21px] font-normal capitalize">{monthLabel}</h2>
          <button
            type="button"
            aria-label="Mese successivo"
            onClick={() => changeMonth(1)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08a5b5]"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 text-center">
          {week.map((date, index) => (
            <span key={`weekday-${date}`} className="pb-2 text-[12px] capitalize text-white/80">
              {WEEKDAYS[index]}
            </span>
          ))}
          {week.map((date) => {
            const selected = date === activeDate;
            const hasEvent = eventDates.has(date);
            return (
              <button
                key={date}
                type="button"
                aria-label={`${localDate(date).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${hasEvent ? ", con eventi" : ""}`}
                aria-pressed={selected}
                onClick={() => {
                  setSelectedDate(date);
                  setOnlyToJustify(false);
                }}
                className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08a5b5] ${
                  selected
                    ? "bg-[#9aa8e8] text-white"
                    : hasEvent
                      ? "text-[#08a5b5] hover:bg-white/10"
                      : "text-white/90 hover:bg-white/10"
                }`}
              >
                {localDate(date).getDate()}
                {hasEvent && !selected && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#08a5b5]"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="mt-5"
        aria-label={onlyToJustify ? "Eventi da giustificare" : "Eventi della data selezionata"}
      >
        {visibleEvents.length ? (
          <ul className="space-y-[2px]">
            {visibleEvents.map((event) => {
              const justified = eventIsJustified(event);
              return (
                <li
                  key={event.id}
                  className="flex min-h-[142px] items-center gap-4 bg-[#252525] px-5 py-5"
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full ${
                      event.type === "absence"
                        ? "bg-[#4169a8] text-white"
                        : "bg-[#4169a8] text-white"
                    }`}
                  >
                    {eventIcon(event)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[#4169a8]">
                      <UserRound className="h-4 w-4 fill-current" />
                      <span className="text-[15px] font-semibold">{eventLabel(event)}</span>
                    </div>
                    <time
                      dateTime={event.date}
                      className="mt-1 block text-[14px] font-medium uppercase tracking-wide text-[#08a5b5]"
                    >
                      {eventDateLabel(event.date)}
                    </time>
                    <p
                      className={`mt-2 text-[14px] ${justified ? "text-white/65" : "text-[#e46b62]"}`}
                    >
                      {justified ? event.justificationStatus || "Giustificato" : "Da giustificare"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex min-h-[154px] items-center justify-center bg-[#252525] px-6 text-center">
            <div>
              <CalendarDays className="mx-auto h-7 w-7 text-[#08a5b5]" />
              <p className="mt-2 text-[15px] text-white/90">
                {events.length === 0
                  ? v.data.attendance.absenceDays ||
                    v.data.attendance.delays ||
                    v.data.attendance.earlyExits
                    ? "Dettagli degli eventi non disponibili nei dati sincronizzati."
                    : "Nessun evento di appello nei dati sincronizzati."
                  : onlyToJustify
                    ? "Non ci sono eventi da giustificare."
                    : "Nessun evento per questa data."}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="px-5 pt-5">
        <button
          type="button"
          aria-pressed={onlyToJustify}
          onClick={() => setOnlyToJustify((active) => !active)}
          className={`flex min-h-[54px] w-full items-center justify-center gap-3 rounded-[12px] px-4 text-[14px] font-medium uppercase tracking-[0.04em] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
            onlyToJustify ? "bg-[#087f8d]" : "bg-[#08a5b5] hover:bg-[#0bb3c4]"
          }`}
        >
          <DoorOpen className="h-5 w-5" />
          <span>{onlyToJustify ? "Tutti gli eventi" : "Eventi da giustificare"}</span>
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-white/80 px-1 text-[13px]">
            {pendingEvents.length}
          </span>
        </button>
      </div>
    </div>
  );
}

function AttendanceCount({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "absence" | "neutral";
}) {
  return (
    <div
      className={`flex min-h-[76px] flex-col items-center justify-center rounded-[10px] ${
        tone === "absence" ? "bg-[#e56c6c]" : "bg-[#365f99]"
      }`}
    >
      <span className="text-[18px] leading-6">{Number.isFinite(value) ? value : 0}</span>
      <span className="text-[14px] font-medium leading-5">{label}</span>
    </div>
  );
}
