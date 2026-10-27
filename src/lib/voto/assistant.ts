import { average, fmt, neededGrade, overallAverage } from "./calc";
import { DAYS, emptySchedule, type DayId, type Schedule } from "./orario";
import type { Interrogazione } from "./interrogazioni";
import {
  asksForLaboratory,
  getClassTeachers,
  teachersForSubject,
  teachersForSubjectQuestion,
} from "./teachers";
import type { Grade, VotoData } from "./types";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const number = (value: number) => fmt(Math.round(value * 100) / 100, 2);

function findSubject(query: string, data: VotoData) {
  const normalized = normalize(query);
  const exactMatches = data.subjects.filter((subject) =>
    normalized.includes(normalize(subject.name)),
  );
  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) return undefined;

  const partialMatches = data.subjects.filter((subject) =>
    normalize(subject.name)
      .split(/\s+/)
      .filter((token) => token.length >= 4)
      .some((token) => normalized.includes(token)),
  );
  return partialMatches.length === 1 ? partialMatches[0] : undefined;
}

function targetFrom(query: string) {
  const match = normalize(query).match(
    /(?:arrivare|raggiungere|obiettivo|media)[^0-9]{0,24}(10(?:[.,]0+)?|[0-9](?:[.,][0-9]+)?)/,
  );
  return match?.[1] ? Number(match[1].replace(",", ".")) : null;
}

function gradeFrom(query: string) {
  const match = normalize(query).match(
    /(?:prendo|prendessi|prendero|con un nuovo voto|con un voto)[^0-9]{0,16}(10(?:[.,]0+)?|[0-9](?:[.,][0-9]+)?)/,
  );
  return match?.[1] ? Number(match[1].replace(",", ".")) : null;
}

function dayFromQuery(query: string, now: Date): DayId | null {
  const normalized = normalize(query);
  const namedDay = DAYS.find((day) => normalized.includes(normalize(day.label)));
  if (namedDay) return namedDay.id;

  const date = new Date(now);
  if (normalized.includes("domani")) date.setDate(date.getDate() + 1);
  const weekday = date.getDay();
  return weekday >= 1 && weekday <= 5 ? (DAYS[weekday - 1]?.id ?? null) : null;
}

function daysUntil(dateValue: string | undefined, now: Date): number | null {
  if (!dateValue) return null;
  const match = dateValue.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const due = new Date(Date.UTC(year, month - 1, day));
  if (due.getUTCFullYear() !== year || due.getUTCMonth() !== month - 1 || due.getUTCDate() !== day)
    return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today) / 86_400_000);
}

function displayDate(dateValue: string | undefined): string | null {
  const match = dateValue?.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function latestGrade(data: VotoData) {
  return (
    data.subjects
      .flatMap((subject) => subject.grades.map((grade) => ({ subject, grade })))
      .sort((a, b) => b.grade.date.localeCompare(a.grade.date))[0] ?? null
  );
}

function noticesByDate(data: VotoData) {
  return data.notifications
    .filter((notification) => notification.type === "notice")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function noticeLabel(notification: VotoData["notifications"][number]): string {
  const date = displayDate(notification.date);
  const dateText = date ? ` (${date})` : "";
  const attachment = notification.attachmentName
    ? ` — allegato: ${notification.attachmentName}`
    : "";
  return `“${notification.title}”${dateText}${attachment}`;
}

export function scheduleDayToClear(query: string): DayId | null {
  const normalized = normalize(query);
  if (
    !(
      normalized.includes("cancella") ||
      normalized.includes("elimina") ||
      normalized.includes("svuota")
    ) ||
    !normalized.includes("orario")
  )
    return null;
  return DAYS.find((day) => normalized.includes(normalize(day.label)))?.id ?? null;
}

export function answerQuestion(
  query: string,
  data: VotoData,
  schedule: Schedule = emptySchedule(),
  now: Date = new Date(),
  interrogazioni: Interrogazione[] = [],
): string {
  const normalized = normalize(query.trim());
  if (!normalized)
    return "Scrivimi una domanda, per esempio: “Quanto devo prendere in Inglese per arrivare a 8?”";

  const notices = noticesByDate(data);
  if (normalized.includes("novit") || normalized.includes("aggiornament")) {
    const recentGrade = latestGrade(data);
    const todayNotices = notices.filter(
      (notification) => notification.date?.slice(0, 10) === localDateKey(now),
    );
    const lines: string[] = [];
    if (recentGrade) {
      const date = displayDate(recentGrade.grade.date);
      lines.push(
        `Ultimo voto: ${recentGrade.grade.label} in ${recentGrade.subject.name}${date ? ` (${date})` : ""}.`,
      );
    }
    if (todayNotices.length) {
      lines.push(`Circolari di oggi: ${todayNotices.map(noticeLabel).join("; ")}.`);
    } else if (notices[0]) {
      lines.push(`Ultima circolare: ${noticeLabel(notices[0])}.`);
    }
    return lines.length
      ? lines.join("\n")
      : "Non risultano nuovi voti o circolari nei dati caricati.";
  }

  if (normalized.includes("orario") || normalized.includes("lezion")) {
    const day = dayFromQuery(query, now);
    if (!day)
      return "Il tuo orario copre dal lunedì al venerdì. Dimmi un giorno scolastico o chiedi “Che lezioni ho domani?”";
    const lessons = (schedule[day] ?? [])
      .map((subject, index) => (subject.trim() ? `${index + 1}ª ora: ${subject.trim()}` : null))
      .filter((lesson): lesson is string => lesson !== null);
    const label = DAYS.find((item) => item.id === day)?.label ?? day;
    return lessons.length
      ? `${label}: ${lessons.length} ${lessons.length === 1 ? "lezione" : "lezioni"}. ${lessons.join("; ")}.`
      : `Non hai lezioni inserite per ${label} nell’orario.`;
  }

  if (normalized.includes("interrogaz")) {
    const requestedDay = normalized.includes("domani") ? 1 : normalized.includes("oggi") ? 0 : null;
    const future = interrogazioni
      .filter((item) => !item.completed && (daysUntil(item.date, now) ?? -1) >= 0)
      .sort((a, b) => `${a.date}${a.hour ?? 0}`.localeCompare(`${b.date}${b.hour ?? 0}`));
    const matches =
      requestedDay === null
        ? future
        : future.filter((item) => daysUntil(item.date, now) === requestedDay);
    if (!matches.length) {
      if (requestedDay === 0) return "Non hai interrogazioni in agenda per oggi.";
      if (requestedDay === 1) return "Non hai interrogazioni in agenda per domani.";
      return "Non risultano interrogazioni future nella tua agenda locale. Puoi aggiungerle nella sezione Interrogazioni.";
    }
    const shown = matches.slice(0, requestedDay === null ? 3 : matches.length).map((item) => {
      const date = displayDate(item.date) ?? item.date;
      const hour = item.hour ? `, ${item.hour}ª ora` : item.time ? `, ${item.time}` : "";
      const notes = item.notes ? ` — ${item.notes}` : "";
      return `${item.subject} (${date}${hour})${notes}`;
    });
    const heading =
      requestedDay === 0
        ? "Interrogazioni di oggi"
        : requestedDay === 1
          ? "Interrogazioni di domani"
          : "Prossime interrogazioni in agenda";
    return `${heading}:\n${shown.map((item) => `• ${item}`).join("\n")}${matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : ""}`;
  }

  if (
    normalized.includes("circolar") ||
    normalized.includes("bacheca") ||
    normalized.includes("avvisi") ||
    normalized.includes("notiz")
  ) {
    const asksToday = normalized.includes("oggi");
    const asksYesterday = normalized.includes("ieri");
    const asksUnread = normalized.includes("non lett");
    const asksNew = normalized.includes("nuov") || normalized.includes("recent");
    let matches = notices;
    if (asksToday)
      matches = matches.filter(
        (notification) => notification.date?.slice(0, 10) === localDateKey(now),
      );
    else if (asksYesterday) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      matches = matches.filter(
        (notification) => notification.date?.slice(0, 10) === localDateKey(yesterday),
      );
    }
    if (asksUnread || (asksNew && !asksToday && !asksYesterday))
      matches = matches.filter((notification) => !notification.read);
    if (!matches.length) {
      if (asksToday) return "Oggi non risultano circolari nei dati caricati.";
      if (asksYesterday) return "Ieri non risultano circolari nei dati caricati.";
      if (asksUnread || asksNew) return "Non risultano circolari nuove o non lette.";
      return "Non risultano circolari o avvisi nei dati caricati.";
    }
    const latestOnly =
      normalized.includes("ultima circolare") || normalized.includes("ultimo avviso");
    const shown = matches.slice(0, latestOnly ? 1 : 5);
    const heading = asksToday
      ? "Circolari di oggi"
      : asksYesterday
        ? "Circolari di ieri"
        : asksUnread || asksNew
          ? "Circolari nuove o non lette"
          : "Circolari recenti";
    const remainder =
      matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
    return `${heading}:\n${shown.map((notification) => `• ${noticeLabel(notification)}`).join("\n")}${remainder}\nLe trovi nella sezione Novità.`;
  }

  const subject = findSubject(query, data);
  const target = targetFrom(query);
  const projectedGrade = gradeFrom(query);
  const asksTeacher =
    normalized.includes("prof") ||
    normalized.includes("docent") ||
    normalized.includes("insegn") ||
    /\bchi (?:fa|tiene)\b/.test(normalized);
  const asksTeacherList =
    normalized.includes("chi") ||
    normalized.includes("quali") ||
    normalized.includes("elenco") ||
    normalized.includes("lista") ||
    normalized === "professori" ||
    normalized === "docenti";
  if (asksTeacher && subject) {
    const questionTeachers = teachersForSubjectQuestion(query);
    const teacher = subject.teacher?.trim();
    if (teacher && !asksForLaboratory(query)) {
      return `Il docente registrato per ${subject.name} è ${teacher}.`;
    }
    if (asksForLaboratory(query) && questionTeachers.length) {
      const names = questionTeachers.map(([name]) => name);
      return `Nella sezione Professori, per il laboratorio risult${names.length === 1 ? "a" : "ano"} ${names.join(", ")}.`;
    }
    const classTeachers = (
      questionTeachers.length ? questionTeachers : teachersForSubject(subject.name)
    ).map(([name]) => name);
    if (classTeachers.length) {
      return `Nella sezione Professori, per ${subject.name} risulta${classTeachers.length === 1 ? "" : "no"} ${classTeachers.join(", ")}.`;
    }
    if (teacher) return `Il docente registrato per ${subject.name} è ${teacher}.`;
    return `Non ho il nome del docente di ${subject.name} nei dati sincronizzati o nella sezione Professori.`;
  }
  if (asksTeacher) {
    const classTeachers = teachersForSubjectQuestion(query).map(([name]) => name);
    if (classTeachers.length) {
      return `Nella sezione Professori, per questa materia risulta${classTeachers.length === 1 ? "" : "no"} ${classTeachers.join(", ")}.`;
    }
  }
  if (asksTeacher && asksTeacherList) {
    const teachers = getClassTeachers();
    if (!teachers.length) {
      return "Non hai ancora inserito professori. Vai in Professori e aggiungi nome e materia: poi potrò riconoscerli anche con domande come ‘chi fa inglese?’ o ‘prof di mate?’.";
    }
    return `Docenti della sezione Professori:\n${teachers
      .map(([name, subjects]) => `• ${subjects}: ${name}`)
      .join("\n")}`;
  }
  if (
    !subject &&
    (normalized.includes("ultimo voto") ||
      normalized.includes("ultima valutazione") ||
      normalized.includes("voto piu recente"))
  ) {
    const recent = latestGrade(data);
    if (!recent) return "Non risultano voti registrati.";
    const date = displayDate(recent.grade.date);
    return `L’ultimo voto registrato è ${recent.grade.label} in ${recent.subject.name}${date ? ` (${date})` : ""}.`;
  }
  if (
    (normalized.includes("previsione") ||
      normalized.includes("che media avro") ||
      normalized.includes("media avro") ||
      normalized.includes("se prendo")) &&
    subject &&
    projectedGrade !== null
  ) {
    const projected: Grade = {
      id: "assistant-preview",
      value: projectedGrade,
      label: String(projectedGrade),
      date: "",
      type: "altro",
      weight: 1,
    };
    const nextAverage = average([...subject.grades, projected]);
    const current = average(subject.grades);
    return nextAverage === null || current === null
      ? `In ${subject.name} non ci sono ancora voti sufficienti per fare la previsione.`
      : `Con un ${number(projectedGrade)} in ${subject.name}, la tua media passerebbe da ${number(current)} a circa ${number(nextAverage)}.`;
  }

  if (
    subject &&
    (normalized.includes("voto piu alto") ||
      normalized.includes("voto massimo") ||
      normalized.includes("miglior voto"))
  ) {
    const best = subject.grades.reduce<number | null>(
      (current, grade) => (current === null || grade.value > current ? grade.value : current),
      null,
    );
    return best === null
      ? `In ${subject.name} non ci sono ancora voti.`
      : `Il voto più alto in ${subject.name} è ${number(best)}.`;
  }

  if (
    subject &&
    (normalized.includes("voto piu basso") ||
      normalized.includes("voto minimo") ||
      normalized.includes("peggior voto"))
  ) {
    const lowest = subject.grades.reduce<number | null>(
      (current, grade) => (current === null || grade.value < current ? grade.value : current),
      null,
    );
    return lowest === null
      ? `In ${subject.name} non ci sono ancora voti.`
      : `Il voto più basso in ${subject.name} è ${number(lowest)}.`;
  }

  const asksHighestGrade =
    normalized.includes("voto piu alto") ||
    normalized.includes("voto massimo") ||
    normalized.includes("miglior voto");
  const asksLowestGrade =
    normalized.includes("voto piu basso") ||
    normalized.includes("voto minimo") ||
    normalized.includes("peggior voto");
  if (!subject && (asksHighestGrade || asksLowestGrade)) {
    const grades = data.subjects.flatMap((item) =>
      item.grades.map((grade) => ({ subject: item, grade })),
    );
    const extreme = grades.sort((a, b) =>
      asksHighestGrade ? b.grade.value - a.grade.value : a.grade.value - b.grade.value,
    )[0];
    if (!extreme) return "Non risultano voti registrati.";
    return asksHighestGrade
      ? `Il voto più alto registrato è ${extreme.grade.label} in ${extreme.subject.name}.`
      : `Il voto più basso registrato è ${extreme.grade.label} in ${extreme.subject.name}.`;
  }

  if (normalized.includes("ultimo voto") && subject) {
    const latest = [...subject.grades].sort((a, b) => b.date.localeCompare(a.date))[0];
    return latest
      ? `L’ultimo voto in ${subject.name} è ${latest.label}${latest.date ? ` del ${displayDate(latest.date) ?? latest.date}` : ""}.`
      : `In ${subject.name} non ci sono ancora voti.`;
  }

  if (
    normalized.includes("quanti voti") ||
    normalized.includes("numero di voti") ||
    normalized.includes("quante valutazioni")
  ) {
    if (subject)
      return `Hai ${subject.grades.length} ${subject.grades.length === 1 ? "voto" : "voti"} registrati in ${subject.name}.`;
    const total = data.subjects.reduce((count, item) => count + item.grades.length, 0);
    return `Hai ${total} ${total === 1 ? "voto" : "voti"} registrati in ${data.subjects.length} materie.`;
  }

  if (
    (normalized.includes("quanto devo") ||
      normalized.includes("arrivare") ||
      normalized.includes("raggiungere")) &&
    subject
  ) {
    const current = average(subject.grades);
    if (current === null)
      return `In ${subject.name} non ci sono ancora voti sufficienti per fare il calcolo.`;
    const wanted = target ?? 8;
    const result = neededGrade(subject.grades, wanted);
    if (result.status === "reached")
      return `In ${subject.name} hai già una media di ${number(current)}: hai già raggiunto l'obiettivo ${number(wanted)}.`;
    if (result.status === "impossible")
      return `In ${subject.name} hai una media di ${number(current)}. Per arrivare a ${number(wanted)} con un solo prossimo voto servirebbe ${number(result.needed)}, quindi non è possibile con un voto massimo di 10.`;
    return `In ${subject.name} hai una media di ${number(current)}. Per arrivare a ${number(wanted)} con il prossimo voto dovresti prendere almeno ${number(result.needed)}.`;
  }

  if (normalized.includes("media") && subject) {
    const current = average(subject.grades);
    return current === null
      ? `In ${subject.name} non ci sono ancora voti.`
      : `La tua media in ${subject.name} è ${number(current)} su ${subject.grades.length} voti.`;
  }

  if (normalized.includes("media piu bassa") || normalized.includes("materia piu bassa")) {
    const ranked = data.subjects
      .map((item) => ({ item, avg: average(item.grades) }))
      .filter(
        (entry): entry is { item: (typeof data.subjects)[number]; avg: number } =>
          entry.avg !== null,
      )
      .sort((a, b) => a.avg - b.avg);
    return ranked[0]
      ? `La media più bassa è ${number(ranked[0].avg)} in ${ranked[0].item.name}.`
      : "Non ci sono ancora voti sufficienti.";
  }

  if (normalized.includes("media piu alta") || normalized.includes("materia migliore")) {
    const ranked = data.subjects
      .map((item) => ({ item, avg: average(item.grades) }))
      .filter(
        (entry): entry is { item: (typeof data.subjects)[number]; avg: number } =>
          entry.avg !== null,
      )
      .sort((a, b) => b.avg - a.avg);
    return ranked[0]
      ? `La media più alta è ${number(ranked[0].avg)} in ${ranked[0].item.name}.`
      : "Non ci sono ancora voti sufficienti.";
  }

  if (
    normalized.includes("insufficient") ||
    normalized.includes("sotto il 6") ||
    normalized.includes("sotto la sufficienza")
  ) {
    const lowSubjects = data.subjects
      .map((item) => ({ item, avg: average(item.grades) }))
      .filter(
        (entry): entry is { item: (typeof data.subjects)[number]; avg: number } =>
          entry.avg !== null && entry.avg < 6,
      );
    return lowSubjects.length
      ? `Materie sotto la sufficienza: ${lowSubjects.map(({ item, avg }) => `${item.name} (${number(avg)})`).join(", ")}.`
      : "Non risultano materie sotto la sufficienza nei voti caricati.";
  }

  if (
    normalized.includes("sto migliorando") ||
    normalized.includes("andamento") ||
    normalized.includes("trend")
  ) {
    const current = overallAverage(data.subjects);
    if (current === null || data.previousAverage === undefined)
      return "Non ho abbastanza dati per confrontare la media attuale con quella precedente.";
    const delta = current - data.previousAverage;
    if (Math.abs(delta) < 0.05)
      return `La media generale è stabile: ${number(current)}, come il dato precedente (${number(data.previousAverage)}).`;
    const direction = delta > 0 ? "aumentata" : "diminuita";
    return `La media generale è ${number(current)}: è ${direction} di ${number(Math.abs(delta))} punti rispetto al dato precedente (${number(data.previousAverage)}).`;
  }

  if (
    normalized.includes("media generale") ||
    normalized.includes("media complessiva") ||
    normalized === "media"
  ) {
    const current = overallAverage(data.subjects);
    return current === null
      ? "Non ci sono ancora voti sufficienti per calcolare la media generale."
      : `La tua media generale è ${number(current)}.`;
  }

  if (
    (normalized.includes("assenza") || normalized.includes("assenze")) &&
    (normalized.includes("limite") || normalized.includes("ancora") || normalized.includes("manca"))
  ) {
    const { absenceHours, absenceLimitHours } = data.attendance;
    const remaining = absenceLimitHours - absenceHours;
    return remaining > 0
      ? `Hai ${number(absenceHours)} ore di assenza su ${number(absenceLimitHours)}: ti restano ${number(remaining)} ore prima del limite.`
      : remaining === 0
        ? `Hai raggiunto il limite di ${number(absenceLimitHours)} ore di assenza.`
        : `Hai superato il limite di ${number(absenceLimitHours)} ore di ${number(Math.abs(remaining))} ore.`;
  }

  if (
    normalized.includes("assenza") ||
    normalized.includes("assenze") ||
    normalized.includes("ritardo") ||
    normalized.includes("ritardi")
  ) {
    const { attendance } = data;
    const daysLabel = attendance.absenceDays === 1 ? "giorno" : "giorni";
    const delaysLabel = attendance.delays === 1 ? "ritardo" : "ritardi";
    return `Hai ${attendance.absenceDays} ${daysLabel} e ${number(attendance.absenceHours)} ore di assenza, con ${attendance.delays} ${delaysLabel}. Il limite impostato è ${number(attendance.absenceLimitHours)} ore.`;
  }

  if (normalized.includes("compiti") || normalized.includes("scadenze")) {
    const open = data.assignments.filter((assignment) => !assignment.completed);
    if (!open.length) return "Non risultano compiti ancora da completare.";

    const requestedDay = normalized.includes("domani") ? 1 : normalized.includes("oggi") ? 0 : null;
    if (requestedDay !== null) {
      const due = open.filter((assignment) => daysUntil(assignment.dueDate, now) === requestedDay);
      const label = requestedDay === 0 ? "oggi" : "domani";
      return due.length
        ? `Hai ${due.length} ${due.length === 1 ? "compito" : "compiti"} in scadenza ${label}: ${due.map((item) => item.title).join(", ")}.`
        : `Non hai compiti aperti in scadenza ${label}.`;
    }

    if (normalized.includes("in ritardo") || normalized.includes("scaduti")) {
      const overdue = open.filter((assignment) => (daysUntil(assignment.dueDate, now) ?? 0) < 0);
      return overdue.length
        ? `Hai ${overdue.length} compiti in ritardo: ${overdue.map((item) => item.title).join(", ")}.`
        : "Non risultano compiti in ritardo.";
    }

    const sorted = [...open].sort((a, b) => {
      const first = daysUntil(a.dueDate, now);
      const second = daysUntil(b.dueDate, now);
      if (first === null) return second === null ? a.title.localeCompare(b.title) : 1;
      if (second === null) return -1;
      return first - second;
    });
    const next = sorted.slice(0, 3).map((item) => {
      const days = daysUntil(item.dueDate, now);
      const date = displayDate(item.dueDate);
      const timing =
        days === null
          ? ""
          : days < 0
            ? ` (scaduto il ${date})`
            : days === 0
              ? " (scade oggi)"
              : days === 1
                ? " (scade domani)"
                : ` (scade il ${date})`;
      return `${item.title}${timing}`;
    });
    return `Hai ${open.length} compit${open.length === 1 ? "o" : "i"} da completare. I prossimi: ${next.join("; ")}.`;
  }

  if (
    normalized.includes("diario") ||
    normalized.includes("professori") ||
    normalized.includes("attivita")
  ) {
    const latest = [...data.diary].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    return latest.length
      ? latest
          .map((entry) => `${entry.date} — ${entry.subject || "Attività"}: ${entry.activity}`)
          .join("\n")
      : "Non ci sono ancora attività nel Diario.";
  }

  return "Non ho capito la domanda. Prova a riformularla o scegli uno dei suggerimenti qui sotto.";
}
