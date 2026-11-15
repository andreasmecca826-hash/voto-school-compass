//#region src/lib/voto/circular-reader.ts
var MONTHS = [
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
	"dicembre"
].join("|");
var DATE_PATTERN = new RegExp(String.raw`\b(?:\d{1,2}[/.]\d{1,2}[/.](?:\d{2}|\d{4})|\d{1,2}\s+(?:${MONTHS})\s+\d{4}|(?:lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\s+\d{1,2}\s+(?:${MONTHS})\s+\d{4})\b`, "giu");
var RECIPIENT_HEADING = /^(?:destinatari?|rivolta\s+a|rivolto\s+a|alla\s+c\.\s*a\.?)\s*:?\s*(.*)$/i;
var DIRECT_RECIPIENT = /^(?:ai\s+(?:genitori|docenti|docenti\s+e\s+genitori|coordinatori|studenti|rappresentanti)\b|alle\s+(?:famiglie|classi|studentesse|studenti|docenti)\b|a\s+tutti\s+(?:i\s+)?(?:docenti|genitori|studenti|classi)\b)/i;
var MAX_PAGES = 80;
var MAX_TEXT_LENGTH = 3e5;
function clean(value) {
	return value.replace(/\s+/g, " ").trim();
}
function normalizeOcrText(text) {
	return text.replace(/\bO(?=\d{1,2}:\d{2})/g, "0").replace(/(?<=\d)\s*[lI]\s*(?=(?:A|B|C|D|E|F)\b)/g, "I").replace(/\blunedi\b/gi, "lunedì").replace(/\bmartedi\b/gi, "martedì").replace(/\bmercoledi\b/gi, "mercoledì").replace(/\bgiovedi\b/gi, "giovedì").replace(/\bvenerdi\b/gi, "venerdì");
}
function extractCircularTableRows(text) {
	const rows = [];
	let page;
	for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
		const line = rawLine.trim();
		const pageMatch = line.match(/^\[Pagina\s+(\d+)\]$/i);
		if (pageMatch?.[1]) {
			page = pageMatch[1];
			continue;
		}
		if (!line || /^Tabella pagina \d+:/i.test(line)) continue;
		const cells = (line.includes("|") ? line.split("|") : line.split(/\s{3,}/)).map(clean).filter(Boolean);
		if (cells.length >= 2) rows.push({
			...page ? { page } : {},
			cells
		});
	}
	return rows;
}
function extractSummary(text) {
	const timetableTitle = text.split("\n").map(clean).find((line) => /\borario\b/i.test(line) && /\b(?:provvisorio|definitivo|scolastico)\b/i.test(line));
	if (timetableTitle) return timetableTitle.slice(0, 420);
	const sentences = text.replace(/\n+/g, " ").match(/[^.!?]+(?:[.!?]+|$)/g)?.map(clean).filter((sentence) => sentence.length >= 45 && sentence.length <= 360).filter((sentence) => !/^(?:https?:\/\/|www\.)/i.test(sentence)).filter((sentence) => !/^(?:plesso|via\s|istituto|cod\.\s*fis|e-mail|il dirigente|prof\.|firma)/i.test(sentence));
	if (!sentences?.length) return null;
	return sentences.slice(0, 3).join(" ").slice(0, 650).trim() || null;
}
function extractActions(text) {
	const actionPattern = /\b(?:deve|devono|dovr\w*|è necessario|si chiede|si invit\w*|invitiamo|consegn\w*|present\w*|invi\w*|compil\w*|partecip\w*|portare|recarsi|restitu\w*|firmare|contatt\w*|effettu\w*)\b/i;
	const sentences = text.replace(/\n+/g, " ").match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];
	const result = /* @__PURE__ */ new Set();
	for (const raw of sentences) {
		const sentence = clean(raw);
		if (sentence.length < 20 || sentence.length > 280 || !actionPattern.test(sentence)) continue;
		result.add(sentence);
		if (result.size >= 5) break;
	}
	return [...result];
}
function extractRecipients(text) {
	const lines = text.split("\n").map(clean).filter(Boolean);
	const recipients = /* @__PURE__ */ new Set();
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
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
function extractDates(text) {
	const found = /* @__PURE__ */ new Map();
	for (const match of text.matchAll(DATE_PATTERN)) {
		const value = clean(match[0] ?? "");
		if (!value) continue;
		const index = match.index ?? 0;
		const context = clean(text.slice(Math.max(0, index - 65), Math.min(text.length, index + value.length + 65))).slice(0, 150);
		const key = value.toLocaleLowerCase("it-IT");
		if (!found.has(key)) found.set(key, {
			value,
			context
		});
		if (found.size >= 20) break;
	}
	return [...found.values()];
}
function extractAttachmentMentions(text) {
	const mentions = /* @__PURE__ */ new Set();
	for (const line of text.split("\n")) {
		const match = line.match(/^\s*(?:allegati?|documenti\s+allegati)\s*[:-]\s*(.+)$/i);
		if (!match?.[1]) continue;
		for (const value of match[1].split(/[,;•]/).map(clean)) if (value.length >= 3 && value.length <= 140) mentions.add(value);
	}
	return [...mentions];
}
function analyzeCircularText(text, attachments = [], pagesAnalyzed = 0, truncated = false) {
	const normalized = text.replace(/\r\n?/g, "\n");
	const dayNames = normalized.toLocaleLowerCase("it-IT");
	const isTimetable = (dayNames.includes("lunedì") || dayNames.includes("lunedi")) && (dayNames.includes("martedì") || dayNames.includes("martedi")) && (dayNames.includes("mercoledì") || dayNames.includes("mercoledi"));
	const hasTableRows = normalized.split("\n").filter((line) => line.trim().length > 0 && /\S\s{3,}\S/.test(line)).length >= 3;
	const extractionQuality = !normalized.trim() ? "bassa" : truncated ? "media" : "alta";
	return {
		summary: isTimetable ? extractSummary(normalized) : hasTableRows ? null : extractSummary(normalized),
		actions: isTimetable || hasTableRows ? [] : extractActions(normalized),
		deadlines: extractDates(normalized).filter(({ context }) => /\b(?:entro|non oltre|scadenza|termine|consegna|restitu\w*|present\w* entro|entro e non oltre)\b/i.test(context)),
		dates: extractDates(normalized),
		recipients: extractRecipients(normalized),
		attachments: [...new Set([...attachments, ...extractAttachmentMentions(normalized)].map(clean).filter(Boolean))],
		layout: isTimetable ? "timetable" : hasTableRows ? "table" : "text",
		extractionQuality,
		pagesAnalyzed,
		truncated
	};
}
function reconstructPositionedText(items) {
	const rows = [];
	for (const item of items) {
		const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5);
		if (row) row.items.push(item);
		else rows.push({
			y: item.y,
			items: [item]
		});
	}
	return rows.sort((left, right) => right.y - left.y).map(({ items: rowItems }) => {
		const sorted = rowItems.sort((left, right) => left.x - right.x);
		let line = "";
		let endX;
		for (const item of sorted) {
			const fontSize = Math.max(item.fontSize, 1);
			const spaceWidth = Math.max(fontSize * .34, 2.2);
			const gapSpaces = endX === void 0 ? 0 : Math.min(100, Math.max(1, Math.round((item.x - endX) / spaceWidth)));
			const content = item.str.trim();
			if (!content) continue;
			line += `${" ".repeat(gapSpaces)}${content}`;
			endX = item.x + item.width;
		}
		return line.trimEnd();
	}).filter(Boolean).join("\n");
}
async function readCircularPdfPages(src) {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
	const loadingTask = pdfjs.getDocument({
		url: src,
		withCredentials: true
	});
	try {
		const pdf = await loadingTask.promise;
		const pagesToRead = Math.min(pdf.numPages, MAX_PAGES);
		const textParts = [];
		let textLength = 0;
		let pagesAnalyzed = 0;
		for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
			const pageText = reconstructPositionedText((await (await pdf.getPage(pageNumber)).getTextContent()).items.flatMap((item) => {
				if (!("str" in item) || !item.str.trim()) return [];
				const [scaleX, , , scaleY, x, y] = item.transform;
				return [{
					str: item.str,
					x,
					y,
					width: item.width,
					fontSize: Math.max(Math.abs(scaleX), Math.abs(scaleY))
				}];
			}));
			textParts.push(`[Pagina ${pageNumber}]\n${pageText}`);
			textLength += pageText.length;
			pagesAnalyzed += 1;
			if (textLength >= MAX_TEXT_LENGTH) break;
		}
		const truncated = pdf.numPages > pagesToRead || textLength >= MAX_TEXT_LENGTH;
		return {
			text: textParts.join("\n\n"),
			pagesAnalyzed,
			truncated
		};
	} finally {
		await loadingTask.destroy().catch(() => {});
	}
}
async function extractCircularPdfText(src) {
	return readCircularPdfPages(src);
}
var MAX_VISUAL_PAGES = 4;
var MAX_VISUAL_PAGE_DIMENSION = 1120;
async function renderCircularPdfPageImages(src) {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
	const loadingTask = pdfjs.getDocument({
		url: src,
		withCredentials: true
	});
	try {
		const pdf = await loadingTask.promise;
		const pages = [];
		const pageCount = Math.min(pdf.numPages, MAX_VISUAL_PAGES);
		for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
			const page = await pdf.getPage(pageNumber);
			const baseViewport = page.getViewport({ scale: 1 });
			const scale = Math.min(1.5, MAX_VISUAL_PAGE_DIMENSION / Math.max(baseViewport.width, baseViewport.height));
			const viewport = page.getViewport({ scale });
			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, Math.floor(viewport.width));
			canvas.height = Math.max(1, Math.floor(viewport.height));
			const context = canvas.getContext("2d", { alpha: false });
			if (!context) throw new Error("Non è possibile preparare le immagini del PDF.");
			await page.render({
				canvas,
				canvasContext: context,
				viewport
			}).promise;
			pages.push({
				pageNumber,
				dataUrl: canvas.toDataURL("image/jpeg", .82)
			});
			canvas.width = 0;
			canvas.height = 0;
		}
		return {
			pages,
			totalPages: pdf.numPages,
			truncated: pdf.numPages > pageCount
		};
	} finally {
		await loadingTask.destroy().catch(() => {});
	}
}
async function analyzeCircularPdf(src, attachments = []) {
	const document = await readCircularPdfPages(src);
	return analyzeCircularText(document.text.replace(/^\[Pagina \d+\]\n/gm, ""), attachments, document.pagesAnalyzed, document.truncated);
}
async function extractCircularDocxText(src) {
	const response = await fetch(src, { credentials: "same-origin" });
	if (!response.ok) throw new Error(`docx_download_${response.status}`);
	const arrayBuffer = await response.arrayBuffer();
	const extracted = await (await import("mammoth")).default.extractRawText({ arrayBuffer });
	return {
		text: extracted.value.slice(0, MAX_TEXT_LENGTH),
		pagesAnalyzed: 0,
		truncated: extracted.value.length > MAX_TEXT_LENGTH
	};
}
async function analyzeCircularDocx(src, attachments = []) {
	const document = await extractCircularDocxText(src);
	return analyzeCircularText(document.text, attachments, 0, document.truncated);
}
//#endregion
export { extractCircularPdfText as a, renderCircularPdfPageImages as c, extractCircularDocxText as i, analyzeCircularPdf as n, extractCircularTableRows as o, analyzeCircularText as r, normalizeOcrText as s, analyzeCircularDocx as t };
