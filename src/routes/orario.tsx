import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useState } from "react";
import { ScheduleCalendarExport } from "@/components/voto/ScheduleCalendarExport";
import { SectionTitle } from "@/components/voto/ui";
import { useVoto } from "@/lib/voto/store";
import { DAYS, loadSchedule, saveSchedule, type DayId, type Schedule } from "@/lib/voto/orario";

export const Route = createFileRoute("/orario")({
  head: () => ({
    meta: [
      { title: "Orario — VOTO." },
      { name: "description", content: "Il tuo orario scolastico dal lunedì al venerdì." },
      { property: "og:title", content: "Orario — VOTO." },
      { property: "og:description", content: "Il tuo orario scolastico settimanale." },
    ],
  }),
  component: Orario,
});

const WEEK_LABELS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;
const WEEKDAY_IDS: (DayId | null)[] = [
  "lunedi",
  "martedi",
  "mercoledi",
  "giovedi",
  "venerdi",
  null,
  null,
];

function Orario() {
  const voto = useVoto();
  const [selectedDay, setSelectedDay] = useState<DayId>(DAYS[0].id);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [schedule, setSchedule] = useState<Schedule>(() => loadSchedule());
  const day = DAYS.find(({ id }) => id === selectedDay)!;

  const updateSubject = (dayId: DayId, hour: number, subject: string) => {
    setSchedule((current) => {
      const next = {
        ...current,
        [dayId]: current[dayId].map((item, index) => (index === hour ? subject : item)),
      };
      saveSchedule(next);
      return next;
    });
  };

  if (voto.registryStyle === "didup") {
    const studentName = (voto.data.student.name || "ANDREA MARIA").toUpperCase();
    const weekdayIndex = (selectedDate.getDay() + 6) % 7;
    const selectedDayId = WEEKDAY_IDS[weekdayIndex] ?? null;
    const selectedLessons = selectedDayId ? schedule[selectedDayId] : [];

    return (
      <div className="didup-page min-h-dvh bg-black px-2 pb-[100px] text-white">
        <header className="flex items-start justify-between px-2 pt-5">
          <div className="flex min-w-0 items-start">
            <Link
              to="/"
              aria-label="Torna alla Home"
              className="press flex h-10 w-10 shrink-0 items-center justify-start text-white"
            >
              <ArrowLeft className="h-8 w-8" strokeWidth={1.7} />
            </Link>
            <div className="ml-4 pt-0.5">
              <h1 className="text-[17px] font-normal leading-5">ORARIO</h1>
              <p className="mt-1 text-[12px] leading-4">{studentName}</p>
            </div>
          </div>
          <img
            src="/didup-profile.jpg"
            alt=""
            className="h-[50px] w-[50px] shrink-0 object-cover"
          />
        </header>

        <section
          aria-label="Seleziona il giorno dell’orario"
          className="mx-1.5 mt-[66px] rounded-[12px] bg-[#292929] px-3 pb-3 pt-4"
        >
          <div className="flex h-8 items-center justify-between">
            <button
              type="button"
              aria-label="Mese precedente"
              onClick={() => setSelectedDate((current) => shiftMonth(current, -1))}
              className="press flex h-9 w-9 items-center justify-center rounded-full text-white"
            >
              <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
            </button>
            <h2 className="text-[17px] font-normal capitalize">
              {selectedDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
            </h2>
            <button
              type="button"
              aria-label="Mese successivo"
              onClick={() => setSelectedDate((current) => shiftMonth(current, 1))}
              className="press flex h-9 w-9 items-center justify-center rounded-full text-white"
            >
              <ChevronRight className="h-7 w-7" strokeWidth={2.2} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 text-center">
            {WEEK_LABELS.map((label) => (
              <span key={label} className="text-[12px] font-normal text-white/90">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 text-center">
            {weekDates(selectedDate).map((date, index) => {
              const isSelected = sameDate(date, selectedDate);
              const isWeekend = index > 4;
              const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  aria-label={date.toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedDate(date)}
                  className={`press mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[15px] tabular transition-colors ${
                    isSelected
                      ? "bg-[#4169a8] text-white"
                      : isWeekend
                        ? "text-[#0aa0b1]"
                        : "text-white"
                  } ${isCurrentMonth ? "" : "opacity-55"}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </section>

        {selectedDayId ? (
          <section
            className="-mx-2 mt-6 overflow-hidden rounded-t-[12px] bg-[#292929]"
            aria-label="Lezioni del giorno"
          >
            {selectedLessons.map((subject, index) => (
              <label
                key={`${selectedDayId}-${index}`}
                className={`flex min-h-[69px] items-center gap-4 px-4 ${
                  index < selectedLessons.length - 1 ? "border-b border-white/80" : ""
                }`}
              >
                <span className="relative flex h-9 w-8 shrink-0 items-start justify-center text-[#4169a8]">
                  <img
                    src="/didup-clock-icon.png"
                    alt=""
                    aria-hidden="true"
                    className="h-7 w-7 object-contain"
                  />
                  <span className="absolute bottom-0 left-0 text-[11px] font-bold leading-none text-white">
                    {index + 1}
                  </span>
                </span>
                <input
                  value={subject}
                  onChange={(event) => updateSubject(selectedDayId, index, event.target.value)}
                  aria-label={`${selectedDate.toLocaleDateString("it-IT", { weekday: "long" })}, ${index + 1}ª ora`}
                  placeholder=" "
                  className="min-h-[68px] min-w-0 flex-1 bg-transparent p-0 text-[15px] font-medium uppercase text-white outline-none placeholder:text-white/0 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60"
                />
              </label>
            ))}
          </section>
        ) : (
          <p className="mt-6 rounded-[12px] bg-[#292929] px-4 py-8 text-center text-sm text-white/70">
            Nessuna lezione prevista nel fine settimana.
          </p>
        )}
        <div className="mx-1.5 mt-4">
          <ScheduleCalendarExport schedule={schedule} isDidup />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Orario</h1>
          <p className="text-xs text-muted-foreground">Sei ore al giorno, dal lunedì al venerdì.</p>
        </div>
      </div>

      <div
        className="no-scrollbar mt-5 flex gap-2 overflow-x-auto"
        role="tablist"
        aria-label="Giorni della settimana"
      >
        {DAYS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selectedDay === item.id}
            onClick={() => setSelectedDay(item.id)}
            className={`press min-w-[62px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${selectedDay === item.id ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {item.short}
          </button>
        ))}
      </div>

      <SectionTitle>{day.label}</SectionTitle>
      <div className="space-y-2">
        {schedule[selectedDay].map((subject, index) => (
          <label key={index} className="card-surface flex items-center gap-3 p-3.5">
            <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span className="tabular text-[9px] font-semibold">{index + 1}ª</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] text-muted-foreground">{index + 1}ª ora</span>
              <input
                value={subject}
                onChange={(event) => updateSubject(selectedDay, index, event.target.value)}
                placeholder="Inserisci materia"
                aria-label={`${day.label}, ${index + 1}ª ora`}
                className="mt-0.5 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
              />
            </span>
          </label>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Le modifiche vengono salvate automaticamente sul dispositivo.
      </p>
      <div className="mt-4">
        <ScheduleCalendarExport schedule={schedule} />
      </div>
    </div>
  );
}

function weekDates(value: Date): Date[] {
  const monday = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function shiftMonth(value: Date, offset: number): Date {
  const day = value.getDate();
  const targetMonth = new Date(value.getFullYear(), value.getMonth() + offset, 1);
  const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
  targetMonth.setDate(Math.min(day, lastDay));
  return targetMonth;
}

function sameDate(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
