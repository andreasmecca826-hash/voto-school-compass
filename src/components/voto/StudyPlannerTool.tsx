import { useMemo, useState } from "react";
import { CalendarClock, Check, Clock3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadSchedule } from "@/lib/voto/orario";
import { buildStudyPlan, type StudyPlanTask } from "@/lib/voto/study-planner";
import { useVoto, useClock } from "@/lib/voto/store";

const COMPLETED_KEY = "voto.study-planner.completed.v1";
const POSTPONED_KEY = "voto.study-planner.postponed.v1";
const START_KEY = "voto.study-planner.start.v1";
const END_KEY = "voto.study-planner.end.v1";

function loadString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function saveString(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // La scelta resta valida nella sessione corrente.
  }
}

function loadRecord(key: string): Record<string, string> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}") as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const result: Record<string, string> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (typeof item === "string") result[key] = item;
    }
    return result;
  } catch {
    return {};
  }
}

function saveRecord(key: string, value: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Il piano resta disponibile nella sessione corrente.
  }
}

function kindLabel(task: StudyPlanTask): string {
  return task.kind === "compito"
    ? "Compito"
    : task.kind === "verifica"
      ? "Verifica"
      : "Interrogazione";
}

function minutesFromTime(value: string): number {
  const [hours = "14", minutes = "00"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function timeLabel(value: number): string {
  const normalized = Math.max(0, value);
  return `${String(Math.floor(normalized / 60) % 24).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function taskTime(start: string, tasks: StudyPlanTask[], index: number): string {
  const from =
    minutesFromTime(start) + tasks.slice(0, index).reduce((total, item) => total + item.minutes, 0);
  return `${timeLabel(from)}–${timeLabel(from + (tasks[index]?.minutes ?? 0))}`;
}

export function StudyPlannerTool() {
  const { data, interrogazioni } = useVoto();
  const now = useClock();
  const [minutesDraft, setMinutesDraft] = useState("90");
  const [studyStart, setStudyStart] = useState(() => loadString(START_KEY, "14:00"));
  const [studyEnd, setStudyEnd] = useState(() => loadString(END_KEY, "15:00"));
  const minutesPerDay = Math.max(30, Math.min(360, Number(minutesDraft) || 90));
  const [completed, setCompleted] = useState<Record<string, string>>(() =>
    loadRecord(COMPLETED_KEY),
  );
  const [postponed, setPostponed] = useState<Record<string, string>>(() =>
    loadRecord(POSTPONED_KEY),
  );
  const completedIds = useMemo(() => new Set(Object.keys(completed)), [completed]);
  const plan = useMemo(
    () =>
      buildStudyPlan({
        assignments: data.assignments,
        interrogazioni,
        schedule: loadSchedule(),
        now,
        minutesPerDay,
        completedIds,
        earliestDates: postponed,
        studyStart,
        studyEnd,
      }),
    [
      completedIds,
      data.assignments,
      interrogazioni,
      minutesPerDay,
      now,
      postponed,
      studyEnd,
      studyStart,
    ],
  );
  const plannedTasks = plan.reduce(
    (total, day) => total + day.tasks.filter((task) => !task.completed).length,
    0,
  );
  const openTasks =
    data.assignments.filter((item) => !item.completed).length +
    interrogazioni.filter((item) => !item.completed).length;

  const completeTask = (task: StudyPlanTask) => {
    if (task.completed) return;
    const final = { ...completed, [task.id]: new Date().toISOString() };
    setCompleted(final);
    saveRecord(COMPLETED_KEY, final);
  };

  const postponeTask = (task: StudyPlanTask, currentDate: string) => {
    const nextDate = plan.find((day) => day.date > currentDate)?.date;
    if (!nextDate) return;
    const next = { ...postponed, [task.id]: nextDate };
    setPostponed(next);
    saveRecord(POSTPONED_KEY, next);
  };

  const resetPlanner = () => {
    setCompleted({});
    setPostponed({});
    saveRecord(COMPLETED_KEY, {});
    saveRecord(POSTPONED_KEY, {});
  };

  const commitMinutes = () => {
    const next = Math.max(30, Math.min(360, Number(minutesDraft) || 90));
    setMinutesDraft(String(next));
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Piano personale
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">Smart Study Planner</h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
              Un programma realistico per arrivare preparato, senza riempire ogni pomeriggio.
              Compiti, verifiche e interrogazioni restano sul dispositivo.
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <CalendarClock className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-5 rounded-xl border border-border/70 bg-card/80 p-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="text-xs font-semibold">
              Quanto tempo hai ogni giorno?
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={30}
                  max={360}
                  step={15}
                  inputMode="numeric"
                  value={minutesDraft}
                  onChange={(event) =>
                    setMinutesDraft(event.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  onBlur={commitMinutes}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitMinutes();
                  }}
                  className="h-11 w-24 rounded-lg border border-input bg-background px-3 text-center text-base font-semibold"
                  aria-label="Minuti di studio al giorno"
                />
                <span className="text-xs text-muted-foreground">minuti</span>
              </span>
            </label>
            <Button variant="ghost" size="sm" onClick={resetPlanner}>
              <RotateCcw /> Azzera
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border/70 pt-3">
            <label className="text-[11px] font-semibold text-muted-foreground">
              Dalle
              <input
                type="time"
                value={studyStart}
                onChange={(event) => {
                  setStudyStart(event.target.value);
                  saveString(START_KEY, event.target.value);
                }}
                className="mt-1 block h-10 rounded-lg border border-input bg-background px-2 text-sm font-semibold text-foreground"
                aria-label="Inizio orario di studio"
              />
            </label>
            <span className="pb-2 text-xs text-muted-foreground">alle</span>
            <label className="text-[11px] font-semibold text-muted-foreground">
              Fine
              <input
                type="time"
                value={studyEnd}
                onChange={(event) => {
                  setStudyEnd(event.target.value);
                  saveString(END_KEY, event.target.value);
                }}
                className="mt-1 block h-10 rounded-lg border border-input bg-background px-2 text-sm font-semibold text-foreground"
                aria-label="Fine orario di studio"
              />
            </label>
            <span className="pb-2 text-[11px] text-muted-foreground">
              La fascia limita il piano giornaliero.
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Preset tempo di studio">
            {[30, 45, 60, 90, 120, 180].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => setMinutesDraft(String(minutes))}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${minutesPerDay === minutes ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-primary/20 bg-primary-soft/30 p-3 text-xs">
        <strong>{plannedTasks}</strong> attività pianificate su <strong>{openTasks}</strong> aperte.
        {plannedTasks === 0 && " Non trovo attività future con data nei prossimi sette giorni."}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {plan.map((day) => (
          <section
            key={day.date}
            className={`overflow-hidden rounded-xl border ${day.tasks.length ? "border-border bg-card shadow-sm" : "border-dashed border-border/70 bg-surface/40"}`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="font-semibold">{day.label}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {day.tasks.length
                    ? `${day.tasks.length} ${day.tasks.length === 1 ? "attività" : "attività"} · `
                    : ""}
                  {day.availableMinutes} min liberi
                </p>
              </div>
              <Clock3
                className={`h-4 w-4 ${day.tasks.length ? "text-primary" : "text-muted-foreground"}`}
              />
            </div>
            {day.tasks.length ? (
              <div className="divide-y divide-border">
                {day.tasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 px-4 py-3 ${task.completed ? "bg-surface/60 opacity-70" : ""}`}
                  >
                    <span
                      className={`mt-0.5 rounded-full px-2 py-1 text-[10px] font-semibold ${task.completed ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}
                    >
                      {task.completed
                        ? "✓ Fatto"
                        : `${taskTime(studyStart, day.tasks, index)} · ${task.minutes} min`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}
                      >
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {kindLabel(task)}
                        {task.subject ? ` · ${task.subject}` : ""}
                        {task.dueDate ? ` · entro ${task.dueDate}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Segna completata"
                        aria-label={`Segna completata: ${task.title}`}
                        disabled={task.completed}
                        onClick={() => completeTask(task)}
                      >
                        <Check />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Rimanda al giorno successivo"
                        aria-label={`Rimanda: ${task.title}`}
                        onClick={() => postponeTask(task, day.date)}
                      >
                        <RotateCcw />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-4 text-xs text-muted-foreground">
                Nessuna attività assegnata a questo giorno.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
