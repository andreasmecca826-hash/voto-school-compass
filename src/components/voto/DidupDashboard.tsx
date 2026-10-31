import {
  CalendarCheck2,
  CalendarX2,
  Eye,
  FileText,
  Pin,
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
  const studentName = (v.data.student.name || "ANDREA MARIA").toUpperCase();
  const progress = avg === null ? 0 : Math.max(0, Math.min(100, avg * 10));
  const attendanceEvents = useMemo(
    () => [...(v.data.attendanceEvents ?? [])]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3),
    [v.data.attendanceEvents],
  );

  return (
    <div className="didup-page min-h-dvh bg-black px-2 pb-24 text-white">
      <header className="flex items-center justify-between px-2.5 pb-6 pt-5">
        <div>
          <h1 className="text-[25px] font-normal leading-none tracking-tight">{studentName}</h1>
          <p className="mt-2 text-[11px] leading-none text-white/80">{updatedLabel(v.data.updatedAt || v.lastSync, now)}</p>
        </div>
        <img src="/didup-profile.jpg" alt="" className="h-[58px] w-[58px] object-cover" />
      </header>

      <section className="didup-card overflow-hidden px-5 pb-4 pt-5">
        <div className="relative grid grid-cols-2 gap-4">
          <span aria-hidden="true" className="absolute left-1/2 top-[60px] h-[44px] w-[2px] -translate-x-1/2 bg-[#0aa0b1]" />
          <div className="text-center">
            <Eye className="absolute left-0 top-0 h-5 w-5 text-[#0aa0b1]" strokeWidth={2.5} />
            <h2 className="text-[20px] font-extrabold leading-none">Media</h2>
            <div
              className="didup-average-ring mx-auto mt-7"
              style={{ "--progress": `${progress}%` } as CSSProperties}
            >
              <span>{avg === null ? "—" : fmt(avg)}</span>
            </div>
            <p className="mt-5 text-[12px] italic leading-5 text-white/90">Calcolata nel periodo</p>
            <p className="text-[12px] italic leading-5 text-white/90">{periodDateRange}</p>
          </div>
          <div className="text-center">
            <h2 className="text-[20px] font-extrabold leading-none">Prepara lo zaino!</h2>
            <BackpackIllustration />
            <p className="mt-4 text-[12px] italic leading-5 text-white/90">Controlla le materie di</p>
            <p className="text-[12px] italic leading-5 text-white/90">domani, {tomorrowLabel(now)}</p>
          </div>
        </div>
        <div className="mt-5 border-t-2 border-[#0aa0b1] pt-4">
          <div className="grid grid-cols-3 text-center text-[11px] font-extrabold uppercase">
            <span>Assenze<strong className="mt-1 block text-[17px]">{Math.round(attendance.absenceDays)}</strong></span>
            <span>Ritardi<strong className="mt-1 block text-[17px]">{attendance.delays}</strong></span>
            <span>Uscite<strong className="mt-1 block text-[17px]">{attendance.earlyExits}</strong></span>
          </div>
        </div>
      </section>

      <DidupSectionTitle title="Prossimi compiti" href="/compiti" />
      <DidupScroller>
        {openAssignments.length > 0 ? openAssignments.slice(0, 5).map((item) => (
          <article key={item.id} className="didup-tile didup-task-tile flex min-h-[196px] w-[84%] shrink-0 flex-col overflow-hidden p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[15px] font-medium uppercase text-white/90">{item.subject ?? "COMPITO"}</p>
              <Pin className="h-5 w-5 shrink-0 rotate-45 text-[#e84834]" fill="#e84834" strokeWidth={1.5} />
            </div>
            <p className="mt-5 line-clamp-3 text-[14px] leading-5 text-white/90">{item.title}{item.details ? `: ${item.details}` : ""}</p>
            <p className="mt-auto border-t border-white/30 pt-3 text-center text-[10px] uppercase text-black/80">Consegna {dueDateLabel(item.dueDate)}</p>
          </article>
        )) : <EmptyTile text="Nessun compito in scadenza" variant="task" />}
      </DidupScroller>

      <section className="didup-card relative overflow-hidden px-5 pb-2 pt-4">
        <img
          src="/didup-event-badge.png"
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
                  <span className="flex w-[22px] shrink-0 items-center justify-center text-[#08b8c4]">
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
                        className="whitespace-nowrap pt-1 text-[12px] font-semibold text-[#08b8c4]"
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

      <DidupSectionTitle title="Ultimi voti" href="/voti" />
      <DidupScroller>
        {latestGrades.slice(0, 5).map(({ subject, grade }) => {
          const badgeImage =
            grade.value < 5
              ? "/didup-grade-badge-red.png"
              : grade.value < 6
                ? "/didup-grade-badge-orange.png"
                : "/didup-grade-badge.png";

          return (
            <article key={grade.id} className="didup-tile relative min-h-[176px] w-[84%] shrink-0 overflow-hidden p-4">
              <span className="absolute right-0 top-0 flex h-[60px] w-[60px] items-center justify-center text-[20px] font-extrabold text-white">
                <img src={badgeImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full select-none" />
                <span className="relative z-10">{grade.label}</span>
              </span>
              <p className="text-[12px] text-[#08b8c4]">{shortDate(grade.date)}</p>
              <p className="mt-5 text-[16px] uppercase">{subject.name}</p>
              <p className="mt-1 text-[13px] text-white/90">{grade.teacher || grade.comment || grade.type}</p>
            </article>
          );
        })}
      </DidupScroller>

      <DidupSectionTitle title="Bacheca" href="/" />
      <DidupScroller>
        {notices.length > 0 ? (
          notices.slice(0, 5).map((item) => {
            const attachmentCount = item.attachments?.length || (item.attachmentPath ? 1 : 0);
            return (
              <article
                key={item.id}
                className="didup-tile relative flex min-h-[234px] w-[84%] shrink-0 flex-col overflow-hidden p-4"
              >
                <p className="pr-12 text-[12px] text-[#08b8c4]">{shortDate(item.date)}</p>
                <img
                  src="/didup-bacheca-badge-transparent.png"
                  alt=""
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-[45px] w-[45px] select-none"
                />
                <p className="mt-2 text-[18px] uppercase">Circolari</p>
                <p className="text-[13px]">{item.subject || "Circolare"}</p>
                <p className="mt-14 line-clamp-1 text-[15px] leading-6">
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

      <DidupSectionTitle title="Promemoria" href="/promemoria" />
      <DidupScroller>
        {(reminders.length ? reminders : [{ id: "empty-reminder", title: "Nessun promemoria", message: "I prossimi promemoria appariranno qui." }]).slice(0, 5).map((item) => (
          <article key={item.id} className="didup-tile relative min-h-[177px] w-[84%] shrink-0 overflow-hidden p-4">
            <p className="pr-12 text-[12px] text-[#08b8c4]">{shortDate(item.date) || "DATA DA DEFINIRE"}</p>
            <img src="/didup-reminder-badge-transparent.png" alt="" aria-hidden="true" className="absolute right-0 top-0 h-[45px] w-[45px] select-none" />
            <p className="mt-2 text-[13px]">{item.subject || "Promemoria"}</p>
            <p className="mt-16 text-[16px] leading-6">{item.message || item.title}</p>
          </article>
        ))}
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

function AbsenceIcon() {
  return <img src="/didup-absence-icon.png" alt="" aria-hidden="true" className="h-[23px] w-[18px] shrink-0 object-contain" />;
}

function EmptyTile({ text, variant }: { text: string; variant: "task" | "notice" }) {
  const size = variant === "task"
    ? "didup-task-tile min-h-[196px] p-5"
    : "min-h-[234px] p-4";
  return <article className={`didup-tile ${size} flex w-[84%] shrink-0 items-center justify-center text-center text-sm text-white/70`}>{text}</article>;
}

function DidupSectionTitle({ title, href }: { title: string; href: string }) {
  return <div className="mt-9 flex items-center justify-between px-3.5"><h2 className="text-[22px] font-extrabold">{title}</h2><Link to={href} className="text-[13px] text-white/90">Vedi tutti ›</Link></div>;
}

function DidupScroller({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-0.5">{children}</div>;
}
