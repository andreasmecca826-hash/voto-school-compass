import { average, fmt, gradeTone, neededGrade, overallAverage } from "./calc";
import { calculateAbsencePlan } from "./absence-calculator";
import { DEFAULT_ABSENCE_HOURS_PER_DAY } from "./absence-preferences";
import { schoolDaysUntilSchoolEnd, type SchoolClosurePeriod } from "./school-holidays";
import { DAYS, emptySchedule, type DayId, type Schedule } from "./orario";
import type { Interrogazione } from "./interrogazioni";
import type { Flashcard } from "./study";
import {
  asksForLaboratory,
  getClassTeachers,
  teachersForSubject,
  teachersForSubjectQuestion,
} from "./teachers";
import type { Grade, VotoData } from "./types";
import {
  formatAssistantSearchResults,
  isAssistantSearchQuery,
  searchAssistantData,
} from "./assistant-search";
import { answerSchoolRegulation } from "./school-regulations";
import { parseEventDateTime } from "./dates";

export interface AssistantContext {
  previousQuestion?: string;
  source?: "demo" | "remote" | "cache";
  lastSync?: string | null;
  syncError?: string | null;
  hasRemoteUrl?: boolean;
  target?: number;
  theme?: string;
  mode?: string;
  accent?: string;
  background?: string;
  density?: string;
  reduceMotion?: boolean;
  customFont?: string;
  interfaceScale?: number;
  homeScale?: number;
  homeModules?: Array<{ id: string; enabled: boolean }>;
  flashcards?: Flashcard[];
  schoolEndDate?: string | undefined;
  schoolClosures?: SchoolClosurePeriod[] | undefined;
  absenceHoursPerDay?: number | undefined;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const number = (value: number) => fmt(Math.round(value * 100) / 100, 2);

function compareLatestGradeToPrevious(subject: VotoData["subjects"][number]) {
  const grades = [...subject.grades]
    .filter((grade) => grade.date)
    .sort((left, right) => left.date.localeCompare(right.date));
  if (grades.length < 2) return null;
  const latest = grades[grades.length - 1];
  const previousAverage = average(grades.slice(0, -1));
  if (!latest || previousAverage === null) return null;
  return { latest, previousAverage, delta: latest.value - previousAverage };
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0]!;
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column]!;
      previous[column] =
        left[row - 1] === right[column - 1]
          ? diagonal
          : Math.min(diagonal + 1, above + 1, previous[column - 1]! + 1);
      diagonal = above;
    }
  }
  return previous[right.length]!;
}

function subjectTokenMatches(queryToken: string, subjectToken: string): boolean {
  if (queryToken === subjectToken) return true;
  if (queryToken.length >= 3 && subjectToken.startsWith(queryToken)) return true;
  if (subjectToken.length >= 3 && queryToken.startsWith(subjectToken)) return true;
  const maxDistance = Math.max(queryToken.length, subjectToken.length) >= 7 ? 2 : 1;
  return (
    queryToken.length >= 4 &&
    subjectToken.length >= 4 &&
    editDistance(queryToken, subjectToken) <= maxDistance
  );
}

function findSubject(query: string, data: VotoData) {
  const normalized = normalize(query).replace(/[^\p{L}\p{N}\s]+/gu, " ");
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
  if (partialMatches.length === 1) return partialMatches[0];

  const queryTokens = normalized.split(/\s+/).filter((token) => token.length >= 3);
  const tolerantMatches = data.subjects.filter((subject) => {
    const subjectTokens = normalize(subject.name)
      .split(/\s+/)
      .filter((token) => token.length >= 4);
    return subjectTokens.some((subjectToken) =>
      queryTokens.some((queryToken) => subjectTokenMatches(queryToken, subjectToken)),
    );
  });
  return tolerantMatches.length === 1 ? tolerantMatches[0] : undefined;
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

function simulatedAbsenceHours(query: string): number | null {
  const asksForSimulation = [
    "simul",
    "aggiung",
    "se faccio",
    "se facessi",
    "se avessi",
    "ipotizz",
    "considera",
  ].some((term) => query.includes(term));
  if (!asksForSimulation) return null;
  const match = query.match(/\b(\d+(?:[.,]\d+)?)\s*(?:ore|h)\b/);
  if (!match?.[1]) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function dayFromQuery(query: string, now: Date): DayId | null {
  const normalized = normalize(query);
  const namedDay = DAYS.find((day) => normalized.includes(normalize(day.label)));
  if (namedDay) return namedDay.id;

  const date = new Date(now);
  const offset = relativeDayOffset(normalized);
  if (offset !== null) date.setDate(date.getDate() + offset);
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

function isAbsenceJustificationStatusQuery(normalizedQuery: string): boolean {
  const mentionsAbsence =
    normalizedQuery.includes("assenza") || normalizedQuery.includes("assenze");
  const asksForStatus = [
    "e giustificat",
    "sono giustificat",
    "state giustificat",
    "stata giustificat",
    "stato giustificat",
    "risulta giustificat",
    "risultano giustificat",
    "ho giustificat",
    "stato della giustificazione",
    "stato di giustificazione",
  ].some((term) => normalizedQuery.includes(term));
  return mentionsAbsence && asksForStatus;
}

function answerAbsenceJustificationStatus(data: VotoData): string {
  const absenceEvents = (data.attendanceEvents ?? [])
    .filter((event) => event.type === "absence")
    .sort((left, right) => right.date.localeCompare(left.date));
  if (absenceEvents.length === 0) {
    return "Nei dati sincronizzati non ci sono date dettagliate delle assenze, quindi non posso controllarne lo stato di giustificazione. Puoi vedere il totale in Altro > Assenze; non invio né modifico giustificazioni.";
  }

  const shown = absenceEvents.slice(0, 5).map((event) => {
    const date = displayDate(event.date) ?? event.date;
    const status =
      event.justificationStatus?.trim() || "stato non disponibile nei dati sincronizzati";
    return `• ${date}: ${status}`;
  });
  const remainder =
    absenceEvents.length > shown.length
      ? `\n• altre ${absenceEvents.length - shown.length} assenze non mostrate`
      : "";
  return `Stato delle assenze nei dati sincronizzati:\n${shown.join("\n")}${remainder}\nRiporto il campo ricevuto dal registro; se manca, non deduco che l’assenza sia giustificata o da giustificare. Non invio né modifico giustificazioni.`;
}

function relativeDayOffset(normalizedQuery: string): number | null {
  if (normalizedQuery.includes("dopodomani")) return 2;
  if (normalizedQuery.includes("altro ieri") || normalizedQuery.includes("ieri l altro")) return -2;
  if (normalizedQuery.includes("ieri")) return -1;
  if (normalizedQuery.includes("domani")) return 1;
  if (normalizedQuery.includes("oggi")) return 0;
  return null;
}

function relativeDayLabel(offset: number): string {
  if (offset === -2) return "l’altro ieri";
  if (offset === -1) return "ieri";
  if (offset === 0) return "oggi";
  if (offset === 1) return "domani";
  if (offset === 2) return "dopodomani";
  return "nel giorno richiesto";
}

function expandFollowUpQuestion(query: string, previousQuestion?: string): string {
  const previous = previousQuestion?.trim();
  const followUp = query.trim();
  if (!previous || !/^(?:e\s+)?(?:oggi|domani|dopodomani|ieri|l'altro ieri)\??$/i.test(followUp)) {
    return query;
  }
  const day = normalize(followUp).replace(/^e\s+/, "").replace(/\?+$/, "").trim();
  const previousWithoutDay = previous.replace(
    /\b(?:oggi|domani|dopodomani|ieri|l'altro ieri)\b/gi,
    "",
  );
  return `${previousWithoutDay.replace(/\?+$/, "").trim()} ${day}?`;
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

type RecentDashboardUpdate = {
  date: string;
  text: string;
};

function recentDashboardUpdates(data: VotoData, now: Date): RecentDashboardUpdate[] {
  const lowerBound = now.getTime() - 24 * 60 * 60 * 1000;
  const upperBound = now.getTime();
  const updates: Array<RecentDashboardUpdate & { occurredAt: number }> = [];

  data.subjects.forEach((subject) => {
    subject.grades.forEach((grade) => {
      const occurredAt = parseEventDateTime(grade.date);
      if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
      updates.push({
        date: grade.date,
        occurredAt,
        text: `voto ${grade.label} in ${subject.name}`,
      });
    });
  });

  data.assignments.forEach((assignment) => {
    const occurredAt = parseEventDateTime(assignment.assignedDate);
    if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
    updates.push({
      date: assignment.assignedDate!,
      occurredAt,
      text: `compito “${assignment.title}”${assignment.subject ? ` di ${assignment.subject}` : ""}`,
    });
  });

  data.notifications.forEach((notification) => {
    const occurredAt = parseEventDateTime(notification.date);
    if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
    const kind =
      notification.type === "grade"
        ? "notifica di voto"
        : notification.type === "notice"
          ? "comunicazione"
          : notification.type === "note"
            ? "nota"
            : "promemoria";
    updates.push({
      date: notification.date!,
      occurredAt,
      text: `${kind} “${notification.title}”`,
    });
  });

  return updates
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .map(({ date, text }) => ({ date, text }));
}

function gradeToneLabel(value: number | null): string {
  const tone = gradeTone(value);
  if (tone === "good") return "verde (da 6 in su)";
  if (tone === "ok") return "arancione (da 5 a 5,99)";
  if (tone === "bad") return "rosso (sotto 5)";
  return "grigio (nessun voto)";
}

function noticesByDate(data: VotoData) {
  return data.notifications
    .filter((notification) => notification.type === "notice")
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function remindersByDate(data: VotoData) {
  return data.notifications
    .filter((notification) => notification.type === "reminder")
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}

function noticeLabel(notification: VotoData["notifications"][number]): string {
  const date = displayDate(notification.date);
  const dateText = date ? ` (${date})` : "";
  const attachment = notification.attachmentName
    ? ` — allegato: ${notification.attachmentName}`
    : "";
  return `“${notification.title}”${dateText}${attachment}`;
}

function noticeSearchText(notification: VotoData["notifications"][number]): string {
  return normalize(
    [
      notification.title,
      notification.message,
      notification.extractedText,
      notification.subject,
      notification.teacher,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function noticeDetailLabel(notification: VotoData["notifications"][number]): string {
  const date = displayDate(notification.date);
  const source = notification.message?.trim() || notification.extractedText?.trim();
  if (!source) return noticeLabel(notification);
  const snippet = source.replace(/\s+/g, " ").trim().slice(0, 520);
  return `“${notification.title}”${date ? ` (${date})` : ""}: ${snippet}${source.length > 520 ? "…" : ""}`;
}

function noticeQueryTerms(query: string): string[] {
  return normalize(query)
    .split(/[^a-z0-9àèéìòù]+/i)
    .filter((term) => term.length >= 2)
    .filter(
      (term) =>
        ![
          "cosa",
          "dice",
          "dettagli",
          "classe",
          "esce",
          "orario",
          "quando",
          "circolare",
          "circolari",
          "avviso",
          "avvisi",
          "che",
          "una",
          "con",
          "nel",
          "alle",
          "per",
          "del",
          "come",
        ].includes(term),
    );
}

function matchesNoticeQuery(
  query: string,
  notification: VotoData["notifications"][number],
): boolean {
  const content = noticeSearchText(notification);
  return noticeQueryTerms(query).some((term) => content.includes(term));
}

function reminderLabel(notification: VotoData["notifications"][number]): string {
  const text = notification.message?.trim() || notification.title;
  const date = displayDate(notification.date);
  const subject = notification.subject ? ` — ${notification.subject}` : "";
  return `${text}${subject}${date ? ` (${date})` : ""}`;
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
  context: AssistantContext = {},
): string {
  query = expandFollowUpQuestion(query, context.previousQuestion);
  const normalized = normalize(query.trim());
  if (!normalized)
    return "Scrivimi una domanda, per esempio: “Quanto devo prendere in Inglese per arrivare a 8?”";

  if (isAssistantSearchQuery(query)) {
    return formatAssistantSearchResults(searchAssistantData(query, data, interrogazioni));
  }

  if (isAbsenceJustificationStatusQuery(normalized)) {
    return answerAbsenceJustificationStatus(data);
  }

  const schoolRegulationAnswer = answerSchoolRegulation(normalized);
  if (schoolRegulationAnswer) return schoolRegulationAnswer;

  if (
    normalized.includes("giustific") &&
    (normalized.includes("assenza") || normalized.includes("assenze"))
  ) {
    return "Posso consultare i conteggi delle assenze presenti nei dati caricati, ma non inviare una giustificazione. Per giustificare un’assenza usa DidUP Famiglia con l’account genitore, se la funzione è abilitata dalla scuola.";
  }

  const asksNtfyMessage =
    normalized.includes("ntfy") ||
    normalized.includes("notifica push") ||
    normalized.includes("notifiche push") ||
    (normalized.includes("notific") &&
      ["messaggio", "testo", "mostra", "dice", "perche", "diverso"].some((term) =>
        normalized.includes(term),
      ));
  if (asksNtfyMessage) {
    return "Le notifiche ntfy del monitor sono brevi: «Ci sono novità in bacheca», «Ci sono novità nei voti» o «Ci sono novità nei compiti». In VOTO, gli avvisi con PDF o DOCX sono Circolari; quelli composti solo da testo sono Comunicazioni. Per ricevere push distinti («Nuove circolari in bacheca» e «Nuove comunicazioni in bacheca») va aggiornato il monitor ntfy esterno, il cui mittente non è incluso in questa app. Per leggere i dettagli apri la sezione corrispondente in VOTO.";
  }

  const asksStudyPlan =
    (normalized.includes("cosa devo studiare") ||
      normalized.includes("piano di studio") ||
      normalized.includes("organizza lo studio")) &&
    (normalized.includes("settimana") ||
      normalized.includes("giorni") ||
      normalized.includes("oggi"));
  if (asksStudyPlan) {
    return "Per organizzare lo studio scegli tu ogni sessione nel Planner di studio: apri Studio Lab > Planner di studio e indica argomento, materia, metodo, giorno, orario e durata. Le sessioni restano salvate su questo dispositivo; non creo un piano automatico dal registro.";
  }

  if (
    normalized.includes("cosa sai fare") ||
    normalized.includes("cosa puoi fare") ||
    normalized.includes("cosa posso chiederti") ||
    normalized.includes("quali funzioni") ||
    normalized.includes("cosa offre l app") ||
    normalized.includes("tutto quello che puoi controllare")
  ) {
    return "Posso consultare i dati già caricati: profilo, voti e medie, compiti, presenze, orario, interrogazioni, diario, note, promemoria, circolari, notifiche di voto e docenti. Sui voti posso riepilogare media generale, punto di forza e materia da seguire e confrontare l’ultimo voto con i precedenti per materia; sono confronti indicativi basati sui dati registrati, non giudizi sugli argomenti. Posso inoltre spiegare i riepiloghi indicativi delle pagelle di primo trimestre e finale e la pagella infraperiodale manuale in Menu > Scrutini infraperiodali, leggere le flashcard di Studio Lab e usare il Planner di studio manuale per pianificare sessioni scegliendo materia, argomento, metodo, data, orario e durata. Posso anche rispondere su una sintesi locale del Regolamento d’Istituto Morselli-Sturzo 2025/2026, indicando sempre che va verificata per l’anno corrente. Se me lo chiedi, posso scegliere a caso un tema completo tra i preset disponibili e applicarlo solo dopo la tua conferma. Posso preparare riepiloghi e filtri per ieri, oggi, domani e dopodomani, calcolare le assenze e i giorni di lezione alla fine delle lezioni se imposti la data in Studio Lab, oltre ad altri calcoli scolastici. Dopo la tua conferma posso segnare un compito come completato o riaprirlo e cancellare un giorno dell’orario. Non accedo autonomamente a DidUP, non invio giustificazioni e non modifico notifiche.";
  }

  if (
    (normalized.includes("pagell") || normalized.includes("scrutin")) &&
    ["ufficial", "promosso", "promozione", "ammesso", "ammissione"].some((term) =>
      normalized.includes(term),
    )
  ) {
    return "No: in Menu > Scrutini infraperiodali, primo trimestre e scrutinio finale mostrano riepiloghi indicativi calcolati dai voti registrati nel periodo; non sono valutazioni ufficiali della scuola. La pagella infraperiodale è invece compilabile manualmente. Per l’esito ufficiale controlla DidUP o le comunicazioni della scuola.";
  }

  const asksWhereToFind =
    normalized.includes("dove trovo") ||
    normalized.includes("dove si trova") ||
    normalized.includes("in quale sezione") ||
    normalized.includes("come apro");
  if (asksWhereToFind) {
    const destinations: [string[], string][] = [
      [["compit", "scadenz"], "Compiti"],
      [["assenza", "presenz", "ritardo"], "Altro > Assenze"],
      [["orario", "lezion"], "Orario"],
      [["interrogaz"], "Interrogazioni"],
      [["scrutin", "pagell"], "Menu > Scrutini infraperiodali"],
      [["diario", "attivita"], "Diario"],
      [["nota"], "Note"],
      [["promemoria"], "Promemoria"],
      [["circolar", "bacheca", "avviso"], "Novità"],
      [["professor", "docent"], "Professori"],
      [["tema oro", "tema dorato", "tema diamante"], "Personalizza > Temi"],
      [["tema", "font", "personalizz", "sfondo"], "Personalizza"],
      [["musica", "brano"], "Personalizza > Musica"],
      [["impostazion", "sincronizz", "collegare i dati"], "Impostazioni"],
      [
        [
          "simulator",
          "calcolo media",
          "voto necessario",
          "calcolo assenze",
          "piantina della classe",
          "calcolatore universale",
        ],
        "Studio Lab > Calcolatore universale (cerca lo strumento nell’elenco)",
      ],
      [
        ["pianificatore", "piano di studio", "cosa devo studiare"],
        "Studio Lab > Planner di studio",
      ],
      [["voto", "materia"], "Voti"],
      [["studio lab", "flashcard", "ruota del ripasso"], "Studio Lab"],
    ];
    const destination = destinations.find(([terms]) =>
      terms.some((term) => normalized.includes(term)),
    );
    if (destination)
      return `Trovi questa funzione in ${destination[1]}. Puoi aprirla dal menu dell’app.`;
  }

  const asksSchoolEnd =
    [
      "finisce",
      "finiscono",
      "finira",
      "finiranno",
      "termina",
      "terminano",
      "terminera",
      "termineranno",
      "fine",
      "ultimo giorno",
      "manca",
    ].some((term) => normalized.includes(term)) &&
    ["scuola", "lezion", "anno scolastico"].some((term) => normalized.includes(term));
  if (asksSchoolEnd) {
    const endDate = context.schoolEndDate;
    const dateLabel = displayDate(endDate);
    const remainingDays = schoolDaysUntilSchoolEnd(endDate, now, context.schoolClosures);
    if (!endDate || !dateLabel || remainingDays === null)
      return "Per calcolare quando finisce la scuola, imposta prima la data ufficiale in Studio Lab > Fine scuola. La data non è nei dati sincronizzati e non la indovino.";
    if (remainingDays === 0) return `Oggi, ${dateLabel}, è l’ultimo giorno di scuola impostato.`;
    if (remainingDays > 0)
      return `La fine delle lezioni è impostata per il ${dateLabel}: mancano ${remainingDays} ${remainingDays === 1 ? "giorno" : "giorni"} di lezione (weekend e festività esclusi).`;
    const elapsedDays = Math.abs(remainingDays);
    return `La data di fine lezioni impostata era il ${dateLabel}: è passata da ${elapsedDays} ${elapsedDays === 1 ? "giorno" : "giorni"} di lezione (weekend e festività esclusi).`;
  }

  if (
    normalized.includes("anno scolastico") &&
    ["quando", "data", "inizia", "inizio", "comincia"].some((term) => normalized.includes(term))
  )
    return "Nei dati caricati non è indicata la data di inizio o fine dell’anno scolastico. Controlla le comunicazioni ufficiali della scuola.";

  if (
    normalized.includes("come mi chiamo") ||
    normalized.includes("qual e il mio nome") ||
    normalized.includes("che classe faccio") ||
    normalized.includes("in che classe sono") ||
    normalized.includes("quale classe frequento") ||
    normalized.includes("qual e il mio anno scolastico") ||
    normalized.includes("che anno scolastico frequento") ||
    normalized.includes("quale anno scolastico frequento") ||
    normalized.includes("in quale anno scolastico sono") ||
    normalized.includes("in che anno scolastico sono") ||
    normalized.includes("in che anno scolastico siamo") ||
    normalized.includes("che anno scolastico e")
  ) {
    const profile = data.student;
    const details = [
      profile.name ? `nome: ${profile.name}` : null,
      profile.className ? `classe: ${profile.className}` : null,
      profile.schoolYear ? `anno scolastico: ${profile.schoolYear}` : null,
    ].filter((value): value is string => Boolean(value));
    return details.length
      ? `Nel profilo scolastico risulta ${details.join("; ")}.`
      : "Nel profilo scolastico caricato non sono presenti nome, classe o anno scolastico.";
  }

  const asksCompleteTheme =
    (normalized.includes("oro") ||
      normalized.includes("diamante") ||
      normalized.includes("sangue") ||
      normalized.includes("dorato")) &&
    ["sblocc", "livello", "scelg", "scegli", "attiv"].some((term) => normalized.includes(term));
  if (asksCompleteTheme)
    return "I temi completi Oro, Diamante e Sangue sono già selezionabili in Personalizza > Temi.";

  if (
    normalized.includes("sincron") ||
    normalized.includes("connession") ||
    normalized.includes("sorgente dati") ||
    normalized.includes("dati demo") ||
    normalized.includes("ultimo aggiornamento dati")
  ) {
    if (!context.source)
      return "Non ho lo stato della sorgente in questa risposta. Puoi controllare la connessione e l’ultimo caricamento in Impostazioni.";
    const sourceLabel =
      context.source === "remote"
        ? "sorgente remota configurata"
        : context.source === "cache"
          ? "copia in cache dell’ultima sorgente remota"
          : "dati demo locali";
    const syncDate = context.lastSync
      ? new Date(context.lastSync).toLocaleString("it-IT")
      : "nessun caricamento riuscito registrato";
    const errorText = context.syncError ? " È presente un errore nell’ultimo aggiornamento." : "";
    const connectionText = context.hasRemoteUrl
      ? "Un URL sorgente è configurato."
      : "Nessun URL sorgente è configurato.";
    return `Stai usando ${sourceLabel}. ${connectionText} Ultimo caricamento riuscito: ${syncDate}.${errorText} Questo indica quando l’app ha letto i dati, non quando la scuola li ha aggiornati.`;
  }

  const asksThemeSetting =
    normalized.includes("tema") &&
    [
      "che tema",
      "quale tema",
      "mio tema",
      "tema attuale",
      "tema impostato",
      "tema selezionato",
      "sto usando",
    ].some((term) => normalized.includes(term));
  if (
    asksThemeSetting ||
    normalized.includes("font") ||
    normalized.includes("carattere") ||
    normalized.includes("personalizz") ||
    normalized.includes("densita") ||
    normalized.includes("movimento") ||
    normalized.includes("dimensione interfaccia") ||
    normalized.includes("moduli della home")
  ) {
    if (!context.theme)
      return "Non ho lo stato delle preferenze in questa risposta. Puoi vedere o modificare tema, font e Home in Personalizza.";
    const themeLabel =
      context.theme === "original"
        ? "Originale"
        : context.theme === "custom"
          ? "Personalizzato"
          : context.theme.replaceAll("-", " ");
    const fontLabels: Record<string, string> = {
      theme: "quello del tema",
      sans: "Sans",
      display: "Display",
      mono: "Monospace",
      serif: "Serif",
    };
    const details = [`tema ${themeLabel}`];
    if (context.mode) details.push(`modalità ${context.mode}`);
    if (context.customFont)
      details.push(`font ${fontLabels[context.customFont] ?? context.customFont}`);
    if (context.interfaceScale) details.push(`dimensione interfaccia ${context.interfaceScale}%`);
    if (context.density)
      details.push(`densità ${context.density === "compact" ? "compatta" : "standard"}`);
    if (context.reduceMotion !== undefined)
      details.push(`movimento ${context.reduceMotion ? "ridotto" : "normale"}`);
    if (context.accent) details.push(`colore accento ${context.accent}`);
    if (context.background) details.push(`sfondo ${context.background}`);
    if (normalized.includes("home") || normalized.includes("moduli")) {
      const labels: Record<string, string> = {
        media: "Media",
        simulatore: "Simulatore",
        presenze: "Presenze",
        compiti: "Compiti",
        interrogazioni: "Interrogazioni",
        note: "Note",
        promemoria: "Promemoria",
        bacheca: "Bacheca",
        obiettivo: "Obiettivo",
      };
      const enabled =
        context.homeModules
          ?.filter((module) => module.enabled)
          .map((module) => labels[module.id] ?? module.id) ?? [];
      if (enabled.length) details.push(`moduli Home attivi: ${enabled.join(", ")}`);
      if (context.homeScale) details.push(`scala Home ${context.homeScale}%`);
    }
    return `Preferenze locali attuali: ${details.join("; ")}. Puoi cambiarle in Personalizza; non sono impostazioni di DidUP.`;
  }

  if (
    normalized.includes("flashcard") ||
    normalized.includes("flash card") ||
    normalized.includes("carte di ripasso")
  ) {
    const cards = context.flashcards ?? [];
    if (!cards.length)
      return "Non risultano flashcard caricate nella sessione Studio Lab. Puoi crearle o importarle in Studio Lab > Flashcard; restano dati della sessione e non vengono inviati online.";
    const subject = findSubject(query, data);
    const matches = subject
      ? cards.filter((card) => normalize(card.subject).includes(normalize(subject.name)))
      : cards;
    if (!matches.length)
      return `Non trovo flashcard per ${subject?.name ?? "questa richiesta"} nel mazzo della sessione.`;
    const showAnswers =
      normalized.includes("risposta") ||
      normalized.includes("mostra") ||
      normalized.includes("elenc");
    const shown = matches
      .slice(0, 8)
      .map(
        (card) =>
          `• ${card.subject ? `${card.subject}: ` : ""}${card.question}${showAnswers ? ` → ${card.answer}` : ""}`,
      );
    return [
      `${matches.length} ${matches.length === 1 ? "flashcard" : "flashcard"} nella sessione${subject ? ` per ${subject.name}` : ""}:`,
      ...shown,
      ...(matches.length > shown.length ? [`E altre ${matches.length - shown.length}.`] : []),
    ].join("\n");
  }

  const asksNotes =
    normalized.includes("note") ||
    normalized.includes("annotazion") ||
    normalized.includes("nota disciplinare");
  if (asksNotes) {
    const asksUnread = normalized.includes("non lett") || normalized.includes("nuov");
    const requestedDay = relativeDayOffset(normalized);
    const subject = findSubject(query, data);
    const matches = data.notifications
      .filter((item) => item.type === "note")
      .filter((item) => !asksUnread || !item.read)
      .filter((item) => !subject || normalize(item.subject ?? "").includes(normalize(subject.name)))
      .filter((item) => (requestedDay === null ? true : daysUntil(item.date, now) === requestedDay))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    if (!matches.length) {
      if (requestedDay !== null)
        return `Non risultano note${asksUnread ? " non lette" : ""} per ${relativeDayLabel(requestedDay)} nei dati caricati.`;
      if (asksUnread) return "Non risultano note non lette nei dati caricati.";
      return "Non risultano note disciplinari nei dati caricati.";
    }
    const shown = matches.slice(0, 5).map((item) => {
      const date = displayDate(item.date);
      const subjectLabel = item.subject ? ` — ${item.subject}` : "";
      const title = item.title.trim();
      const message = item.message?.trim();
      const text = message && message !== title ? `${title}: ${message}` : title;
      return `• ${text}${subjectLabel}${date ? ` (${date})` : ""}${item.read ? "" : " — non letta"}`;
    });
    const remainder =
      matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
    return `Note${asksUnread ? " non lette" : " disciplinari"}:\n${shown.join("\n")}${remainder}\nLe trovi nella sezione Note.`;
  }

  const asksDiary = normalized.includes("diario") || normalized.includes("attivita");
  if (asksDiary) {
    const subject = findSubject(query, data);
    const requestedDay = relativeDayOffset(normalized);
    const matches = data.diary
      .filter(
        (entry) => !subject || normalize(entry.subject ?? "").includes(normalize(subject.name)),
      )
      .filter((entry) =>
        requestedDay === null ? true : daysUntil(entry.date, now) === requestedDay,
      )
      .sort((a, b) => `${b.date}${b.hour ?? ""}`.localeCompare(`${a.date}${a.hour ?? ""}`));
    if (!matches.length) {
      if (requestedDay !== null)
        return `Non risultano attività nel Diario per ${relativeDayLabel(requestedDay)}.`;
      return "Non ci sono attività nel Diario che corrispondono alla richiesta.";
    }
    const shown = matches.slice(0, 8).map((entry) => {
      const date = displayDate(entry.date) ?? entry.date;
      const details = [entry.subject, entry.hour, entry.teacher]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(", ");
      return `• ${date}${details ? ` — ${details}` : ""}: ${entry.activity}`;
    });
    const remainder =
      matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
    return `Attività del Diario:\n${shown.join("\n")}${remainder}\nI dati provengono dal Diario caricato nell’app.`;
  }

  const notices = noticesByDate(data);
  const reminders = remindersByDate(data);
  const asksReminders =
    normalized.includes("promemoria") ||
    normalized.includes("promemorie") ||
    (normalized.includes("ricord") &&
      (normalized.includes("oggi") ||
        normalized.includes("domani") ||
        normalized.includes("cosa") ||
        normalized.includes("quali") ||
        normalized.includes("ho")));
  if (asksReminders) {
    const requestedDay = relativeDayOffset(normalized);
    const asksPastReminders =
      normalized.includes("scors") ||
      normalized.includes("passat") ||
      normalized.includes("precedent") ||
      normalized.includes("scadut") ||
      (normalized.includes("ultim") && normalized.includes("giorn"));
    const asksUnread = normalized.includes("non lett") || normalized.includes("nuov");
    const matches = reminders
      .filter((item) => {
        const days = daysUntil(item.date, now);
        if (requestedDay !== null) return days === requestedDay;
        if (asksPastReminders) return days !== null && days < 0 && days >= -30;
        return days === null || days >= 0;
      })
      .filter((item) => !asksUnread || !item.read)
      .sort((a, b) =>
        asksPastReminders
          ? (b.date ?? "").localeCompare(a.date ?? "")
          : (a.date ?? "9999").localeCompare(b.date ?? "9999"),
      );
    if (!matches.length) {
      if (requestedDay !== null)
        return `Non risultano promemoria DidUP per ${relativeDayLabel(requestedDay)}.`;
      if (asksUnread) return "Non risultano promemoria non letti nei dati caricati.";
      if (asksPastReminders) return "Non risultano promemoria passati negli ultimi 30 giorni.";
      return "Non risultano promemoria DidUP nei dati sincronizzati.";
    }
    const shown = matches.slice(0, 5);
    const heading =
      requestedDay !== null
        ? `Promemoria DidUP di ${relativeDayLabel(requestedDay)}`
        : asksPastReminders
          ? "Promemoria passati negli ultimi 30 giorni"
          : asksUnread
            ? "Promemoria non letti"
            : "Promemoria DidUP";
    const remainder =
      matches.length > shown.length ? `\nE altri ${matches.length - shown.length}.` : "";
    return `${heading}:\n${shown.map((item) => `• ${reminderLabel(item)}`).join("\n")}${remainder}\nLi trovi nella sezione Promemoria.`;
  }

  const asksNotificationListing =
    normalized.includes("notific") &&
    !normalized.includes("promemoria") &&
    !normalized.includes("note") &&
    !normalized.includes("circolar") &&
    !normalized.includes("bacheca") &&
    !normalized.includes("avviso");
  if (asksNotificationListing) {
    const requestedType =
      normalized.includes("vot") || normalized.includes("valutaz") ? "grade" : undefined;
    const unreadOnly = normalized.includes("non lett") || normalized.includes("nuov");
    const requestedDay = relativeDayOffset(normalized);
    const labels: Record<string, string> = {
      note: "Nota",
      grade: "Voto",
      reminder: "Promemoria",
      notice: "Avviso",
    };
    const matches = data.notifications
      .filter((item) => !requestedType || item.type === requestedType)
      .filter((item) => !unreadOnly || !item.read)
      .filter((item) => (requestedDay === null ? true : daysUntil(item.date, now) === requestedDay))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    if (!matches.length)
      return requestedType
        ? `Non risultano notifiche di voto${requestedDay === null ? "" : ` per ${relativeDayLabel(requestedDay)}`} nei dati caricati.`
        : `Non risultano notifiche che corrispondono alla richiesta${requestedDay === null ? "" : ` per ${relativeDayLabel(requestedDay)}`} nei dati caricati.`;
    const shown = matches.slice(0, 8).map((item) => {
      const date = displayDate(item.date);
      const message = item.message?.trim();
      const detail = message && message !== item.title ? ` — ${message}` : "";
      const subject = item.subject ? `, ${item.subject}` : "";
      const attachment = item.attachmentName ? `, allegato: ${item.attachmentName}` : "";
      return `• ${labels[item.type] ?? "Notifica"}: ${item.title}${detail}${subject}${date ? ` (${date})` : ""}${attachment}${item.read ? "" : " — non letta"}`;
    });
    const remainder =
      matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
    return `Notifiche${requestedType ? " di voto" : ""}${unreadOnly ? " non lette" : ""}:\n${shown.join("\n")}${remainder}\nLa lettura qui non modifica il loro stato.`;
  }

  const asksCategorySpecificUpdates = [
    "bacheca",
    "circolar",
    "avvis",
    "voto",
    "voti",
    "valutazion",
    "compit",
    "scadenz",
  ].some((term) => normalized.includes(term));
  const asksDashboardOverview =
    normalized.includes("dashboard") ||
    normalized.includes("situazione generale") ||
    normalized.includes("cosa e successo") ||
    normalized.includes("cosa è successo") ||
    normalized.includes("ultimo aggiornamento");
  if (
    (normalized.includes("novit") ||
      normalized.includes("aggiornament") ||
      asksDashboardOverview) &&
    !asksCategorySpecificUpdates
  ) {
    const recentGrade = latestGrade(data);
    const recentUpdates = recentDashboardUpdates(data, now);
    const currentAverage = overallAverage(data.subjects);
    const todayNotices = notices.filter(
      (notification) => notification.date?.slice(0, 10) === localDateKey(now),
    );
    const lines: string[] = [];
    if (currentAverage !== null) {
      const delta =
        data.previousAverage === undefined ? null : currentAverage - data.previousAverage;
      const trend =
        delta === null
          ? ""
          : delta > 0.05
            ? `, in crescita di ${number(delta)} punti`
            : delta < -0.05
              ? `, in calo di ${number(Math.abs(delta))} punti`
              : ", stabile rispetto all’ultimo dato";
      lines.push(`Media generale: ${number(currentAverage)} su 10${trend}.`);
    } else {
      lines.push("Media generale: non ancora calcolabile perché non ci sono voti sufficienti.");
    }
    if (recentUpdates.length) {
      lines.push(
        `Evento più recente nelle ultime 24 ore: ${recentUpdates[0]!.text} (${displayDate(recentUpdates[0]!.date) ?? recentUpdates[0]!.date}).`,
      );
      if (recentUpdates.length > 1) {
        lines.push(
          `Altre novità recenti: ${recentUpdates
            .slice(1, 4)
            .map((item) => item.text)
            .join("; ")}.`,
        );
      }
    } else {
      lines.push("Nessun nuovo evento registrato nelle ultime 24 ore.");
    }
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
    const nextReminder = reminders.find((item) => {
      const days = daysUntil(item.date, now);
      return days !== null && days >= 0;
    });
    if (nextReminder) lines.push(`Promemoria: ${reminderLabel(nextReminder)}.`);
    return lines.join("\n");
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

  const asksInterrogationPreparation =
    normalized.includes("checklist") ||
    normalized.includes("prepar") ||
    normalized.includes("ripassare") ||
    normalized.includes("cosa devo studiare");
  if (normalized.includes("interrogaz") && asksInterrogationPreparation) {
    const subject = findSubject(query, data);
    const upcoming = interrogazioni
      .filter((item) => !item.completed && (daysUntil(item.date, now) ?? -1) >= 0)
      .filter((item) => !subject || normalize(item.subject).includes(normalize(subject.name)))
      .sort((a, b) => `${a.date}${a.hour ?? 0}`.localeCompare(`${b.date}${b.hour ?? 0}`));
    const item = upcoming[0];
    if (!item)
      return "Non trovo un’interrogazione futura corrispondente nell’agenda locale. Puoi controllare la sezione Interrogazioni.";
    const date = displayDate(item.date) ?? item.date;
    const preparation = item.checklist.length
      ? item.checklist
          .map((step) => `• ${step.done ? "Fatto" : "Da fare"}: ${step.label}`)
          .join("\n")
      : "Nessun punto di preparazione inserito.";
    return `Preparazione per ${item.subject} (${date}):\n${preparation}\nLa consultazione non modifica la checklist.`;
  }

  if (
    normalized.includes("interrogaz") &&
    (normalized.includes("completat") ||
      normalized.includes("passat") ||
      normalized.includes("gia fatt"))
  ) {
    const completed = interrogazioni
      .filter((item) => item.completed)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (!completed.length) return "Non risultano interrogazioni completate nell’agenda locale.";
    const shown = completed.slice(0, 8).map((item) => {
      const date = displayDate(item.date) ?? item.date;
      return `• ${item.subject} (${date})${item.notes ? ` — ${item.notes}` : ""}`;
    });
    return `Interrogazioni completate:\n${shown.join("\n")}${completed.length > shown.length ? `\nE altre ${completed.length - shown.length}.` : ""}`;
  }

  if (normalized.includes("interrogaz")) {
    const requestedDay = relativeDayOffset(normalized);
    const future = interrogazioni
      .filter((item) => !item.completed)
      .filter((item) => {
        const distance = daysUntil(item.date, now);
        return requestedDay !== null
          ? distance === requestedDay
          : distance !== null && distance >= 0;
      })
      .sort((a, b) => `${a.date}${a.hour ?? 0}`.localeCompare(`${b.date}${b.hour ?? 0}`));
    const matches =
      requestedDay === null
        ? future
        : future.filter((item) => daysUntil(item.date, now) === requestedDay);
    if (!matches.length) {
      if (requestedDay !== null)
        return `Non hai interrogazioni in agenda per ${relativeDayLabel(requestedDay)}.`;
      return "Non risultano interrogazioni future nella tua agenda locale. Puoi aggiungerle nella sezione Interrogazioni.";
    }
    const shown = matches.slice(0, requestedDay === null ? 3 : matches.length).map((item) => {
      const date = displayDate(item.date) ?? item.date;
      const hour = item.hour ? `, ${item.hour}ª ora` : item.time ? `, ${item.time}` : "";
      const notes = item.notes ? ` — ${item.notes}` : "";
      return `${item.subject} (${date}${hour})${notes}`;
    });
    const heading =
      requestedDay !== null
        ? `Interrogazioni di ${relativeDayLabel(requestedDay)}`
        : "Prossime interrogazioni in agenda";
    return `${heading}:\n${shown.map((item) => `• ${item}`).join("\n")}${matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : ""}`;
  }

  const asksNoticeDetails =
    (normalized.includes("cosa dice") ||
      normalized.includes("dettagli") ||
      normalized.includes("classe") ||
      normalized.includes("esce") ||
      normalized.includes("orario") ||
      normalized.includes("a che ora") ||
      normalized.includes("quando")) &&
    notices.some((notification) => matchesNoticeQuery(normalized, notification));
  if (
    normalized.includes("circolar") ||
    normalized.includes("bacheca") ||
    normalized.includes("avvisi") ||
    normalized.includes("notiz") ||
    asksNoticeDetails
  ) {
    const requestedDay = relativeDayOffset(normalized);
    const asksUnread = normalized.includes("non lett");
    const asksNew =
      normalized.includes("nuov") ||
      normalized.includes("recent") ||
      normalized.includes("novit") ||
      normalized.includes("aggiornament");
    const asksDetails = asksNoticeDetails;
    let matches = notices;
    if (requestedDay !== null)
      matches = matches.filter(
        (notification) => daysUntil(notification.date, now) === requestedDay,
      );
    if (asksUnread || (asksNew && requestedDay === null))
      matches = matches.filter((notification) => !notification.read);
    if (asksDetails) {
      const searchTerms = noticeQueryTerms(normalized);
      if (searchTerms.length) {
        matches = matches.filter((notification) => {
          const content = noticeSearchText(notification);
          return searchTerms.some((term) => content.includes(term));
        });
      }
    }
    if (!matches.length) {
      if (requestedDay !== null)
        return `Non risultano circolari per ${relativeDayLabel(requestedDay)} nei dati caricati.`;
      if (asksUnread || asksNew) return "Non risultano circolari nuove o non lette.";
      return "Non risultano circolari o avvisi nei dati caricati.";
    }
    const latestOnly =
      normalized.includes("ultima circolare") || normalized.includes("ultimo avviso");
    const shown = matches.slice(0, latestOnly ? 1 : 5);
    const heading =
      requestedDay !== null
        ? `Circolari di ${relativeDayLabel(requestedDay)}`
        : asksUnread || asksNew
          ? "Circolari nuove o non lette"
          : "Circolari recenti";
    const remainder =
      matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
    return `${heading}:\n${shown.map((notification) => `• ${asksDetails ? noticeDetailLabel(notification) : noticeLabel(notification)}`).join("\n")}${remainder}\nLe trovi nella sezione Novità.`;
  }

  const asksDailyOverview =
    ((normalized.includes("riepilog") ||
      normalized.includes("programma") ||
      normalized.includes("agenda")) &&
      relativeDayOffset(normalized) !== null) ||
    /\bcosa (?:ho|devo fare|mi aspetta) (?:oggi|ieri|domani|dopodomani)\b/.test(normalized) ||
    /\bche impegni ho (?:oggi|ieri|domani|dopodomani)\b/.test(normalized);
  if (asksDailyOverview) {
    const offset = relativeDayOffset(normalized) ?? 0;
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const dateKey = localDateKey(date);
    const dateLabel = date.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const weekday = date.getDay();
    const dayId = weekday >= 1 && weekday <= 5 ? DAYS[weekday - 1]?.id : null;
    const sections: string[] = [];
    const lessons = dayId
      ? (schedule[dayId] ?? [])
          .map((lesson, index) => (lesson.trim() ? `${index + 1}ª ${lesson.trim()}` : null))
          .filter((lesson): lesson is string => lesson !== null)
      : [];
    if (lessons.length) sections.push(`Lezioni: ${lessons.join(", ")}`);
    const assignments = data.assignments.filter(
      (item) => !item.completed && item.dueDate?.slice(0, 10) === dateKey,
    );
    if (assignments.length)
      sections.push(
        `Compiti: ${assignments
          .slice(0, 5)
          .map(
            (item) =>
              `${item.title}${item.subject ? ` (${item.subject})` : ""}${item.details ? ` — ${item.details}` : ""}`,
          )
          .join("; ")}`,
      );
    const diary = data.diary.filter((item) => item.date.slice(0, 10) === dateKey);
    if (diary.length)
      sections.push(
        `Diario: ${diary
          .slice(0, 5)
          .map(
            (item) =>
              `${item.hour ? `${item.hour}ª ora, ` : ""}${item.subject ? `${item.subject}: ` : ""}${item.activity}`,
          )
          .join("; ")}`,
      );
    const interrogations = interrogazioni.filter(
      (item) => !item.completed && item.date.slice(0, 10) === dateKey,
    );
    if (interrogations.length)
      sections.push(
        `Interrogazioni in agenda: ${interrogations
          .map(
            (item) =>
              `${item.subject}${item.hour ? `, ${item.hour}ª ora` : item.time ? `, ${item.time}` : ""}${item.notes ? ` — ${item.notes}` : ""}`,
          )
          .join("; ")}`,
      );
    const notifications = data.notifications.filter((item) => item.date?.slice(0, 10) === dateKey);
    for (const [type, label] of [
      ["reminder", "Promemoria"],
      ["note", "Note"],
      ["notice", "Circolari"],
      ["grade", "Notifiche di voto"],
    ] as const) {
      const items = notifications.filter((item) => item.type === type);
      if (items.length)
        sections.push(
          `${label}: ${items
            .slice(0, 4)
            .map(
              (item) =>
                `${item.title}${item.message && item.message !== item.title ? ` — ${item.message}` : ""}`,
            )
            .join("; ")}`,
        );
    }
    return sections.length
      ? [
          `Riepilogo di ${relativeDayLabel(offset)} (${dateLabel}):`,
          ...sections.map((section) => `• ${section}`),
          "Riepilogo basato sui dati già caricati nell’app.",
        ].join("\n")
      : `Non trovo lezioni inserite né compiti, attività, interrogazioni o comunicazioni per ${relativeDayLabel(offset)} (${dateLabel}) nei dati caricati.`;
  }

  const subject = findSubject(query, data);
  const target = targetFrom(query);
  const projectedGrade = gradeFrom(query);
  const asksStrength = [
    "punto di forza",
    "punti di forza",
    "materia migliore",
    "materie migliori",
    "materia piu forte",
    "materie piu forti",
    "vado meglio",
    "sono piu bravo",
    "mi riesce meglio",
  ].some((term) => normalized.includes(term));
  const asksWeakness = [
    "punto di debolezza",
    "punti di debolezza",
    "e debolezza",
    "e di debolezza",
    "punto debole",
    "punti deboli",
    "materia peggiore",
    "materie peggiori",
    "materia piu debole",
    "materie piu deboli",
    "materia da seguire",
    "vado peggio",
    "faccio piu fatica",
    "mi riesce peggio",
  ].some((term) => normalized.includes(term));
  const asksStudyPriority = [
    "cosa devo migliorare",
    "quale materia devo migliorare",
    "quali materie devo migliorare",
    "su cosa devo concentrarmi",
    "dove vado peggio",
    "in cosa sono debole",
    "come posso migliorare",
  ].some((term) => normalized.includes(term));
  if (asksStrength || asksWeakness || asksStudyPriority) {
    if (subject) {
      const subjectAverage = average(subject.grades);
      if (subjectAverage === null)
        return `Non risultano voti sufficienti in ${subject.name} per individuare un andamento. Il registro non contiene dati sugli argomenti specifici da migliorare.`;
      const comparison = compareLatestGradeToPrevious(subject);
      const latestInfo = comparison
        ? ` L’ultimo voto (${comparison.latest.label}) è ${comparison.delta > 0 ? "sopra" : comparison.delta < 0 ? "sotto" : "in linea con"} la media dei voti precedenti (${number(comparison.previousAverage)}).`
        : " Per confrontare l’andamento servono almeno due voti datati.";
      return `In ${subject.name} la media registrata è ${number(subjectAverage)} su 10.${latestInfo} Dai soli voti non posso dedurre quali argomenti specifici siano più difficili.`;
    }

    const ranked = data.subjects
      .map((item) => ({ item, avg: average(item.grades) }))
      .filter(
        (entry): entry is { item: (typeof data.subjects)[number]; avg: number } =>
          entry.avg !== null,
      )
      .sort((a, b) => b.avg - a.avg);
    const overall = overallAverage(data.subjects);
    if (!ranked.length || overall === null)
      return "Non ci sono ancora voti sufficienti per individuare punti di forza o materie da seguire.";

    const lines = [`Media generale: ${number(overall)} su 10.`];
    const showStrength = asksStrength;
    const showWeakness = asksWeakness || asksStudyPriority;
    if (showStrength) {
      const strongest = ranked.filter((entry) => entry.avg === ranked[0]!.avg);
      lines.push(
        `Punto di forza: ${strongest.map(({ item, avg }) => `${item.name} (${number(avg)})`).join(", ")}.`,
      );
    }
    if (showWeakness) {
      const lowestAverage = ranked[ranked.length - 1]!.avg;
      const weakest = ranked.filter((entry) => entry.avg === lowestAverage);
      lines.push(
        `Punto di debolezza da seguire: ${weakest.map(({ item, avg }) => `${item.name} (${number(avg)})`).join(", ")}.`,
      );
    }
    lines.push(
      "È un confronto tra le medie dei voti caricati, non una valutazione degli argomenti specifici.",
    );
    return lines.join("\n");
  }

  const asksSubjectAverages = [
    "media per materia",
    "medie per materia",
    "medie delle materie",
    "media di ogni materia",
    "media in tutte le materie",
  ].some((term) => normalized.includes(term));
  if (asksSubjectAverages) {
    const rankings = data.subjects
      .map((item) => ({ item, avg: average(item.grades) }))
      .filter(
        (entry): entry is { item: (typeof data.subjects)[number]; avg: number } =>
          entry.avg !== null,
      )
      .sort((a, b) => b.avg - a.avg);
    return rankings.length
      ? `Medie per materia, dalla più alta:\n${rankings.map(({ item, avg }) => `• ${item.name}: ${number(avg)} su 10`).join("\n")}\nCalcolo basato sui voti registrati; i pesi dei voti sono considerati.`
      : "Non ci sono ancora voti sufficienti per calcolare le medie per materia.";
  }

  const asksSubjectTrend =
    normalized.includes("sto migliorando") ||
    normalized.includes("sto peggiorando") ||
    normalized.includes("andamento") ||
    normalized.includes("trend");
  if (!subject && asksSubjectTrend && normalized.includes("materie")) {
    const comparisons = data.subjects
      .map((item) => ({ item, comparison: compareLatestGradeToPrevious(item) }))
      .filter(
        (
          entry,
        ): entry is {
          item: (typeof data.subjects)[number];
          comparison: NonNullable<ReturnType<typeof compareLatestGradeToPrevious>>;
        } => entry.comparison !== null,
      );
    if (!comparisons.length)
      return "Per confrontare l’andamento per materia servono almeno due voti datati in ciascuna. Al momento non ho dati sufficienti.";
    const describe = (entry: (typeof comparisons)[number]) =>
      `${entry.item.name} (${entry.comparison!.delta > 0 ? "+" : ""}${number(entry.comparison!.delta)})`;
    const improving = comparisons
      .filter(({ comparison }) => comparison.delta > 0.05)
      .sort((a, b) => b.comparison!.delta - a.comparison!.delta);
    const declining = comparisons
      .filter(({ comparison }) => comparison.delta < -0.05)
      .sort((a, b) => a.comparison!.delta - b.comparison!.delta);
    const stable = comparisons.filter(({ comparison }) => Math.abs(comparison.delta) <= 0.05);
    return [
      "Confronto tra l’ultimo voto e la media dei voti precedenti per materia:",
      improving.length
        ? `In crescita: ${improving.map(describe).join(", ")}.`
        : "Nessuna materia in crescita nei dati confrontabili.",
      declining.length
        ? `In calo: ${declining.map(describe).join(", ")}.`
        : "Nessuna materia in calo nei dati confrontabili.",
      stable.length ? `Stabili: ${stable.map(describe).join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const asksGradeList =
    (normalized.includes("voto") ||
      normalized.includes("voti") ||
      normalized.includes("valutazion")) &&
    [
      "quali",
      "elenc",
      "lista",
      "mostra",
      "tutti",
      "vedere",
      "novit",
      "aggiornament",
      "nuov",
      "recent",
    ].some((term) => normalized.includes(term));
  if (asksGradeList) {
    let grades = data.subjects.flatMap((item) =>
      item.grades.map((grade) => ({ subject: item, grade })),
    );
    if (subject) grades = grades.filter((entry) => entry.subject.id === subject.id);
    const typeTerms: Record<string, string[]> = {
      orale: ["oral"],
      scritto: ["scritt"],
      pratico: ["pratic"],
      altro: ["altro"],
    };
    const requestedType = Object.entries(typeTerms).find(([, terms]) =>
      terms.some((term) => normalized.includes(term)),
    )?.[0];
    if (requestedType) grades = grades.filter((entry) => entry.grade.type === requestedType);
    grades.sort((a, b) => b.grade.date.localeCompare(a.grade.date));
    if (!grades.length)
      return subject
        ? `Non risultano voti${requestedType ? ` di tipo ${requestedType}` : ""} in ${subject.name}.`
        : "Non risultano voti nei dati caricati.";
    const shown = grades.slice(0, 12).map(({ subject: item, grade }) => {
      const date = displayDate(grade.date);
      const weight = grade.weight !== 1 ? `, peso ${number(grade.weight)}` : "";
      const comment = grade.comment?.trim() ? ` — ${grade.comment.trim()}` : "";
      return `• ${item.name}: ${grade.label} (${grade.type}${date ? `, ${date}` : ""}${weight})${comment}`;
    });
    const remainder =
      grades.length > shown.length ? `\nE altri ${grades.length - shown.length} voti.` : "";
    return `Voti${subject ? ` in ${subject.name}` : " registrati"}${requestedType ? ` (${requestedType})` : ""}:\n${shown.join("\n")}${remainder}`;
  }

  if (
    !subject &&
    (normalized.includes("mio obiettivo") ||
      normalized.includes("mio target") ||
      normalized.includes("target impostato") ||
      normalized.includes("obiettivo impostato") ||
      normalized.includes("qual e il target") ||
      normalized.includes("qual e il mio obiettivo"))
  ) {
    return context.target === undefined
      ? "Non ho il valore dell’obiettivo in questa risposta. Puoi verificarlo nel modulo Obiettivo della Dashboard."
      : `L’obiettivo della media generale impostato nella Dashboard è ${number(context.target)} su 10. I calcoli dell’assistente sui voti necessari riguardano invece una singola materia.`;
  }

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

  const asksGradeColors =
    normalized.includes("colore") ||
    normalized.includes("colori") ||
    normalized.includes("verde") ||
    normalized.includes("arancion") ||
    normalized.includes("rosso");
  if (asksGradeColors) {
    if (subject) {
      const current = average(subject.grades);
      return `In ${subject.name} la media è ${current === null ? "—" : number(current)}: fascia ${gradeToneLabel(current)}.`;
    }
    return "La regola dei voti è: verde da 6 in su, arancione da 5 a 5,99, rosso sotto il 5. Le materie senza voti sono grigie.";
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

  if (asksSubjectTrend) {
    if (subject) {
      const comparison = compareLatestGradeToPrevious(subject);
      if (!comparison)
        return `In ${subject.name} non ho abbastanza voti datati per confrontare l’ultimo risultato con i precedenti.`;
      const date = displayDate(comparison.latest.date);
      const direction =
        Math.abs(comparison.delta) <= 0.05
          ? "in linea con"
          : comparison.delta > 0
            ? "sopra"
            : "sotto";
      const deltaText =
        Math.abs(comparison.delta) <= 0.05
          ? ""
          : ` (differenza ${comparison.delta > 0 ? "+" : ""}${number(comparison.delta)})`;
      return `L’ultimo voto in ${subject.name} è ${comparison.latest.label}${date ? ` del ${date}` : ""}: è ${direction} la media dei voti precedenti (${number(comparison.previousAverage)})${deltaText}. È un confronto descrittivo, non una previsione.`;
    }
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

  const mentionsAbsence =
    normalized.includes("assenza") ||
    normalized.includes("assenze") ||
    normalized.includes("assent");
  const additionalAbsenceHours = mentionsAbsence ? simulatedAbsenceHours(normalized) : null;
  if (additionalAbsenceHours !== null) {
    const plan = calculateAbsencePlan({
      absenceHours: data.attendance.absenceHours,
      absenceLimitHours: data.attendance.absenceLimitHours,
      annualHours: data.attendance.annualHours,
      simulatedHours: additionalAbsenceHours,
      hoursPerDay: context.absenceHoursPerDay ?? DEFAULT_ABSENCE_HOURS_PER_DAY,
    });
    if (!plan.hasConfiguredLimit)
      return `Con altre ${number(additionalAbsenceHours)} ore arriveresti a ${number(plan.simulatedTotalHours)} ore di assenza, ma nei dati caricati non è impostato un limite valido per valutare il risultato.`;
    if (plan.simulatedExceededHours > 0)
      return `Con altre ${number(additionalAbsenceHours)} ore arriveresti a ${number(plan.simulatedTotalHours)} ore di assenza: supereresti il limite di ${number(plan.simulatedExceededHours)} ore.`;
    if (plan.simulatedRemainingHours === 0)
      return `Con altre ${number(additionalAbsenceHours)} ore arriveresti esattamente al limite di ${number(plan.absenceLimitHours)} ore.`;
    const dayEstimate =
      plan.fullDaysAfterSimulation === null
        ? ""
        : ` Sono circa ${plan.fullDaysAfterSimulation} giornate intere residue, calcolate usando ${number(plan.hoursPerDay)} ore per giornata.`;
    return `Con altre ${number(additionalAbsenceHours)} ore arriveresti a ${number(plan.simulatedTotalHours)} ore: resterebbero ${number(plan.simulatedRemainingHours)} ore prima del limite.${dayEstimate}`;
  }

  const asksForEventDates =
    normalized.includes("quali") ||
    normalized.includes("quando") ||
    normalized.includes("giorni") ||
    normalized.includes("date");
  const asksForAllEvents =
    normalized.includes("tutti gli eventi") ||
    normalized.includes("eventi appello") ||
    normalized.includes("eventi di appello");
  if (asksForAllEvents) {
    return "Puoi vedere assenze, ritardi e uscite nella schermata personalizzata Altro > Assenze > Tutti gli eventi, con filtri separati e gli stati di giustificazione.";
  }
  if (mentionsAbsence && asksForEventDates) {
    const absenceEvents = (data.attendanceEvents ?? [])
      .filter((event) => event.type === "absence")
      .sort((a, b) => b.date.localeCompare(a.date));
    if (absenceEvents.length === 0) {
      return "Nei dati sincronizzati non sono presenti le date dettagliate delle assenze. Puoi comunque vedere il totale nella sezione Altro > Assenze.";
    }
    const dates = absenceEvents
      .map((event) => displayDate(event.date))
      .filter((date): date is string => date !== null);
    return `Le tue assenze registrate sono: ${dates.join(", ")}. Per vedere anche ritardi, uscite e giustificazioni apri Altro > Assenze > Tutti gli eventi.`;
  }
  const asksForDelayDates =
    (normalized.includes("ritardo") || normalized.includes("ritardi")) && asksForEventDates;
  if (asksForDelayDates) {
    const delayEvents = (data.attendanceEvents ?? [])
      .filter((event) => event.type === "delay")
      .sort((a, b) => b.date.localeCompare(a.date));
    if (delayEvents.length === 0) {
      return "Nei dati sincronizzati non sono presenti le date dettagliate dei ritardi. Il conteggio disponibile è quello riportato nella sezione Presenze.";
    }
    const dates = delayEvents
      .map((event) => displayDate(event.date))
      .filter((date): date is string => date !== null);
    return `I ritardi registrati risultano nelle date: ${dates.join(", ")}. Puoi controllare tutti gli eventi da Altro > Assenze > Tutti gli eventi.`;
  }

  const asksForRemainingAbsence = [
    "limite",
    "ancora",
    "manca",
    "restan",
    "posso fare",
    "posso assentarmi",
    "posso permettermi",
  ].some((term) => normalized.includes(term));
  if (mentionsAbsence && asksForRemainingAbsence) {
    const plan = calculateAbsencePlan({
      absenceHours: data.attendance.absenceHours,
      absenceLimitHours: data.attendance.absenceLimitHours,
      annualHours: data.attendance.annualHours,
      simulatedHours: 0,
      hoursPerDay: context.absenceHoursPerDay ?? DEFAULT_ABSENCE_HOURS_PER_DAY,
    });
    if (!plan.hasConfiguredLimit)
      return `Nei dati caricati risultano ${number(plan.absenceHours)} ore di assenza, ma non è impostato un limite valido per calcolare quanto margine resta.`;
    if (plan.exceededHours > 0)
      return `Hai ${number(plan.absenceHours)} ore di assenza e hai già superato il limite di ${number(plan.absenceLimitHours)} ore di ${number(plan.exceededHours)} ore.`;
    if (plan.remainingHours === 0)
      return `Hai raggiunto il limite di ${number(plan.absenceLimitHours)} ore di assenza.`;
    const dayEstimate =
      normalized.includes("giorn") && plan.fullDaysRemaining !== null
        ? ` A ${number(plan.hoursPerDay)} ore per giornata, equivalgono a circa ${plan.fullDaysRemaining} giornate intere.`
        : "";
    return `Hai ${number(plan.absenceHours)} ore di assenza su ${number(plan.absenceLimitHours)}: ti restano ${number(plan.remainingHours)} ore prima del limite.${dayEstimate}`;
  }

  if (
    normalized.includes("uscit") &&
    (normalized.includes("anticip") || normalized.includes("uscite"))
  ) {
    const count = data.attendance.earlyExits;
    return `Nei dati caricati risult${count === 1 ? "a" : "ano"} ${count} ${count === 1 ? "uscita anticipata" : "uscite anticipate"}.`;
  }

  if (
    normalized.includes("assenza") ||
    normalized.includes("assenze") ||
    normalized.includes("ritardo") ||
    normalized.includes("ritardi")
  ) {
    const { attendance } = data;
    const plan = calculateAbsencePlan({
      absenceHours: attendance.absenceHours,
      absenceLimitHours: attendance.absenceLimitHours,
      annualHours: attendance.annualHours,
      simulatedHours: 0,
      hoursPerDay: context.absenceHoursPerDay ?? DEFAULT_ABSENCE_HOURS_PER_DAY,
    });
    const daysLabel = attendance.absenceDays === 1 ? "giorno" : "giorni";
    const delaysLabel = attendance.delays === 1 ? "ritardo" : "ritardi";
    const limitSummary = plan.hasConfiguredLimit
      ? `Il limite impostato è ${number(plan.absenceLimitHours)} ore.`
      : "Nei dati caricati non è impostato un limite valido per le assenze.";
    return `Hai ${attendance.absenceDays} ${daysLabel} e ${number(plan.absenceHours)} ore di assenza, con ${attendance.delays} ${delaysLabel}. ${limitSummary}`;
  }

  const asksCompletedAssignments =
    normalized.includes("completat") ||
    normalized.includes("svolti") ||
    normalized.includes("finiti") ||
    normalized.includes("fatti");
  if (
    (normalized.includes("compit") || normalized.includes("scadenz")) &&
    (asksCompletedAssignments || subject)
  ) {
    let matches = data.assignments.filter((item) =>
      asksCompletedAssignments ? item.completed : !item.completed,
    );
    if (subject)
      matches = matches.filter((item) =>
        normalize(item.subject ?? "").includes(normalize(subject.name)),
      );
    const requestedDay = relativeDayOffset(normalized);
    if (requestedDay !== null)
      matches = matches.filter((item) => daysUntil(item.dueDate, now) === requestedDay);
    matches.sort((a, b) => {
      const first = daysUntil(a.dueDate, now);
      const second = daysUntil(b.dueDate, now);
      if (first === null) return second === null ? a.title.localeCompare(b.title) : 1;
      if (second === null) return -1;
      return first - second || (a.dueTime ?? "").localeCompare(b.dueTime ?? "");
    });
    if (!matches.length) {
      const state = asksCompletedAssignments ? "completati" : "aperti";
      const scope = subject ? ` di ${subject.name}` : "";
      return `Non risultano compiti ${state}${scope}${requestedDay === null ? "" : ` per ${relativeDayLabel(requestedDay)}`} nei dati caricati.`;
    }
    const shown = matches.slice(0, 8).map((item) => {
      const dueDate = displayDate(item.dueDate);
      const due = dueDate ? `, ${dueDate}${item.dueTime ? ` alle ${item.dueTime}` : ""}` : "";
      const itemSubject = item.subject ? ` — ${item.subject}` : "";
      const details = item.details?.trim() ? `: ${item.details.trim()}` : "";
      return `• ${item.title}${itemSubject}${due}${details}`;
    });
    const remainder =
      matches.length > shown.length ? `\nE altri ${matches.length - shown.length}.` : "";
    const heading = asksCompletedAssignments ? "Compiti completati" : "Compiti aperti";
    return `${heading}${subject ? ` di ${subject.name}` : ""}:\n${shown.join("\n")}${remainder}`;
  }

  if (normalized.includes("compiti") || normalized.includes("scadenze")) {
    const open = data.assignments.filter((assignment) => !assignment.completed);
    if (!open.length) return "Non risultano compiti ancora da completare.";

    const requestedDay = relativeDayOffset(normalized);
    if (requestedDay !== null) {
      const due = open.filter((assignment) => daysUntil(assignment.dueDate, now) === requestedDay);
      return due.length
        ? `Hai ${due.length} ${due.length === 1 ? "compito" : "compiti"} in scadenza ${relativeDayLabel(requestedDay)}: ${due.map((item) => item.title).join(", ")}.`
        : `Non hai compiti aperti in scadenza ${relativeDayLabel(requestedDay)}.`;
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

  if (normalized.includes("diario") || normalized.includes("attivita")) {
    const latest = [...data.diary].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    return latest.length
      ? latest
          .map((entry) => `${entry.date} — ${entry.subject || "Attività"}: ${entry.activity}`)
          .join("\n")
      : "Non ci sono ancora attività nel Diario.";
  }

  if (
    [
      "voto",
      "voti",
      "compito",
      "compiti",
      "circolare",
      "circolari",
      "promemoria",
      "diario",
      "interrogazione",
      "interrogazioni",
      "materia",
      "docente",
    ].some((term) => normalized.includes(term))
  ) {
    return "Riconosco l’argomento, ma non la forma della richiesta. Prova per esempio “cerca algebra”, “quali compiti ho?” oppure “qual è l’ultimo voto?”. Non ho modificato nessun dato.";
  }

  return "Non ho capito la domanda. Prova a riformularla o scegli uno dei suggerimenti qui sotto.";
}
