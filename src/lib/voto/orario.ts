export const DAYS = [
  { id: "lunedi", label: "Lunedì", short: "Lun" },
  { id: "martedi", label: "Martedì", short: "Mar" },
  { id: "mercoledi", label: "Mercoledì", short: "Mer" },
  { id: "giovedi", label: "Giovedì", short: "Gio" },
  { id: "venerdi", label: "Venerdì", short: "Ven" },
] as const;

export type DayId = (typeof DAYS)[number]["id"];
export type Schedule = Record<DayId, string[]>;

const STORAGE_KEY = "voto.orario";
const HOURS = 6;

export function emptySchedule(): Schedule {
  return Object.fromEntries(
    DAYS.map(({ id }) => [id, Array.from({ length: HOURS }, () => "")]),
  ) as Schedule;
}

export function loadSchedule(): Schedule {
  const fallback = emptySchedule();
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<Schedule> | null;
    if (!parsed || typeof parsed !== "object") return fallback;
    return Object.fromEntries(
      DAYS.map(({ id }) => [
        id,
        Array.from({ length: HOURS }, (_, index) =>
          typeof parsed[id]?.[index] === "string" ? parsed[id][index] : "",
        ),
      ]),
    ) as Schedule;
  } catch {
    return fallback;
  }
}

export function saveSchedule(schedule: Schedule) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    /* storage pieno o non disponibile */
  }
}

export function clearScheduleDay(schedule: Schedule, day: DayId): Schedule {
  const next = { ...schedule, [day]: Array.from({ length: HOURS }, () => "") };
  saveSchedule(next);
  return next;
}

export type ClearScheduleDayResult = "cleared" | "changed" | "empty";

export function clearScheduleDayIfUnchanged(
  schedule: Schedule,
  day: DayId,
  expectedLessons: readonly string[],
): ClearScheduleDayResult {
  const currentLessons = schedule[day];
  if (
    currentLessons.length !== expectedLessons.length ||
    currentLessons.some((lesson, index) => lesson !== expectedLessons[index])
  )
    return "changed";
  if (!currentLessons.some((lesson) => lesson.trim())) return "empty";
  clearScheduleDay(schedule, day);
  return "cleared";
}
