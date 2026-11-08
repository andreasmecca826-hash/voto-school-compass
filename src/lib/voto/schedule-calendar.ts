import { DAYS, type DayId, type Schedule } from "./orario";

export interface ScheduleCalendarOptions {
  fromDate: string;
  untilDate: string;
  firstLessonTime: string;
  lessonMinutes: number;
  breakMinutes: number;
  now?: Date;
}

interface ScheduleCalendarEvent {
  uid: string;
  date: string;
  startMinutes: number;
  endDate: string;
  endMinutes: number;
  summary: string;
  description: string;
  byDay: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const encoder = new TextEncoder();
const BY_DAY: Record<DayId, string> = {
  lunedi: "MO",
  martedi: "TU",
  mercoledi: "WE",
  giovedi: "TH",
  venerdi: "FR",
};

function isValidDate(value: string): boolean {
  if (!DATE_ONLY.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function compactDate(value: string): string {
  return value.replace(/-/g, "");
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextWeekday(fromDate: string, weekday: number): string {
  const date = new Date(`${fromDate}T00:00:00.000Z`);
  const offset = (weekday - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  let output = "";
  let segment = "";
  let byteLength = 0;

  for (const character of line) {
    const characterBytes = encoder.encode(character).length;
    if (byteLength + characterBytes > 75) {
      output += `${segment}\r\n `;
      segment = character;
      byteLength = 1 + characterBytes;
    } else {
      segment += character;
      byteLength += characterBytes;
    }
  }
  return output + segment;
}

function formatUtcDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}${String(remainder).padStart(2, "0")}00`;
}

function eventLines(event: ScheduleCalendarEvent, untilDate: string, stamp: string): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${compactDate(event.date)}T${formatTime(event.startMinutes)}`,
    `DTEND:${compactDate(event.endDate)}T${formatTime(event.endMinutes)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${event.byDay};UNTIL=${compactDate(untilDate)}T235959`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    "CATEGORIES:Orario scolastico",
    "END:VEVENT",
  ].map(foldLine);
}

export function createScheduleCalendarIcs(
  schedule: Schedule,
  options: ScheduleCalendarOptions,
): { content: string; eventCount: number } {
  if (
    !isValidDate(options.fromDate) ||
    !isValidDate(options.untilDate) ||
    options.fromDate > options.untilDate
  ) {
    throw new RangeError("Seleziona un intervallo di date valido.");
  }
  if (!TIME_ONLY.test(options.firstLessonTime)) {
    throw new RangeError("Inserisci un orario di inizio valido.");
  }
  if (
    !Number.isInteger(options.lessonMinutes) ||
    options.lessonMinutes < 1 ||
    options.lessonMinutes > 360
  ) {
    throw new RangeError("La durata della lezione deve essere compresa tra 1 e 360 minuti.");
  }
  if (
    !Number.isInteger(options.breakMinutes) ||
    options.breakMinutes < 0 ||
    options.breakMinutes > 120
  ) {
    throw new RangeError("L’intervallo tra le lezioni deve essere compreso tra 0 e 120 minuti.");
  }

  const firstStart =
    Number(options.firstLessonTime.slice(0, 2)) * 60 + Number(options.firstLessonTime.slice(3, 5));
  const step = options.lessonMinutes + options.breakMinutes;
  const events: ScheduleCalendarEvent[] = [];

  DAYS.forEach(({ id }, weekdayIndex) => {
    const lessons = schedule[id] ?? [];
    const firstDate = nextWeekday(options.fromDate, weekdayIndex + 1);
    if (firstDate > options.untilDate) return;

    lessons.forEach((rawSubject, lessonIndex) => {
      const subject = rawSubject.trim();
      if (!subject) return;

      const startMinutes = firstStart + lessonIndex * step;
      const endMinutes = startMinutes + options.lessonMinutes;
      if (startMinutes >= 24 * 60 || endMinutes > 24 * 60) {
        throw new RangeError(
          "Gli orari delle lezioni superano la mezzanotte; controlla durata e intervallo.",
        );
      }
      const endsAtMidnight = endMinutes === 24 * 60;

      events.push({
        uid: `orario-${id}-${lessonIndex + 1}@voto.app`,
        date: firstDate,
        startMinutes,
        endDate: endsAtMidnight ? addDays(firstDate, 1) : firstDate,
        endMinutes: endsAtMidnight ? 0 : endMinutes,
        summary: `${subject} · ${lessonIndex + 1}ª ora`,
        description: "Lezione ricorrente dell’orario scolastico VOTO.",
        byDay: BY_DAY[id],
      });
    });
  });

  if (events.length === 0) return { content: "", eventCount: 0 };

  const stamp = formatUtcDateTime(options.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VOTO//Orario scolastico 3.0.0//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:VOTO - Orario scolastico",
    ...events.flatMap((event) => eventLines(event, options.untilDate, stamp)),
    "END:VCALENDAR",
  ];

  return { content: `${lines.map(foldLine).join("\r\n")}\r\n`, eventCount: events.length };
}

export function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultSchoolYearEnd(date = new Date()): string {
  const year = date.getFullYear() + (date.getMonth() >= 6 ? 1 : 0);
  return `${year}-06-30`;
}
