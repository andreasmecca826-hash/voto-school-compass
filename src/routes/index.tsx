import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Calculator,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Github,
  Megaphone,
  Minus,
  StickyNote,
} from "lucide-react";
import { PeriodPicker } from "@/components/voto/PeriodPicker";
import { useSchoolPeriods } from "@/lib/voto/periods-context";
import { Slider } from "@/components/ui/slider";
import { AssignmentRow } from "@/components/voto/AssignmentRow";
import { CircularViewer } from "@/components/voto/CircularViewer";
import { CircularCheckControl } from "@/components/voto/CircularCheckControl";
import { NOTIF_META } from "@/lib/voto/notification-meta";
import { Empty, ProgressBar, SectionTitle, Sparkline } from "@/components/voto/ui";
import { resolveHomeModuleScale } from "@/lib/voto/home-customization";
import { emptySchedule, loadSchedule, type Schedule } from "@/lib/voto/orario";
import { getNextScheduledLesson } from "@/lib/voto/next-lesson";
import { cn } from "@/lib/utils";
import {
  openAssignmentsForTomorrow,
  tomorrowDate,
  tomorrowScheduleDay,
  tomorrowSubjects,
  upcomingSchoolEvents,
} from "@/lib/voto/tomorrow-school";
import type { Interrogazione } from "@/lib/voto/interrogazioni";
import type { AppNotification, Assignment } from "@/lib/voto/types";
import { average, averageHistory, fmt, neededGrade, overallAverage } from "@/lib/voto/calc";
import { fmtDate, fmtTime } from "@/lib/voto/dates";
import {
  selectDashboardAssignments,
  selectNotificationsByType,
  selectOpenInterrogazioni,
  selectUpcomingReminders,
} from "@/lib/voto/selectors";
import { useClock, useVoto } from "@/lib/voto/store";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VOTO." },
      {
        name: "description",
        content: "Media generale, presenze, compiti e comunicazioni scolastiche.",
      },
      { property: "og:title", content: "Dashboard — VOTO." },
      { property: "og:description", content: "La tua dashboard scolastica personale." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const v = useVoto();
  const { isDone } = v;
  const now = useClock();
  const [attendanceView, setAttendanceView] = useState<"hours" | "days">("hours");
  const [schedule, setSchedule] = useState<Schedule>(() => emptySchedule());
  const { subjects, config } = useSchoolPeriods();
  const { assignments, notifications, previousAverage } = v.data;
  const avg = useMemo(() => overallAverage(subjects), [subjects]);
  const history = useMemo(() => averageHistory(subjects), [subjects]);
  const delta =
    config.selection === "all" && avg !== null && previousAverage !== undefined
      ? avg - previousAverage
      : null;
  const today = useMemo(
    () => selectDashboardAssignments(assignments, now, v.isDone),
    [assignments, now, v.isDone],
  );
  const attendance = v.data.attendance ?? {
    absenceDays: 0,
    absenceHours: 0,
    delays: 0,
    earlyExits: 0,
    annualHours: 990,
    absenceLimitHours: 264,
  };
  const remainingHours = Math.max(0, attendance.absenceLimitHours - attendance.absenceHours);
  const absenceLimitDays = attendance.absenceLimitHours / 6;
  const remainingDays = Math.max(0, absenceLimitDays - attendance.absenceDays);
  const showingDays = attendanceView === "days";
  const notes = useMemo(() => selectNotificationsByType(notifications, "note"), [notifications]);
  const reminders = useMemo(
    () => selectUpcomingReminders(notifications, now).slice(0, 3),
    [notifications, now],
  );
  const bulletin = useMemo(
    () => selectNotificationsByType(notifications, "notice"),
    [notifications],
  );
  const interrogazioni = useMemo(
    () => selectOpenInterrogazioni(v.interrogazioni),
    [v.interrogazioni],
  );
  useEffect(() => setSchedule(loadSchedule()), []);
  const nextLesson = useMemo(() => getNextScheduledLesson(schedule, now), [schedule, now]);
  const lessonPreparation = useMemo(() => {
    if (!nextLesson) return null;
    const normalizedSubject = nextLesson.subject.trim().toLocaleLowerCase("it-IT");
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return assignments
      .filter((assignment) => {
        const subject = assignment.subject?.trim().toLocaleLowerCase("it-IT");
        const dueDate = assignment.dueDate;
        return (
          subject === normalizedSubject &&
          dueDate !== undefined &&
          dueDate >= todayKey &&
          !isDone(assignment.id, assignment.completed)
        );
      })
      .sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""))[0];
  }, [nextLesson, assignments, isDone, now]);
  const isHomeModuleVisible = (id: string) =>
    v.homeModules.find((module) => module.id === id)?.enabled ?? false;
  const homeOrder = (id: string) => v.homeModules.findIndex((module) => module.id === id);
  const homeModuleScale = (id: string) =>
    resolveHomeModuleScale(
      v.homeScale,
      v.homeModules.find((module) => module.id === id)?.scale ?? 100,
    ) / v.homeScale;

  const micro =
    avg === null
      ? "Nessun voto ancora: il primo arriverà presto."
      : delta !== null && delta > 0.05
        ? "Stai migliorando: continua così."
        : delta !== null && delta < -0.05
          ? "Leggero calo: punta sulle materie più deboli."
          : avg >= 8
            ? "Andamento solido e costante."
            : avg >= 6
              ? "Sei in linea, c'è margine per crescere."
              : "Serve un recupero mirato: usa il simulatore.";

  return (
    <div className="pt-3" style={{ zoom: v.homeScale / 100 }}>
      {v.source === "demo" && (
        <Link
          to="/impostazioni"
          className="press mb-4 flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft p-3.5"
        >
          <Github className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">Stai vedendo dati DEMO</p>
            <p className="text-[11px] text-muted-foreground">
              Incolla il tuo URL JSON di GitHub per i dati reali.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-primary" />
        </Link>
      )}

      <PeriodPicker />
      <TomorrowSchoolCard
        now={now}
        schedule={schedule}
        assignments={assignments}
        interrogazioni={v.interrogazioni}
        notifications={notifications}
        isDone={v.isDone}
      />
      <div className="flex flex-col">
        {isHomeModuleVisible("media") && (
          <div style={{ order: homeOrder("media"), zoom: homeModuleScale("media") }}>
            <section
              className="card-surface relative overflow-hidden p-5"
              aria-label="Media generale"
            >
              <div className="flex items-start justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Media generale
                </p>
                <Sparkline values={history} />
              </div>
              <div className="-mt-4 flex items-baseline gap-1.5">
                <span className="tabular font-display text-6xl font-semibold tracking-tight">
                  {avg === null ? "—" : fmt(avg)}
                </span>
                <span className="text-lg text-muted-foreground">/10</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {delta === null ? (
                  <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted-foreground">
                    Trend non disponibile
                  </span>
                ) : (
                  <span
                    className={cn(
                      "tabular inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      delta > 0.005
                        ? "bg-success-soft text-success"
                        : delta < -0.005
                          ? "bg-danger-soft text-danger"
                          : "bg-surface text-muted-foreground",
                    )}
                  >
                    {delta > 0.005 ? (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    ) : delta < -0.005 ? (
                      <ArrowDownRight className="h-3.5 w-3.5" />
                    ) : (
                      <Minus className="h-3.5 w-3.5" />
                    )}
                    {delta > 0 ? "+" : ""}
                    {fmt(delta)} vs {fmt(previousAverage!)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{micro}</span>
              </div>
              <p className="mt-4 text-[10.5px] text-muted-foreground">
                {v.source === "demo" ? "Dati demo" : `Aggiornato ${fmtTime(v.lastSync)}`}
                {v.error && v.source !== "demo" && (
                  <span className="text-danger"> · offline, dati salvati</span>
                )}
              </p>
            </section>
          </div>
        )}

        {isHomeModuleVisible("simulatore") && (
          <div style={{ order: homeOrder("simulatore"), zoom: homeModuleScale("simulatore") }}>
            <Link
              to="/studio"
              className="press card-surface mt-3 flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Calculator className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Studio Lab</span>
                <span className="block text-xs text-muted-foreground">
                  Calcolo media e simulatore voti
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        )}

        {isHomeModuleVisible("prossima-lezione") && (
          <div
            style={{
              order: homeOrder("prossima-lezione"),
              zoom: homeModuleScale("prossima-lezione"),
            }}
          >
            <SectionTitle
              action={
                <Link to="/orario" className="text-xs font-medium text-primary">
                  Modifica orario
                </Link>
              }
            >
              Prossima lezione
            </SectionTitle>
            {nextLesson ? (
              <section className="card-surface flex items-start gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {nextLesson.isToday ? "Oggi" : nextLesson.dayLabel} · {nextLesson.hour}ª ora
                  </p>
                  <h3 className="mt-1 truncate text-base font-semibold">{nextLesson.subject}</h3>
                  {lessonPreparation ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Da preparare:</span>{" "}
                      {lessonPreparation.title}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Nessun compito aperto registrato per questa materia.
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Le lezioni sono mostrate nell’ordine inserito: gli orari delle campanelle non
                    sono configurati nell’app.
                  </p>
                </div>
              </section>
            ) : (
              <Empty
                icon={<BookOpen className="h-6 w-6" />}
                title="Completa il tuo orario"
                text="Inserisci le materie per vedere qui la prossima lezione."
              />
            )}
          </div>
        )}

        {isHomeModuleVisible("presenze") && (
          <div style={{ order: homeOrder("presenze"), zoom: homeModuleScale("presenze") }}>
            <SectionTitle>Presenze</SectionTitle>
            <section className="card-surface p-4">
              <div className="mb-4 grid grid-cols-2 rounded-xl border border-border bg-surface p-1">
                {(["hours", "days"] as const).map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setAttendanceView(view)}
                    className={cn(
                      "press rounded-lg px-3 py-2 text-xs font-semibold",
                      attendanceView === view
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {view === "hours" ? "Ore" : "Giorni"}
                  </button>
                ))}
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {showingDays ? "Giorni di assenza" : "Ore di assenza"}
                  </p>
                  <p className="mt-1 tabular font-display text-3xl font-semibold">
                    {fmt(
                      showingDays ? attendance.absenceDays : attendance.absenceHours,
                      showingDays ? 0 : 1,
                    )}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{" "}
                      {fmt(
                        showingDays ? absenceLimitDays : attendance.absenceLimitHours,
                        showingDays ? 0 : 1,
                      )}{" "}
                      {showingDays ? "giorni" : "ore"}
                    </span>
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      attendance.absenceHours > attendance.absenceLimitHours
                        ? "text-danger"
                        : "text-muted-foreground",
                    )}
                  >
                    {attendance.absenceHours > attendance.absenceLimitHours
                      ? "Limite del 25% superato"
                      : `Puoi ancora fare ${fmt(showingDays ? remainingDays : remainingHours, showingDays ? 0 : 1)} ${showingDays ? "giorni" : "ore"}`}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={Math.min(
                    100,
                    (attendance.absenceHours / attendance.absenceLimitHours) * 100,
                  )}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-[11px] text-muted-foreground">Ritardi</p>
                  <p className="tabular text-xl font-semibold">{attendance.delays}</p>
                  <p className="text-[10px] text-muted-foreground">non conteggiati nelle ore</p>
                </div>
                <div className="rounded-xl bg-surface p-3">
                  <p className="text-[11px] text-muted-foreground">Uscite</p>
                  <p className="tabular text-xl font-semibold">{attendance.earlyExits}</p>
                  <p className="text-[10px] text-muted-foreground">non conteggiate nelle ore</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {isHomeModuleVisible("compiti") && (
          <div style={{ order: homeOrder("compiti"), zoom: homeModuleScale("compiti") }}>
            <SectionTitle
              action={
                <Link to="/compiti" className="text-xs font-medium text-primary">
                  Compiti
                </Link>
              }
            >
              Oggi
            </SectionTitle>
            {today.length === 0 ? (
              <Empty
                icon={<CalendarCheck className="h-6 w-6" />}
                title="Niente in scadenza"
                text="Nessun compito per oggi o domani."
              />
            ) : (
              <ul className="space-y-2">
                {today.map((a) => (
                  <AssignmentRow key={a.id} a={a} />
                ))}
              </ul>
            )}
          </div>
        )}

        {isHomeModuleVisible("interrogazioni") && (
          <div
            style={{ order: homeOrder("interrogazioni"), zoom: homeModuleScale("interrogazioni") }}
          >
            <SectionTitle
              action={
                <Link to="/interrogazioni" className="text-xs font-medium text-primary">
                  Vedi tutte
                </Link>
              }
            >
              Interrogazioni
            </SectionTitle>
            {interrogazioni.length === 0 ? (
              <Empty
                icon={<CalendarDays className="h-6 w-6" />}
                title="Nessuna interrogazione"
                text="Aggiungila dalla sezione Interrogazioni."
              />
            ) : (
              <ul className="space-y-2">
                {interrogazioni.map((item) => (
                  <li key={item.id} className="card-surface flex items-center gap-3 p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.subject}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {item.date ? fmtDate(item.date) : "Data da definire"}
                        {item.hour ? ` · ${item.hour}ª ora` : item.time ? ` · ${item.time}` : ""}
                      </p>
                    </div>
                    {item.notes && (
                      <span className="max-w-[35%] truncate text-[10px] text-muted-foreground">
                        {item.notes}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isHomeModuleVisible("note") && (
          <div style={{ order: homeOrder("note"), zoom: homeModuleScale("note") }}>
            <SectionTitle>Note</SectionTitle>
            {notes.length === 0 ? (
              <Empty icon={<StickyNote className="h-6 w-6" />} title="Nessuna nota" />
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <NotifItem key={n.id} id={n.id} />
                ))}
              </ul>
            )}
          </div>
        )}

        {isHomeModuleVisible("promemoria") && (
          <div style={{ order: homeOrder("promemoria"), zoom: homeModuleScale("promemoria") }}>
            <SectionTitle
              action={
                <Link to="/promemoria" className="text-xs font-medium text-primary">
                  Vedi tutti
                </Link>
              }
            >
              Promemoria
            </SectionTitle>
            {reminders.length === 0 ? (
              <Empty
                icon={<Clock3 className="h-6 w-6" />}
                title="Nessun promemoria"
                text="I promemoria sincronizzati da DidUP compariranno qui."
              />
            ) : (
              <ul className="space-y-2">
                {reminders.map((reminder) => (
                  <NotifItem key={reminder.id} id={reminder.id} />
                ))}
              </ul>
            )}
          </div>
        )}

        {isHomeModuleVisible("bacheca") && (
          <div style={{ order: homeOrder("bacheca"), zoom: homeModuleScale("bacheca") }}>
            <SectionTitle>Bacheca</SectionTitle>
            <CircularCheckControl />
            {bulletin.length === 0 ? (
              <Empty icon={<Megaphone className="h-6 w-6" />} title="Nessuna comunicazione" />
            ) : (
              <ul className="space-y-2">
                {bulletin.map((n) => (
                  <NotifItem key={n.id} id={n.id} />
                ))}
              </ul>
            )}
          </div>
        )}

        {isHomeModuleVisible("obiettivo") && (
          <div style={{ order: homeOrder("obiettivo"), zoom: homeModuleScale("obiettivo") }}>
            <GoalWidget avg={avg} />
          </div>
        )}
      </div>
    </div>
  );
}

function TomorrowSchoolCard({
  now,
  schedule,
  assignments,
  interrogazioni,
  notifications,
  isDone,
}: {
  now: Date;
  schedule: Schedule;
  assignments: Assignment[];
  interrogazioni: Interrogazione[];
  notifications: AppNotification[];
  isDone: (id: string, remote: boolean) => boolean;
}) {
  const nextDay = tomorrowScheduleDay(now);
  const tomorrow = tomorrowDate(now);
  const tomorrowLabel = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(tomorrow);
  const titleDate = tomorrowLabel.charAt(0).toLocaleUpperCase("it-IT") + tomorrowLabel.slice(1);
  const materials = tomorrowSubjects(schedule, now);
  const openTasks = openAssignmentsForTomorrow(assignments, isDone, now);
  const events = upcomingSchoolEvents(interrogazioni, notifications, now);

  return (
    <section className="card-surface mt-4 overflow-hidden" aria-label="Domani a scuola">
      <div className="flex items-center gap-3 border-b border-border bg-primary-soft/40 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">Domani a scuola</h2>
          <p className="text-xs text-muted-foreground">{titleDate}</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold">Libri e quaderni da portare</h3>
          </div>
          {materials.length ? (
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {materials.map((subject) => (
                <li
                  key={subject}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs"
                >
                  <span className="font-medium">{subject}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    Libro · quaderno
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
              {nextDay
                ? "Nessuna materia inserita nell’orario di domani."
                : "Domani non è un giorno scolastico feriale: nessuna lezione prevista nell’orario."}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold">Compiti con scadenza domani</h3>
            </div>
            <Link to="/compiti" className="text-[10px] font-medium text-primary">
              Apri
            </Link>
          </div>
          {openTasks.length ? (
            <ul className="space-y-1.5">
              {openTasks.slice(0, 4).map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs"
                >
                  <span className="min-w-0 font-medium">
                    {task.title}
                    {task.subject ? (
                      <span className="font-normal text-muted-foreground"> · {task.subject}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {task.dueDate ? fmtDate(task.dueDate) : "Senza scadenza"}
                  </span>
                </li>
              ))}
              {openTasks.length > 4 && (
                <li className="px-3 text-[10px] text-muted-foreground">
                  e altri {openTasks.length - 4} compiti
                </li>
              )}
            </ul>
          ) : (
            <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
              Nessun compito con scadenza domani.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold">Verifiche e interrogazioni di domani</h3>
            </div>
            <Link to="/interrogazioni" className="text-[10px] font-medium text-primary">
              Agenda
            </Link>
          </div>
          {events.length ? (
            <ul className="space-y-1.5">
              {events.slice(0, 4).map((event) => (
                <li
                  key={event.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{event.title}</span>
                    <span className="block text-[10px] text-muted-foreground">
                      {event.source === "interrogazione" ? "Interrogazione" : "Promemoria DidUP"}
                      {event.detail ? ` · ${event.detail}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {fmtDate(event.date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground">
              Nessuna verifica o interrogazione in programma per domani.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function NotifItem({ id }: { id: string }) {
  const v = useVoto();
  const [circularOpen, setCircularOpen] = useState(false);
  const n = v.data.notifications.find((x) => x.id === id)!;
  const read = v.isRead(n.id, n.read);
  const M = NOTIF_META[n.type];
  return (
    <li className={cn("card-surface flex items-center gap-3 p-3.5", !read && "border-primary/30")}>
      <span
        className={cn(
          "flex h-9 min-w-11 items-center justify-center rounded-lg bg-surface",
          !read && "text-primary",
        )}
      >
        <M.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{n.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {M.label}
          {n.message ? ` · ${n.message}` : ""}
        </p>
        {n.type === "notice" && (
          <button
            type="button"
            onClick={() => {
              setCircularOpen(true);
              if (!read) v.markRead([n.id]);
            }}
            className="press mt-2 inline-flex max-w-full items-center rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-semibold text-primary"
          >
            Apri circolare
          </button>
        )}
      </div>
      {read ? (
        <span className="text-[11px] text-muted-foreground">{fmtDate(n.date)}</span>
      ) : (
        <button
          type="button"
          onClick={() => v.markRead([n.id])}
          className="press rounded-lg px-2 py-1 text-[11px] font-medium text-primary"
        >
          Letto
        </button>
      )}
      {n.type === "notice" && (
        <CircularViewer
          open={circularOpen}
          onOpenChange={setCircularOpen}
          title={n.message ?? n.title}
          fileName={n.attachmentName}
          path={n.attachmentPath}
          url={n.attachmentPath ? n.attachmentUrl : undefined}
        />
      )}
    </li>
  );
}

function GoalWidget({ avg }: { avg: number | null }) {
  const v = useVoto();
  const { subjects } = useSchoolPeriods();
  const graded = subjects.filter((s) => average(s.grades) !== null);
  const gap = avg === null ? null : v.target - avg;

  let estimate = "Aggiungi voti per una stima.";
  if (avg !== null && gap !== null && graded.length) {
    if (gap <= 0) estimate = "Obiettivo raggiunto: mantieni il ritmo.";
    else {
      const weakest = [...graded].sort((a, b) => average(a.grades)! - average(b.grades)!)[0]!;
      const sum = graded.reduce((t, s) => t + average(s.grades)!, 0);
      const needAvg = v.target * graded.length - sum + average(weakest.grades)!;
      const r = needAvg <= 10 ? neededGrade(weakest.grades, needAvg, 1) : null;
      estimate =
        r && r.status === "ok"
          ? `Con un ${fmt(r.needed, 1)} in ${weakest.name} raggiungeresti ${fmt(v.target)}.`
          : `Serve crescere in più materie: in media +${fmt(gap)} ciascuna.`;
    }
  }
  const pct = avg === null ? 0 : Math.min(100, (avg / v.target) * 100);

  return (
    <>
      <SectionTitle>Obiettivo media</SectionTitle>
      <section className="card-surface p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Obiettivo</p>
            <p className="tabular font-display text-3xl font-semibold">{fmt(v.target)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Scarto</p>
            <p
              className={cn(
                "tabular font-display text-lg font-semibold",
                gap !== null && gap <= 0 ? "text-success" : "text-primary",
              )}
            >
              {gap === null ? "—" : gap <= 0 ? "Raggiunto" : `−${fmt(gap)}`}
            </p>
          </div>
        </div>
        <Slider
          className="mt-4"
          min={6}
          max={10}
          step={0.25}
          value={[v.target]}
          onValueChange={(val) => v.setTarget(val[0] ?? v.target)}
          aria-label="Obiettivo media generale"
        />
        <div className="mt-4">
          <ProgressBar value={pct} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{estimate}</p>
      </section>
    </>
  );
}
