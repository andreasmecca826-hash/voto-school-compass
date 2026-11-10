import { useMemo, useState } from "react";
import { CalendarClock, Check, Clock3, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadSchedule } from "@/lib/voto/orario";
import { buildStudyPlan, type StudyPlanTask } from "@/lib/voto/study-planner";
import { useVoto, useClock } from "@/lib/voto/store";

const COMPLETED_KEY = "voto.study-planner.completed.v1";
const POSTPONED_KEY = "voto.study-planner.postponed.v1";

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

export function StudyPlannerTool() {
  const { data, interrogazioni } = useVoto();
  const now = useClock();
  const [minutesPerDay, setMinutesPerDay] = useState(90);
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
      }),
    [completedIds, data.assignments, interrogazioni, minutesPerDay, now, postponed],
  );
  const plannedTasks = plan.reduce((total, day) => total + day.tasks.length, 0);
  const openTasks =
    data.assignments.filter((item) => !item.completed).length +
    interrogazioni.filter((item) => !item.completed).length;

  const completeTask = (task: StudyPlanTask) => {
    const final =
      task.id in completed
        ? (() => {
            const copy = { ...completed };
            delete copy[task.id];
            return copy;
          })()
        : { ...completed, [task.id]: new Date().toISOString() };
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

  return (
    <div className="space-y-4">
      <section className="card-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold">Smart Study Planner</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Organizza compiti, verifiche e interrogazioni nei prossimi sette giorni. Tutto resta
              locale sul dispositivo.
            </p>
          </div>
          <CalendarClock className="h-5 w-5 shrink-0 text-primary" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs font-medium">
            Tempo di studio al giorno
            <span className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={30}
                max={360}
                step={15}
                value={minutesPerDay}
                onChange={(event) =>
                  setMinutesPerDay(Math.max(30, Math.min(360, Number(event.target.value) || 30)))
                }
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
              />
              <span className="text-xs text-muted-foreground">minuti</span>
            </span>
          </label>
          <Button variant="outline" onClick={resetPlanner}>
            <RotateCcw /> Azzera piano
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Il planner riduce il tempo disponibile nei giorni con più lezioni e mette prima le
          attività con scadenza più vicina. Attività completate e rimandate vengono ricalcolate
          automaticamente.
        </p>
      </section>

      <section className="rounded-xl border border-primary/20 bg-primary-soft/30 p-3 text-xs">
        <strong>{plannedTasks}</strong> attività pianificate su <strong>{openTasks}</strong> aperte.
        {plannedTasks === 0 && " Non trovo attività future con data nei prossimi sette giorni."}
      </section>

      <div className="space-y-3">
        {plan.map((day) => (
          <section key={day.date} className="card-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="font-semibold">{day.label}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {day.availableMinutes} min ancora disponibili dopo il piano
                </p>
              </div>
              <Clock3 className="h-4 w-4 text-muted-foreground" />
            </div>
            {day.tasks.length ? (
              <div className="divide-y divide-border">
                {day.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary">
                      {task.minutes} min
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
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
