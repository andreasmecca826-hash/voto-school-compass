import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty, SectionTitle } from "@/components/voto/ui";
import { fmtDate, parseIso, toIso } from "@/lib/voto/dates";
import { useVoto } from "@/lib/voto/store";
import type { Assignment, DiaryEntry } from "@/lib/voto/types";

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
  const voto = useVoto();
  return voto.registryStyle === "didup" ? <DidupDiario /> : <StandardDiario />;
}

function StandardDiario() {
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
                            <span className="text-[11px] text-muted-foreground">
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

function DidupDiario() {
  const voto = useVoto();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tab, setTab] = useState<"attivita" | "compiti">("attivita");
  const latestActivityDate = useMemo(() => {
    const latest = [...voto.data.diary]
      .map((entry) => entry.date)
      .filter(Boolean)
      .sort()
      .at(-1);
    return latest ? parseIso(latest) : new Date();
  }, [voto.data.diary]);
  const activeDate = selectedDate ?? latestActivityDate;
  const activeDateKey = toIso(activeDate);
  const activities = useMemo(
    () =>
      voto.data.diary
        .filter((entry) => entry.date === activeDateKey)
        .sort((a, b) => lessonNumber(a) - lessonNumber(b)),
    [activeDateKey, voto.data.diary],
  );
  const assignments = useMemo(
    () =>
      voto.data.assignments
        .filter((assignment) => assignment.dueDate === activeDateKey)
        .sort((a, b) => (a.dueTime ?? "").localeCompare(b.dueTime ?? "")),
    [activeDateKey, voto.data.assignments],
  );
  const studentName = (voto.data.student.name ?? "").toUpperCase();

  return (
    <div className="didup-page min-h-dvh bg-black px-2 pb-[100px] text-white">
      <header className="flex items-start justify-between px-2 pt-5">
        <div>
          <h1 className="text-[20px] font-normal leading-6">Diario</h1>
          {studentName && <p className="mt-0.5 text-[12px] leading-4">{studentName}</p>}
        </div>
        <img
          src="/didup-profile.jpg"
          alt=""
          aria-hidden="true"
          className="h-[50px] w-[50px] shrink-0 object-cover"
        />
      </header>

      <section
        aria-label="Seleziona il giorno del diario"
        className="mx-2 mt-7 min-h-[164px] rounded-[12px] bg-[#292929] px-3 pb-3 pt-4"
      >
        <div className="flex h-9 items-center justify-between">
          <button
            type="button"
            aria-label="Mese precedente"
            onClick={() => setSelectedDate((current) => shiftMonth(current ?? activeDate, -1))}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-white"
          >
            <ChevronLeft className="h-7 w-7" strokeWidth={2.2} />
          </button>
          <h2 className="text-[17px] font-normal capitalize">
            {activeDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
          </h2>
          <button
            type="button"
            aria-label="Mese successivo"
            onClick={() => setSelectedDate((current) => shiftMonth(current ?? activeDate, 1))}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-white"
          >
            <ChevronRight className="h-7 w-7" strokeWidth={2.2} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 text-center">
          {WEEKDAYS.map((day) => (
            <span key={day} className="text-[12px] font-normal text-white/90">
              {day}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 text-center">
          {weekDates(activeDate).map((date, index) => {
            const selected = toIso(date) === activeDateKey;
            const sameMonth = date.getMonth() === activeDate.getMonth();
            return (
              <button
                key={toIso(date)}
                type="button"
                aria-label={date.toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                aria-pressed={selected}
                onClick={() => setSelectedDate(date)}
                className={`press mx-auto flex h-11 w-11 items-center justify-center rounded-full text-[15px] tabular transition-colors ${
                  selected ? "bg-[#4169a8] text-white" : index > 4 ? "text-[#0aa0b1]" : "text-white"
                } ${sameMonth ? "" : "opacity-55"}`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </section>

      <div
        className="-mx-2 mt-7 grid h-[58px] grid-cols-2 bg-[#292929]"
        role="tablist"
        aria-label="Sezione Diario"
      >
        {(
          [
            ["attivita", "Attività"],
            ["compiti", "Compiti"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`relative flex items-center justify-center text-[15px] ${
              tab === id ? "font-semibold text-white" : "font-normal text-white/75"
            }`}
          >
            {label}
            {tab === id && (
              <span className="absolute bottom-0 h-[3px] w-[68px] rounded-t-full bg-white" />
            )}
          </button>
        ))}
      </div>

      {tab === "attivita" ? (
        activities.length ? (
          <ul role="tabpanel" aria-label="Attività svolte" className="divide-y divide-[#454545]">
            {activities.map((entry, index) => (
              <DidupActivityRow key={entry.id} entry={entry} fallbackHour={index + 1} />
            ))}
          </ul>
        ) : (
          <p role="tabpanel" className="px-5 py-10 text-center text-sm text-white/65">
            Nessuna attività registrata per questa data.
          </p>
        )
      ) : assignments.length ? (
        <ul role="tabpanel" aria-label="Compiti assegnati" className="divide-y divide-[#454545]">
          {assignments.map((assignment) => (
            <DidupAssignmentRow key={assignment.id} assignment={assignment} />
          ))}
        </ul>
      ) : (
        <p role="tabpanel" className="px-5 py-10 text-center text-sm text-white/65">
          Nessun compito assegnato per questa data.
        </p>
      )}
    </div>
  );
}

function DidupActivityRow({ entry, fallbackHour }: { entry: DiaryEntry; fallbackHour: number }) {
  const hour = lessonNumber(entry) || fallbackHour;
  return (
    <li className="px-3 py-5">
      <div className="flex min-h-[40px] items-center gap-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
          <span
            aria-hidden="true"
            className="h-8 w-8 bg-[#0aa0b1]"
            style={{
              maskImage: "url(/didup-clock-icon.png)",
              WebkitMaskImage: "url(/didup-clock-icon.png)",
              maskPosition: "center",
              WebkitMaskPosition: "center",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskSize: "contain",
              WebkitMaskSize: "contain",
            }}
          />
          <span className="absolute bottom-0 left-0 text-[10px] font-bold leading-none text-[#0aa0b1]">
            {hour}°
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-normal uppercase leading-[1.3]">
            {entry.subject || "Attività"}
          </p>
          {entry.teacher && <TeacherName name={entry.teacher} />}
        </div>
      </div>
      <p className="mt-4 px-1 text-[14px] leading-[1.45] text-white/90">{entry.activity}</p>
    </li>
  );
}

function DidupAssignmentRow({ assignment }: { assignment: Assignment }) {
  return (
    <li className="px-3 py-5">
      <div className="flex min-h-[40px] items-center gap-3">
        <span
          className="relative flex h-9 w-9 shrink-0 items-center justify-center text-[#0aa0b1]"
          aria-hidden="true"
        >
          <CalendarDays className="h-7 w-7" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-normal uppercase leading-[1.3]">
            {assignment.subject || "Compito"}
          </p>
          {assignment.teacher && <TeacherName name={assignment.teacher} />}
        </div>
      </div>
      <p className="mt-4 px-1 text-[14px] leading-[1.45] text-white/90">
        {assignment.details || assignment.title}
      </p>
    </li>
  );
}

function TeacherName({ name }: { name: string }) {
  return (
    <p className="mt-0.5 flex items-center gap-2 text-[11px] font-medium uppercase leading-4 text-white">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-[15px] w-[15px] shrink-0 fill-[#34558b]"
      >
        <circle cx="12" cy="7" r="4" />
        <path d="M3 21v-1.5c0-3.7 3.8-6.5 9-6.5s9 2.8 9 6.5V21H3Z" />
      </svg>
      {name}
    </p>
  );
}

function lessonNumber(entry: DiaryEntry) {
  const match = entry.hour?.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"] as const;

function weekDates(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

function shiftMonth(date: Date, delta: number) {
  const dayOfMonth = date.getDate();
  const shifted = new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const daysInMonth = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate();
  shifted.setDate(Math.min(dayOfMonth, daysInMonth));
  return shifted;
}
