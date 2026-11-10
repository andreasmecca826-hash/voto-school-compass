import { askAboutCircular } from "./circular-assistant";
import { answerCircularQuestionLocally } from "./circular-local-answer";
import { extractCircularDocxText, extractCircularPdfText } from "./circular-reader";
import type { AppNotification } from "./types";

export type CircularAssistantMode = "local" | "api";

const MAX_API_DOCUMENT_LENGTH = 60_000;
const CIRCULAR_TERMS = /\b(?:circolar\w*|avvis\w*|bachec\w*)\b/;
const RECENT_TERMS = /\b(?:ultim\w*|recent\w*|nuov\w*)\b/;
const CONTENT_TERMS =
  /\b(?:cosa dice|di cosa parla|contenut\w*|riassum\w*|spieg\w*|scad\w*|termin\w*|entro|quando|ora|chi deve|a chi|destinatar\w*|rivolt\w*|cosa devo|azioni|obblig\w*|partecip\w*|parl\w*|serve\w*)/;
const SKIP_COMMAND = /^\s*(?:cerca(?:re)?|trova(?:re)?|ricerca(?:\s+rapida)?)\b/i;
const FOLLOW_UP_TERMS =
  /^(?:quando|dove|chi|a chi|e\s+(?:quando|dove|chi)|quale|quali|perche|perché|e poi|cosa succede)\??\s*$/i;
const COMPARE_TERMS =
  /\b(?:confronta|confrontare|differenze|differenza|cambiato|cambiate|rispetto)\b/i;

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function dateRank(value?: string): number {
  const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const italian = value?.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (italian) return Date.UTC(Number(italian[3]), Number(italian[2]) - 1, Number(italian[1]));
  return 0;
}

function dateLabel(value?: string): string {
  const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const italian = value?.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (italian) {
    const [, day, month, year] = italian;
    return `${day?.padStart(2, "0") ?? "00"}/${month?.padStart(2, "0") ?? "00"}/${year ?? "0000"}`;
  }
  return value?.trim() || "data non indicata";
}

function latestNotices(notifications: AppNotification[]): AppNotification[] {
  return notifications
    .filter((item) => item.type === "notice")
    .sort((left, right) => dateRank(right.date) - dateRank(left.date));
}

export function isCircularChatQuestion(question: string): boolean {
  const normalized = normalize(question);
  if (!CIRCULAR_TERMS.test(normalized) || SKIP_COMMAND.test(question)) return false;
  return RECENT_TERMS.test(normalized) || CONTENT_TERMS.test(normalized);
}

export function isCircularFollowUpQuestion(question: string, previousQuestion?: string): boolean {
  return Boolean(
    previousQuestion &&
    FOLLOW_UP_TERMS.test(question.trim()) &&
    isCircularChatQuestion(previousQuestion),
  );
}

function asksForCircularList(question: string): boolean {
  const normalized = normalize(question);
  const asksList = /\b(?:quali|lista|elenco|ultim\w*|recent\w*|mostra)\b/.test(normalized);
  return asksList && !CONTENT_TERMS.test(normalized);
}

function formatCircularList(notices: AppNotification[]): string {
  const recent = notices.slice(0, 3);
  if (recent.length === 0) {
    return "Non trovo circolari nei dati locali. Aggiorna i dati o controlla la Bacheca.";
  }
  return `Le circolari più recenti caricate nell’app sono:\n${recent
    .map((notice) => {
      const attachments = [
        notice.attachmentName,
        ...(notice.attachments ?? []).map((item) => item.name),
      ]
        .filter(Boolean)
        .join(", ");
      return `• ${dateLabel(notice.date)} — ${notice.title}${attachments ? ` (allegati: ${attachments})` : ""}`;
    })
    .join("\n")}`;
}

function asksForCircularComparison(question: string): boolean {
  return COMPARE_TERMS.test(normalize(question));
}

function normalizeComparisonLine(line: string): string {
  return line
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chooseNotice(question: string, notices: AppNotification[]): AppNotification | undefined {
  if (RECENT_TERMS.test(normalize(question))) return notices[0];
  const ignored = new Set([
    "circolare",
    "circolari",
    "avviso",
    "avvisi",
    "bacheca",
    "cosa",
    "dice",
    "parla",
    "quando",
    "entro",
    "scadenza",
    "contenuto",
    "riassunto",
    "riassumi",
    "ultima",
    "ultime",
    "ultimo",
    "ultimi",
    "della",
    "delle",
    "dell",
    "qual",
    "quale",
    "spiega",
    "dimmi",
  ]);
  const terms = [...new Set(normalize(question).match(/[\p{L}\p{N}]+/gu) ?? [])].filter(
    (term) => term.length >= 3 && !ignored.has(term),
  );
  if (terms.length === 0) return notices[0];

  const ranked = notices
    .map((notice) => {
      const searchable = normalize(
        [notice.title, notice.message, notice.extractedText, notice.subject, notice.attachmentName]
          .filter(Boolean)
          .join(" "),
      );
      return { notice, score: terms.filter((term) => searchable.includes(term)).length };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);
  return ranked[0]?.notice ?? notices[0];
}

function attachmentPath(notice: AppNotification): string | undefined {
  const paths = [notice.attachmentPath, ...(notice.attachments ?? []).map((item) => item.path)];
  return paths.find(
    (path) => typeof path === "string" && /^circulars\/[a-f0-9]{64}\.(?:pdf|docx)$/i.test(path),
  );
}

function internalAttachmentUrl(path: string): string {
  return `/api/circulars/mirror?${new URLSearchParams({ path }).toString()}`;
}

async function readNoticeText(
  notice: AppNotification,
): Promise<{ text: string; truncated: boolean }> {
  const extractedText = notice.extractedText?.trim();
  if (extractedText) return { text: extractedText, truncated: false };
  const path = attachmentPath(notice);
  if (path) {
    const url = internalAttachmentUrl(path);
    const document = path.toLowerCase().endsWith(".docx")
      ? await extractCircularDocxText(url)
      : await extractCircularPdfText(url);
    return { text: document.text.trim(), truncated: document.truncated };
  }
  return { text: notice.message?.trim() ?? "", truncated: false };
}

export async function answerCircularChatQuestion(
  question: string,
  notifications: AppNotification[],
  mode: CircularAssistantMode,
  previousQuestion?: string,
): Promise<string | null> {
  const isFollowUp = isCircularFollowUpQuestion(question, previousQuestion);
  if (!isCircularChatQuestion(question) && !isFollowUp) return null;
  const effectiveQuestion = isFollowUp ? `${previousQuestion} ${question}` : question;
  const notices = latestNotices(notifications);
  if (notices.length === 0) {
    return "Non trovo circolari caricate nei dati locali. Aggiorna la Bacheca e riprova.";
  }

  if (asksForCircularComparison(effectiveQuestion)) {
    if (notices.length < 2) return "Mi servono almeno due circolari locali per fare un confronto.";
    try {
      const [newer, older] = notices;
      if (!newer || !older) return "Mi servono almeno due circolari locali per fare un confronto.";
      const [newerDocument, olderDocument] = await Promise.all([
        readNoticeText(newer),
        readNoticeText(older),
      ]);
      const olderLines = new Set(
        olderDocument.text
          .split(/\r?\n/)
          .map(normalizeComparisonLine)
          .filter((line) => line.length >= 18),
      );
      const changes = newerDocument.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 18 && !olderLines.has(normalizeComparisonLine(line)))
        .slice(0, 6);
      return `Confronto locale:\n• Più recente: ${newer.title}\n• Precedente: ${older.title}\n\n${changes.length ? `Elementi presenti nella più recente e non trovati nella precedente:\n${changes.map((line) => `• ${line}`).join("\n")}` : "Non ho trovato differenze testuali evidenti nelle parti estratte."}`;
    } catch {
      return "Non riesco a leggere localmente entrambe le circolari per confrontarle.";
    }
  }

  if (asksForCircularList(effectiveQuestion)) return formatCircularList(notices);

  const notice = chooseNotice(effectiveQuestion, notices);
  if (!notice) return "Non trovo la circolare richiesta nei dati locali.";

  let document: { text: string; truncated: boolean };
  try {
    document = await readNoticeText(notice);
  } catch {
    return `Non riesco a leggere localmente l’allegato di “${notice.title}”. Apri la circolare in Bacheca e riprova.`;
  }

  if (!document.text) {
    return `La circolare più recente è “${notice.title}” (${dateLabel(notice.date)}), ma non trovo testo o allegato leggibile nei dati locali. Aprila dalla Bacheca.`;
  }

  const clippedText = document.text.slice(0, MAX_API_DOCUMENT_LENGTH);
  const prefix = `Circolare: ${notice.title} (${dateLabel(notice.date)}).\n\n`;
  if (mode === "api") {
    const answer = await askAboutCircular({
      question: effectiveQuestion,
      documentText: clippedText,
      documentTruncated: document.truncated || document.text.length > MAX_API_DOCUMENT_LENGTH,
    });
    return `${prefix}${answer}`;
  }

  const answer = answerCircularQuestionLocally(effectiveQuestion, document.text);
  const truncatedNotice = document.truncated
    ? "\n\nNota: il documento è lungo; ho analizzato solo la parte estratta disponibile."
    : "";
  return `${prefix}${answer}${truncatedNotice}`;
}
