export interface CircularDateMention {
  value: string;
  context: string;
}

export interface CircularAnalysis {
  summary: string | null;
  dates: CircularDateMention[];
  recipients: string[];
  attachments: string[];
  layout: "text" | "table" | "timetable";
  pagesAnalyzed: number;
  truncated: boolean;
}

interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
}

const MONTHS = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
].join("|");

const DATE_PATTERN = new RegExp(
  String.raw`\b(?:\d{1,2}[/.]\d{1,2}[/.](?:\d{2}|\d{4})|\d{1,2}\s+(?:${MONTHS})\s+\d{4}|(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\s+\d{1,2}\s+(?:${MONTHS})\s+\d{4})\b`,
  "giu",
);

const RECIPIENT_HEADING =
  /^(?:destinatari?|rivolta\s+a|rivolto\s+a|alla\s+c\.\s*a\.?)\s*:?\s*(.*)$/i;
const DIRECT_RECIPIENT =
  /^(?:ai\s+(?:genitori|docenti|docenti\s+e\s+genitori|coordinatori|studenti|rappresentanti)\b|alle\s+(?:famiglie|classi|studentesse|studenti|docenti)\b|a\s+tutti\s+(?:i\s+)?(?:docenti|genitori|studenti|classi)\b)/i;
const MAX_PAGES = 80;
const MAX_TEXT_LENGTH = 300_000;

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractSummary(text: string): string | null {
  const timetableTitle = text
    .split("\n")
    .map(clean)
    .find(
      (line) => /\borario\b/i.test(line) && /\b(?:provvisorio|definitivo|scolastico)\b/i.test(line),
    );
  if (timetableTitle) return timetableTitle.slice(0, 420);

  const paragraphs = text
    .split(/\n{2,}/)
    .map(clean)
    .filter((paragraph) => paragraph.length >= 55)
    .filter((paragraph) => !/^https?:\/\//i.test(paragraph));
  const candidate = paragraphs[0];
  if (!candidate) return null;
  const sentences = candidate.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [candidate];
  let summary = "";
  for (const sentence of sentences) {
    const next = clean(`${summary} ${sentence}`);
    if (next.length > 420 && summary.length > 0) break;
    summary = next;
    if (summary.length >= 260) break;
  }
  return summary.slice(0, 420).trim() || null;
}

function extractRecipients(text: string): string[] {
  const lines = text.split("\n").map(clean).filter(Boolean);
  const recipients = new Set<string>();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const heading = line.match(RECIPIENT_HEADING);
    if (heading) {
      const inline = clean(heading[1] ?? "");
      if (inline.length >= 3) recipients.add(inline.slice(0, 180));
      else {
        const nextLine = lines[index + 1];
        if (nextLine && nextLine.length <= 180) recipients.add(nextLine);
      }
      continue;
    }
    if (DIRECT_RECIPIENT.test(line)) recipients.add(line.slice(0, 180));
  }
  return [...recipients].slice(0, 8);
}

function extractDates(text: string): CircularDateMention[] {
  const found = new Map<string, CircularDateMention>();
  for (const match of text.matchAll(DATE_PATTERN)) {
    const value = clean(match[0] ?? "");
    if (!value) continue;
    const index = match.index ?? 0;
    const nearby = text.slice(
      Math.max(0, index - 65),
      Math.min(text.length, index + value.length + 65),
    );
    const context = clean(nearby).slice(0, 150);
    const key = value.toLocaleLowerCase("it-IT");
    if (!found.has(key)) found.set(key, { value, context });
    if (found.size >= 20) break;
  }
  return [...found.values()];
}

function extractAttachmentMentions(text: string): string[] {
  const mentions = new Set<string>();
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*(?:allegati?|documenti\s+allegati)\s*[:\-]\s*(.+)$/i);
    if (!match?.[1]) continue;
    for (const value of match[1].split(/[,;•]/).map(clean)) {
      if (value.length >= 3 && value.length <= 140) mentions.add(value);
    }
  }
  return [...mentions];
}

export function analyzeCircularText(
  text: string,
  attachments: string[] = [],
  pagesAnalyzed = 0,
  truncated = false,
): CircularAnalysis {
  const normalized = text.replace(/\r\n?/g, "\n");
  const dayNames = normalized.toLocaleLowerCase("it-IT");
  const isTimetable =
    (dayNames.includes("lunedì") || dayNames.includes("lunedi")) &&
    (dayNames.includes("martedì") || dayNames.includes("martedi")) &&
    (dayNames.includes("mercoledì") || dayNames.includes("mercoledi"));
  const hasTableRows =
    normalized.split("\n").filter((line) => line.trim().length > 0 && /\S\s{3,}\S/.test(line))
      .length >= 3;
  return {
    summary: isTimetable
      ? extractSummary(normalized)
      : hasTableRows
        ? null
        : extractSummary(normalized),
    dates: extractDates(normalized),
    recipients: extractRecipients(normalized),
    attachments: [
      ...new Set(
        [...attachments, ...extractAttachmentMentions(normalized)].map(clean).filter(Boolean),
      ),
    ],
    layout: isTimetable ? "timetable" : hasTableRows ? "table" : "text",
    pagesAnalyzed,
    truncated,
  };
}

export function reconstructPositionedText(items: PositionedTextItem[]): string {
  const rows: Array<{ y: number; items: PositionedTextItem[] }> = [];
  for (const item of items) {
    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .map(({ items: rowItems }) => {
      const sorted = rowItems.sort((left, right) => left.x - right.x);
      let line = "";
      let endX: number | undefined;
      for (const item of sorted) {
        const fontSize = Math.max(item.fontSize, 1);
        const spaceWidth = Math.max(fontSize * 0.34, 2.2);
        const gapSpaces =
          endX === undefined
            ? 0
            : Math.min(100, Math.max(1, Math.round((item.x - endX) / spaceWidth)));
        const content = item.str.trim();
        if (!content) continue;
        line += `${" ".repeat(gapSpaces)}${content}`;
        endX = item.x + item.width;
      }
      return line.trimEnd();
    })
    .filter(Boolean)
    .join("\n");
}

export async function analyzeCircularPdf(
  src: string,
  attachments: string[] = [],
): Promise<CircularAnalysis> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const loadingTask = pdfjs.getDocument({ url: src, withCredentials: true });
  try {
    const pdf = await loadingTask.promise;
    const pagesToRead = Math.min(pdf.numPages, MAX_PAGES);
    const textParts: string[] = [];
    let textLength = 0;
    let pagesAnalyzed = 0;
    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = reconstructPositionedText(
        content.items.flatMap((item) => {
          if (!("str" in item) || !item.str.trim()) return [];
          const [scaleX, , , scaleY, x, y] = item.transform;
          return [
            {
              str: item.str,
              x,
              y,
              width: item.width,
              fontSize: Math.max(Math.abs(scaleX), Math.abs(scaleY)),
            },
          ];
        }),
      );
      textParts.push(pageText);
      textLength += pageText.length;
      pagesAnalyzed += 1;
      if (textLength >= MAX_TEXT_LENGTH) break;
    }
    const truncated = pdf.numPages > pagesToRead || textLength >= MAX_TEXT_LENGTH;
    return analyzeCircularText(textParts.join("\n\n"), attachments, pagesAnalyzed, truncated);
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}
