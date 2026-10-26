import { average, fmt, neededGrade, overallAverage } from "./calc";
import { DAYS, type DayId } from "./orario";
import type { Grade } from "./types";
import type { VotoData } from "./types";

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const number = (value: number) => fmt(Math.round(value * 100) / 100, 2);

function findSubject(query: string, data: VotoData) {
  const normalized = normalize(query);
  return data.subjects.find((subject) => normalized.includes(normalize(subject.name)));
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

export function answerQuestion(query: string, data: VotoData): string {
  const normalized = normalize(query.trim());
  if (!normalized)
    return "Scrivimi una domanda, per esempio: “Quanto devo prendere in Inglese per arrivare a 8?”";

  const subject = findSubject(query, data);
  const target = targetFrom(query);
  const projectedGrade = gradeFrom(query);
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

  if (normalized.includes("media generale") || normalized === "media") {
    const current = overallAverage(data.subjects);
    return current === null
      ? "Non ci sono ancora voti sufficienti per calcolare la media generale."
      : `La tua media generale è ${number(current)}.`;
  }

  if (normalized.includes("assenze") || normalized.includes("ritardi")) {
    const { attendance } = data;
    return `Hai ${attendance.absenceDays} giorni e ${number(attendance.absenceHours)} ore di assenza, con ${attendance.delays} ritardi. Il limite impostato è ${number(attendance.absenceLimitHours)} ore.`;
  }

  if (normalized.includes("compiti") || normalized.includes("scadenze")) {
    const open = data.assignments.filter((assignment) => !assignment.completed);
    return open.length
      ? `Hai ${open.length} compit${open.length === 1 ? "o" : "i"} ancora da completare. Il prossimo è: “${open[0]?.title}”.`
      : "Non risultano compiti ancora da completare.";
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

  return "Posso aiutarti con medie e voti necessari, voti per materia, materia più bassa, compiti, Diario, assenze e ritardi. Prova: “Quanto devo prendere in Inglese per arrivare a 8?”";
}
