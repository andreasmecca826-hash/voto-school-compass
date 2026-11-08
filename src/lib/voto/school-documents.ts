import type { CircularAssistantMode } from "./circular-assistant-chat";
import { askWithDocument } from "./circular-assistant";

export interface OfficialSchoolSource {
  title: string;
  url: string;
  page: number | null;
}

export interface OfficialSchoolAnswer {
  text: string;
  sources: OfficialSchoolSource[];
}

interface RegulationPage {
  page: number;
  text: string;
}

interface RegulationExcerpt {
  page: number;
  text: string;
}

interface RegulationData {
  title: string;
  academicYear: string;
  sourceUrl: string;
  pages: RegulationPage[];
}

const SCHOOL_POLICY_TERMS =
  /\b(?:fum\w*|sigarett\w*|svap\w*|vape\w*|smok\w*|regol\w*|regole|sanzion\w*|disciplin\w*|diviet\w*|infrazion\w*|sospension\w*|cellular\w*|telefon\w*|ritard\w*|assenze?|giustific\w*|uscit\w*|entrate?|permess\w*|comportament\w*|condotta|intervall\w*|ricreazion\w*|espulsion\w*)\b/i;

const STOP_WORDS = new Set([
  "accade",
  "al",
  "alla",
  "alle",
  "allo",
  "anche",
  "che",
  "chi",
  "come",
  "con",
  "cosa",
  "da",
  "dal",
  "dalla",
  "dalle",
  "dello",
  "della",
  "delle",
  "dei",
  "del",
  "di",
  "dopo",
  "e",
  "gli",
  "ha",
  "i",
  "il",
  "in",
  "io",
  "la",
  "le",
  "lo",
  "ma",
  "mi",
  "mio",
  "mia",
  "nei",
  "nel",
  "nella",
  "nelle",
  "o",
  "per",
  "puo",
  "se",
  "si",
  "sono",
  "succede",
  "tra",
  "un",
  "una",
  "uno",
  "voi",
  "viene",
]);

const ITALIAN_SUFFIXES = [
  "azioni",
  "azione",
  "amenti",
  "amento",
  "mente",
  "ando",
  "endo",
  "enze",
  "enza",
  "zioni",
  "zione",
  "ati",
  "ate",
  "ato",
  "ata",
  "uti",
  "ute",
  "uto",
  "uta",
  "are",
  "ere",
  "ire",
  "i",
  "o",
  "a",
  "e",
];

const HIGH_SIGNAL_TERMS = new Set([
  "fum",
  "sigarett",
  "svap",
  "vape",
  "smok",
  "sanzion",
  "disciplin",
  "diviet",
  "infrazion",
  "sospension",
  "cellular",
  "telefon",
]);

export function isSchoolPolicyQuestion(question: string): boolean {
  return SCHOOL_POLICY_TERMS.test(question);
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function stem(word: string): string {
  for (const suffix of ITALIAN_SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

function keywords(value: string): string[] {
  return (normalize(value).match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .map(stem)
    .filter((word) => word.length >= 3);
}

let regulationPromise: Promise<RegulationData> | undefined;

function loadRegulation(): Promise<RegulationData> {
  regulationPromise ??= import("./morselli-regulation-data.json?raw")
    .then(({ default: rawJson }) => JSON.parse(rawJson) as RegulationData)
    .catch((error: unknown) => {
      regulationPromise = undefined;
      throw error;
    });
  return regulationPromise;
}

function extractExcerpts(page: RegulationPage): RegulationExcerpt[] {
  const blocks = page.text
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
  const excerpts: RegulationExcerpt[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (!block) continue;
    const isArticleHeading = /^ART(?:ICOLO)?\.?\s*\d+/i.test(block);
    const body = isArticleHeading ? blocks[index + 1] : undefined;
    if (body) index += 1;

    excerpts.push({
      page: page.page,
      text: [block, body]
        .filter(Boolean)
        .join("\n")
        .replace(/\n[ \t]*/g, " ")
        .replace(/[ \t]{2,}/g, " "),
    });
  }

  return excerpts;
}

function retrieveRelevantExcerpts(
  question: string,
  regulation: RegulationData,
): {
  regulation: RegulationData;
  excerpts: RegulationExcerpt[];
} | null {
  const queryTerms = [...new Set(keywords(question))];
  if (queryTerms.length === 0) return null;

  const ranked = regulation.pages
    .flatMap(extractExcerpts)
    .map((excerpt) => {
      const termCounts = new Map<string, number>();
      for (const term of keywords(excerpt.text)) {
        termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
      }
      const score = queryTerms.reduce((total, term) => {
        const count = termCounts.get(term) ?? 0;
        const weight = HIGH_SIGNAL_TERMS.has(term) ? 4 : 1;
        return total + weight * Math.min(count, 3);
      }, 0);
      return { excerpt, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.excerpt.page - right.excerpt.page)
    .slice(0, 3);

  if (ranked.length === 0) return null;
  const minimumScore = Math.max(1, Math.ceil(ranked[0]!.score * 0.5));
  const selectedExcerpts = ranked
    .filter(({ score }) => score >= minimumScore)
    .map(({ excerpt }) => excerpt);
  return { regulation, excerpts: selectedExcerpts };
}

function fallbackAnswer(regulation: RegulationData): OfficialSchoolAnswer {
  return {
    text: `Non trovo un passaggio pertinente nel regolamento pubblico dell’Istituto per questa domanda. Non voglio inventare una regola o una sanzione: verifica il documento ufficiale o una circolare aggiornata.`,
    sources: [{ title: regulation.title, url: regulation.sourceUrl, page: null }],
  };
}

export async function answerSchoolPolicyQuestion(
  question: string,
  mode: CircularAssistantMode,
): Promise<OfficialSchoolAnswer> {
  const regulation = await loadRegulation();
  const relevant = retrieveRelevantExcerpts(question, regulation);
  if (!relevant) return fallbackAnswer(regulation);

  const sourcePages = [...new Set(relevant.excerpts.map((excerpt) => excerpt.page))];
  const sources = sourcePages.map((page) => ({
    title: relevant.regulation.title,
    url: relevant.regulation.sourceUrl,
    page,
  }));
  const documentText = relevant.excerpts
    .map(
      (excerpt) =>
        `[Fonte ufficiale: ${relevant.regulation.title}; pagina ${excerpt.page}]\n${excerpt.text}`,
    )
    .join("\n\n---\n\n");

  if (mode === "local") {
    return {
      text: `Ho trovato questi passaggi nel regolamento ufficiale (A.S. ${relevant.regulation.academicYear}):\n\n${relevant.excerpts
        .map((excerpt) => `Pagina ${excerpt.page}:\n${excerpt.text}`)
        .join("\n\n")}`,
      sources,
    };
  }

  const answer = await askWithDocument({ question, documentText, documentTruncated: false });
  return { text: answer, sources };
}
