import type { AppNotification, Assignment, Attendance, Grade, GradeType, NotificationType, Subject, VotoData } from "./types";

export class SchemaError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined);

/** Converte voti come 7, "7,5", "7+", "7-", "7½", "6/7" in numero. Restituisce null se non numerico. */
export function parseGradeValue(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim().replace(",", ".").replace("½", ".5");
  let delta = 0;
  if (/^\d+(\.\d+)?\s*\+$/.test(s)) { delta = 0.25; s = s.replace("+", ""); }
  else if (/^\d+(\.\d+)?\s*-$/.test(s)) { delta = -0.25; s = s.replace("-", ""); }
  const range = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  const n = range ? (parseFloat(range[1]) + parseFloat(range[2])) / 2 : Number(s);
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

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

export function parseVotoData(raw: unknown): VotoData {
  if (!isObj(raw)) throw new SchemaError("Il file non contiene un oggetto JSON valido.");
  if (!Array.isArray(raw.subjects)) throw new SchemaError('Campo "subjects" mancante o non è un array.');

  const subjects: Subject[] = raw.subjects.map((s, i) => {
    if (!isObj(s)) throw new SchemaError(`subjects[${i}] non è un oggetto.`);
    const name = str(s.name);
    if (!name) throw new SchemaError(`subjects[${i}] non ha un "name".`);
    const grades: Grade[] = [];
    (Array.isArray(s.grades) ? s.grades : []).forEach((g, j) => {
      if (!isObj(g)) return;
      const value = parseGradeValue(g.value);
      if (value === null) return; // voti non numerici (es. "giust.") ignorati
      const w = typeof g.weight === "number" && g.weight > 0 ? g.weight : parseFloat(String(g.weight ?? "").replace(",", "."));
      grades.push({
        id: str(g.id) ?? `${slug(name)}-${j}`,
        value,
        label: str(g.value) ?? String(value),
        date: str(g.date) ?? "",
        type: gradeType(g.type),
        weight: Number.isFinite(w) && w > 0 ? w : 1,
        comment: str(g.comment),
      });
    });
    return { id: str(s.id) ?? slug(name), name, color: str(s.color), teacher: str(s.teacher), grades };
  });

  const assignments: Assignment[] = (Array.isArray(raw.assignments) ? raw.assignments : [])
    .filter(isObj)
    .map((a, i) => ({
      id: str(a.id) ?? `a-${i}`,
      title: str(a.title) ?? "Compito",
      subject: str(a.subject),
      dueDate: str(a.dueDate),
      dueTime: str(a.dueTime),
      completed: a.completed === true,
      details: str(a.details),
    }));

  const notifications: AppNotification[] = (Array.isArray(raw.notifications) ? raw.notifications : [])
    .filter(isObj)
    .map((n, i) => ({
      id: str(n.id) ?? `n-${i}`,
      type: notifType(n.type),
      title: str(n.title) ?? "Avviso",
      message: str(n.message),
      date: str(n.date),
      subject: str(n.subject),
      attachmentUrl: str(n.attachmentUrl),
      attachmentName: str(n.attachmentName),
      read: n.read === true,
    }));

  const st = isObj(raw.student) ? raw.student : {};
  const prev = typeof raw.previousAverage === "number" && Number.isFinite(raw.previousAverage) ? raw.previousAverage : undefined;
  const attendanceRaw = isObj(raw.attendance) ? raw.attendance : {};
  const attendance: Attendance = {
    absenceDays: typeof attendanceRaw.absenceDays === "number" ? attendanceRaw.absenceDays : 0,
    absenceHours: typeof attendanceRaw.absenceHours === "number" ? attendanceRaw.absenceHours : 0,
    delays: typeof attendanceRaw.delays === "number" ? attendanceRaw.delays : 0,
    earlyExits: typeof attendanceRaw.earlyExits === "number" ? attendanceRaw.earlyExits : 0,
    annualHours: typeof attendanceRaw.annualHours === "number" ? attendanceRaw.annualHours : 990,
    absenceLimitHours: typeof attendanceRaw.absenceLimitHours === "number" ? attendanceRaw.absenceLimitHours : 247.5,
  };

  return {
    student: { name: str(st.name), className: str(st.className), schoolYear: str(st.schoolYear) },
    updatedAt: str(raw.updatedAt),
    previousAverage: prev,
    subjects,
    assignments,
    notifications,
    attendance,
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
    if ((e as Error).name === "AbortError") throw new Error("Tempo scaduto: il server non risponde.");
    throw new Error(typeof navigator !== "undefined" && !navigator.onLine ? "Sei offline. Mostro gli ultimi dati salvati." : "Impossibile raggiungere l'URL (rete o CORS).");
  } finally {
    clearTimeout(t);
  }
  if (!res.ok) throw new Error(res.status === 404 ? "File non trovato (404). Controlla l'URL raw." : `Errore del server (${res.status}).`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new SchemaError("Il file non è JSON valido.");
  }
  return parseVotoData(json);
}
