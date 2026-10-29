import type { Interrogazione } from "./interrogazioni";
import type { VotoData } from "./types";

export interface AssistantSearchResult {
  category: string;
  title: string;
  detail: string;
  searchableText: string;
}

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const STOP_WORDS = new Set([
  "cerca",
  "cercare",
  "trova",
  "trovare",
  "ricerca",
  "rapida",
  "nei",
  "nelle",
  "nella",
  "nel",
  "degli",
  "delle",
  "della",
  "del",
  "dei",
  "di",
  "da",
  "in",
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "un",
  "una",
  "uno",
  "e",
  "con",
  "per",
  "miei",
  "mie",
  "dati",
  "app",
  "voto",
  "scolastici",
]);

function dateLabel(value?: string): string {
  const match = value?.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : (value ?? "");
}

export function assistantSearchTerms(query: string): string[] {
  return [...new Set(normalize(query).match(/[\p{L}\p{N}]+/gu) ?? [])].filter(
    (term) => term.length > 1 && !STOP_WORDS.has(term),
  );
}

export function isAssistantSearchQuery(query: string): boolean {
  return /^\s*(?:(?:per favore)\s+)?(?:cerca(?:re)?|trova(?:re)?|ricerca(?:\s+rapida)?)\b/i.test(
    query,
  );
}

function rankResult(result: AssistantSearchResult, terms: string[], phrase: string): number {
  const title = normalize(result.title);
  const text = normalize(
    `${result.category} ${result.title} ${result.detail} ${result.searchableText}`,
  );
  const matched = terms.filter((term) => text.includes(term));
  if (matched.length === 0) return 0;
  const titleMatches = terms.filter((term) => title.includes(term)).length;
  const phraseBoost = phrase.length > 2 && text.includes(phrase) ? 3 : 0;
  return matched.length * 2 + titleMatches * 2 + phraseBoost;
}

export function searchAssistantData(
  query: string,
  data: VotoData,
  interrogazioni: Interrogazione[] = [],
  limit = 6,
): AssistantSearchResult[] {
  const terms = assistantSearchTerms(query);
  if (terms.length === 0) return [];
  const phrase = normalize(
    query
      .replace(
        /^\s*(?:(?:per favore)\s+)?(?:cerca(?:re)?|trova(?:re)?|ricerca(?:\s+rapida)?)\s*/i,
        "",
      )
      .trim(),
  );
  const records: AssistantSearchResult[] = [];

  for (const subject of data.subjects) {
    const grades = [...subject.grades]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(
        (grade) =>
          `${grade.label} (${dateLabel(grade.date)}${grade.comment ? `, ${grade.comment}` : ""})`,
      );
    records.push({
      category: "Materia",
      title: subject.name,
      detail: [
        subject.teacher ? `Docente: ${subject.teacher}` : "",
        grades.length ? `Voti: ${grades.join("; ")}` : "Nessun voto registrato",
      ]
        .filter(Boolean)
        .join(" · "),
      searchableText: `${subject.teacher ?? ""} ${subject.grades.map((grade) => `${grade.label} ${grade.type} ${grade.comment ?? ""}`).join(" ")}`,
    });
  }

  for (const subject of data.subjects) {
    for (const grade of subject.grades) {
      records.push({
        category: "Voto",
        title: `${grade.label} · ${subject.name}`,
        detail: [dateLabel(grade.date), grade.type, grade.comment].filter(Boolean).join(" · "),
        searchableText: `${subject.name} ${subject.teacher ?? ""} ${grade.label} ${grade.type} ${grade.comment ?? ""}`,
      });
    }
  }

  for (const assignment of data.assignments) {
    records.push({
      category: assignment.completed ? "Compito completato" : "Compito",
      title: assignment.title,
      detail: [assignment.subject, dateLabel(assignment.dueDate), assignment.details]
        .filter(Boolean)
        .join(" · "),
      searchableText: `${assignment.title} ${assignment.subject ?? ""} ${assignment.details ?? ""} ${assignment.completed ? "completato svolto fatto" : "da fare aperto"}`,
    });
  }

  for (const notification of data.notifications) {
    const category =
      notification.type === "notice"
        ? "Circolare"
        : notification.type === "reminder"
          ? "Promemoria"
          : notification.type === "note"
            ? "Nota"
            : "Notifica voto";
    records.push({
      category,
      title: notification.title,
      detail: [
        dateLabel(notification.date),
        notification.subject,
        notification.message,
        notification.attachmentName,
      ]
        .filter(Boolean)
        .join(" · "),
      searchableText: `${notification.title} ${notification.subject ?? ""} ${notification.message ?? ""} ${notification.attachmentName ?? ""}`,
    });
  }

  for (const entry of data.diary) {
    records.push({
      category: "Diario",
      title: entry.subject
        ? `${entry.subject} · ${dateLabel(entry.date)}`
        : `Attività · ${dateLabel(entry.date)}`,
      detail: [entry.teacher, entry.hour, entry.activity].filter(Boolean).join(" · "),
      searchableText: `${entry.subject ?? ""} ${entry.teacher ?? ""} ${entry.activity}`,
    });
  }

  for (const exam of interrogazioni) {
    records.push({
      category: exam.completed ? "Interrogazione completata" : "Interrogazione",
      title: exam.subject,
      detail: [dateLabel(exam.date), exam.hour ? `${exam.hour}ª ora` : exam.time, exam.notes]
        .filter(Boolean)
        .join(" · "),
      searchableText: `${exam.subject} ${exam.notes ?? ""} ${exam.checklist.map((item) => item.label).join(" ")}`,
    });
  }

  return records
    .map((result) => ({ result, score: rankResult(result, terms, phrase) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title, "it"))
    .slice(0, Math.max(1, limit))
    .map(({ result }) => result);
}

export function formatAssistantSearchResults(results: AssistantSearchResult[]): string {
  if (results.length === 0) {
    return "Non ho trovato corrispondenze nei dati caricati. Prova con una parola più breve o controlla che i dati siano stati sincronizzati.";
  }
  return `Ho trovato ${results.length} ${results.length === 1 ? "risultato" : "risultati"} nei dati dell’app:\n${results
    .map(
      (result) =>
        `• ${result.category}: ${result.title}${result.detail ? ` — ${result.detail}` : ""}`,
    )
    .join("\n")}`;
}
