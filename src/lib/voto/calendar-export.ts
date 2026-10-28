import type { Interrogazione } from "./interrogazioni";
import type { AppNotification, Assignment } from "./types";

export interface CalendarExportData {
  assignments: Assignment[];
  interrogazioni: Interrogazione[];
  notifications: AppNotification[];
}

export interface CalendarExportOptions {
  from: string;
  to: string;
  include: {
    assignments: boolean;
    interrogazioni: boolean;
    reminders: boolean;
  };
  isAssignmentDone: (id: string, completed: boolean) => boolean;
  now?: Date;
}

interface CalendarEvent {
  uid: string;
  date: string;
  time?: string | undefined;
  summary: string;
  description: string;
  category: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME_ONLY = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const encoder = new TextEncoder();

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

function dateInRange(date: string, from: string, to: string): boolean {
  return isValidDate(date) && date >= from && date <= to;
}

function eventDate(value: string | undefined): string | null {
  const date = value?.slice(0, 10) ?? "";
  return isValidDate(date) ? date : null;
}

function eventTime(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.length === 5 ? `${value}:00` : value;
  return TIME_ONLY.test(normalized) ? normalized : undefined;
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

function nextDate(date: string): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function serializeEvent(event: CalendarEvent, stamp: string): string[] {
  const lines = ["BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${stamp}`];

  if (event.time) {
    const start = new Date(`${event.date}T${event.time}`);
    if (Number.isFinite(start.getTime())) {
      lines.push(`DTSTART:${formatUtcDateTime(start)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`);
      lines.push(`DTEND;VALUE=DATE:${nextDate(event.date).replace(/-/g, "")}`);
    }
  } else {
    lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`);
    lines.push(`DTEND;VALUE=DATE:${nextDate(event.date).replace(/-/g, "")}`);
  }

  lines.push(
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `CATEGORIES:${escapeText(event.category)}`,
    "END:VEVENT",
  );
  return lines.map(foldLine);
}

export function createCalendarIcs(
  data: CalendarExportData,
  options: CalendarExportOptions,
): { content: string; eventCount: number } {
  if (!isValidDate(options.from) || !isValidDate(options.to) || options.from > options.to) {
    throw new RangeError("Seleziona un intervallo di date valido.");
  }

  const events: CalendarEvent[] = [];

  if (options.include.assignments) {
    for (const assignment of data.assignments) {
      const date = eventDate(assignment.dueDate);
      if (
        !date ||
        !dateInRange(date, options.from, options.to) ||
        options.isAssignmentDone(assignment.id, assignment.completed)
      ) {
        continue;
      }
      const details = [
        assignment.subject ? `Materia: ${assignment.subject}` : "",
        assignment.details?.trim() ?? "",
      ].filter(Boolean);
      events.push({
        uid: `compito-${encodeURIComponent(assignment.id)}@voto.app`,
        date,
        time: eventTime(assignment.dueTime),
        summary: `Compito: ${assignment.title}`,
        description: details.join("\n") || "Scadenza compito scolastico.",
        category: "Compiti",
      });
    }
  }

  if (options.include.interrogazioni) {
    for (const item of data.interrogazioni) {
      const date = eventDate(item.date);
      if (!date || !dateInRange(date, options.from, options.to) || item.completed) continue;
      events.push({
        uid: `interrogazione-${encodeURIComponent(item.id)}@voto.app`,
        date,
        time: eventTime(item.time),
        summary: `Interrogazione: ${item.subject}`,
        description: item.notes?.trim() || `Preparazione per ${item.subject}.`,
        category: "Interrogazioni",
      });
    }
  }

  if (options.include.reminders) {
    for (const notification of data.notifications) {
      if (notification.type !== "reminder") continue;
      const date = eventDate(notification.date);
      if (!date || !dateInRange(date, options.from, options.to)) continue;
      const details = [
        notification.subject ? `Materia: ${notification.subject}` : "",
        notification.message?.trim() ?? "",
      ].filter(Boolean);
      events.push({
        uid: `promemoria-${encodeURIComponent(notification.id)}@voto.app`,
        date,
        summary: `Promemoria: ${notification.title}`,
        description: details.join("\n") || "Promemoria scolastico.",
        category: "Promemoria",
      });
    }
  }

  if (events.length === 0) return { content: "", eventCount: 0 };

  const stamp = formatUtcDateTime(options.now ?? new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//VOTO//Calendario scolastico 2.5.0//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:VOTO - Calendario scolastico",
    ...events.flatMap((event) => serializeEvent(event, stamp)),
    "END:VCALENDAR",
  ];

  return { content: `${lines.map(foldLine).join("\r\n")}\r\n`, eventCount: events.length };
}
