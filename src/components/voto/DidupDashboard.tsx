import {
  CalendarCheck2,
  CalendarX2,
  FileText,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { CircularViewer } from "@/components/voto/CircularViewer";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { selectUpcomingReminders } from "@/lib/voto/selectors";
import { fmtDate, toIso } from "@/lib/voto/dates";
import type { AppNotification } from "@/lib/voto/types";
import { useClock, useVoto } from "@/lib/voto/store";
import { fmt, overallAverage } from "@/lib/voto/calc";

function updatedLabel(value: string | null | undefined, now: Date) {
  const parsed = value ? new Date(value) : now;
  const date = Number.isNaN(parsed.getTime()) ? now : parsed;
  const time = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  return `Dati aggiornati alle ${time} del ${day}`;
}

function shortDate(iso?: string) {
  if (!iso) return "";
  return fmtDate(iso, {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  }).toUpperCase();
}

function dueDateLabel(iso?: string) {
  if (!iso) return "DATA DA DEFINIRE";
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "DATA DA DEFINIRE";
  return date
    .toLocaleDateString("it-IT", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    })
    .toUpperCase();
}

function tomorrowLabel(now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "2-digit",
  }).toUpperCase();
}

export function DidupDashboard() {
  const v = useVoto();
  const now = useClock();
  const { subjects, assignments, notifications, attendance } = v.data;
  const { subjects: periodSubjects, label: periodLabel } = useSchoolPeriods();
  const [selectedCircular, setSelectedCircular] = useState<AppNotification | null>(null);
  const today = toIso(now);
  const isDone = v.isDone;
  const avg = useMemo(() => overallAverage(periodSubjects), [periodSubjects]);
  const periodDateRange = useMemo(() => {
    const dates = periodSubjects.flatMap((subject) => subject.grades.map((grade) => grade.date)).sort();
    if (!dates.length) return periodLabel.toUpperCase();
    const format = (date: string) => fmtDate(date, {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
    return `${format(dates[0] ?? "")} – ${format(dates[dates.length - 1] ?? "")}`;
  }, [periodSubjects, periodLabel]);
  const openAssignments = useMemo(
    () => assignments
      .filter((item) => !isDone(item.id, item.completed) && (!item.dueDate || item.dueDate.slice(0, 10) >= today))
      .sort((a, b) => `${a.dueDate ?? "9999"}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate ?? "9999"}${b.dueTime ?? ""}`)),
    [assignments, today, isDone],
  );
  const latestGrades = useMemo(
    () => subjects
      .flatMap((subject) => subject.grades.map((grade) => ({ subject, grade })))
      .sort((a, b) => b.grade.date.localeCompare(a.grade.date)),
    [subjects],
  );
  const notices = useMemo(
    () => notifications.filter((item) => item.type === "notice").sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [notifications],
  );
  const reminders = useMemo(
    () => selectUpcomingReminders(notifications, now),
    [notifications, now],
  );
  const reminderCards: AppNotification[] = reminders.length
    ? reminders
    : [{
        id: "empty-reminder",
        type: "reminder",
        title: "Nessun promemoria",
        message: "I prossimi promemoria appariranno qui.",
        read: true,
      }];
  const studentName = (v.data.student.name || "ANDREA MARIA").toUpperCase();
  const progress = avg === null ? 0 : Math.max(0, Math.min(100, avg * 10));
  const teacherForSubject = (subjectName?: string) => {
    const normalizedName = subjectName?.trim().toLocaleLowerCase("it-IT");
    if (!normalizedName) return undefined;
    return subjects.find((subject) => subject.name.trim().toLocaleLowerCase("it-IT") === normalizedName)?.teacher;
  };
  const attendanceEvents = useMemo(
    () => [...(v.data.attendanceEvents ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3),
    [v.data.attendanceEvents],
  );

  return (
    <div className="didup-page min-h-dvh bg-black px-2 pb-[108px] text-white">
      <header className="flex items-center justify-between px-2.5 pb-[32px] pt-5">
        <div>
          <h1 className="text-[20px] font-normal leading-none tracking-tight">{studentName}</h1>
          <p className="mt-2 text-[11px] leading-none text-white/80">{updatedLabel(v.data.updatedAt || v.lastSync, now)}</p>
        </div>
        <img src="/didup-profile.jpg" alt="" className="h-[50px] w-[50px] object-cover" />
      </header>

      <section className="didup-card overflow-hidden px-5 pb-2 pt-[26px]">
        <div className="relative grid grid-cols-2 gap-4">
          <span aria-hidden="true" className="absolute left-1/2 top-[40px] h-[34px] w-[2px] -translate-x-1/2 bg-[#0aa0b1]" />
          <div className="text-center">
            <DidupEyeIcon />
            <h2 className="text-[16px] font-extrabold leading-none">Media</h2>
            <div
              className="didup-average-ring mx-auto mt-[22px]"
              style={{ "--progress": `${progress}%` } as CSSProperties}
            >
              <span>{avg === null ? "—" : fmt(avg)}</span>
            </div>
            <p className="mt-[22px] text-[12px] italic leading-5 text-white/90">Calcolata nel periodo</p>
            <p className="text-[12px] italic leading-5 text-white/90">{periodDateRange}</p>
          </div>
          <div className="text-center">
            <h2 className="text-[16px] font-extrabold leading-none">Prepara lo zaino!</h2>
            <BackpackIllustration />
            <p className="mt-4 text-[12px] italic leading-5 text-white/90">Controlla le materie di</p>
            <p className="text-[12px] italic leading-5 text-white/90">domani, {tomorrowLabel(now)}</p>
          </div>
        </div>
        <div className="mt-3 border-t-2 border-[#0aa0b1] pt-2">
          <div className="grid grid-cols-3 text-center text-[10px] font-extrabold uppercase">
            <span>Assenze<strong className="mt-1 block text-[15px]">{Math.round(attendance.absenceDays)}</strong></span>
            <span>Ritardi<strong className="mt-1 block text-[15px]">{attendance.delays}</strong></span>
            <span>Uscite<strong className="mt-1 block text-[15px]">{attendance.earlyExits}</strong></span>
          </div>
        </div>
      </section>

      <DidupSectionTitle title="Prossimi compiti" href="/compiti" />
      <DidupScroller>
        {openAssignments.length > 0 ? openAssignments.slice(0, 5).map((item) => (
          <article key={item.id} className="didup-tile didup-task-tile flex min-h-[172px] w-[84%] shrink-0 flex-col overflow-hidden px-5 pb-5 pt-[18px]">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[16px] font-medium uppercase text-white/90">{item.subject ?? "COMPITO"}</p>
              <DidupPinIcon />
            </div>
            <p className="mt-[9px] line-clamp-3 text-[14px] leading-5 text-white/90">{item.title}{item.details ? `: ${item.details}` : ""}</p>
            <p className="mt-auto border-t border-white/30 pt-3 text-right text-[10px] uppercase text-black/80">Consegna {dueDateLabel(item.dueDate)}</p>
          </article>
        )) : <EmptyTile text="Nessun compito in scadenza" variant="task" />}
      </DidupScroller>

      <section className="didup-card relative mt-9 overflow-hidden px-5 pb-2 pt-4">
        <img
          src="/didup-event-badge-transparent.png"
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-0 h-9 w-9 select-none"
        />
        <h2 className="pr-10 text-[18px] font-extrabold leading-6">Eventi appello</h2>
        <div className="mt-2">
          {attendanceEvents.length > 0 ? (
            attendanceEvents.map((event, index) => {
              const title =
                event.type === "absence"
                  ? "Assenza"
                  : event.type === "delay"
                    ? "Ritardo"
                    : "Uscita";
              const icon =
                event.type === "absence" ? (
                  <AbsenceIcon />
                ) : event.type === "delay" ? (
                  <CalendarCheck2 className="h-5 w-5" />
                ) : (
                  <CalendarX2 className="h-5 w-5" />
                );

              return (
                <div key={event.id} className="flex items-center gap-4 py-3">
                  <span className="flex w-[22px] shrink-0 items-center justify-center text-[#0aa0b1]">
                    {icon}
                  </span>
                  <div
                    className={`min-w-0 flex-1 pb-3 ${index < attendanceEvents.length - 1 ? "border-b border-white/15" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[16px] leading-5">{title}</p>
                        {event.justificationStatus && (
                          <p className="mt-1 text-[13px] leading-5 text-[#e47d89]">
                            ({event.justificationStatus})
                          </p>
                        )}
                      </div>
                      <time
                        dateTime={event.date}
                        className="whitespace-nowrap pt-1 text-[12px] font-semibold text-[#0aa0b1]"
                      >
                        {shortDate(event.date)}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-5 text-center text-[13px] text-white/70">
              {attendance.absenceDays > 0 || attendance.delays > 0 || attendance.earlyExits > 0
                ? "Dettagli degli eventi non disponibili nei dati sincronizzati."
                : "Nessun evento di appello."}
            </p>
          )}
        </div>
      </section>

      <DidupSectionTitle title="Ultimi voti" href="/voti" compact />
      <DidupScroller>
        {latestGrades.slice(0, 5).map(({ subject, grade }) => {
          const badgeImage =
            grade.value < 5
              ? "/didup-grade-badge-red.png"
              : grade.value < 6
                ? "/didup-grade-badge-orange.png"
                : "/didup-grade-badge.png";
          const teacher = grade.teacher || subject.teacher;

          return (
            <article key={grade.id} className="didup-tile relative min-h-[154px] w-[84%] shrink-0 overflow-hidden p-4">
              <span className="absolute right-0 top-0 flex h-[60px] w-[60px] items-center justify-center text-[20px] font-extrabold text-white">
                <img src={badgeImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full select-none" />
                <span className="relative z-10">{grade.label}</span>
              </span>
              <p className="text-[12px] text-[#0aa0b1]">{shortDate(grade.date)}</p>
              <p className="mt-5 text-[16px] uppercase">{subject.name}</p>
              {grade.comment && (
                <p className="mt-1 text-[13px] text-white/90">{grade.comment}</p>
              )}
              {teacher && <p className="mt-1 text-[11px] text-white/65">{teacher}</p>}
            </article>
          );
        })}
      </DidupScroller>

      <DidupSectionTitle title="Bacheca" href="/" compact />
      <DidupScroller>
        {notices.length > 0 ? (
          notices.slice(0, 5).map((item) => {
            const attachmentCount = item.attachments?.length || (item.attachmentPath ? 1 : 0);
            const teacher = item.teacher || teacherForSubject(item.subject);
            return (
              <article
                key={item.id}
                className="didup-tile relative flex min-h-[206px] w-[84%] shrink-0 flex-col overflow-hidden p-4"
              >
                <p className="pr-12 text-[12px] text-[#0aa0b1]">{shortDate(item.date)}</p>
                <img
                  src="/didup-bacheca-badge-transparent.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-[40px] w-[40px] select-none"
                />
                <p className="mt-2 text-[18px] uppercase">Circolari</p>
                <p className="text-[13px]">
                  {item.subject || "Circolare"}{teacher ? ` · ${teacher}` : ""}
                </p>
                <p className="mt-7 line-clamp-1 text-[14px] leading-6">
                  {item.message || item.title}
                </p>
                {attachmentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCircular(item);
                      v.markRead([item.id]);
                    }}
                    aria-label={`Apri circolare, ${attachmentCount} ${attachmentCount === 1 ? "allegato" : "allegati"}: ${item.title}`}
                    className="press mt-auto inline-flex items-center text-left text-[12px] text-white/90"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {attachmentCount}
                  </button>
                )}
              </article>
            );
          })
        ) : (
          <EmptyTile text="Nessuna circolare" variant="notice" />
        )}
      </DidupScroller>

      <DidupSectionTitle title="Promemoria" href="/promemoria" compact />
      <DidupScroller>
        {reminderCards.slice(0, 5).map((item) => {
          const teacher = item.teacher || teacherForSubject(item.subject);
          return (
            <article key={item.id} className="didup-tile relative min-h-[155px] w-[84%] shrink-0 overflow-hidden p-4">
              <p className="pr-12 text-[12px] text-[#0aa0b1]">{shortDate(item.date) || "DATA DA DEFINIRE"}</p>
              <img src="/didup-reminder-badge-transparent.png" alt="" aria-hidden="true" className="absolute right-0 top-0 h-[40px] w-[40px] select-none" />
              <p className="mt-2 text-[13px]">
                {item.subject || "Promemoria"}{teacher ? ` · ${teacher}` : ""}
              </p>
              <p className="mt-8 text-[15px] leading-6">{item.message || item.title}</p>
            </article>
          );
        })}
      </DidupScroller>
      <CircularViewer
        open={selectedCircular !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCircular(null);
        }}
        title={selectedCircular?.message ?? selectedCircular?.title ?? "Circolare"}
        fileName={selectedCircular?.attachmentName}
        path={selectedCircular?.attachmentPath}
        attachments={selectedCircular?.attachments}
        url={selectedCircular?.attachmentPath ? selectedCircular.attachmentUrl : undefined}
      />
    </div>
  );
}

function BackpackIllustration() {
  return <img src="/didup-backpack-transparent.png" alt="" className="mx-auto mt-3 h-[85px] w-[84px] object-contain object-top" />;
}

function DidupEyeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 19"
      className="absolute -left-[6px] -top-[9.5px] h-[12px] w-[16px]"
    >
      <path
        d="M1 9.5c2.4-5.5 6.1-8.5 11-8.5s8.6 3 11 8.5c-2.4 5.25-6.1 8.25-11 8.25S3.4 14.75 1 9.5Z"
        fill="#0aa0b1"
      />
      <circle cx="12" cy="9.5" r="3.1" fill="#292929" />
      <circle cx="12" cy="9.5" r="1.25" fill="#0aa0b1" />
    </svg>
  );
}

function DidupPinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[17px] w-[17px] shrink-0 rotate-45"
    >
      <path d="M8 3.5h8l-1.1 5.7 3.1 2.9v1.8H6v-1.8l3.1-2.9L8 3.5Z" fill="#e84834" />
      <path d="M12 14v8" fill="none" stroke="#d7d7d7" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function AbsenceIcon() {
  return <img src="/didup-absence-icon.png" alt="" aria-hidden="true" className="h-[23px] w-[18px] shrink-0 object-contain" />;
}

function EmptyTile({ text, variant }: { text: string; variant: "task" | "notice" }) {
  const size = variant === "task"
    ? "didup-task-tile min-h-[172px] p-5"
    : "min-h-[206px] p-4";
  return <article className={`didup-tile ${size} flex w-[84%] shrink-0 items-center justify-center text-center text-sm text-white/70`}>{text}</article>;
}

function DidupSectionTitle({
  title,
  href,
  compact = false,
}: {
  title: string;
  href: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "mt-6" : "mt-9"} flex items-center justify-between px-3.5`}>
      <h2 className="text-[22px] font-extrabold">{title}</h2>
      <Link to={href} className="text-[13px] text-white/90">
        Vedi tutti ›
      </Link>
    </div>
  );
}

function DidupScroller({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar mt-1 flex gap-4 overflow-x-auto px-0.5">{children}</div>;
}
