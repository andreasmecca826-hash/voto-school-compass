import type { CircularAssistantMode } from "./circular-assistant-chat";
import { askWithDocument } from "./circular-assistant";

export interface SchoolDocumentSource {
  title: string;
  url?: string;
  page: number | null;
  sourceKind: "official" | "user-provided";
}

export interface SchoolPolicyAnswer {
  text: string;
  sources: SchoolDocumentSource[];
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
  academicYear?: string;
  sourceUrl?: string;
  sourceKind?: "official" | "user-provided";
  sourceNote?: string;
  pages: RegulationPage[];
}

const SCHOOL_POLICY_TERMS =
  /\b(?:fum\w*|sigarett\w*|svap\w*|vape\w*|smok\w*|regol\w*|regole|sanzion\w*|disciplin\w*|diviet\w*|infrazion\w*|sospension\w*|cellular\w*|telefon\w*|ritard\w*|assenze?|giustific\w*|uscit\w*|entrate?|permess\w*|comportament\w*|condotta|intervall\w*|ricreazion\w*|espulsion\w*)\b/i;
const SCHOOL_PROFILE_TERMS =
  /\b(?:morsell\w*|sturzo|gela|clis022009|clrh02202e|cltd02201g|cltf02201t|itt|ite|ipseoa|ptof|pago.?pa|offerta formativa|indirizz\w*|percors\w*|pless\w*|sed(?:e|i)|via pitagora|via liszt|romagnoli|contatt\w*|telefon\w*|email|posta elettronica|codice meccanografico|storia dell.?istituto|storia della scuola|dirigen\w*|enogastronom\w*|alberghier\w*|turismo)\b/i;

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
  "morsell",
  "sturz",
  "indirizz",
  "percors",
  "pless",
  "meccanografic",
  "pagopa",
]);

export function isSchoolPolicyQuestion(question: string): boolean {
  return SCHOOL_POLICY_TERMS.test(question) || SCHOOL_PROFILE_TERMS.test(question);
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

let schoolDocumentsPromise: Promise<RegulationData[]> | undefined;

function loadSchoolDocuments(): Promise<RegulationData[]> {
  schoolDocumentsPromise ??= Promise.all([
    import("./morselli-regulation-data.json?raw"),
    import("./morselli-sturzo-research-data.json?raw"),
  ])
    .then(([officialDocument, userResearch]) => [
      JSON.parse(officialDocument.default) as RegulationData,
      JSON.parse(userResearch.default) as RegulationData,
    ])
    .catch((error: unknown) => {
      schoolDocumentsPromise = undefined;
      throw error;
    });
  return schoolDocumentsPromise;
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
  documents: RegulationData[],
): {
  excerpts: Array<RegulationExcerpt & { document: RegulationData }>;
} | null {
  const queryTerms = [...new Set(keywords(question))];
  if (queryTerms.length === 0) return null;
  const isProfileQuestion =
    SCHOOL_PROFILE_TERMS.test(question) && !SCHOOL_POLICY_TERMS.test(question);
  const relevantDocuments = isProfileQuestion
    ? documents.filter((document) => document.sourceKind === "user-provided")
    : documents;

  const ranked = relevantDocuments
    .flatMap((document) =>
      document.pages.flatMap((page) =>
        extractExcerpts(page).map((excerpt) => ({ document, excerpt })),
      ),
    )
    .map(({ document, excerpt }) => {
      const termCounts = new Map<string, number>();
      for (const term of keywords(excerpt.text)) {
        termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
      }
      const score = queryTerms.reduce((total, term) => {
        const count = termCounts.get(term) ?? 0;
        const weight = HIGH_SIGNAL_TERMS.has(term) ? 4 : 1;
        return total + weight * Math.min(count, 3);
      }, 0);
      return { document, excerpt, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(left.document.sourceKind === "user-provided") -
          Number(right.document.sourceKind === "user-provided") ||
        left.excerpt.page - right.excerpt.page,
    )
    .slice(0, 3);

  if (ranked.length === 0) return null;
  const minimumScore = Math.max(1, Math.ceil(ranked[0]!.score * 0.5));
  const selectedExcerpts = ranked
    .filter(({ score }) => score >= minimumScore)
    .map(({ document, excerpt }) => ({ ...excerpt, document }));
  return { excerpts: selectedExcerpts };
}

function fallbackAnswer(regulation: RegulationData): SchoolPolicyAnswer {
  return {
    text: "Non trovo un estratto pertinente nelle fonti scolastiche disponibili. Non voglio inventare dati o regole: verifica il sito ufficiale o un documento più recente.",
    sources: [
      {
        title: regulation.title,
        ...(regulation.sourceUrl ? { url: regulation.sourceUrl } : {}),
        page: null,
        sourceKind: "official",
      },
    ],
  };
}

export async function answerSchoolPolicyQuestion(
  question: string,
  mode: CircularAssistantMode,
): Promise<SchoolPolicyAnswer> {
  const documents = await loadSchoolDocuments();
  const regulation = documents.find((document) => document.sourceKind !== "user-provided");
  const relevant = retrieveRelevantExcerpts(question, documents);
  if (!relevant) return fallbackAnswer(regulation ?? documents[0]!);

  const sourcesByKey = new Map<string, SchoolDocumentSource>();
  for (const { document, page } of relevant.excerpts) {
    const sourceKind = document.sourceKind ?? "official";
    const key = `${document.title}:${page}`;
    if (!sourcesByKey.has(key)) {
      sourcesByKey.set(key, {
        title: document.title,
        ...(document.sourceUrl ? { url: document.sourceUrl } : {}),
        page,
        sourceKind,
      });
    }
  }
  const sources = [...sourcesByKey.values()];
  const documentText = relevant.excerpts
    .map(({ document, page, text }) => {
      const sourceLabel =
        document.sourceKind === "user-provided"
          ? "Ricerca fornita dall’utente; non verificata"
          : "Fonte ufficiale";
      return `[${sourceLabel}: ${document.title}; pagina ${page}]\n${text}`;
    })
    .join("\n\n---\n\n");

  if (mode === "local") {
    const includesUserResearch = relevant.excerpts.some(
      ({ document }) => document.sourceKind === "user-provided",
    );
    const intro = includesUserResearch
      ? "Ho trovato questi passaggi. La ricerca PDF fornita dall’utente non è un documento ufficiale verificato: controlla le informazioni sul sito della scuola o con la segreteria."
      : `Ho trovato questi passaggi nel regolamento ufficiale (A.S. ${regulation?.academicYear ?? "2025-2026"}):`;
    return {
      text: `${intro}\n\n${relevant.excerpts
        .map(({ document, page, text }) => {
          const sourceLabel =
            document.sourceKind === "user-provided"
              ? `Ricerca utente non verificata — ${document.title}`
              : `Regolamento ufficiale — ${document.title}`;
          return `${sourceLabel}, pagina ${page}:\n${text}`;
        })
        .join("\n\n")}`,
      sources,
    };
  }

  const answer = await askWithDocument({ question, documentText, documentTruncated: false });
  return { text: answer, sources };
}
