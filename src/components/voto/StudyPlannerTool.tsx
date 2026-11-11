import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarClock, Check, Clock3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoto, useClock } from "@/lib/voto/store";

const MANUAL_TASKS_KEY = "voto.study-planner.manual-tasks.v1";
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const METHODS = [
  { value: "ripasso", label: "Ripasso" },
  { value: "esercizi", label: "Esercizi" },
  { value: "lettura", label: "Lettura" },
  { value: "preparazione", label: "Preparazione verifica/interrogazione" },
  { value: "altro", label: "Altro" },
] as const;

type StudyMethod = (typeof METHODS)[number]["value"];

interface ManualStudyTask {
  id: string;
  title: string;
  subject: string;
  method: StudyMethod;
  date: string;
  startTime: string;
  minutes: number;
  completed: boolean;
}

function dateFromKey(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;
  return date;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(value: string, amount: number): string {
  const date = dateFromKey(value);
  if (!date) return value;
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function mondayOf(value: string): string {
  const date = dateFromKey(value);
  if (!date) return value;
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return dateKey(date);
}

function daysBetween(start: string, end: string): number {
  const from = dateFromKey(start);
  const to = dateFromKey(end);
  if (!from || !to) return 0;
  return Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      86_400_000,
  );
}

function dayLabel(value: string): string {
  const date = dateFromKey(value);
  if (!date) return value;
  const label = date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  return label.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("it-IT"));
}

function weekLabel(start: string): string {
  const first = dateFromKey(start);
  const last = dateFromKey(addDays(start, 6));
  if (!first || !last) return "Settimana";
  const startLabel = first.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  const endLabel = last.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Settimana ${startLabel} – ${endLabel}`;
}

function loadManualTasks(): ManualStudyTask[] {
  try {
    const value = JSON.parse(localStorage.getItem(MANUAL_TASKS_KEY) ?? "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.flatMap((item): ManualStudyTask[] => {
      if (!item || typeof item !== "object") return [];
      const stored = item as Record<string, unknown>;
      const id = stored["id"];
      const title = stored["title"];
      const date = stored["date"];
      const minutes = stored["minutes"];
      const storedMethod = stored["method"] ?? stored["kind"];
      const subject = stored["subject"];
      const startTime = stored["startTime"];
      const completed = stored["completed"];
      if (
        typeof id !== "string" ||
        typeof title !== "string" ||
        typeof date !== "string" ||
        !dateFromKey(date) ||
        typeof minutes !== "number"
      ) {
        return [];
      }

      const method = METHODS.some((option) => option.value === storedMethod)
        ? (storedMethod as StudyMethod)
        : storedMethod === "verifica" || storedMethod === "interrogazione"
          ? "preparazione"
          : "esercizi";
      return [
        {
          id,
          title,
          subject: typeof subject === "string" ? subject : "",
          method,
          date,
          startTime:
            typeof startTime === "string" && /^\d{2}:\d{2}$/.test(startTime) ? startTime : "16:00",
          minutes: Math.max(15, Math.min(360, minutes)),
          completed: completed === true,
        },
      ];
    });
  } catch {
    return [];
  }
}

function saveManualTasks(tasks: ManualStudyTask[]) {
  try {
    localStorage.setItem(MANUAL_TASKS_KEY, JSON.stringify(tasks));
  } catch {
    // Le sessioni restano disponibili nella schermata aperta se lo storage non è disponibile.
  }
}

function methodLabel(method: StudyMethod): string {
  return METHODS.find((option) => option.value === method)?.label ?? "Studio";
}

export function StudyPlannerTool() {
  const { data, interrogazioni } = useVoto();
  const now = useClock();
  const today = dateKey(now);
  const currentWeekStart = mondayOf(today);
  const [manualTasks, setManualTasks] = useState<ManualStudyTask[]>(() => loadManualTasks());
  const [manualTitle, setManualTitle] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [manualMethod, setManualMethod] = useState<StudyMethod>("ripasso");
  const [manualMinutes, setManualMinutes] = useState("45");
  const [manualDate, setManualDate] = useState(today);
  const [manualStartTime, setManualStartTime] = useState("16:00");
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDays(currentWeekStart, weekOffset * 7);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const weekTasks = manualTasks.filter((task) => weekDays.includes(task.date));
  const openTasks = weekTasks.filter((task) => !task.completed).length;
  const plannedMinutes = weekTasks.reduce((total, task) => total + task.minutes, 0);
  const subjectOptions = [
    ...new Set(
      [
        ...data.subjects.map((subject) => subject.name),
        ...data.assignments.map((item) => item.subject ?? ""),
        ...interrogazioni.map((item) => item.subject),
      ].filter(Boolean),
    ),
  ];

  const selectDate = (value: string) => {
    if (!dateFromKey(value)) return;
    setManualDate(value);
    const targetWeekStart = mondayOf(value);
    setWeekOffset(Math.round(daysBetween(currentWeekStart, targetWeekStart) / 7));
  };

  const changeWeek = (amount: number) => {
    const nextStart = addDays(weekStart, amount * 7);
    setWeekOffset((current) => current + amount);
    setManualDate(nextStart);
  };

  const addManualTask = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = manualTitle.trim();
    const minutes = Math.max(15, Math.min(360, Number(manualMinutes) || 45));
    if (!title || !dateFromKey(manualDate)) return;
    const task: ManualStudyTask = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      subject: manualSubject.trim(),
      method: manualMethod,
      date: manualDate,
      startTime: manualStartTime || "16:00",
      minutes,
      completed: false,
    };
    const next = [...manualTasks, task];
    setManualTasks(next);
    saveManualTasks(next);
    setManualTitle("");
  };

  const toggleTask = (taskId: string) => {
    const next = manualTasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    );
    setManualTasks(next);
    saveManualTasks(next);
  };

  const removeTask = (taskId: string) => {
    const next = manualTasks.filter((task) => task.id !== taskId);
    setManualTasks(next);
    saveManualTasks(next);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Piano personale
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">Planner di studio</h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
              Decidi tu materia, argomento, metodo, giorno e durata. Le sessioni restano salvate su
              questo dispositivo: nessuna attività viene pianificata automaticamente.
            </p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <CalendarClock className="h-5 w-5" />
          </span>
        </div>
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="planner-add-title">
        <div>
          <h3 id="planner-add-title" className="font-display text-base font-semibold">
            Aggiungi una sessione
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Scrivi un obiettivo concreto, per esempio “Ripassare le equazioni del secondo grado”.
          </p>
        </div>
        <form onSubmit={addManualTask} className="space-y-3">
          <label className="block text-xs font-semibold">
            Argomento o obiettivo
            <input
              value={manualTitle}
              onChange={(event) => setManualTitle(event.target.value)}
              placeholder="Es. Ripassare le equazioni del secondo grado"
              maxLength={120}
              className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal"
              aria-label="Argomento o obiettivo"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold">
              Materia
              <input
                value={manualSubject}
                onChange={(event) => setManualSubject(event.target.value)}
                list="planner-subject-options"
                maxLength={80}
                placeholder="Es. Matematica"
                className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal"
                aria-label="Materia"
              />
              <datalist id="planner-subject-options">
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
            </label>
            <label className="block text-xs font-semibold">
              Metodo
              <select
                value={manualMethod}
                onChange={(event) => setManualMethod(event.target.value as StudyMethod)}
                className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal"
                aria-label="Metodo di studio"
              >
                {METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block text-xs font-semibold">
              Giorno
              <input
                type="date"
                value={manualDate}
                onChange={(event) => selectDate(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-2 text-sm font-normal"
                aria-label="Giorno della sessione"
                required
              />
            </label>
            <label className="block text-xs font-semibold">
              Inizio
              <input
                type="time"
                value={manualStartTime}
                onChange={(event) => setManualStartTime(event.target.value)}
                className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-2 text-sm font-normal"
                aria-label="Orario di inizio"
                required
              />
            </label>
            <label className="block text-xs font-semibold">
              Durata
              <span className="mt-1 flex h-11 items-center rounded-lg border border-input bg-card pr-3">
                <input
                  type="number"
                  min={15}
                  max={360}
                  step={15}
                  inputMode="numeric"
                  value={manualMinutes}
                  onChange={(event) =>
                    setManualMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                  className="h-full min-w-0 flex-1 rounded-lg bg-transparent px-3 text-sm font-normal outline-none"
                  aria-label="Durata in minuti"
                  required
                />
                <span className="text-[11px] font-normal text-muted-foreground">min</span>
              </span>
            </label>
            <Button type="submit" className="self-end">
              <Plus /> Aggiungi
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-primary/20 bg-primary-soft/30 p-3 text-xs">
        <strong>{openTasks}</strong> sessioni ancora da fare questa settimana ·{" "}
        <strong>{plannedMinutes}</strong> minuti pianificati.
      </section>

      <section aria-labelledby="planner-week-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
              Il tuo piano
            </p>
            <h3 id="planner-week-title" className="font-display text-base font-semibold">
              {weekLabel(weekStart)}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Settimana precedente"
              title="Settimana precedente"
              onClick={() => changeWeek(-1)}
            >
              <ArrowLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={weekOffset === 0}
              onClick={() => {
                setWeekOffset(0);
                setManualDate(today);
              }}
            >
              Oggi
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Settimana successiva"
              title="Settimana successiva"
              onClick={() => changeWeek(1)}
            >
              <ArrowRight />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {weekDays.map((day) => {
            const tasks = manualTasks
              .filter((task) => task.date === day)
              .sort((left, right) => left.startTime.localeCompare(right.startTime));
            return (
              <section
                key={day}
                className={`overflow-hidden rounded-xl border ${tasks.length ? "border-border bg-card shadow-sm" : "border-dashed border-border/70 bg-surface/40"}`}
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h4 className="font-semibold">{dayLabel(day)}</h4>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {tasks.reduce((total, task) => total + task.minutes, 0)} min
                  </span>
                </div>
                {tasks.length ? (
                  <div className="divide-y divide-border">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 px-4 py-3 ${task.completed ? "bg-surface/60 opacity-70" : ""}`}
                      >
                        <span
                          className={`mt-0.5 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${task.completed ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`}
                        >
                          {task.completed ? "Fatto" : `${task.startTime} · ${task.minutes} min`}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`break-words text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}
                          >
                            {task.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {methodLabel(task.method)}
                            {task.subject ? ` · ${task.subject}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`${task.completed ? "Segna da fare" : "Segna completata"}: ${task.title}`}
                            title={task.completed ? "Segna da fare" : "Segna completata"}
                            onClick={() => toggleTask(task.id)}
                          >
                            <Check />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Elimina: ${task.title}`}
                            title="Elimina sessione"
                            onClick={() => removeTask(task.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-4 py-4 text-xs text-muted-foreground">
                    Nessuna sessione pianificata.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <p className="text-center text-[11px] text-muted-foreground">
        Il planner è personale e funziona anche offline; i dati restano su questo dispositivo.
      </p>
    </div>
  );
}
