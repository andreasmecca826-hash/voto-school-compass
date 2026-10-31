import type {
  AppNotification,
  Assignment,
  Attendance,
  AttendanceEvent,
  CircularAttachment,
  DiaryEntry,
  Grade,
  GradeType,
  NotificationType,
  Subject,
  VotoData,
} from "./types";
import { mirrorCirculars } from "./circulars";

export class SchemaError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined;

/** Converte voti come 7, "7,5", "7+", "7-", "7½", "6/7" in numero. Restituisce null se non numerico. */
export function parseGradeValue(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim().replace(",", ".").replace("½", ".5");
  let delta = 0;
  if (/^\d+(\.\d+)?\s*\+$/.test(s)) {
    delta = 0.25;
    s = s.replace("+", "");
  } else if (/^\d+(\.\d+)?\s*-$/.test(s)) {
    delta = -0.25;
    s = s.replace("-", "");
  }
  const range = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  const n = range ? (parseFloat(range[1] ?? "0") + parseFloat(range[2] ?? "0")) / 2 : Number(s);
  if (!Number.isFinite(n)) return null;
  const r = n + delta;
  return r >= 0 && r <= 10 ? r : null;
}

const gradeType = (v: unknown): GradeType => {
  const s = String(v ?? "").toLowerCase();
  if (s.startsWith("or")) return "orale";
  if (s.startsWith("scr")) return "scritto";
  if (s.startsWith("pra") || s.startsWith("lab")) return "pratico";
  return "altro";
};

const notifType = (v: unknown): NotificationType => {
  const s = String(v ?? "").toLowerCase();
  if (s === "grade" || s === "voto") return "grade";
  if (s === "reminder" || s === "promemoria") return "reminder";
  if (s === "notice" || s === "avviso") return "notice";
  return "note";
};

const attendanceEventType = (v: unknown): AttendanceEvent["type"] | undefined => {
  const s = String(v ?? "").toLowerCase();
  if (s === "a" || s === "absence" || s === "assenza") return "absence";
  if (s === "i" || s === "delay" || s === "ritardo") return "delay";
  if (s === "u" || s === "earlyexit" || s === "early-exit" || s === "uscita") return "earlyExit";
  return undefined;
};

function parseCircularAttachment(raw: unknown): CircularAttachment | undefined {
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) return undefined;
    const isInternalPath = /^circulars\/[a-f0-9]{64}\.pdf$/.test(value);
    const name = isInternalPath
      ? value.split("/").at(-1)
      : value.split(/[/?#]/).filter(Boolean).at(-1);
    return {
      ...(name ? { name } : {}),
      ...(isInternalPath ? { path: value } : {}),
    };
  }
  if (!isObj(raw)) return undefined;
  const path = str(raw["path"] ?? raw["attachmentPath"]);
  const name = str(
    raw["name"] ?? raw["fileName"] ?? raw["filename"] ?? raw["attachmentName"] ?? raw["nome"],
  );
  if (!path && !name) return undefined;
  return {
    ...(name ? { name } : {}),
    ...(path ? { path } : {}),
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

export function parseVotoData(raw: unknown): VotoData {
  if (!isObj(raw)) throw new SchemaError("Il file non contiene un oggetto JSON valido.");
  if (!Array.isArray(raw["subjects"]))
    throw new SchemaError('Campo "subjects" mancante o non è un array.');

  const subjects: Subject[] = (raw["subjects"] as unknown[]).map((sub, i) => {
    if (!isObj(sub)) throw new SchemaError(`subjects[${i}] non è un oggetto.`);
    const name = str(sub["name"]);
    if (!name) throw new SchemaError(`subjects[${i}] non ha un "name".`);
    const grades: Grade[] = [];
    (Array.isArray(sub["grades"]) ? sub["grades"] : []).forEach((gr, j) => {
      if (!isObj(gr)) return;
      const value = parseGradeValue(gr["value"]);
      if (value === null) return; // voti non numerici (es. "giust.") ignorati
      const w =
        typeof gr["weight"] === "number" && gr["weight"] > 0
          ? gr["weight"]
          : parseFloat(String(gr["weight"] ?? "").replace(",", "."));
      grades.push({
        id: str(gr["id"]) ?? `${slug(name)}-${j}`,
        value,
        label: str(gr["value"]) ?? String(value),
        date: str(gr["date"]) ?? "",
        type: gradeType(gr["type"]),
        weight: Number.isFinite(w) && w > 0 ? w : 1,
        comment: str(gr["comment"]),
      });
    });
    return {
      id: str(sub["id"]) ?? slug(name),
      name,
      color: str(sub["color"]),
      teacher: str(sub["teacher"]),
      grades,
    };
  });

  const assignments: Assignment[] = (Array.isArray(raw["assignments"]) ? raw["assignments"] : [])
    .filter(isObj)
    .map((a, i) => ({
      id: str(a["id"]) ?? `a-${i}`,
      title: str(a["title"]) ?? "Compito",
      subject: str(a["subject"]),
      dueDate: str(a["dueDate"]),
      dueTime: str(a["dueTime"]),
      completed: a["completed"] === true,
      details: str(a["details"]),
    }));

  const notifications: AppNotification[] = (
    Array.isArray(raw["notifications"]) ? raw["notifications"] : []
  )
    .filter(isObj)
    .map((n, i) => {
      const rawAttachments = n["attachments"] ?? n["allegati"] ?? n["attachmentPaths"];
      const attachments = Array.isArray(rawAttachments)
        ? rawAttachments.map(parseCircularAttachment).filter((item) => item !== undefined)
        : undefined;
      return {
        id: str(n["id"]) ?? `n-${i}`,
        type: notifType(n["type"]),
        title: str(n["title"]) ?? "Avviso",
        message: str(n["message"]),
        date: str(n["date"]),
        subject: str(n["subject"]),
        attachmentPath: str(n["attachmentPath"]),
        attachmentUrl: str(n["attachmentUrl"]),
        attachmentName: str(n["attachmentName"]),
        ...(attachments?.length ? { attachments } : {}),
        read: n["read"] === true,
      };
    });

  const diary: DiaryEntry[] = (Array.isArray(raw["diary"]) ? raw["diary"] : [])
    .filter(isObj)
    .map((entry, i) => ({
      id: str(entry["id"]) ?? `diary-${i}`,
      date: str(entry["date"]) ?? "",
      subject: str(entry["subject"]),
      teacher: str(entry["teacher"]),
      hour: str(entry["hour"]),
      activity: str(entry["activity"]) ?? "Attività non specificata",
    }))
    .filter((entry) => entry.date || entry.activity);

  const attendanceEvents: AttendanceEvent[] = (
    Array.isArray(raw["attendanceEvents"]) ? raw["attendanceEvents"] : []
  )
    .filter(isObj)
    .map((event, i) => {
      const type = attendanceEventType(event["type"]);
      const date = str(event["date"]);
      if (!type || !date) return undefined;
      const justificationStatus = str(event["justificationStatus"]);
      return {
        id: str(event["id"]) ?? `appello-${i}`,
        type,
        date: date.slice(0, 10),
        ...(justificationStatus ? { justificationStatus } : {}),
      };
    })
    .filter((event): event is AttendanceEvent => event !== undefined);

  const st = isObj(raw["student"]) ? raw["student"] : {};
  const prev =
    typeof raw["previousAverage"] === "number" && Number.isFinite(raw["previousAverage"])
      ? raw["previousAverage"]
      : undefined;
  const attendanceRaw = isObj(raw["attendance"]) ? raw["attendance"] : {};
  const attendance: Attendance = {
    absenceDays:
      typeof attendanceRaw["absenceDays"] === "number" ? attendanceRaw["absenceDays"] : 0,
    absenceHours:
      typeof attendanceRaw["absenceHours"] === "number" ? attendanceRaw["absenceHours"] : 0,
    delays: typeof attendanceRaw["delays"] === "number" ? attendanceRaw["delays"] : 0,
    earlyExits: typeof attendanceRaw["earlyExits"] === "number" ? attendanceRaw["earlyExits"] : 0,
    annualHours:
      typeof attendanceRaw["annualHours"] === "number" ? attendanceRaw["annualHours"] : 990,
    absenceLimitHours:
      typeof attendanceRaw["absenceLimitHours"] === "number"
        ? attendanceRaw["absenceLimitHours"]
        : 264,
  };

  return {
    student: {
      name: str(st["name"]),
      className: str(st["className"]),
      schoolYear: str(st["schoolYear"]),
    },
    updatedAt: str(raw["updatedAt"]),
    previousAverage: prev,
    subjects,
    assignments,
    notifications,
    diary,
    attendance,
    attendanceEvents,
  };
}

export function validateUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return "L'URL deve iniziare con https://";
    return null;
  } catch {
    return "URL non valido.";
  }
}

export async function fetchVotoData(url: string, timeoutMs = 10000): Promise<VotoData> {
  const err = validateUrl(url);
  if (err) throw new SchemaError(err);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const sep = url.includes("?") ? "&" : "?";
  let res: Response;
  try {
    res = await fetch(`${url}${sep}_t=${Date.now()}`, { cache: "no-store", signal: ctrl.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError")
      throw new Error("Tempo scaduto: il server non risponde.");
    throw new Error(
      typeof navigator !== "undefined" && !navigator.onLine
        ? "Sei offline. Mostro gli ultimi dati salvati."
        : "Impossibile raggiungere l'URL (rete o CORS).",
    );
  } finally {
    clearTimeout(t);
  }
  if (!res.ok)
    throw new Error(
      res.status === 404
        ? "File non trovato (404). Controlla l'URL raw."
        : `Errore del server (${res.status}).`,
    );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new SchemaError("Il file non è JSON valido.");
  }
  return mirrorCirculars(parseVotoData(json));
}
