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
import { supabasePublishableKey } from "./circulars";
import { PRIVATE_SCHOOL_DATA_URL, supabase } from "../supabase-auth";

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
    delta = 0.15;
    s = s.replace("+", "");
  } else if (/^\d+(\.\d+)?\s*-$/.test(s)) {
    delta = -0.15;
    s = s.replace("-", "");
  }
  const range = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  const n = range ? (parseFloat(range[1] ?? "0") + parseFloat(range[2] ?? "0")) / 2 : Number(s);
  if (!Number.isFinite(n)) return null;
  const r = n + delta;
  return r >= 0 && r <= 10 ? r : null;
}

const ITALIAN_GRADE_WORDS = [
  "zero",
  "uno",
  "due",
  "tre",
  "quattro",
  "cinque",
  "sei",
  "sette",
  "otto",
  "nove",
  "dieci",
];

function normalizedGradeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/g, "");
}

function gradeCommentOrUndefined(
  comment: string | undefined,
  label: string,
  value: number,
): string | undefined {
  if (!comment?.trim()) return undefined;

  const normalizedComment = normalizedGradeText(comment);
  const numericLabel = label.trim().match(/^(\d+)\s*[+-]?$/);
  const spokenGrade = Number.isInteger(value)
    ? ITALIAN_GRADE_WORDS[value]
    : numericLabel
      ? ITALIAN_GRADE_WORDS[Number(numericLabel[1])]
      : ITALIAN_GRADE_WORDS[Math.floor(value)];
  const valueForms = [
    normalizedGradeText(label),
    normalizedGradeText(String(value)),
    normalizedGradeText(new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value)),
    spokenGrade,
    ...(value % 1 === 0.5 && spokenGrade ? [`${spokenGrade} e mezzo`, `${spokenGrade} mezzo`] : []),
    ...(numericLabel?.[1] ? [normalizedGradeText(numericLabel[1])] : []),
  ].filter((form): form is string => Boolean(form));

  return valueForms.includes(normalizedComment) ? undefined : comment.trim();
}

/** Corregge i valori numerici in cache usando il voto originale quando include + o -. */
export function normalizeCachedGradeValues(data: VotoData): VotoData {
  let changed = false;
  const subjects = data.subjects.map((subject) => {
    const grades = subject.grades.map((grade) => {
      const parsedLabel = parseGradeValue(grade.label);
      const value =
        /[+-]\s*$/.test(grade.label) && parsedLabel !== null ? parsedLabel : grade.value;
      const comment = gradeCommentOrUndefined(grade.comment, grade.label, value);
      if (value === grade.value && comment === grade.comment) {
        return grade;
      }
      changed = true;
      return { ...grade, value, comment };
    });
    return grades.some((grade, index) => grade !== subject.grades[index])
      ? { ...subject, grades }
      : subject;
  });
  return changed ? { ...data, subjects } : data;
}

const isSignedGradeLabel = (value: unknown): value is string =>
  typeof value === "string" && /^\d+(?:[.,]\d+)?\s*[+-]$/.test(value.trim());

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
  if (
    [
      "notice",
      "avviso",
      "comunicazione",
      "comunicazioni",
      "communication",
      "communications",
      "circolare",
      "circolari",
    ].includes(s)
  )
    return "notice";
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
    const isInternalPath = /^circulars\/[a-f0-9]{64}\.(pdf|docx)$/.test(value);
    const name = isInternalPath
      ? value.split("/").at(-1)
      : value.split(/[/?#]/).filter(Boolean).at(-1);
    return {
      ...(name ? { name } : {}),
      ...(isInternalPath ? { path: value } : {}),
    };
  }
  if (!isObj(raw)) return undefined;
  const rawPath = str(raw["path"] ?? raw["attachmentPath"]);
  const rawUrl = str(raw["url"] ?? raw["attachmentUrl"]);
  const path =
    rawPath && /^\/?circulars\/[a-f0-9]{64}\.(pdf|docx)$/i.test(rawPath)
      ? rawPath.replace(/^\/+/, "")
      : undefined;
  const url = rawUrl ?? (rawPath && /^https?:\/\//i.test(rawPath) ? rawPath : undefined);
  const name = str(
    raw["name"] ?? raw["fileName"] ?? raw["filename"] ?? raw["attachmentName"] ?? raw["nome"],
  );
  const tableCount =
    typeof raw["tableCount"] === "number" && raw["tableCount"] > 0
      ? Math.floor(raw["tableCount"])
      : undefined;
  if (!path && !url && !name) return undefined;
  return {
    ...(name ? { name } : {}),
    ...(path ? { path } : {}),
    ...(url ? { url } : {}),
    ...(raw["hasTables"] === true || tableCount ? { hasTables: true } : {}),
    ...(tableCount ? { tableCount } : {}),
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

export function parseVotoData(raw: unknown): VotoData {
  if (!isObj(raw)) throw new SchemaError("I dati Supabase ricevuti non hanno un formato valido.");
  if (!Array.isArray(raw["subjects"]))
    throw new SchemaError('Campo "subjects" mancante o non è un array.');
  for (const key of ["assignments", "notifications", "diary", "attendanceEvents"] as const) {
    const value = raw[key];
    if (value != null && !Array.isArray(value)) {
      throw new SchemaError(`Campo "${key}" ricevuto in un formato non valido.`);
    }
  }
  if (raw["student"] != null && !isObj(raw["student"])) {
    throw new SchemaError('Campo "student" ricevuto in un formato non valido.');
  }
  if (raw["attendance"] != null && !isObj(raw["attendance"])) {
    throw new SchemaError('Campo "attendance" ricevuto in un formato non valido.');
  }

  const subjects: Subject[] = (raw["subjects"] as unknown[]).map((sub, i) => {
    if (!isObj(sub)) throw new SchemaError(`subjects[${i}] non è un oggetto.`);
    const name = str(sub["name"]);
    if (!name) throw new SchemaError(`subjects[${i}] non ha un "name".`);
    const rawGrades = sub["grades"];
    if (rawGrades != null && !Array.isArray(rawGrades)) {
      throw new SchemaError(`subjects[${i}].grades non è un array.`);
    }
    const grades: Grade[] = [];
    (Array.isArray(rawGrades) ? rawGrades : []).forEach((gr, j) => {
      if (!isObj(gr)) return;
      const label = str(gr["label"]);
      const value = parseGradeValue(isSignedGradeLabel(label) ? label : gr["value"]);
      if (value === null) return; // voti non numerici (es. "giust.") ignorati
      const w =
        typeof gr["weight"] === "number" && gr["weight"] > 0
          ? gr["weight"]
          : parseFloat(String(gr["weight"] ?? "").replace(",", "."));
      const gradeLabel = label ?? str(gr["value"]) ?? String(value);
      grades.push({
        id: str(gr["id"]) ?? `${slug(name)}-${j}`,
        value,
        label: gradeLabel,
        date: str(gr["date"]) ?? "",
        type: gradeType(gr["type"]),
        weight: Number.isFinite(w) && w > 0 ? w : 1,
        comment: gradeCommentOrUndefined(str(gr["comment"]), gradeLabel, value),
        teacher: str(gr["teacher"]) ?? str(gr["docente"]) ?? str(gr["prof"]),
      });
    });
    return {
      id: str(sub["id"]) ?? slug(name),
      name,
      color: str(sub["color"]),
      teacher: str(sub["teacher"]) ?? str(sub["docente"]) ?? str(sub["prof"]),
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
      assignedDate: str(a["assignedDate"]) ?? str(a["assignmentDate"]),
      completed: a["completed"] === true,
      details: str(a["details"]) ?? str(a["description"]),
      teacher: str(a["teacher"]) ?? str(a["docente"]) ?? str(a["prof"]),
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
      const legacyPath = str(n["attachmentPath"]);
      const legacyInternalPath =
        legacyPath && /^\/?circulars\/[a-f0-9]{64}\.(pdf|docx)$/i.test(legacyPath)
          ? legacyPath.replace(/^\/+/, "")
          : undefined;
      const legacyUrl =
        str(n["attachmentUrl"]) ??
        (legacyPath && /^https?:\/\//i.test(legacyPath) ? legacyPath : undefined);
      return {
        id: str(n["id"]) ?? `n-${i}`,
        type: notifType(n["type"]),
        title: str(n["title"]) ?? "Avviso",
        message: str(n["message"]) ?? str(n["description"]) ?? str(n["details"]),
        date: str(n["date"]),
        subject: str(n["subject"]),
        teacher: str(n["teacher"]) ?? str(n["docente"]) ?? str(n["prof"]),
        attachmentPath: legacyInternalPath,
        attachmentUrl: legacyUrl,
        attachmentName: str(n["attachmentName"]),
        ...(attachments?.length ? { attachments } : {}),
        extractedText: str(n["extractedText"]),
        hasTables: n["hasTables"] === true,
        tableCount:
          typeof n["tableCount"] === "number" && n["tableCount"] > 0
            ? Math.floor(n["tableCount"])
            : undefined,
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
    .flatMap((event, i) => {
      const type = attendanceEventType(event["type"]);
      const date = str(event["date"]);
      if (!type || !date) return [];
      const justificationStatus = str(event["justificationStatus"]);
      return [
        {
          id: str(event["id"]) ?? `appello-${i}`,
          type,
          date: date.slice(0, 10),
          ...(justificationStatus ? { justificationStatus } : {}),
        },
      ];
    });

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

function gradeCount(data: VotoData) {
  return data.subjects.reduce((count, subject) => count + subject.grades.length, 0);
}

function validateSnapshotContinuity(previous: VotoData, next: VotoData, raw: unknown) {
  const schoolYearChanged =
    Boolean(previous.student.schoolYear) &&
    Boolean(next.student.schoolYear) &&
    previous.student.schoolYear !== next.student.schoolYear;
  if (schoolYearChanged) return;
  const payload = isObj(raw) ? raw : {};

  for (const [key, label] of [
    ["assignments", "compiti"],
    ["notifications", "avvisi"],
    ["diary", "diario"],
    ["attendanceEvents", "assenze e ritardi"],
  ] as const) {
    if (previous[key].length > 0 && !Array.isArray(payload[key])) {
      throw new SchemaError(
        `La risposta del registro è incompleta: manca la sezione ${label}. Mantengo gli ultimi dati validi.`,
      );
    }
  }

  const previousAttendance = previous.attendance;
  const hasAttendanceData =
    previousAttendance.absenceDays > 0 ||
    previousAttendance.absenceHours > 0 ||
    previousAttendance.delays > 0 ||
    previousAttendance.earlyExits > 0;
  if (hasAttendanceData && !isObj(payload["attendance"])) {
    throw new SchemaError(
      "La risposta del registro è incompleta: manca la sezione presenze. Mantengo gli ultimi dati validi.",
    );
  }

  if (previous.subjects.length > 0 && next.subjects.length === 0) {
    throw new SchemaError(
      "La risposta del registro non contiene materie; mantengo gli ultimi dati validi.",
    );
  }

  if (gradeCount(previous) >= 3 && gradeCount(next) === 0) {
    throw new SchemaError(
      "La risposta del registro non contiene più i voti già salvati; mantengo gli ultimi dati validi.",
    );
  }

  if (previous.student.name && !next.student.name) {
    throw new SchemaError(
      "La risposta del registro è incompleta: manca il nome dello studente. Mantengo gli ultimi dati validi.",
    );
  }
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

export async function fetchVotoData(
  url: string,
  timeoutMs = 10000,
  previousData?: VotoData,
): Promise<VotoData> {
  const privateSource = url === PRIVATE_SCHOOL_DATA_URL;
  const err = privateSource ? null : validateUrl(url);
  if (err) throw new SchemaError(err);
  let accessToken: string | undefined;
  if (privateSource) {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw new Error("PRIVATE_DATA_UNAUTHENTICATED: Accedi per aggiornare i dati.");
    accessToken = data.session.access_token;
  }
  const request = async (token?: string) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const sep = url.includes("?") ? "&" : "?";
    try {
      return await fetch(`${url}${sep}_t=${Date.now()}`, {
        cache: "no-store",
        signal: ctrl.signal,
        ...(token
          ? { headers: { apikey: supabasePublishableKey(), Authorization: `Bearer ${token}` } }
          : {}),
      });
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
  };

  let res = await request(accessToken);
  if (privateSource && res.status === 401) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshed.session) {
      res = await request(refreshed.session.access_token);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const { data: latest } = await supabase.auth.getSession();
      if (latest.session) res = await request(latest.session.access_token);
    }
    if (res.status === 401)
      throw new Error("PRIVATE_DATA_UNAUTHENTICATED: La sessione è scaduta; accedi di nuovo.");
  }
  if (privateSource && res.status === 403) {
    throw new Error("PRIVATE_DATA_FORBIDDEN: Questo account non è autorizzato al registro.");
  }
  if (privateSource && res.status === 503) {
    throw new Error("I dati privati non sono ancora disponibili; riprova tra poco.");
  }
  if (!res.ok)
    throw new Error(
      res.status === 404
        ? "Dati Supabase non trovati (404). Verifica che il servizio sia disponibile."
        : `Errore del server (${res.status}).`,
    );
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new SchemaError("La risposta di Supabase non contiene dati validi.");
  }
  const parsed = parseVotoData(json);
  if (privateSource && parsed.subjects.length === 0) {
    throw new SchemaError(
      "La risposta del registro non contiene materie; mantengo gli ultimi dati validi.",
    );
  }
  if (previousData) validateSnapshotContinuity(previousData, parsed, json);
  return parsed;
}
