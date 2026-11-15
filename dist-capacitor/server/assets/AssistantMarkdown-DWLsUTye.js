import { o as extractCircularTableRows, r as analyzeCircularText, s as normalizeOcrText } from "./circular-reader-Bi5AGq_T.js";
import { r as supabase } from "./supabase-auth-BEdIbH2_.js";
import { jsx } from "react/jsx-runtime";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
//#region src/lib/voto/circular-local-answer.ts
var STOP_WORDS = /* @__PURE__ */ new Set([
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
	"quali"
]);
var TERM_ALIASES = {
	gita: ["viaggio", "istruzione"],
	gite: ["viaggi", "istruzione"],
	uscita: ["visita", "didattica"],
	compito: ["attivita", "esercitazione"],
	compiti: ["attivita", "esercitazione"],
	genitore: ["famiglia", "famiglie"],
	genitori: ["famiglia", "famiglie"],
	orario: [
		"ora",
		"ore",
		"giorno"
	],
	consegnare: [
		"consegna",
		"consegnato",
		"consegnate"
	],
	modulo: ["autorizzazione", "documento"]
};
function normalize(value) {
	return value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function terms(value) {
	const base = [...new Set(normalize(value).split(/\s+/).filter((word) => word.length >= 3))].filter((word) => !STOP_WORDS.has(word));
	return [...new Set(base.flatMap((word) => [word, ...TERM_ALIASES[word] ?? []]))];
}
function relatedTerm(left, right) {
	if (left === right) return true;
	return left.length >= 6 && right.length >= 6 && left.slice(0, 6) === right.slice(0, 6);
}
function isDateQuestion(question) {
	return /\b(quando|data|scad\w*|termine|entro|giorno|orario|ora)\b/i.test(normalize(question));
}
function containsDate(value) {
	return /\b\d{1,2}[/.]\d{1,2}[/.](?:\d{2}|\d{4})\b|\b\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}\b/i.test(value);
}
function confidenceLabel(score, matchedTerms, hasPage) {
	if (matchedTerms >= 3 || matchedTerms >= 2 && hasPage && score >= 4) return "Alta";
	if (matchedTerms >= 2 || hasPage) return "Media";
	return "Bassa";
}
function sourceLabel(pages) {
	const uniquePages = [...new Set(pages.filter((page) => Boolean(page)))];
	return uniquePages.length > 0 ? `${uniquePages.length > 1 ? "Pagine" : "Pagina"} ${uniquePages.join(", ")}` : "pagina non indicata";
}
function answerCircularQuestionLocally(question, documentText) {
	const searchableDocument = normalizeOcrText(documentText);
	const questionTerms = terms(question);
	if (questionTerms.length === 0) {
		const analysis = analyzeCircularText(searchableDocument);
		const details = [
			analysis.summary ? `Sintesi estratta: ${analysis.summary}` : "",
			analysis.deadlines.length ? `Scadenze individuate: ${analysis.deadlines.map(({ value }) => value).join(", ")}.` : "",
			analysis.recipients.length ? `Destinatari individuati: ${analysis.recipients.join(", ")}.` : "",
			analysis.actions.length ? `Indicazioni: ${analysis.actions.join(" ")}` : ""
		].filter(Boolean);
		if (details.length === 0) {
			const excerpt = searchableDocument.replace(/^\[Pagina\s+\d+\]\s*$/gim, "").split(/(?<=[.!?])\s+|\n+/).map((sentence) => sentence.trim()).find((sentence) => sentence.length >= 24);
			if (excerpt) details.push(`Estratto del documento: ${excerpt.slice(0, 560)}`);
		}
		return details.length ? `Modalità locale: sintesi ed elementi estratti sul dispositivo, non una risposta generata.\n\n${details.join("\n")}\n\nFonte: ${sourceLabel([...searchableDocument.matchAll(/^\[Pagina\s+(\d+)\]$/gim)].map((match) => match[1]))}.\nQualità estrazione: ${analysis.extractionQuality}.\nAffidabilità: ${analysis.extractionQuality === "alta" ? "Media" : "Bassa"}.` : "Non riesco a ricavare una sintesi locale da questa circolare. Prova con una parola chiave presente nel documento.";
	}
	const wantsDate = isDateQuestion(question);
	const tableRows = extractCircularTableRows(searchableDocument);
	const tableMatches = tableRows.map((row) => {
		const rowTerms = terms(row.cells.join(" "));
		return {
			row,
			matched: questionTerms.filter((term) => rowTerms.some((rowTerm) => relatedTerm(term, rowTerm))).length
		};
	}).filter(({ matched }) => matched >= 2 || matched >= 1 && questionTerms.length <= 2).sort((left, right) => right.matched - left.matched).slice(0, 3);
	if (tableMatches.length > 0 && (tableRows.length >= 3 || tableMatches[0].matched >= 2)) {
		const pages = tableMatches.map(({ row }) => row.page);
		return `Modalità locale: ho trovato righe pertinenti nella tabella (non è una risposta generata).\n\nCosa ho trovato:\n${tableMatches.map(({ row }) => `• ${row.cells.join(" · ")}`).join("\n")}\n\nFonte: ${sourceLabel(pages)}.\nAffidabilità: ${tableMatches[0].matched >= 2 ? "Alta" : "Media"}.`;
	}
	const passages = [];
	let currentPage;
	for (const rawLine of searchableDocument.split(/\r?\n/)) {
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
			const matchedTerms = questionTerms.filter((questionTerm) => sentenceTerms.some((sentenceTerm) => relatedTerm(questionTerm, sentenceTerm)));
			let score = matchedTerms.length;
			if (wantsDate && containsDate(sentence)) score += 2;
			if (score > 0) passages.push({
				text: sentence.slice(0, 560),
				...currentPage ? { page: currentPage } : {},
				score,
				matchedTerms: matchedTerms.length
			});
		}
	}
	const selected = [...new Map(passages.map((passage) => [passage.text, passage])).values()].sort((left, right) => right.score - left.score).slice(0, 3);
	if (selected.length === 0) return "Non trovo un passaggio chiaramente collegato. Prova con parole presenti nella circolare oppure scegli la modalità API per una risposta generativa.";
	const excerpts = selected.map(({ page, text }) => `${page ? `[Pagina ${page}] ` : ""}${text}`);
	const matchedTerms = Math.max(...selected.map((passage) => passage.matchedTerms));
	const bestScore = Math.max(...selected.map((passage) => passage.score));
	const pages = selected.map((passage) => passage.page);
	return `Modalità locale: passaggi pertinenti trovati nel documento (non è una risposta generata).\n\nCosa ho trovato:\n${excerpts.join("\n\n")}\n\nFonte: ${sourceLabel(pages)}.\nAffidabilità: ${confidenceLabel(bestScore, matchedTerms, pages.some(Boolean))}.`;
}
//#endregion
//#region src/lib/voto/circular-assistant.ts
var API_QUOTA_KEY = "voto.api-quota.v1";
function rememberApiQuota(value) {
	if (typeof window === "undefined" || !value || typeof value !== "object") return;
	const raw = value;
	const quota = {
		...typeof raw["limitRequests"] === "number" ? { limitRequests: raw["limitRequests"] } : {},
		...typeof raw["remainingRequests"] === "number" ? { remainingRequests: raw["remainingRequests"] } : {},
		...typeof raw["resetRequests"] === "string" ? { resetRequests: raw["resetRequests"] } : {},
		...typeof raw["limitTokens"] === "number" ? { limitTokens: raw["limitTokens"] } : {},
		...typeof raw["remainingTokens"] === "number" ? { remainingTokens: raw["remainingTokens"] } : {},
		...typeof raw["resetTokens"] === "string" ? { resetTokens: raw["resetTokens"] } : {},
		observedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	if (Object.keys(quota).length <= 1) return;
	try {
		window.localStorage.setItem(API_QUOTA_KEY, JSON.stringify(quota));
	} catch {}
}
function getLastApiQuota() {
	if (typeof window === "undefined") return null;
	try {
		const value = JSON.parse(window.localStorage.getItem(API_QUOTA_KEY) ?? "null");
		return value && typeof value === "object" && typeof value.observedAt === "string" ? value : null;
	} catch {
		return null;
	}
}
async function askAssistantApi(input) {
	const { data, error } = await supabase.functions.invoke("circular-assistant", { body: input });
	rememberApiQuota(data?.quota);
	if (error) {
		if (error.name === "FunctionsFetchError") throw new Error("Non riesco a raggiungere il servizio AI. Riprova più tardi.");
		let message = typeof data?.error === "string" ? data.error : "La risposta AI non è disponibile.";
		if (error.context instanceof Response) try {
			const body = await error.context.clone().json();
			if (typeof body.error === "string") message = body.error;
		} catch {}
		throw new Error(message);
	}
	if (!data || typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Il servizio AI ha restituito una risposta vuota.");
	return data.answer.trim();
}
function askAboutCircular(input) {
	return askAssistantApi(input);
}
function askAboutCircularImages(input) {
	return askAssistantApi({
		question: input.question,
		pageImages: input.pageImages
	});
}
function askWithDocument(input) {
	return askAssistantApi(input);
}
function askGeneralQuestion(question) {
	return askAssistantApi({ question });
}
//#endregion
//#region src/components/voto/AssistantMarkdown.tsx
var components = {
	p: ({ children }) => /* @__PURE__ */ jsx("p", {
		className: "my-2 whitespace-normal first:mt-0 last:mb-0",
		children
	}),
	ul: ({ children }) => /* @__PURE__ */ jsx("ul", {
		className: "my-2 list-disc space-y-1 pl-5",
		children
	}),
	ol: ({ children }) => /* @__PURE__ */ jsx("ol", {
		className: "my-2 list-decimal space-y-1 pl-5",
		children
	}),
	li: ({ children }) => /* @__PURE__ */ jsx("li", {
		className: "pl-0.5",
		children
	}),
	h1: ({ children }) => /* @__PURE__ */ jsx("h1", {
		className: "mb-2 mt-3 text-base font-semibold",
		children
	}),
	h2: ({ children }) => /* @__PURE__ */ jsx("h2", {
		className: "mb-2 mt-3 text-sm font-semibold",
		children
	}),
	h3: ({ children }) => /* @__PURE__ */ jsx("h3", {
		className: "mb-1 mt-2 text-sm font-semibold",
		children
	}),
	a: ({ children, href }) => href ? /* @__PURE__ */ jsx("a", {
		href,
		target: "_blank",
		rel: "noopener noreferrer",
		className: "text-primary underline",
		children
	}) : /* @__PURE__ */ jsx("span", { children }),
	blockquote: ({ children }) => /* @__PURE__ */ jsx("blockquote", {
		className: "my-2 border-l-2 border-border pl-3 text-muted-foreground",
		children
	}),
	pre: ({ children }) => /* @__PURE__ */ jsx("pre", {
		className: "my-2 overflow-x-auto rounded-lg bg-muted/60 p-2 text-xs",
		children
	}),
	code: ({ children }) => /* @__PURE__ */ jsx("code", {
		className: "rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.95em]",
		children
	}),
	table: ({ children }) => /* @__PURE__ */ jsx("table", {
		className: "my-2 w-full border-collapse text-left text-xs",
		children
	}),
	th: ({ children }) => /* @__PURE__ */ jsx("th", {
		className: "border border-border px-2 py-1 font-semibold",
		children
	}),
	td: ({ children }) => /* @__PURE__ */ jsx("td", {
		className: "border border-border px-2 py-1",
		children
	}),
	hr: () => /* @__PURE__ */ jsx("hr", { className: "my-3 border-border" })
};
function AssistantMarkdown({ text, className }) {
	return /* @__PURE__ */ jsx("div", {
		className: `min-w-0 whitespace-normal break-words leading-relaxed ${className ?? ""}`,
		children: /* @__PURE__ */ jsx(ReactMarkdown, {
			remarkPlugins: [remarkGfm],
			components,
			children: text
		})
	});
}
//#endregion
export { askWithDocument as a, askGeneralQuestion as i, askAboutCircular as n, getLastApiQuota as o, askAboutCircularImages as r, answerCircularQuestionLocally as s, AssistantMarkdown as t };
