import { analyzeCircularText } from "./circular-reader";

const STOP_WORDS = new Set([
  "a",
  "ad",
  "al",
  "alla",
  "alle",
  "allo",
  "ai",
  "agli",
  "che",
  "chi",
  "cosa",
  "dice",
  "dici",
  "devo",
  "come",
  "con",
  "da",
  "dal",
  "dalla",
  "dalle",
  "de",
  "dei",
  "del",
  "della",
  "delle",
  "di",
  "dove",
  "e",
  "gli",
  "i",
  "il",
  "in",
  "la",
  "le",
  "lo",
  "ma",
  "mi",
  "ne",
  "nel",
  "nella",
  "nelle",
  "o",
  "per",
  "perche",
  "puoi",
  "si",
  "sul",
  "sulla",
  "sulle",
  "un",
  "una",
  "uno",
  "va",
  "quando",
  "fare",
  "circolare",
  "circolari",
  "avviso",
  "avvisi",
  "ultima",
  "ultime",
  "ultimo",
  "ultimi",
  "recente",
  "recenti",
  "parla",
  "parlami",
  "fammi",
  "riassumi",
  "riassumere",
  "riassunto",
  "dimmi",
  "spiega",
  "spiegami",
  "spiegare",
  "destinatari",
  "destinatario",
  "destinataria",
  "destinatarie",
  "rivolta",
  "rivolto",
  "quale",
  "quali",
]);

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function terms(value: string): string[] {
  return [
    ...new Set(
      normalize(value)
        .split(/\s+/)
        .filter((word) => word.length >= 3),
    ),
  ].filter((word) => !STOP_WORDS.has(word));
}

function relatedTerm(left: string, right: string): boolean {
  if (left === right) return true;
  return left.length >= 6 && right.length >= 6 && left.slice(0, 6) === right.slice(0, 6);
}

function isDateQuestion(question: string): boolean {
  return /\b(quando|data|scad\w*|termine|entro|giorno|orario|ora)\b/i.test(normalize(question));
}

function containsDate(value: string): boolean {
  return /\b\d{1,2}[/.]\d{1,2}[/.](?:\d{2}|\d{4})\b|\b\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}\b/i.test(
    value,
  );
}

interface Passage {
  text: string;
  page?: string;
  score: number;
}

export function answerCircularQuestionLocally(question: string, documentText: string): string {
  const questionTerms = terms(question);
  if (questionTerms.length === 0) {
    const analysis = analyzeCircularText(documentText);
    const details = [
      analysis.summary ? `Sintesi estratta: ${analysis.summary}` : "",
      analysis.deadlines.length
        ? `Scadenze individuate: ${analysis.deadlines.map(({ value }) => value).join(", ")}.`
        : "",
      analysis.recipients.length
        ? `Destinatari individuati: ${analysis.recipients.join(", ")}.`
        : "",
      analysis.actions.length ? `Indicazioni: ${analysis.actions.join(" ")}` : "",
    ].filter(Boolean);
    if (details.length === 0) {
      const excerpt = documentText
        .replace(/^\[Pagina\s+\d+\]\s*$/gim, "")
        .split(/(?<=[.!?])\s+|\n+/)
        .map((sentence) => sentence.trim())
        .find((sentence) => sentence.length >= 24);
      if (excerpt) details.push(`Estratto del documento: ${excerpt.slice(0, 560)}`);
    }
    return details.length
      ? `Modalità locale: sintesi ed elementi estratti sul dispositivo, non una risposta generata.\n\n${details.join("\n")}`
      : "Non riesco a ricavare una sintesi locale da questa circolare. Prova con una parola chiave presente nel documento.";
  }

  const wantsDate = isDateQuestion(question);
  const passages: Passage[] = [];
  let currentPage: string | undefined;

  for (const rawLine of documentText.split(/\r?\n/)) {
    const pageMatch = rawLine.trim().match(/^\[Pagina\s+(\d+)\]$/i);
    if (pageMatch?.[1]) {
      currentPage = pageMatch[1];
      continue;
    }

    const sentences = rawLine.split(/(?<=[.!?;])\s+/);
    for (const rawSentence of sentences) {
      const sentence = rawSentence.trim().replace(/^[•*–-]\s*/, "");
      if (sentence.length < 18) continue;

      const sentenceTerms = terms(sentence);
      const matchedTerms = questionTerms.filter((questionTerm) =>
        sentenceTerms.some((sentenceTerm) => relatedTerm(questionTerm, sentenceTerm)),
      );
      let score = matchedTerms.length;
      if (wantsDate && containsDate(sentence)) score += 2;
      if (score > 0) {
        passages.push({
          text: sentence.slice(0, 560),
          ...(currentPage ? { page: currentPage } : {}),
          score,
        });
      }
    }
  }

  const uniquePassages = [...new Map(passages.map((passage) => [passage.text, passage])).values()];
  const selected = uniquePassages.sort((left, right) => right.score - left.score).slice(0, 3);
  if (selected.length === 0) {
    return "Non trovo un passaggio chiaramente collegato. Prova con parole presenti nella circolare oppure scegli la modalità API per una risposta generativa.";
  }

  const excerpts = selected.map(({ page, text }) => `${page ? `[Pagina ${page}] ` : ""}${text}`);
  return `Modalità locale: passaggi pertinenti trovati nel documento (non è una risposta generata).\n\n${excerpts.join("\n\n")}`;
}
