import { a as extractCircularPdfText, c as renderCircularPdfPageImages, i as extractCircularDocxText } from "./circular-reader-Bi5AGq_T.js";
import { a as askWithDocument, i as askGeneralQuestion, n as askAboutCircular, o as getLastApiQuota, s as answerCircularQuestionLocally, t as AssistantMarkdown } from "./AssistantMarkdown-DWLsUTye.js";
import { t as useOnlineStatus } from "./use-online-status-B-_W9iFn.js";
import { n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { i as parseEventDateTime } from "./dates-CdBXaUB1.js";
import { a as gradeTone, i as fmt, n as average, o as neededGrade, s as overallAverage } from "./calc-DWBiEBUY.js";
import { n as useStudy } from "./study-context-BQIH1Rbo.js";
import { a as loadSchoolClosures, c as schoolDaysUntilSchoolEnd, d as calculateAbsencePlan, l as loadAbsenceHoursPerDay, n as loadSchoolEndDate } from "./school-end-date-cQiQhVfB.js";
import { i as loadSchedule, n as clearScheduleDayIfUnchanged, r as emptySchedule, t as DAYS } from "./orario-zeGcQdAY.js";
import { a as teachersForSubjectQuestion, i as teachersForSubject, n as getClassTeachers, t as asksForLaboratory } from "./teachers-opxojIU-.js";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Bot, FileText, LoaderCircle, Paperclip, ScanText, Send, Sparkles, UserRound, X } from "lucide-react";
//#region src/lib/voto/assistant-actions.ts
var normalize$6 = (value) => value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
var includesAny = (text, terms) => terms.some((term) => text.includes(term));
function editDistance$1(left, right) {
	const row = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let i = 1; i <= left.length; i += 1) {
		let diagonal = row[0];
		row[0] = i;
		for (let j = 1; j <= right.length; j += 1) {
			const above = row[j];
			row[j] = left[i - 1] === right[j - 1] ? diagonal : Math.min(diagonal + 1, above + 1, row[j - 1] + 1);
			diagonal = above;
		}
	}
	return row[right.length];
}
function titleMatchesQuery(query, title) {
	if (query.includes(title)) return true;
	const titleTokens = title.split(/\s+/).filter((token) => token.length >= 4);
	if (titleTokens.length === 0) return false;
	const queryTokens = query.split(/\s+/);
	return titleTokens.filter((titleToken) => queryTokens.some((queryToken) => queryToken.includes(titleToken) || queryToken.length >= 5 && titleToken.length >= 5 && editDistance$1(queryToken, titleToken) <= (titleToken.length >= 6 ? 2 : 1))).length >= Math.ceil(titleTokens.length * .6);
}
function isExplicitlyNegatedTaskAction(query) {
	return /\bnon\s+(?:(?:voglio|devo|posso)\s+)?(?:segnare|segna|marcare|marca|mettere|metti|completare|completa|riaprire|riapri)\b/.test(query);
}
function reportsUnfinishedTask(query) {
	return /\bnon\s+(?:(?:ho|hai|ha|abbiamo|avete|hanno|sono|sei|e)\s+(?:ancora\s+)?|(?:voglio|devo|posso)\s+)?(?:fatt\w*|finit\w*|svolt\w*|conclus\w*|complet\w*)\b/.test(query);
}
function requestedCompletionState(query) {
	const requestsReopen = includesAny(query, [
		"riapri",
		"riaprire",
		"annulla completamento",
		"non completat",
		"incomplet",
		"non fatto",
		"come da fare",
		"da fare"
	]);
	const requestsCompletion = includesAny(query, [
		"complet",
		"fatto",
		"finito",
		"svolto",
		"conclus"
	]);
	if (requestsReopen && includesAny(query, [
		"riapri",
		"annulla completamento",
		"non completat",
		"incomplet",
		"non fatto",
		"come da fare",
		"da fare"
	])) return false;
	if (requestsReopen === requestsCompletion) return null;
	return requestsCompletion;
}
function getAssignmentActionIntent(query, assignments) {
	const normalized = normalize$6(query.trim());
	if (isExplicitlyNegatedTaskAction(normalized)) return null;
	const targetState = requestedCompletionState(normalized);
	const hasTaskReference = includesAny(normalized, [
		"compit",
		"consegn",
		"attivita"
	]);
	const hasActionVerb = /\b(segna|marca|metti|imposta|completa|riapri|annulla)\b/.test(normalized);
	const reportsCompletion = /\bho\s+(fatto|finito|complet\w*|svolt\w*)/.test(normalized);
	const matchedCandidates = assignments.filter((assignment) => {
		const title = normalize$6(assignment.title.trim());
		return title.length >= 3 && titleMatchesQuery(normalized, title);
	});
	const candidates = matchedCandidates.filter((candidate) => {
		const title = normalize$6(candidate.title.trim());
		return !matchedCandidates.some((other) => {
			if (other.id === candidate.id) return false;
			const otherTitle = normalize$6(other.title.trim());
			return otherTitle.length > title.length && otherTitle.includes(title);
		});
	});
	if (reportsUnfinishedTask(normalized) && candidates.length) {
		if (candidates.length > 1) return {
			kind: "clarify",
			message: "Capito: non segno questi compiti come completati. Non ho modificato nulla; indicami il titolo preciso se vuoi aggiornare uno stato."
		};
		const assignment = candidates[0];
		return assignment.completed ? {
			kind: "clarify",
			message: `Dici di non aver finito “${assignment.title}”, ma nei dati risulta completato. Vuoi riaprirlo? Non ho modificato nulla.`
		} : {
			kind: "already",
			message: `Capito: “${assignment.title}” risulta già da fare. Non ho modificato nulla.`
		};
	}
	const referencesTask = hasTaskReference || candidates.length > 0;
	const expressesAction = hasActionVerb || reportsCompletion && candidates.length > 0;
	if (!expressesAction) return null;
	if (targetState === null) {
		if (!referencesTask || !expressesAction) return null;
		return {
			kind: "clarify",
			message: "Vuoi segnare il compito come completato o riaprirlo? Non ho modificato nulla."
		};
	}
	const completed = targetState;
	let matchingAssignments = candidates;
	if (!matchingAssignments.length) matchingAssignments = assignments.filter((assignment) => {
		const subject = assignment.subject?.trim();
		return subject && normalize$6(subject).length >= 2 && normalized.includes(normalize$6(subject));
	});
	if (matchingAssignments.length > 1) return {
		kind: "clarify",
		message: `Trovo più compiti compatibili: ${matchingAssignments.slice(0, 5).map((assignment) => `“${assignment.title}”${assignment.subject ? ` (${assignment.subject})` : ""}`).join(", ")}. Scrivimi il titolo preciso. Non ho modificato nulla.`
	};
	const assignment = matchingAssignments[0];
	if (!assignment) return {
		kind: "clarify",
		message: "Non trovo un compito corrispondente. Scrivimi il titolo esatto e specifica se vuoi completarlo o riaprirlo; non ho modificato nulla."
	};
	if (assignment.completed === completed) return {
		kind: "already",
		message: completed ? `“${assignment.title}” risulta già completato. Non ho apportato modifiche.` : `“${assignment.title}” risulta già da fare. Non ho apportato modifiche.`
	};
	return {
		kind: "confirm",
		action: {
			id: assignment.id,
			title: assignment.title,
			subject: assignment.subject,
			dueDate: assignment.dueDate,
			currentCompleted: assignment.completed,
			completed
		}
	};
}
//#endregion
//#region src/lib/voto/assistant-search.ts
var normalize$5 = (value) => value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
var STOP_WORDS$1 = /* @__PURE__ */ new Set([
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
	"mostra",
	"mostrami",
	"fammi",
	"dimmi",
	"informazioni",
	"informazione",
	"su"
]);
var SEARCH_ALIASES = {
	avviso: ["circolare", "comunicazione"],
	avvisi: ["circolari", "comunicazioni"],
	comunicazione: ["circolare", "avviso"],
	comunicazioni: ["circolari", "avvisi"],
	prof: ["docente", "professore"],
	professore: ["docente", "prof"],
	professoressa: ["docente", "prof"],
	gita: ["uscita", "viaggio"],
	gite: ["uscite", "viaggi"],
	interrogazione: ["interrogazioni", "orale"],
	interrogazioni: ["interrogazione", "orali"],
	compito: ["compiti", "esercizio"],
	compiti: ["compito", "esercizi"]
};
function dateLabel$1(value) {
	const match = value?.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
	return match ? `${match[3]}/${match[2]}/${match[1]}` : value ?? "";
}
function assistantSearchTerms(query) {
	const rawTerms = [...new Set(normalize$5(query).match(/[\p{L}\p{N}]+/gu) ?? [])].filter((term) => (term.length > 1 || /^\d$/.test(term)) && !STOP_WORDS$1.has(term));
	return [...new Set(rawTerms.flatMap((term) => [term, ...SEARCH_ALIASES[term] ?? []]))];
}
function isAssistantSearchQuery(query) {
	return /^\s*(?:(?:per favore)\s+)?(?:cerca(?:re)?|trova(?:re)?|ricerca(?:\s+rapida)?)\b/i.test(query);
}
function rankResult(result, terms, phrase) {
	const title = normalize$5(result.title);
	const numericSearchText = normalize$5(`${result.category} ${result.title} ${result.searchableText}`);
	const text = normalize$5(`${result.category} ${result.title} ${result.detail} ${result.searchableText}`);
	const containsNumericToken = (value, term) => {
		return (value.match(/[\p{L}\p{N}]+/gu) ?? []).includes(term);
	};
	const editDistance = (left, right) => {
		const row = Array.from({ length: right.length + 1 }, (_, index) => index);
		for (let i = 1; i <= left.length; i += 1) {
			let diagonal = row[0];
			row[0] = i;
			for (let j = 1; j <= right.length; j += 1) {
				const above = row[j];
				row[j] = left[i - 1] === right[j - 1] ? diagonal : Math.min(diagonal + 1, above + 1, row[j - 1] + 1);
				diagonal = above;
			}
		}
		return row[right.length];
	};
	const textTokens = text.match(/[\p{L}\p{N}]+/gu) ?? [];
	const matchesTerm = (term) => {
		if (/^\d+$/.test(term)) return containsNumericToken(numericSearchText, term);
		if (text.includes(term)) return true;
		return textTokens.some((token) => token.length >= 5 && term.length >= 5 && token.slice(0, 5) === term.slice(0, 5) || term.length >= 5 && token.length >= 5 && editDistance(token, term) <= 1);
	};
	const matched = terms.filter(matchesTerm);
	if (terms.some((term) => /^\d+$/.test(term)) && matched.length !== terms.length) return 0;
	if (matched.length === 0) return 0;
	const titleMatches = terms.filter((term) => {
		if (/^\d+$/.test(term)) return containsNumericToken(title, term);
		return title.includes(term) || term.length >= 5 && (title.match(/[\p{L}\p{N}]+/gu) ?? []).some((token) => editDistance(token, term) <= 1);
	}).length;
	const phraseBoost = phrase.length > 2 && text.includes(phrase) ? 3 : 0;
	return matched.length * 2 + titleMatches * 2 + phraseBoost;
}
function searchCategoryMatches(query, category) {
	const normalized = normalize$5(query);
	const active = [
		[["voto", "voti"], (value) => value === "Voto" || value === "Materia"],
		[[
			"compito",
			"compiti",
			"esercizio",
			"esercizi"
		], (value) => value.startsWith("Compito")],
		[[
			"circolare",
			"circolari",
			"avviso",
			"avvisi"
		], (value) => value === "Circolare"],
		[["promemoria", "promemoria"], (value) => value === "Promemoria"],
		[["diario", "attivita"], (value) => value === "Diario"],
		[["nota", "note"], (value) => value === "Nota"],
		[[
			"interrogazione",
			"interrogazioni",
			"orale",
			"orali"
		], (value) => value.startsWith("Interrogazione")]
	].find(([terms]) => terms.some((term) => normalized.includes(term)));
	return active ? active[1](category) : true;
}
function searchStatusMatches(query, category) {
	const normalized = normalize$5(query);
	if (!category.startsWith("Compito") && !category.startsWith("Interrogazione")) return true;
	const asksCompleted = /\b(?:completat|svolt|finit|fatt)\w*/.test(normalized);
	const asksOpen = normalized.includes("da fare") || normalized.includes("non complet") || normalized.includes("apert");
	if (asksCompleted && !asksOpen) return category.includes("completat");
	if (asksOpen && !asksCompleted) return !category.includes("completat");
	return true;
}
function searchAssistantData(query, data, interrogazioni = [], limit = 6) {
	const terms = assistantSearchTerms(query);
	if (terms.length === 0) return [];
	const phrase = normalize$5(query.replace(/^\s*(?:(?:per favore)\s+)?(?:cerca(?:re)?|trova(?:re)?|ricerca(?:\s+rapida)?)\s*/i, "").trim());
	const records = [];
	for (const subject of data.subjects) {
		const grades = [...subject.grades].sort((a, b) => b.date.localeCompare(a.date)).map((grade) => `${grade.label} (${dateLabel$1(grade.date)}${grade.comment ? `, ${grade.comment}` : ""})`);
		records.push({
			category: "Materia",
			title: subject.name,
			detail: [subject.teacher ? `Docente: ${subject.teacher}` : "", grades.length ? `Voti: ${grades.join("; ")}` : "Nessun voto registrato"].filter(Boolean).join(" · "),
			searchableText: `${subject.teacher ?? ""} ${subject.grades.map((grade) => `${grade.label} ${grade.type} ${grade.comment ?? ""}`).join(" ")}`
		});
	}
	for (const subject of data.subjects) for (const grade of subject.grades) records.push({
		category: "Voto",
		title: `${grade.label} · ${subject.name}`,
		detail: [
			dateLabel$1(grade.date),
			grade.type,
			grade.comment
		].filter(Boolean).join(" · "),
		searchableText: `${subject.name} ${subject.teacher ?? ""} ${grade.label} ${grade.type} ${grade.comment ?? ""}`
	});
	for (const assignment of data.assignments) records.push({
		category: assignment.completed ? "Compito completato" : "Compito",
		title: assignment.title,
		detail: [
			assignment.subject,
			dateLabel$1(assignment.dueDate),
			assignment.details
		].filter(Boolean).join(" · "),
		searchableText: `${assignment.title} ${assignment.subject ?? ""} ${assignment.details ?? ""} ${assignment.completed ? "completato svolto fatto" : "da fare aperto"}`
	});
	for (const notification of data.notifications) {
		const category = notification.type === "notice" ? "Circolare" : notification.type === "reminder" ? "Promemoria" : notification.type === "note" ? "Nota" : "Notifica voto";
		records.push({
			category,
			title: notification.title,
			detail: [
				dateLabel$1(notification.date),
				notification.subject,
				notification.message,
				notification.attachmentName,
				...(notification.attachments ?? []).map((attachment) => attachment.name)
			].filter(Boolean).join(" · "),
			searchableText: `${notification.title} ${notification.subject ?? ""} ${notification.message ?? ""} ${notification.attachmentName ?? ""} ${(notification.attachments ?? []).map((attachment) => attachment.name ?? "").join(" ")}`
		});
	}
	for (const entry of data.diary) records.push({
		category: "Diario",
		title: entry.subject ? `${entry.subject} · ${dateLabel$1(entry.date)}` : `Attività · ${dateLabel$1(entry.date)}`,
		detail: [
			entry.teacher,
			entry.hour,
			entry.activity
		].filter(Boolean).join(" · "),
		searchableText: `${entry.subject ?? ""} ${entry.teacher ?? ""} ${entry.activity}`
	});
	for (const exam of interrogazioni) records.push({
		category: exam.completed ? "Interrogazione completata" : "Interrogazione",
		title: exam.subject,
		detail: [
			dateLabel$1(exam.date),
			exam.hour ? `${exam.hour}ª ora` : exam.time,
			exam.notes
		].filter(Boolean).join(" · "),
		searchableText: `${exam.subject} ${exam.notes ?? ""} ${exam.checklist.map((item) => item.label).join(" ")}`
	});
	return records.filter((result) => searchCategoryMatches(query, result.category)).filter((result) => searchStatusMatches(query, result.category)).map((result) => ({
		result,
		score: rankResult(result, terms, phrase)
	})).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title, "it")).slice(0, Math.max(1, limit)).map(({ result }) => result);
}
function formatAssistantSearchResults(results) {
	if (results.length === 0) return "Non ho trovato corrispondenze nei dati caricati. Prova con una parola più breve o controlla che i dati siano stati sincronizzati.";
	const categories = [...new Set(results.map((result) => result.category))];
	const scope = categories.length === 1 ? ` di ${categories[0].toLocaleLowerCase("it-IT")}` : "";
	return `Ho trovato ${results.length} ${results.length === 1 ? "risultato" : "risultati"}${scope} nei dati locali dell’app:\n${results.map((result) => `• ${result.category}: ${result.title}${result.detail ? ` — ${result.detail}` : ""}`).join("\n")}`;
}
//#endregion
//#region src/lib/voto/regulation-corpus.ts
var REGULATION_CORPUS = [
	{
		page: 1,
		text: "REGOLAMENTO D’ISTITUTO 1"
	},
	{
		page: 2,
		text: "PREMESSA Il buon funzionamento di un Istituto dipende dai rapporti tra le diverse componenti e dalla correttezza comportamentale. Al fine, pertanto, di prevenire comportamenti scorretti e favorire i rapporti tra le diverse componenti, nel regolamento d’Istituto sono state individuate alcune disposizioni a cui è fondamentale attenersi. Il rispetto delle regole del convivere civile, prime fra tutti la cura e il rispetto di sé, degli altri e dell’ambiente che si frequenta, è condizione fondamentale affinché la scuola possa assolvere al suo compito educativo, formativo e didattico."
	},
	{
		page: 2,
		text: "I diritti e i doveri irrinunciabili delle persone si garantiscono a partire dal senso di responsabilità che ciascuno sa maturare interiormente ed esercitare con coerenza professionale ed etica. Tutte le componenti della comunità scolastica concorrono, con pari dignità e nella diversità dei ruoli, alla educazione ai valori condivisi -verificati e sperimentati nel quotidiano, alla partecipazione sociale, alla realizzazione del diritto allo studio, al recupero delle situazioni di svantaggio e alla promozione del merito."
	},
	{
		page: 2,
		text: "Il presente regolamento è conforme e si richiama ai principi e alle norme dello \"Statuto delle Studentesse e degli Studenti\", emanato con il D.P.R. 24 giugno 1998 n. 249 così come modificato ed integrato dal D.P.R. 235/07, e al Regolamento dell'Autonomia delle Istituzioni scolastiche, emanato con il D.P.R. 8 marzo 1999 n. 275, del D.P.R. 10 ottobre 1996, n. 567, e sue modifiche e integrazioni. È coerente e funzionale al Piano dell'Offerta Formativa adottato dall'Istituto. Il presente regolamento è stato redatto e approvato dal Consiglio d’Istituto ai sensi dell'art. 10.3, comma a, delD.Lgs. 297/1994 ed ha pertanto carattere vincolante."
	},
	{
		page: 2,
		text: "È uno strumento a carattere formativo, che definisce le corrette norme relazionali e procedurali alle quali far riferimento, il cui rispetto diviene indice di consapevole e responsabile partecipazione alla vita scolastica. Tutte le componenti operanti nella scuola, ciascuna nel rispetto del proprio ruolo e secondo le proprie competenze, si impegnano ad osservare e a far osservare il presente regolamento."
	},
	{
		page: 3,
		text: "PRINCIPI GENERALI La scuola si propone come luogo di educazione in senso ampio, che promuove il processo di apprendimento, l'acquisizione delle conoscenze e lo sviluppo delle competenze e della coscienza critica degli studenti. La scuola garantisce il diritto all’apprendimento di tutti e di ciascuno, nel rispetto della professionalità del corpo docente e della libertà d'insegnamento. Il diritto all'apprendimento è garantito a ciascuno studente anche attraverso la realizzazione di percorsi individualizzati e personalizzati, tesi a promuoverne il successo formativo."
	},
	{
		page: 3,
		text: "Il presente regolamento si ispira ai seguenti principi fondanti: Uguaglianza: il servizio scolastico è improntato al pieno rispetto dei diritti e degli interessi dell’alunno. All’interno della scuola nessuna discriminazione può essere compiuta per motivi riguardanti le condizioni socio- economiche, psico-fisiche, di lingua, di sesso, di etnia, di religione o di opinioni politiche. Imparzialità, equità e trasparenza: i soggetti erogatori del servizio scolastico agiscono secondo criteri di obiettività, equità e trasparenza."
	},
	{
		page: 3,
		text: "La scuola si impegna a garantire la vigilanza, la continuità del servizio e delle attività educative nel rispetto dei principi e delle norme sancite dalla legge; si impegna, inoltre, a rendere noti finalità, obiettivi e metodi dell’attività didattica, i criteri di valutazione, le procedure relative ai provvedimenti disciplinari. Accoglienza ed integrazione: la scuola favorisce l’accoglienza dei genitori e degli alunni, con particolare riguardo alla fase di ingresso alle classi iniziali e alle situazioni di rilevante necessità."
	},
	{
		page: 3,
		text: "Attraverso il coordinamento con i servizi sociali, con gli enti locali e con le associazioni senza fine di lucro, la scuola pone in essere le azioni adatte ad avviare a soluzione le problematiche relative agli studenti stranieri, agli alunni con Bisogni Educativi Speciali e, più in generale, agli studenti svantaggiati. Partecipazione: la scuola garantisce la partecipazione attiva e responsabile degli studenti alla vita della scuola. TITOLO I – DOCENTI ART. 1 - DIRITTI Ogni docente ha il diritto di:"
	},
	{
		page: 4,
		text: "- vedere riconosciuta la qualità del proprio lavoro ed essere trattato con rispetto da tutti i membri della comunità scolastica; - operare scelte personali relativamente a programmi, strumenti di valutazione e metodologie didattiche, nel rispetto delle norme vigenti e delle delibere dei competenti Organi Collegiali."
	},
	{
		page: 4,
		text: "ART. 2 - DOVERI È dovere di ogni docente: - partecipare alla definizione comune dell’offerta formativa, degli obiettivi didattici, dei criteri di valutazione e delle metodologie didattiche; - contribuire all’attuazione dei progetti didattici decisi collegialmente; - garantire l’uso di metodologie didattiche aggiornate secondo le più recenti indicazioni delle Scienze dell’Educazione, adeguate alle discipline di studio e alle caratteristiche degli studenti; - favorire l’innovazione metodologico-didattica; - rispettare la personalità degli studenti, la loro identità sessuale, la loro coscienza e le loro credenze; - contribuire ad alimentare un clima democratico, di partecipazione e di scambio di idee ed esperienze; - mantenere o sollecitare un rapporto collaborativo con le famiglie; - fornire agli studenti:  una informazione preventiva in merito alle modalità di insegnamento, ai criteri di valutazione e alle opportunità di recupero;  una comunicazione tempestiva degli esiti della valutazione delle prove di verifica (il giorno stesso della prova per le verifiche orali, entro quindici giorni per le verifiche scritte/pratiche e per le prove autentiche);  una informazione trasparente e periodica sull’andamento del profitto."
	},
	{
		page: 4,
		text: "Durante le lezioni i docenti:  vigilano sui comportamenti degli studenti affinché non sia procurato danno alle persone e alle cose;  vigilano sull’osservanza da parte degli studenti delle norme di sicurezza e delle disposizioni dei Regolamenti vigenti all’interno dell’Istituto;  vigilano nelle aule e nei laboratori perché siano rispettati arredi, suppellettili e attrezzature;  vigilano affinché non siano imbrattati gli ambienti;  non consentono l’uscita dalla classe a più di uno studente per volta per la fruizione dei servizi igienici, tranne in casi eccezionali debitamente motivati;  non consentono agli studenti l’uscita dalla classe per l’acquisto di snacks e bevande"
	},
	{
		page: 5,
		text: "presso i distributori automatici, tranne in casi eccezionali debitamente motivati.  Il Docente deve dare il cambio dell’ora tempestivamente dopo il suono della campana;  Il Docente deve affidare temporaneamente la classe al collaboratore scolastico, presente nel piano, in caso di necessità o in caso di ritardo nel cambio dell’ora da parte dell’insegnante subentrante;  Il Docente deve restare a scuola nelle ore a disposizione per l’intera durata dell’ora;  Il Docente e o il Coordinatore di classe deve avvertire subito l’Ufficio di Presidenza nei casi in cui gli alunni si assentino in massa, senza alcuna giustificazione, o siano presenti pochi elementi.  Il Docente deve prendere visione delle eventuali comunicazioni del DS, pubblicate all’albo ovvero inviate via email."
	},
	{
		page: 5,
		text: "È fatto obbligo, al rientro da eventuali assenze, prendere visione delle circolari e degli avvisi emanati durante il periodo di assenza. Le comunicazioni del DS dono da ritenersi degli ordini di servizio a tutti gli effetti; pertanto, il DS ne risponde in ordine alla legittimità dell’ordine impartito ed il docente per quanto concerne la esecutività dello stesso.  Durante le lezioni i docenti non possono utilizzare il telefono cellulare per motivi personali (C.M., N. 362, PROT. 30885/bl)  Il Docente è tenuto a rispettare il divieto di fumo in tutti i locali dell’edificio scolastico, scale antincendio comprese, ed in tutte le aree di pertinenza dell’istituto."
	},
	{
		page: 5,
		text: "Il suddetto divieto è chiaramente in vigore durante tutto il periodo di permanenza all’interno della scuola, incluso il periodo dell’intervallo, durante il quale è vietato uscire dal perimetro scolastico. Tale divieto ai sensi del Decreto Legge 12 settembre 2013, n. 104, Misure urgenti in materia di istruzione, università e ricerca (GU Serie Generale n.214 del 12-9- 2013), art. n°4 e n°51."
	},
	{
		page: 5,
		text: "I DOCENTI CHE SI ASSENTANO PER MOTIVI DI SALUTE SONO TENUTI A:  comunicare entro le ore 8:00 telefonicamente l’assenza e formulare la richiesta tramite registro elettronico;  confermare o meno il domicilio abituale.  I docenti che chiedono un permesso per motivi di famiglia sono tenuti a farne richiesta scritta e ad allegare un’autocertificazione relativa al motivo dell’assenza.  I docenti che chiedono un permesso breve in orario di servizio sono tenuti a farne richiesta scritta, specificando il giorno, l’ora e il motivo dell’assenza (le ore devono essere recuperate). ART. 3 - ORARIO DI INIZIO DEL SERVIZIO Ogni docente, anche quando è a disposizione volontaria o disposta d’ufficio per la"
	},
	{
		page: 6,
		text: "sostituzione dei colleghi assenti, dev’essere presente almeno cinque minuti prima dell’inizio del suo orario di servizio, per vigilare sugli studenti in ingresso, nei cambi d’ora e per assicurare il puntuale avvio della lezione. ART. 4 – TENUTA DEI REGISTRI 4.1– REGISTRO DI CLASSE Ogni docente è tenuto a compilare il registro elettronico di classe in ogni parte di sua competenza."
	},
	{
		page: 6,
		text: "È necessario annotare le assenze ed i permessi relativi agli studenti, le attività svolte comprese quelle di recupero e sostegno in itinere -, prendere visione e dare lettura alla classe (ove necessario) delle comunicazioni del Dirigente Scolastico diffuse mediante il registro elettronico, annotare i richiami disciplinari, registrare ogni altra nota significativa inerente all’organizzazione dell’attività didattica della classe. I docenti della prima ora sono tenuti a richiedere la giustificazione per le assenze effettuate dagli alunni nei giorni precedenti. Se il docente della prima ora è assente, la classe viene affidata alla vigilanza del collaboratore in attesa del docente- sostituto."
	},
	{
		page: 6,
		text: "Gli alunni che non giustificano un'assenza entro i 3 giorni successivi saranno ammessi in classe con riserva e con annotazione sul registro di classe; al quarto giorno di dimenticanza, il coordinatoredi classe informerà i genitori ed il giorno successivo saranno tenuti ad accompagnare il figlio a scuola; se ciò non dovesse avvenire, lo studente dovrà essere autorizzato, con annotazione sul registro di classe, dal Dirigente Scolastico o da uno dei docenti delegati ai permessi. Le assenze non giustificate incidono negativamente nella valutazione del comportamento."
	},
	{
		page: 6,
		text: "REGISTRO PERSONALE DEL PROFESSORE Ogni docente è tenuto a compilare in ogni sua parte e a tenere aggiornato il proprio registro personale elettronico, che è del pari obbligatorio in quanto strumento e documento dell’attività amministrativa. Tutte le annotazioni relative alle valutazioni e ai giudizi, nonché all’attività svolta non devono essere crittografate. 4.2 – REGISTRI DEI LABORATORI Tutti i docenti, quando fanno uso dei laboratori per le attività didattiche con le classi o a livello personale, devono attenersi ai rispettivi Regolamenti, richiamandone il rispetto da parte degli allievi."
	},
	{
		page: 6,
		text: "Inoltre i docenti devono compilare l’apposito “Registro delle attività di laboratorio” in tutte le parti richieste, in quanto, responsabili della sicurezza degli studenti e del buon uso"
	},
	{
		page: 7,
		text: "delle attrezzature. 4.3 – REGISTRI DELLE ATTIVITÀ EXTRACURRICOLARI INTEGRATIVE I docenti devono annotare negli appositi registri l’effettuazione di attività di recupero, sostegno, di attività integrative, PCTO, commissioni di lavoro e altro, a documentazione dell’attività svolta che costituisca titolo per l’accesso al fondo d’Istituto. TITOLO II – STUDENTI ART. 5 – PRINCIPI FONDAMENTALI La scuola promuove lo sviluppo fisico, spirituale, morale, culturale e sociale dello studente. Questi è “cittadino della scuola”, gode di diritti e risponde dei propri doveri. Si impegna per raggiungere il successo negli studi per il bene proprio e della collettività in cui è inserito."
	},
	{
		page: 7,
		text: "Per raggiungere tale obiettivo primario dovrà organizzare il proprio tempo, le proprie attività e adeguare i propri comportamenti. In particolare si precisa che: È vietato l’uso di sostanze tossiche, di sostanze chimiche all’esterno dei laboratori, l’uso libero da parte degli alunni di attrezzi appuntiti o taglienti, l’uso libero da parte degli alunni di apparecchi alimentati elettricamente."
	},
	{
		page: 7,
		text: "È vietato altresì che eventuale trasferimento di materiali, suppellettili, arredi ingombranti sia a carico degli alunni È vietato, tassativamente, riprendere immagini o filmare compagni o docenti con i videotelefonini (si fanno presenti le gravi conseguenze connesse alla diffusione di immagini altrui senza l’acquisizione delle dovute autorizzazioni nel rispetto della normativa vigente).L’utilizzo non autorizzato del cellulare in classe si configura, a norma del Regolamento di Disciplina dell’Istituto: come mancanza disciplinare lieve sanzionabile, con ammonizione scritta sul registro di classe ( da parte del docente); in caso di uso reiterato, come mancanza grave, sanzionabile, con censura scritta (da parte del D.S.), o con allontanamento temporaneo dalla comunità scolastica da 1 a 15 giorni (su decisione del Consiglio di Classe)."
	},
	{
		page: 7,
		text: "In caso di necessità studenti e docenti possono utilizzare gli apparecchi telefonici della segreteria. E’vietato utilizzare, telefono cellulare o altri dispositivi elettronici durante lo svolgimento delle attività didattiche Il provvedimento ministeriale (circolare n° 3392 del 16 giugno 2025) che vieta l’uso del cellulare (e di altri dispositivi elettronici) in classe, ribadisce come possa essere un elemento di distrazione e di grave mancanza di rispetto per i docenti e i compagni. In questi casi si compie un’infrazione che ha risvolti sanzionabili attraverso provvedimenti disciplinari da parte della scuola, provvedimenti orientati a prevenire e scoraggiare tali pratiche. Pertanto: Nella scuola è fatto divieto per gli alunni di portare il cellulare. Qualora alcune famiglie,"
	},
	{
		page: 8,
		text: "per motivi plausibili, ritengano necessario che i propri figli debbano averlo con sé, dovranno inoltrare motivata richiesta in direzione, la quale valuterà le ragioni esposte ed eventualmente concederà deroga. Gli alunni autorizzati, al loro arrivo in classe, dovranno consegnare il cellulare ai docenti prima dell'inizio delle lezioni e ritirarlo al termine delle stesse. Il mancato rispetto di tale disposizione e l’uso improprio del cellulare durante la permanenza a scuola, saranno oggetto di immediato ritiro dello strumento da parte dei docenti e di successivi provvedimenti disciplinari."
	},
	{
		page: 8,
		text: "A parziale deroga ƒ gli studenti, considerato il grado di maturazione dell’età, potranno portare con sé il cellulare durante le uscite di almeno una giornata intera. ƒ Nelle uscite che si realizzano nell’arco della mattinata, gli insegnanti ne consentiranno l’uso in base alle condizioni ed alle eventuali necessità di tipo didattico o logistico. ƒ L’uso del cellulare può essere consentito, sempre a discrezione dell’insegnante, in caso di lezioni che prevedano l’uso di strumentazioni multimediali. Ogni attività deve sempre essere regolamentata dalla presenza vigile dei docenti."
	},
	{
		page: 8,
		text: "Durante lo svolgimento delle lezioni, i docenti non possono essere distolti dal servizio in classe (interlocuzioni con estranei, presenza non autorizzata di rappresentanti, telefonate…). Tutte le comunicazioni saranno fornite al docente al termine del servizio o filtrate dai collaboratori scolastici. Altri adempimenti (telefonate, servizi di segreteria, adempimenti amministrativi, altro) vanno compiuti in orario diverso dal servizio. Sono naturalmente fatti salvi gravi e urgenti motivi. In questo caso deve essere altresì assicurata la vigilanza della classe. Durante losvolgimentodell’attività didattica il personaledocentee ATAnon puòfare uso di dispositivi informatici non espressamente autorizzati."
	},
	{
		page: 8,
		text: "L’uso autorizzato per soli fini didattici e/o amministrativi (registro elettronico, bacheca, cellulare) esclude categoricamente l’accesso ad ogni piattaforma social e/o account personale. ART. 6 – DIRITTI Gli studenti con le loro potenzialità, aspirazioni ed esigenze costituiscono il centro e la ragione d’essere del processo educativo promosso dall’istituto. La scuola si propone di favorire la loro autonomia coinvolgendoli gradualmente nella responsabilità della loro formazione e nell’espressione della loro individualità. In particolare, la scuola, si impegna a riconoscere agli studenti i diritti previsti dallo \"Statuto delle studentesse e degli studenti della scuola secondaria\":"
	},
	{
		page: 9,
		text: "1. Gli studenti hanno diritto ad una formazione culturale e professionale qualificata che rispetti e valorizzi, anche attraverso l'orientamento, l'identità di ciascuno e sia aperta alla pluralità delle idee. La scuola persegue la continuità dell'apprendimento e valorizza le inclinazioni personali degli studenti, anche attraverso un'adeguata informazione, la possibilità di formulare richieste, di sviluppare temi liberamente scelti e di realizzare iniziative autonome. 2. La comunità scolastica promuove la solidarietà tra i suoi componenti e tutela il diritto dello studente alla riservatezza. 3. Lo studente ha diritto di essere informato sulle decisioni e sulle norme che regolano la vita della scuola. 4."
	},
	{
		page: 9,
		text: "Lo studente ha diritto alla partecipazione attiva e responsabile alla vita della scuola. Il dirigente scolastico e i docenti attivano con gli studenti un dialogo costruttivo sulle scelte di loro competenza in tema di programmazione e definizione degli obiettivi didattici, di organizzazione della scuola, di criteri di valutazione, di scelta dei libri e del materiale didattico. Lo studente ha inoltre diritto a una valutazione trasparente e tempestiva, volta ad attivare un processo di auto valutazione che lo conduca a individuare i propri punti di forza e di debolezza e a migliorare il proprio rendimento. 5."
	},
	{
		page: 9,
		text: "Nei casi in cui una decisione influisca in modo rilevante sull'organizzazione della scuola gli studenti della scuola secondaria superiore, anche su loro richiesta, possono essere chiamati ad esprimere la loro opinione mediante una consultazione. 6. Gli studenti hanno diritto alla libertà di apprendimento ed esercitano autonomamente il diritto di scelta tra le attività curricolari integrative e tra le attività aggiuntive facoltative offerte dalla scuola. Le attività didattiche curricolari e le attività aggiuntive facoltative sono organizzate secondo tempi e modalità che tengono conto dei ritmi di apprendimento e delle esigenze di vita degli studenti. 7."
	},
	{
		page: 9,
		text: "Gli studenti stranieri hanno diritto al rispetto della vita culturale e religiosa della comunità alla quale appartengono. La scuola promuove e favorisce iniziative volte all’accoglienza e alla tutela della loro linguae alla realizzazione di attività interculturali. 8. Gli studenti, al fine di attivare un processo di autovalutazione che li conduca ad individuare i propri punti di forza e di debolezza e a migliorare il proprio rendimento, hanno il diritto di conoscere tempestivamente gli esiti della valutazione delle verifiche cui sono sottoposti: il giorno stesso della prova per le verifiche orali, entro quindici giorni per le verifiche scritte/pratiche e per le prove autentiche. 9."
	},
	{
		page: 9,
		text: "Gli studenti hanno il diritto di conoscere i criteri di valutazione delle diverse tipologie di prove di verifica cui sono sottoposti, che - negli aspetti generali - sono preventivamente approvati dai competenti Organi Collegiali. ART. 7 – DOVERI"
	},
	{
		page: 10,
		text: "Ogni studente deve contribuire all’efficacia, all’efficienza e alla qualità della vita di relazione all’interno dell’Istituto. • Lo studente è tenuto a frequentare regolarmente le lezioni ed assolvere assiduamente gli impegni di studio. • Lo studente è tenuto ad osservare le disposizioni organizzative e di sicurezza dettate dal regolamento d’Istituto. • Nell’esercizio dei suoi diritti lo studente è tenuto a mantenere un comportamento responsabile e corretto sia a scuola che in ambienti esterni durante le attività didattiche organizzate dalla scuola. In particolare, gli studenti hanno il dovere di: 1."
	},
	{
		page: 10,
		text: "Frequentare regolarmente i corsi e assolvere assiduamente gli impegni di studio (gli studenti non partecipanti alle visite ed ai viaggi di istruzione devono frequentare le lezioni previste per la classe). 2. Assumere un comportamento corretto durante le attività didattiche: gli alunni non devono alzarsi dal posto loro assegnato senza autorizzazione del docente, né parlare tra di loro di argomenti non correlati alla lezione in modo tale da non consentire l’azione didattica. Comunque non devono proseguire dopo il primo richiamo del docente. 3."
	},
	{
		page: 10,
		text: "Assumere un comportamento corretto durante le prove di verifica: non devono suggerire, copiare o usare sussidi o sistemi non autorizzati né alterare o falsificare le prove e/o le valutazioni delle stesse. 4. Avere nei confronti del Dirigente scolastico, dei docenti, del personale ATA della scuola e dei compagni lo stesso rispetto, anche formale, che chiedono per sé stessi. Tutti gli studenti sono tenuti ad un abbigliamento e ad un linguaggio adeguati al luogo. 5. Nell'esercizio dei loro diritti e nell'adempimento dei loro doveri gli studenti sono tenuti a mantenere un comportamento corretto e coerente con il principio della civile convivenza. 6."
	},
	{
		page: 10,
		text: "Osservare le disposizioni organizzative e di sicurezza dettate dal presente regolamento e tutte le altre disposizioni di funzionamento emanate successivamente ad integrazione del presente regolamento 7. Utilizzare correttamente le strutture, i macchinari e i sussidi didattici e a comportarsi nella vita scolastica in modo da non arrecare danni al patrimonio della scuola. 8. Condividere la responsabilità di rendere accogliente l'ambiente scolastico e di averne cura come importante fattore di qualità della vita della scuola."
	},
	{
		page: 10,
		text: "All'inizio di ogni anno scolastico, gli alunni e i rispettivi genitori devono sottoscrivere consegnare al coordinatore di classe una dichiarazione di presa visione e accettazione dei Regolamenti vigenti nell’Istituto e del “Patto di corresponsabilità”, e tutte le disposizioni successive emanate ad integrazione del presente regolamento a che vengono pubblicati"
	},
	{
		page: 11,
		text: "sul sito web della scuola. Al presente regolamento si allega la griglia di valutazione del comportamento che verrà utilizzata per l’attribuzione del voto di comportamento. ART. 8 – REGOLAMENTO DISCIPLINARE DEGLI STUDENTI Il regolamento disciplinare degli studenti raccoglie le norme che regolano il comportamento degli studenti, le infrazioni, le sanzioni (ordinarie e alternative), le procedure disciplinari, le modalità di ricorso e il funzionamento dell’Organo di Garanzia interno all’Istituto."
	},
	{
		page: 11,
		text: "Il regolamento disciplinare degli studenti fa parte integrante dei regolamenti interni dell’Istituto ed è adottato/aggiornato con delibera del Consiglio d’Istituto ART. 9 – ASSOCIAZIONI DEGLI STUDENTI E UTILIZZO DEGLI SPAZI DELLA SCUOLA Così come previsto dal D.P.R. 567/96 e ss.mm.ii., gli studenti hanno diritto di associarsi liberamente all'interno dell'Istituto. Ogni associazione si dà uno statuto, approvato dalla maggioranza dei suoi componenti, depositato agli atti della scuola e dato in visione al Consiglio di Istituto."
	},
	{
		page: 11,
		text: "Gli studenti hanno diritto ad utilizzare gli spazi della scuola, in orario extracurricolare, al fine di svolgere iniziative come singoli o come associazioni, previa autorizzazione da parte del Dirigente Scolastico o di un suo delegato (DPR 10.10.96 n°567 e DPR 09.04.99 n°156). ART. 10 – LIBERTÀ DI ESPRESSIONE Gli studenti sono liberi di esprimere il loro pensiero con le parole e con lo scritto, nel rispetto della libertà e dei diritti altrui. Nell'ambito dell'Istituto, possono redigere, esporre in appositi spazi e diffondere fogli e periodici che testimonino la loro partecipazione alla società civile."
	},
	{
		page: 11,
		text: "Gli stessi saranno pubblicati solo a condizione che risulti manifesta la fonte, che non contengano violazioni di legge e previa autorizzazione da parte del Dirigente Scolastico. ART. 11 – ASSEMBLEA D’ISTITUTO E' consentito lo svolgimento di un'assemblea di istituto al mese (fatta eccezione per gli ultimi trenta giorni). Durante le ore di assemblea le lezioni delle classi coinvolte sono sospese. L'assemblea deve essere richiesta dalla maggioranza dei rappresentanti degli studenti in seno al Consiglio d’Istituto, ovvero dalla maggioranza (la metà più uno) dei membri del Comitato studentesco (art.43 D.P.R. 416/74) ovvero da almeno il 10% degli studenti."
	},
	{
		page: 11,
		text: "All’atto della richiesta bisogna evitare che l’assemblea si svolga sempre nello stesso giorno della settimana in cui si sono svolte le assemblee precedenti. La richiesta va inoltrata con almeno 5 (cinque) giorni di anticipo, mediante apposito"
	},
	{
		page: 12,
		text: "modulo fornito dalla scuola, e deve contenere l'ordine del giorno proposto. L’assemblea viene autorizzata dal Dirigente scolastico. La partecipazione all’assemblea di istituto è consentita esclusivamente agli studenti iscritti all'Istituto. Saranno presenti, nel caso che ne facciano richiesta, anche dei rappresentanti dei genitori. È prevista la possibilità di far partecipare anche esperti di problemi sociali, culturali, artistici e scientifici, indicati dai promotori dell'assemblea contestualmente con la presentazione dell'ordine del giorno. Detta partecipazione deve essere autorizzata dal Dirigente Scolastico."
	},
	{
		page: 12,
		text: "Anche la visione di film o documentari dovrà essere sottoposta all'approvazione del Dirigente Scolastico. L'assemblea è presieduta da uno studente liberamente eletto dagli studenti; il Presidente nomina un segretario per la stesura del verbale che, alla fine della seduta, viene consegnato al Dirigente scolastico. Il Presidentedell'assemblea si fagarantedel corretto svolgimentodei lavori. In caso di constatata impossibilità di corretto ed ordinato svolgimento dell'assemblea, il Dirigente Scolastico (o un suo delegato) può intervenire e scioglierla."
	},
	{
		page: 12,
		text: "Qualora il disturbo ai lavori dell’Assemblea provenga da singoli studenti, il docente in servizio nella classe allontana costoro e, unitamente alla classe di appartenenza, riprende il regolare svolgimento delle lezioni. ART. 12 – ASSEMBLEA DI CLASSE L'assemblea di classe degli studenti è consentita una volta al mese (fatta eccezione per gli ultimi trenta giorni delle lezioni) e nel limite di due ore di lezione. L’assemblea si svolge nel luogo individuato dal Dirigente Scolastico tenendo conto delle esigenze di sicurezza. L'assemblea deve essere richiesta dai rappresentanti di classe o da almeno il 50% + 1 degli studenti della classe."
	},
	{
		page: 12,
		text: "La richiesta, inoltrata con almeno 5 giorni di anticipo mediante apposito modulo disponibile in Vicepresidenza, deve contenere l'ordine del giorno, la data, l'ora e la firma degli insegnanti presenti nelle ore indicate. Gli insegnanti hanno il dovere di dare, a turno, la disponibilità delle proprie ore; per nessun motivo saranno concesse assemblee da tenersi nei laboratori. L'assemblea è presieduta dai rappresentanti di classe, i quali provvedono anche alla stesura del verbale che, alla fine della seduta, viene consegnato in Vicepresidenza. Il docente dell'ora vigila sul corretto svolgimento dell'assemblea."
	},
	{
		page: 12,
		text: "Può concordare con la classe stessa di non essere fisicamente presente, per rispettare gli spazi di autonomia degli studenti; tuttavia, deve garantire il costante rispetto del Regolamento nonché l’ordinato"
	},
	{
		page: 13,
		text: "svolgimento dell’assemblea, rimanendo a disposizione degli studenti e reperibile con certezza in qualunque momento. In caso di infrazioni al Regolamento e di palese assenza di dibattito, il docente in servizio è autorizzato a sospendere l’assemblea, annotando l’interruzione sul registro di classe. L'assemblea di classe può essere utilizzata per lo svolgimento di attività di ricerca, di seminario e per lavori di gruppo. TITOLO III – FAMIGLIE ART. 13 – RAPPORTI SCUOLA – FAMIGLIA Il rapporto Scuola-Famiglia è quotidiano, attraverso la consultazione del sito internet dell’Istituto per tutto ciò che attiene l’organizzazione e lo svolgimento della vita scolastica."
	},
	{
		page: 13,
		text: "Accedendo tramite password personale fornita dall’Istituto, la Famiglia potrà, altresì, consultare il registro elettronico della classe del proprio figlio e visionare in area riservata assenze, ritardi d’ingresso, uscite anticipate e note disciplinari relativi al medesimo. Al raggiungimento del numero massimo mensile di ritardi brevi o ingressi alla seconda ora, la Scuola ne darà comunicazione alla Famiglia telefonicamente o tramite email, secondo la preferenza da quest’ultima espressa, al numero di telefono o all’indirizzo di posta elettronica da essa forniti alla Segreteria Didattica."
	},
	{
		page: 13,
		text: "L’Istituto si riserva in ogni caso la possibilità di inviare alla famiglia ulteriori comunicazioni (telefonica, email o raccomandata), in presenza di specifiche situazioni o circostanze meritevoli di segnalazione. Gli incontri generali Scuola-Famiglia si svolgono durante l’anno scolastico nella fase centrale di ciascun periodo didattico, per le dovute e necessarie informazioni alle famiglie sull’andamento didattico e disciplinare degli studenti."
	},
	{
		page: 13,
		text: "Ai genitori di studenti maggiorenni che abbiano dichiarato di mantenere agli studi il proprio figlio e richiesto di essere informati sul suo andamento didattico e disciplinare, le informazioni saranno fornite solo ove il figlio stesso abbia autorizzato espressamente e per iscritto la scuola a dare tali informazioni. La scuola per il tramite del dirigente scolastico o di persona delegata si riserva di comunicare ai genitori anche degli alunni maggiorenni ogni azione e/o comportamento non consono espressione di immaturità evidente."
	},
	{
		page: 13,
		text: "Oltre i due incontri collettivi previsti, il singolo docente potrà sempre comunicare alla famiglia/alunno maggiorenne la necessità di un incontro a scuola per problemi relativi al proprio insegnamento; in caso di problemi disciplinari che potrebbero comportare l’irrogazione di una sanzione, la richiesta di colloquio sarà avanzata dal coordinatore di classe."
	},
	{
		page: 14,
		text: "ART. 14 – ASSEMBLEE DEI GENITORI I rappresentanti dei genitori eletti in seno ai Consigli di Classe e al Consiglio d’Istituto costituiscono il Comitato dei Genitori. Il Comitato è presieduto dal Presidente del Consiglio d’Istituto. Le assemblee dei genitori possono essere di classe o d'Istituto. Qualora le assemblee si svolgano nei locali dell'Istituto, la data e l'orario di svolgimento devono essere concordati di volta in volta con il Dirigente Scolastico. L'assemblea di classe dei genitori è convocata su richiesta dei rappresentanti dei genitori nei Consigli di classe."
	},
	{
		page: 14,
		text: "Il Dirigente Scolastico, viste le motivazioni, autorizza la convocazione dell’assemblea; i genitori promotori ne danno comunicazione mediante avviso affisso all'albo rendendo noto anche l'ordine del giorno. Le risultanze dei lavori dell'assemblea devono essere comunicate per iscritto al Dirigente Scolastico. L’assemblea del Comitato dei Genitori è convocata dal Dirigente Scolastico, sentito il Presidente del Consiglio d’Istituto, ovvero dalla maggioranza del Comitato dei Genitori. In quest’ultimo caso, Il Dirigente Scolastico, vistele motivazioni, autorizza la convocazione dell’assemblea; i genitori promotori ne danno comunicazione mediante avviso affisso all'albo rendendo noto anche l'ordine del giorno."
	},
	{
		page: 14,
		text: "All'assemblea di classe o di Istituto possono partecipare con diritto di parola il Dirigente Scolastico e i docenti. TITOLO IV – ORGANIZZAZIONE INTERNA DELL’ ISTITUTO ART. 15 – ACCESSO DI MEZZI MOTORIZZATI NEGLI SPAZI ESTERNI DI PERTINENZA DELL’ISTITUTO È consentito l’ingresso con mezzi motorizzati, per il tempo strettamente necessario, ai fornitori, alle ditte incaricate di consegna merce o alle ditte di manutenzione."
	},
	{
		page: 14,
		text: "In caso di alunno con limitazioni nella deambulazione, può essere previsto l’accesso di un mezzo motorizzato (solo previa autorizzazione del Dirigente Scolastico) lievemente posticipato e un’uscita anticipata per evitare pericolosi contatti con i compagni o per agevolare movimenti dell’infortunato/a all’interno dell’aula. ART. 16 – UTILIZZO DEI CANCELLI ESTERNI PER L’USCITA DALL’ISTITUTO I cancelli esterni vengono aperti per l'uscita al suono della campanella che segna la conclusione delle attività didattiche."
	},
	{
		page: 15,
		text: "ART. 17 – ORARIO DELLE ATTIVITA' CURRICOLARI L’orario settimanale è articolato in cinque giorni (dal lunedì al venerdì) ed è distribuito Secondo la tabella di seguito indicata. L’inizio delle lezioni, salvo diversa comunicazione interna, è fissato alle ore 8:00; al suono della campanella che segna l’inizio delle lezioni gli studenti dovranno trovarsi già in classe. La fine delle lezioni è stabilita alle ore 14.30 Le pause di socializzazione sono due e si svolgono la I° delladuratadi 10minuti a cavallotralaterzae la quarta unità oraria e la II° della durata di cinque minuti a cavalo tra la quinta e la sesta unità oraria e si svolgerà, in classe."
	},
	{
		page: 15,
		text: "Orario delle lezioni SCANSIONE ORARIA LU MA ME GIO VE I 8.00-9.30 8.00-9.00 8.00-9.30 8.00-9.00 8.00-9.00 II 9.30-10.30 9.00-10.00 9.30-10.30 9.00-10.00 9.00-10.00 III 10.30-11.30 10.00-11.00 10.30-11.30 10.00-11.0010.00-11.00 IV 11.30-12.30 11.00-12.00 11.30-12.30 11.00-12.0011.00-12.00 V 12.30-13.30 12.00-13.00 12.30-13.30 12.00-13.0012.00-13.00 VI 13.30-14.30 13.00-14.30 13.30-14.30 13.00-14.3013.00-14.00 VII"
	},
	{
		page: 16,
		text: "ART. 1 8 – INGRESSO NELL’ISTITUTO 18.1-ENTRATA ED ACCOGLIENZA DEGLI ALLIEVI Dalle 7.30 alle ore 8:00 non può essere garantita la vigilanza da parte del personale scolastico. I cancelli esterni rimangono aperti soltanto per evitare ai ragazzi di stazionare in mezzo alla strada. Gli alunni attendono il suono della campanella nell’atrio degli edifici all’interno del cancello principale. Al suono della campanella (h.8:00) è consentito l’ingresso negli edifici fino a raggiungere le aule. Il personale docente deve trovarsi sul luogo di lavoro almeno 5 minuti prima dell'orario d'inizio del proprio turno di lavoro."
	},
	{
		page: 16,
		text: "Gli insegnanti possono posizionarsi sulla porta d'ingresso dell'aula in modo da vigilare sia il locale, sia il corridoio d'accesso, oppure attendere gli alunni in un lato dell’atrio di ingresso e portare tutta la classe nella propria aula al suono della campana di inizio lezioni. L’ingresso alla prima ora è previsto alle ore 8:00, gli alunni potranno essere ammessi in classe eccezionalmente fino alle ore 8:10. 18.2-NORME COMPORTAMENTALI DURANTE L'ENTRATA • I docenti della prima ora dopo aver atteso alcuni minuti l’arrivo degli alunni e chiamato l’appello avvieranno le attività didattiche."
	},
	{
		page: 16,
		text: "Le assenze vanno annotate nell’immediato nel registro di classe: Sarà cura dello stesso docente della prima ora annotare eventuali ritardi brevi ammissibili non oltre i 10 minuti dall’inizio delle lezioni. Superati i 10 minuti di ritardo l’alunno sarà ammesso in classe in seconda ora. • Per i ritardi non abituali fino a 10 minuti dall’inizio delle lezioni, è sufficiente che l’alunno ne spieghi i motivi all’insegnante della prima ora che, se li riterrà validi lo ammetterà in classe segnando una “R” sul nominativo dello studente già registrato come assente."
	},
	{
		page: 16,
		text: "Gli alunni, dopo tre ritardi, saranno riammessi in classe accompagnati dai genitori. • Se il ritardo è reiterato dovrà essere ulteriormente convocata la famiglia con eventuali conseguenze sul voto di condotta. • Gli alunni che, per motivi straordinari (visite specialistiche, casi particolari), avessero la necessità di entrare dopo l’orario di ingresso devono essere autorizzati dal Dirigente Scolastico o da un suo collaboratore. Non sono comunque ammesse entrate dopo la seconda ora di lezione. L’alunno entrerà in classe accompagnato dal collaboratore."
	},
	{
		page: 16,
		text: "È vietato al genitore entrare in classe durante l’ora di lezione. • L’ assenza dovrà essere giustificata tempestivamente mediante la funzione on-line del Registro Elettronico (o in alternativa attraverso il diario scolastico), in caso contrario, sarà considerata ingiustificata e ne verrà data notizia alla famiglia. Il controllo della presenza svolto in raccordo tra scuola e famiglia costituisce, in particolare, per i minori, garanzia di sicurezza e protezione per gli alunni ed è un atto dovuto per prevenire e"
	},
	{
		page: 17,
		text: "contrastare il fenomeno della dispersione scolastica e degli abbandoni. I ritardi vanno comunque monitorati dal coordinatore del consiglio di classe: qualora si dovessero registrare più di N°3 ritardi mensili, il docente coordinatore provvederà a inviare comunicazione scritta alla famiglia. Ritardi ed uscite anticipate contribuiscono a formare il monte ore di assenza. Per gli alunni in ritardo non può essere garantita la vigilanza. Gli alunni tutti devono entrare in modo ordinato, senza correre e spingere, dirigendosi verso la propria aula. È vietato ai genitori degli alunni accompagnare i figli all'interno dell'edificio o fino alle aule, se non espressamente autorizzati od invitati."
	},
	{
		page: 17,
		text: "Il Personale Docente, il personale ATA, e il personale docente, con funzioni di collaboratore scolastico, devono vigilare le operazioni di ingresso, richiamando gli interessati al rispetto delle norme comportamentali; tali richiami devono essere rivolti in modo pacato ed educato. Devono essere evitati in ogni caso discussioni e alterchi all’interno della scuola. 18.3-ENTRATE POSTICIPATE (ingresso seconda ora) Gli alunni che giungono a scuola in orario posticipato (seconda ora), e in modo occasionale, sono ammessi alla frequenza delle lezioni dal docente della seconda ora. L’ingresso posticipato deve comunque essere motivato e giustificato."
	},
	{
		page: 17,
		text: "Qualora gli ingressi posticipati fossero superiori a n°3 mensili l’alunno dovrà ricorrere alla autorizzazione del collaboratore scolastico vicario che avrà cura di informare il Dirigente Scolastico. Nel caso di ingressi posticipati superiori a n. 3 mensili il Coordinatore di classe avrà cura di informare la famiglia. Ogni entrata posticipata motivata che abbia carattere di continuità nel tempo deve essere preventivamente autorizzata dal dirigente scolastico, previa richiesta scritta dei genitori o di chi esercita la potestà parentale. L'insegnante di classe annoterà ogni entrata posticipata sul registro di classe."
	},
	{
		page: 17,
		text: "ART.19 USCITA DEGLI ALLIEVI L’orario completo delle attività didattiche è reso noto agli alunni e alle famiglie attraverso i canali formali. Ogni eventuale variazione anche estemporanea deve essere comunicata non oltre il giorno prima. Si fa eccezione per ogni circostanza di ordine superiore dovesse determinare una interruzione improvvisa e necessaria dell’attività didattica: sarà cura dei collaboratori del dirigente inviare messaggio alle famiglie mediante registro elettronico. I docenti avranno cura di accertarsi che tutti gli alunni abbiano lasciato i locali scolastici e che nel piazzale della scuola non sia rimasto alcuno incustodito."
	},
	{
		page: 17,
		text: "I collaboratori scolastici devono sorvegliare l'uscita dall'edificio scolastico disponendosi in modo razionale al fine di tenere sotto controllo l’intero percorso degli alunni, vigilando per tutto il periodo necessario, fino a quando siano terminate le procedure di uscita di tutti gli alunni."
	},
	{
		page: 18,
		text: "19.1-USCITE ANTICIPATE Ogni richiesta di uscita anticipata, non dovuta ad evento accaduto a scuola (malore, visita medica, altro), deve essere di norma preannunciata dal genitore e deve comunque essere motivata e giustificata. Ogni uscita anticipata che abbia carattere di continuità nel tempo deve essere preventivamente autorizzata dal dirigente scolastico, previa richiesta scritta dei genitori o di chi esercita la potestà parentale. L'insegnante di classe annoterà l'uscita anticipata sul registro."
	},
	{
		page: 18,
		text: "Eventuali uscite anticipate devono essere autorizzate dai genitori degli alunni minorenni e annotate dal docente in servizio nell’ora per la quale è richiesto esonero di frequenza (es. la richiesta di uscita prima dell’inizio della sesta ora deve essere annotata dal docente che inizia la sesta ora e non dal docente che finisce la quinta ora). L’alunno/alunna minorenne potrà uscire anticipatamente soltanto in presenza di genitore o persona delegata. Il genitore o la persona delegata compila il modulo (richiesta uscita anticipata) e lo consegna al collaboratore scolastico del plesso il quale avrà cura di consegnarlo al docente della classe."
	},
	{
		page: 18,
		text: "L’alunno/a accompagnato/a dal collaboratore stesso è affidato al genitore o persona delegata che ha firmato il permesso e che rimane in attesa all’ingresso dell’edificio. La richiesta di uscita anticipata formulata dall’alunno maggiorenne è autorizzata dal docente della classe che per il tramite della segreteria informa almeno uno dei genitori. In caso di ripetute uscite anticipate superiori a N°3 mensili l’alunno dovrà ricorrere alla autorizzazione del collaboratore vicario che avrà cura di informare la Dirigente e le famiglie."
	},
	{
		page: 18,
		text: "ART. 20 – ASSENZE DEGLI ALLIEVI Gli insegnanti devono provvedere alla quotidiana registrazione delle presenze e delle assenze degli alunni sul registro di classe e all’aggiornamento periodico e costante del registro elettronico informando il Dirigente scolastico dei casi di prolungata assenza o di assenza con dubbia motivazione. In caso di assenza per malattia infettiva, i genitori, o gli insegnanti che ne vengono a conoscenza, devono avvisare la segreteria per le eventuali procedure profilattiche. In caso di allontanamento degli alunni deciso dall’A.S.L. la riammissione degli alunni è subordinata alla presentazione di idoneo certificato medico. Agli studenti assenti è fatto assoluto divieto di entrare e permanere nella scuola, nelle palestre e negli spazi di pertinenza dell’Istituto."
	},
	{
		page: 19,
		text: "ART. 21– VALIDITÀ DELL’ANNO SCOLASTICO Ai fini della validità dell’anno scolastico, per procedere alla valutazione finale di ciascuno studente, secondo l’art. 14 c. 7 del Regolamento di coordinamento delle norme per la valutazione degli alunni di cui al DPR 122/2009, “è richiesta la frequenza di almeno tre quarti dell’orario annuale personalizzato”. Le assenze degli studenti non contribuiscono al calcolo del monte ore massimo consentito qualora rientrino nelle deroghe approvate dal Collegio dei Docenti e previste nel vigente Piano Triennale per l’Offerta Formativa. I certificati medici devono essere prodotti in concomitanza dell’evento e prodotti al rientro."
	},
	{
		page: 19,
		text: "NON POSSONO ESSERE PRESI IN CONSIDERAZIONE CERTICAZIONI MEDICHE PRODOTTE A POSTERIORI RIGUARDANTI PERIODI DI MALATTIA PREGRESSA. Ulteriori deroghe possono essere deliberate dal Collegio dei Docenti e notificate all’Albo dell’Istituto. Sono derogate d’ufficio le assenze dalle lezioni per attività di arricchimento dell’offerta formativa e quelle per riduzione dell’orario scolastico su disposizione del Dirigente Scolastico. La documentazione delle deroghe deve essere consegnata all’Ufficio protocollo nel giorno del rientro e, comunque, entro i 15 giorni successivi. In caso di ritardo nella consegna della documentazione delle deroghe, è facoltà del Dirigente Scolastico non tener conto della documentazione prodotta."
	},
	{
		page: 19,
		text: "ART. 22 – UTILIZZO DEI SERVIZI IGIENICI Occorre scoraggiare l’uso dei servizi igienici in ogni momento della giornata e in modo disordinato, fatta eccezione per le reali esigenze estemporanee.  Non sarà consentito autorizzare gli alunni ad andare in bagno durante gli intervalli, tutti gli insegnanti durante le ore di lezione (eccezionalmente alla prima ora), autorizzeranno gli alunni a fruire dei servizi, registrandone l’uscita sul registro di classe, per agevolarne la gestione e comunicazione ai colleghi delle ore successive.  Durante il cambio dell’ora, gli alunni sono tenuti a non allontanarsi dalla classe, tenendo un comportamento corretto in attesa che giunga l’altro insegnante.  Gli alunni accedono ai servizi igienici solo dopo l’assenso del docente, escluso durante l’intervallo, che annoterà i nominativi su un apposito registro; durante la prima e l’ultima ora di lezione, solo eccezionalmente è consentito l’accesso ai servizi; richieste reiterate di uscita dovranno essere giustificate da un certificato medico, consegnato al coordinatore, che provvederà ad informare i colleghi del Consiglio di classe.  All’alunno non è consentito andare in giro per i corridoi, accedere alle altre aule, laboratori, palestra e uffici senza il permesso dell’insegnante che avrà cura di affidarlo sempre ad un collaboratore scolastico."
	},
	{
		page: 20,
		text: " L’uso dei servizi igienici è consentito a partire dalla seconda ora e solo dopo ingresso degli alunni ritardatari autorizzati. I Collaboratori scolastici avranno cura di garantire una fruizione ottimale dei servizi igienici prevenendo e segnalando situazioni di pericolo. A conclusione dell’uso dei servizi igienici i collaboratori provvederanno alla pulizia degli stessi avendo cura di segnalare con apposita segnaletica la eventuale presenza di pavimento scivoloso."
	},
	{
		page: 20,
		text: "ART. 23 – UTILIZZO DELL’ASCENSORE (quando è in funzione) L’utilizzo dell’ascensore è consentito: 1) ai docenti e al personale A.T.A. che, previo inoltro di specifica richiesta al Dirigente Scolastico, scritta e motivata, ottengano da questo esplicita autorizzazione; 2) agli studenti con certificate o acclarate difficoltà di deambulazione, che possono usare l’ascensore solo se accompagnati da un collaboratore scolastico. ART. 24 – PAUSA DI SOCIALIZZAZIONE-ricreazione Gli alunni devono rispettare le indicazioni dei docenti nella fascia oraria che comprende le pause di socializzazione, e dei collaboratori scolastici, che vigilano sulle aree del reparto loro assegnato."
	},
	{
		page: 20,
		text: "È comunque dovere degli studenti astenersi dal tenere comportamenti che possano mettere in pericolo l’incolumità propria o altrui ovvero danneggiare oggetti altrui. Gli studenti devono rientrare in classe non oltre 5 minuti dopo la fine della pausa. Non è consentito portare vivande di alcun genere da parte di terze persone non autorizzate, nel rispetto della vita scolastica e dei regolamenti di istituto."
	},
	{
		page: 20,
		text: "In alternativa al servizio ristoro autorizzato e ai distributori automatici è permesso il pasto autonomo inserito nello zaino trasportato dallo stesso studente ad inizio giornata scolastica purché la tipologia di alimento sia consono alla permanenza in classe senza arrecare disturbo nella convivenza civile (sono da escludere categoricamente pietanze umide ed eccessivamente elaborate nonché sapori/odori forti). È consentito condividere una “torta di compleanno” all’interno della classe, purché sia consumata esclusivamente durante la ricreazione dagli alunni e dai docenti della classe."
	},
	{
		page: 20,
		text: "Per la circostanza (compleanno) non è consentita la presenza di genitori o terze persone se non per la esclusiva consegna della torta al collaboratore scolastico addetto alla accoglienza che la recapiterà nella classe di riferimento. ART. 25-DISTRIBUTORI AUTOMATICI La presenza dei distributori automatici non deve rappresentare un elemento di distrazione frequente né motivo di interruzione dell’attività didattica."
	},
	{
		page: 21,
		text: "I distributori automatici, quando saranno attivi, potranno essere utilizzati prima dell’ingresso in classe (dalle 7,45 alle ore 8.00) e poco prima di recarsi in aula da chi entra la seconda ora. Potranno essere utilizzati altresì durante la I° ricreazione. ART. 26 – COMUNICAZIONI INTERNE Tutte le comunicazioni interne indirizzate agli studenti e/o alle loro famiglie saranno lette in classe dal docente dell’ora e rese disponibili sul registro di classe elettronico e in modalità telematica (sito web della scuola). Gli studenti hanno l’obbligo di informare i genitori circa le Comunicazioni interne a loro indirizzate."
	},
	{
		page: 21,
		text: "ART. 27 – VISITATORI I visitatori che entrano dentro l'edificio, ivi compresi i genitori degli alunni o chi ne fa le veci, possono recarsi esclusivamente in Presidenza, Vice-presidenza o nelle segreterie. E' fatto assoluto divieto di entrare nelle aule, nei laboratori e in palestra. Il personale non docente sorveglierà accuratamente a tale riguardo. Per tutelare la sicurezza della comunità scolastica e degli ospiti, tutti i visitatori, nel momento in cui fanno il loro ingresso a scuola, sono tenuti a far registrare la loro presenza a scuola dal collaboratore scolastico in servizio presso la guardiola dell’atrio."
	},
	{
		page: 21,
		text: "ART.28 - ESPERTI ESTERNI - FIGURE SPECIALISTICHE Qualora i docenti o i genitori ritenessero utile invitare in classe altre persone in qualità di “esperti” o specialisti (OSA, ASACOM, TERAPISTI, -altro) a supporto dell’attività didattica, va chiesta, di volta in volta, l’autorizzazione al Dirigente scolastico utilizzando apposita modulistica. Gli “esperti” permarranno nei locali scolastici per il tempo necessario all’espletamento delle loro funzioni. In ogni caso la completa responsabilità didattica e la vigilanza sulla classe restano del docente."
	},
	{
		page: 21,
		text: "Pertanto nel caso di intervento in classe (o palestra o altro laboratorio) di “esperti”, l’insegnante deve restare nella classe ad affiancare l’”esperto” per la durata dell’intervento. ART. 29 – RISPETTO DELLE PERSONE E DEI LORO BENI L’Istituto non risponde di eventuali furti, smarrimento o danneggiamento di oggetti personali; pertanto gli studenti devono evitare di portare con sé oggetti di valore o devono comunque custodirli con cura. Il Dirigente Scolastico, i docenti e i collaboratori non sono assolutamente autorizzati ad effettuare"
	},
	{
		page: 22,
		text: "alcuna perquisizione personale o degli zaini; tali operazioni possono solo essere effettuate dalle Forze dell’Ordine nei modi e con le garanzie previste dalla legge. Gli studenti, quando si recano nelle aule speciali e nei laboratori, non devono lasciare oggetti personali incustoditi in classe. Durante le ore di lezione in palestra, gli studenti possono affidare i propri oggetti personali al docente che provvederà a custodirli in un apposito armadietto chiuso. Gli studenti non devono sottrarre o danneggiare qualsiasi tipo di oggetto personale altrui. • Gli studenti non devono tenere comportamenti che possano mettere in pericolo l’incolumità propria o altrui."
	},
	{
		page: 22,
		text: "Nelle ore di Scienze motorie l’alunno indosserà l’uniforme sportiva e porterà da casa una t-shirt di ricambio. (Si rimanda al Regolamento della Palestra). • Ogni alunno avrà cura della propria classe e gli sarà consentita, naturalmente sotto la supervisione dei docenti, qualsiasi iniziativa volta ad adornarla. • L’alunno che imbratterà, deteriorerà, danneggerà l’arredamento o i locali della scuola, sarà soggetto a provvedimenti disciplinari. Alla famiglia sarà addebitata la spesa concernente le relative riparazioni. • Gli alunni che arrecano danni materiali agli arredi (banchi, sedie, cattedre, lavagne, armadietti ecc.), all’edificio (bagni, porte, muri ecc.) dovranno risarcirli."
	},
	{
		page: 22,
		text: "In caso di mancata individuazione dei responsabili, non si esclude il ricorso a forme di risarcimento collettivo. • L’alunno avrà cura della strumentazione tecnologica (LIM, PC) a corredo della classe e dei laboratori, sarà responsabilità della famiglia farsi carico di eventuali danni arrecati alla stessa. • Gli alunni sono tenuti a portare a scuola il diario e a far firmare ai genitori, per presa visione, tutte le comunicazioni predisposte dai docenti e le eventuali note disciplinari scritte. • Gli studenti hanno il dovere di condividere la responsabilità di rendere accogliente l'ambiente scolastico e di averne cura come importante fattore di qualità della vita della scuola."
	},
	{
		page: 22,
		text: "Gli studenti non devono mai trascendere nei fisiologici diverbi tra di loro e con il personale docente o ATA; soprattutto, non devono assumere atteggiamenti aggressivi e minacciosi, né tantomeno devono colpire le persone con attacchi fisici. Sono vietati atti di bullismo sotto forma di comportamenti aggressivi e di intimidazione nei confronti dei pari, come ad esempio molestie verbali, aggressioni fisiche, persecuzioni, discriminazioni etniche, confessionali, di genere o di orientamento sessuale. Gli studenti hanno il dovere di testimoniare sui fatti oggetto di contestazione disciplinare di cui siano a conoscenza."
	},
	{
		page: 22,
		text: "ART. 30 – RISPETTO DELLE STRUTTURE E DEI BENI DELL’ISTITUTO Il rispetto ed il corretto utilizzo delle dotazioni tecnologiche d’aula sono responsabilità personale di tutti gli alunni, che pertanto vigileranno, unitamente a docenti e collaboratori, affinché le stesse possano assolvere compiutamente la loro funzione. I danni alle strutture e agli arredi scolastici chiaramente imputabili ad uno o più alunni devono essere da questi risarciti; gli studenti hanno il dovere di testimoniare sui fatti oggetto di"
	},
	{
		page: 23,
		text: "contestazione di cui siano a conoscenza. Il Dirigente Scolastico valuterà l’opportunità/necessità di sporgere denuncia o querela di parte alle Forze dell’Ordine. In mancanza dell'individuazione di precise responsabilità personali, onde evitare comportamenti omertosi, l'intera classe che occupa il locale dove è avvenuto il furto/danno subirà sanzioni disciplinari proporzionate alla gravità dei fatti accaduti. Gli studenti devono contribuire a garantire un’utilizzazione ottimale delle strutture e delle dotazioni scolastiche. Gli studenti sono tenuti a segnalare gli inconvenienti riscontrati all’ufficio di Vicepresidenza affinché si possano adottare con tempestività gli interventi necessari."
	},
	{
		page: 23,
		text: "L’uso dei singoli ambienti e delle strutture è regolamentato da appositi Regolamenti. ART. 31 – RACCOLTA DIFFERENZIATA Gli studenti dovranno collaborare ad una corretta ed ordinata gestione della raccolta differenziata dei rifiuti, utilizzando in aula i contenitori solo per la carta ed il cestino per l’indifferenziata ART. 32 – SERVIZIO FOTOCOPIE Non è consentito in alcun caso l’accesso al servizio di fotocopie da parte degli studenti. È comunque fatto divieto a chiunque di fotocopiare libri o altro materiale protetto da diritti d’autore se non nel rispetto delle leggi sul diritto d’autore."
	},
	{
		page: 23,
		text: "ART. 33 – DIVIETO DI FUMO È vietato fumare (comprese le sigarette elettroniche) in tutti i locali dell’Istituto e nelle pertinenze dello stesso, ancorché esterne. Il mancato rispetto del divieto di fumo, oltre a costituire, ai sensi della normativa vigente, illecito amministrativo sanzionato con apposite sanzioni pecuniarie, costituisce grave infrazione disciplinare. Il mancato rispetto del divieto di fumo è sanzionato secondo le disposizioni a carattere permanente impartite dal Dirigente Scolastico, nel rispetto della normativa vigente in materia."
	},
	{
		page: 23,
		text: "ART. 34 – DIVIETO DI UTILIZZO DELLE PORTE DI SICUREZZA E DELLE SCALE ANTINCENDIO In condizioni ordinarie, è severamente vietato utilizzare le porte di sicurezza per accedere o uscire dai locali scolastici. Durante i cambi d’ora e la pausa di socializzazione è severamente vietato intrattenersi sulle scale anti-incendio e nei terrazzi esterni; i collaboratori scolastici e i docenti in servizio ai piani vigileranno sul rispetto di tale divieto."
	},
	{
		page: 24,
		text: "ART. 35 – MALORI E INFORTUNI DEGLI ALUNNI In caso di malessere sopraggiunto o infortunio, l’operatore presente: a) richiederà l’intervento dell’addetto al primo soccorso presente; b) provvederà ad avvisare i familiari; c) nelle situazioni di gravità, anche presunta, inoltrerà richiesta di intervento urgente dei servizi sanitari d’emergenza (n° tel. 118). In caso d’infortunio, l’insegnante presente, ai fini della procedura assicurativa, redigerà una sintetica relazione sull’accaduto da consegnare all’ufficio di segreteria, utilizzando apposita modulistica fornita dalla scuola."
	},
	{
		page: 24,
		text: "In caso di intervento medico ed ospedaliero occorre informare i famigliari della necessità di consegnare in segreteria la certificazione medica rilasciata dal personale curante. In caso di attività esposte a rischio specifico, il personale è tenuto a prendere tutte le precauzioni possibili per ridurre al minimo i fattori di rischio. In caso di incidenti o malori di una certa gravità sarà valutata la possibilità/opportunità di attendere l’arrivo dei genitori, immediatamente informati, o di avvisare subito il 118."
	},
	{
		page: 24,
		text: "In caso l’alunno debba essere portato al Pronto Soccorso in ambulanza e i genitori non siano ancora arrivati o siano irreperibili, l’alunno dovrà essere accompagnato dal docente o da un collaboratore scolastico. In particolare: in caso di infortunio di un alunno/a durante l’orario scolastico o nel periodo preposto per l’accoglienza e la vigilanza, il docente o il collaboratore scolastico in turno di vigilanza deve avvertire tempestivamente e personalmente gli uffici di dirigenza e di segreteria, in modo che ne appuri i fatti, la responsabilità ed attivi le procedure opportune."
	},
	{
		page: 24,
		text: "È necessario redigere la dichiarazione anche nel caso di incidenti lievi o episodi incerti per evitare che nel caso di successive complicazioni o richieste di risarcimento per fatti non adeguatamente segnalati l’assicurazione non sia stata regolarmente attivata e quindi non copra il danno che di conseguenza resta a carico della scuola e del suo personale. ART. 36 FARMACI Il personale tutto della scuola non è autorizzato a somministrare farmaci agli/alle alunni/e per nessun motivo; pertanto per gli/le alunni che avessero bisogno di assumerne, è consentito l’ingresso in qualsiasi momento ai genitori o a persone da questi delegate a tale scopo."
	},
	{
		page: 24,
		text: "Diverso è il comportamento da seguire nel caso in cui sia necessaria la somministrazione dei cosiddetti “FARMACI SALVAVITA”, una terapia medica ciclica e programmata, per determinate patologie (p.es. diabete, epilessia ed altro) e della quale pertanto non si può fare a meno. Deve essere somministrata a scuola previa:  autorizzazione scritta da parte dei genitori, con cui si rilasci piena e totale liberatoria nei confronti della scuola; prescrizione della terapia a firma del medico curante;"
	},
	{
		page: 25,
		text: " nota informativa, a firma del medico curante, contenente tutte le indicazioni necessarie per una corretta somministrazione del farmaco, questa nota informativa dovrà indicare con precisione e chiarezza anche le tecniche di intervento, le manovre o altro da effettuare qualora si renda necessario un soccorso immediato (ad esempio in caso di attacco epilettico o di shock anafilattico);  È necessario che i genitori comunichino in segreteria tutti i possibili recapiti telefonici per consentire in ogni momento la reperibilità di un familiare. I numeri telefonici e i recapiti utili sono raccolti in apposito modulo fornito dalla segreteria e/o dal singolo plesso."
	},
	{
		page: 25,
		text: "Per i rimborsi delle spese sostenute in seguito ad infortunio, si rimanda alla lettura delle condizioni particolari della polizza stipulata dal nostro istituto. ART. 37 VIAGGI D’ISTRUZIONE a) FINALITÀ Le disposizioni vigenti in materia sono contenute nella Circolare Ministeriale n. 291 /1992, nell’OM 132/1990, nella Circolare Ministeriale n. 623/1996, nel Decreto Legislativo n. 111/1995. I viaggi d’istruzione fanno parte integrante della programmazione educativa e didattica in quanto iniziative integrative del percorso formativo, funzionali agli obiettivi educativi, cognitivi, culturali e didattici presenti nel POF."
	},
	{
		page: 25,
		text: "Poiché anche i viaggi di istruzione sono “progetti” la cui realizzazione è frutto della sinergia dell'elemento progettuale didattico e di quello organizzativo e amministrativo-contabile, anche per essi sono necessari una programmazione responsabile e attenta, un loro monitoraggio e una valutazione a consuntivo. b) PERIODI DI EFFETTUAZIONE a. Nessun tipo di viaggio o visita guidata è possibile nell'ultimo mese (ultimi trenta giorni) di lezione, salvo deroghe debitamente motivate e autorizzate dal Dirigete Scolastico. b."
	},
	{
		page: 25,
		text: "Il Consiglio di Istituto stabilirà anno per anno il periodo preferenziale per l’effettuazione dei viaggi, tenendo presente il calendario scolastico e l’articolazione didattica dell’anno scolastico stabilita dal Collegio dei Docenti. c. Le visite guidate e le uscite didattiche di un giorno possono svolgersi durante tutto l'anno scolastico ad eccezione dell'ultimo mese di scuola. c) PARTECIPAZIONE a. Il viaggio di istruzione si effettua solo a condizione che vi partecipino almeno i 2/3 della classe. b. Gli studenti che non partecipano al viaggio di istruzione devono essere presenti a scuola secondo il normale orario delle lezioni. In caso di assenza devono presentare la richiesta di giustificazione. c."
	},
	{
		page: 25,
		text: "Alle visite guidate e alle uscite di un giorno è obbligatoria la partecipazione dell'intera classe (salvo gli assenti della giornata). L'eventuale assenza nel giorno della visita guidata deve essere giustificata."
	},
	{
		page: 26,
		text: "d. Ai viaggi di istruzione e alle visite guidate è rigorosamente vietata la partecipazione di persone estranee alla scuola. e. I genitori degli studenti diversamente abili, invece, possono partecipare, interamente a proprie spese, ai viaggi di istruzione, alle visite guidate, alle uscite didattiche, previa comunicazione al dirigente scolastico e al docente accompagnatore. f. Spetta al Consiglio di classe valutare l’opportunità della partecipazione ai viaggi di istruzione da parte degli studenti che abbiano subito provvedimenti disciplinari. Il numero degli studenti non ammessi sarà sottratto al totale per il computo dei due terzi di cui al comma a. del presente regolamento. g."
	},
	{
		page: 26,
		text: "Di norma non si effettuano viaggi di istruzione a cui partecipi solo una classe oppure più di quattro classi. d) DOCENTI ACCOMPAGNATORI a. Gli accompagnatori dovranno essere docenti delle classi interessate, salvo situazioni contingenti di emergenza e potranno partecipare ad un solo viaggio di istruzione nell'anno scolastico in corso; questa limitazione non si applica alle visite guidate e alle uscite di un solo giorno. b. La disponibilità dei docenti a fungere da accompagnatori dovrà essere segnalata sull’apposito modulo di presentazione del viaggio/uscita didattica. c. Per i viaggi all'estero, è opportuno che almeno uno degli accompagnatori possieda conoscenza della lingua del Paese da visitare. d."
	},
	{
		page: 26,
		text: "Per i viaggi in cui sia presente un allievo portatore di disabilità è opportuna la presenza di un docente di sostegno. Nel caso questo non sia possibile, l’accompagnatore può essere, tenuto conto della gravità della disabilità, un altro docente del consiglio di classe, un collaboratore scolastico, un familiare dell’allievo. In quest’ultimo caso, la famiglia dell’allievo si farà carico di una quota aggiuntiva di partecipazione. e. I docenti accompagnatori sono in numero di uno ogni quindici studenti partecipanti. f. Il Dirigente Scolastico conferirà l'incarico con nomina. g."
	},
	{
		page: 26,
		text: "I docenti accompagnatori assumono la responsabilità di cui all'articolo 2048 del Codice Civile (\"Culpa in vigilando\"), integrato dall'art.61 Legge 312/1980, nei riguardi di tutti gli studenti partecipanti al viaggio, anche se non espressamente affidati a loro. e) SICUREZZA · si eviteranno gli spostamenti nelle ore notturne, se il mezzo di locomozione scelto è il pullman; · le agenzie di viaggio interpellate dovranno essere in possesso di licenza di categoria A B; · le ditte di autotrasporto devono produrre i documenti e le certificazioni che ne attestino l'affidabilità e il possesso di tutti i requisiti a norma delle leggi vigenti; · nel caso di spostamenti in pullman superiori a 9 ore giornaliere continuative il mezzo dovrà avere doppio autista;"
	},
	{
		page: 27,
		text: "· qualora ci sia un unico autista, ogni quattro ore e mezza di servizio dovrà riposare per non meno di 45 minuti; · tutti i partecipanti devono essere coperti da polizza assicurativa contro gli infortuni; · l’agenzia scelta dovrà rilasciare alla scuola e ai docenti accompagnatori il nome e il numero di telefono di un referente sempre reperibile; · gli insegnanti accompagnatori segnaleranno tempestivamente alla Dirigenza situazioni di rischio, disguidi, irregolarità entro 24 ore per consentire eventuali reclami scritti all'agenzia di viaggio entro i termini previsti dal Codice di Procedura Civile; · gli studenti dovranno essere muniti della tessera sanitaria e segnalare in modo tempestivo eventuali allergie a cibi e/o farmaci o particolari problemi di salute che richiedano precauzioni particolari; · i docenti accompagnatori devono avere tutti i recapiti telefonici dei genitori (o di chi ne fa le veci) di ogni singolo studente, per eventuali comunicazioni urgenti che li riguardino. f) ASPETTI ECONOMICI Si ricorda che, anche ai sensi dell’OM 132/90, non è opportuno chiedere alle famiglie degli studenti quote di partecipazione di rilevante entità, tali da determinare situazioni discriminatorie."
	},
	{
		page: 27,
		text: "Anche l’aspetto economico, quindi, deve costituire uno dei criteri determinanti per la scelta della meta, della durata del viaggio e dell’agenzia. g) PROCEDURE ORGANIZZATIVE a. I Docenti che abbiano intenzione di essere accompagnatori di un viaggio di istruzione presentano la proposta in Presidenza entro il termine preventivamente stabilito e comunicato tramite apposita circolare, compilando il modulo apposito, b. Tutte le proposte di viaggio sono comunicate nei Consigli di Classe di novembre e allegate ai verbali dei consigli stessi. c. La Presidenza vaglia le proposte e redige un piano generale. d. Il piano generale così redatto è approvato dal Collegio dei Docenti. e."
	},
	{
		page: 27,
		text: "La Commissione viaggi di istruzione, presieduta dal Dirigente Scolastico, ha il compito di: compilare la lista delle agenzie da invitare alla gara, f. Non saranno prese in considerazione dalla Commissione: - le proposte pervenute dopo il termine previsto, - le variazioni successive alle delibere degli organi collegiali. Sulla base dei risultati dell’istruttoria svolta dalla Commissione viaggi di istruzione, il Consiglio di Istituto delibera, in base ai criteri di competenza, l'effettuazione dei viaggi e le Agenzie cui affidarne l'organizzazione. Il Consiglio delibera anche l'eventuale contributo a carico dell'Istituto."
	},
	{
		page: 27,
		text: "Dopo la delibera del Consiglio di Istituto, sarà cura della Segreteria tenere i rapporti con la/e agenzia/e per l’iter di fornitura del servizio e dei pagamenti secondo le normali procedure. Tutti"
	},
	{
		page: 28,
		text: "gli atti amministrativi relativi ai viaggi devono essere improntati alla piena trasparenza e gli studenti e le famiglie hanno il diritto di prenderne visione in ogni momento. h) NORME DI COMPORTAMENTO VIAGGI DI ISTRUZIONE Durante il viaggio di istruzione sono tenuti a partecipare a tutte le attività didattiche previste dal programma, sotto la direzione e la sorveglianza dei docenti o del personale incaricato, senza assumere iniziative autonome. - sono tenuti al rispetto costante degli orari. - dovranno mantenere un comportamento sempre corretto nei confronti dei loro compagni, degli insegnanti, del personale addetto all'organizzazione dell'iniziativa stessa ed anche rispettoso delle persone e case ospitanti o delle attrezzature alberghiere, dei mezzi di trasporto messi a loro disposizione, dell'ambiente e del patrimonio storico-artistico."
	},
	{
		page: 28,
		text: "L'atteggiamento maturo e responsabile è volto al fine di evitare possibili inconvenienti a danno di sé stessi e dell’intero gruppo. Si indicano, di seguito, alcune norme più specifiche da rispettare durante il viaggio di istruzione: È severamente vietato bere vino e alcolici in genere. i) VIOLAZIONE DELLE NORME DI COMPORTAMENTO La violazione delle norme indicate prevede l’applicazione di provvedimenti disciplinari a carico dello studente. Nel caso di violazioni gravi o reiterate, i docenti responsabili del viaggio, d'intesa con il Dirigente Scolastico, disporranno il rientro anticipato in Sede dell'alunno o degli alunni interessati, previa comunicazione alle famiglie e a spese delle stesse."
	},
	{
		page: 28,
		text: "Gli alunni maggiorenni potranno rientrare anche da soli, previo accordo con la famiglia. l) INDICAZIONI DI CARATTERE GENERALE Gli studenti che partecipano a un viaggio di istruzione o a un soggiorno linguistico sono pregati di: - Portarsi il documento di identità o il passaporto e la tessera sanitaria plastificata - Fare la fotocopia del tesserino sanitario e del documento di identità o passaporto, per accelerare le procedure in caso di smarrimento degli originali, e tenere le copie in luogo separato dagli originali."
	},
	{
		page: 28,
		text: "Munirsi, se necessario, di adattatore per le prese elettriche - Avere a disposizione medicinali comuni per la febbre, medicinali di base o farmaci che si assumono per patologie specifiche, tenendo presente che per qualsiasi medicina assunta dallo studente, la responsabilità è dello studente stesso. - Prendere contatti con la propria compagnia telefonica per attivare tariffe convenienti per l'estero o utilizzare le carte prepagate - Indicazioni per il bagaglio in caso di voli aerei (ai sensi della vigente normativa antiterrorismo) - NON SUPERARE per la valigia e il bagaglio a mano il peso e le dimensioni massime indicate dalla compagnia aerea; la tariffa applicata dalla compagnia aerea per peso eccedente sarà a carico dello studente il quale, se non è in grado di pagarla, dovrà lasciare parte del"
	},
	{
		page: 29,
		text: "bagaglio in aeroporto. - Contrassegnare la valigia per non confonderla con altre simile - Non trasportare documenti e soldi in valigia - Non trasportare nel bagaglio a mano prodotti liquidi o in gel (vedi articoli da toilette e cosmetici), nonché oggetti appuntiti e acuminati, quali limette e/o forbicine· - Non trasportare accendini né nel bagaglio a mano né nel bagaglio registrato."
	},
	{
		page: 29,
		text: "Presentare ai controlli di sicurezza farmaci e cibi speciali, necessari durante il volo e presenti nel bagaglio a mano; mostrare la prescrizione medica, se i farmaci sono in forma liquida Presentare ai controlli di sicurezza apparecchiature elettroniche, come telefoni cellulari, camere digitali e lettori MP3, computer portatili o apparecchi elettrici voluminosi (come ad esempio il phon) TITOLO V- PERSONALE ATA 38 ASSISTENTI AMMINISTRATIVI Premessa Il ruolo del personale amministrativo è indispensabile anche come supporto all'azione didattica e la valorizzazione delle loro competenze è decisiva per l'efficienza e l'efficacia del servizio e per il conseguimento delle finalità educative."
	},
	{
		page: 29,
		text: "La qualità del rapporto con il pubblico e con il personale è di fondamentale importanza, in quanto esso contribuisce a determinare il clima educativo della scuola e a favorire il processo comunicativo tra le diverse componenti che si muovono dentro o attorno alla scuola. L’Assistente Amministrativo ha il dovere di attenersi al Codice di comportamento dei dipendenti pubblici e a esercitare con diligenza, equilibrio e professionalità i compiti costituenti l’esplicazione del profilo professionale di titolarità, come riportati nei documenti contrattuali. 1. L’Assistente Amministrativo si impegna a offrire la propria collaborazione al Dirigente Scolastico, al Direttore Amministrativo e al personale docente. 2."
	},
	{
		page: 29,
		text: "L’Assistente Amministrativo cura anche la diffusione delle circolari e degli avvisi. Nei rapporti con l’utenza deve fornire tutte le informazioni cui abbia titolo, nel rispetto delle disposizioni in materia di trasparenza e di accesso alle attività amministrative previste dalla legge. 3."
	},
	{
		page: 29,
		text: "L’ Assistente Amministrativo ha il dovere di mantenere una condotta uniformata non solo a principi generali di correttezza ma, altresì, all'esigenza di coerenza con le specifiche finalità educative dell'intera comunità scolastica; è tenuto ad assumere comportamenti ispirati a cortesia e disponibilità e garbo verbale e a non assumere mai comportamenti lesivi della dignità delle persone: un ambiente educativo richiede sobrietà e correttezza. Conseguentemente, sono censurabili comportamenti che non siano rispettosi del lavoro e dell’impegno dei colleghi. Nessuna discussione, lamentela o rimprovero tra colleghi va fatto ad alta voce e in pubblico. 4."
	},
	{
		page: 29,
		text: "La soluzione dei problemi della scuola deve costituire impegno attento e motivante; la professionalità risulterà arricchita e rinfrancata se confortata dall’ atteggiamento sereno e"
	},
	{
		page: 30,
		text: "disponibile dei collaboratori. 5. L’Assistente Amministrativo è tenuto alle norme sulla privacy ed è obbligato al rispetto del segreto d'ufficio, obbligo strettamente connesso con la funzione del personale amministrativo che deve assicurare la custodia della documentazione con particolare attenzione a quella riguardante i dati sensibili del personale scolastico e degli alunni e non utilizzare ai fini privati le informazioni di cui disponga per ragioni d'ufficio. Altresì, deve immediatamente segnalare eventuali effrazioni e ogni tipo di intrusione che possa costituire una minaccia alla protezione dei dati sulla privacy. 6."
	},
	{
		page: 30,
		text: "L’ Assistente Amministrativo è nominato dalla Dirigenza “Incaricato del trattamento dei dati personali”. Tale nomina significa che di ogni dato personale o sensibile di cui, a motivo delle proprie mansioni, venga a conoscenza, sono tenuti alla riservatezza, non possono diffondere notizie riguardanti situazioni personali di alunni, colleghi o docenti, non possono rivelare circostanze che riguardino fatti legati alla sfera privata di altri. Il diritto alla riservatezza è tutelato dalla legge e, pertanto, ogni violazione è sanzionata penalmente. 7."
	},
	{
		page: 30,
		text: "L’Assistente Amministrativo è tenuto al rispetto rigoroso dell’orario di servizio posto che l’orario di servizio di tutte le componenti scolastiche si uniforma a criteri di efficienza, efficacia e flessibilità; 8. L’Assistente Amministrativo non può allontanarsi dal luogo di lavoro, tranne che per motivi autorizzati dal D.S.G.A. o dal Dirigente Scolastico. In caso di ritardo o di assenza, deve darne comunicazione al Direttore SGA. 9."
	},
	{
		page: 30,
		text: "L’Assistente Amministrativo deve essere facilmente identificabile per l'intero orario di lavoro. 10.L’Assistente Amministrativo al telefono risponde con la denominazione dell'Istituzione Scolastica e si qualifica anche con nome e cognome. 11.L’Assistente Amministrativo non utilizza il cellulare durante l’orario di servizio se non per casi di effettiva urgenza personale o circostanziate situazioni per le quali, in carenza, danneggiamento o malfunzionamento degli strumenti di comunicazione messi a disposizione, se ne ravvisi una evidente necessità utile alla prosecuzione dell’attività lavorativa."
	},
	{
		page: 30,
		text: "I telefoni della scuola possono essere utilizzati per motivi personali solo in caso di urgenza. 12.L’Assistente Amministrativo non utilizza i devices della scuola per fini privati. 13.L’Assistente Amministrativo cura i rapporti con l'utenza, con gentilezza e cortesia, nel rispetto delle disposizioni in materia di trasparenza e di accesso alla documentazione amministrativa prevista dalla legge e fornisce tutte le informazioni a famiglie e alunni. 14.L’Assistente Amministrativo collabora con i colleghi, collabora con i docenti anche in merito alle comunicazioni da inviare alle famiglie. 15.L’Assistente Amministrativo, al fine di promuovere ogni forma di partecipazione, si impegna perché la Scuola garantisca all’utenza la massima semplificazione delle procedure e un’informazione completa e trasparente. 16.L’Assistente Amministrativo è consapevole che l’utenza può accedere ai documenti e agli atti"
	},
	{
		page: 31,
		text: "amministrativi secondo la normativa vigente. 17.Gli uffici di Segreteria garantiscono il servizio con un opportuno sistema di turna- zione durante le operazioni di valutazione degli alunni. 18.Il personale di Segreteria assicura la tempestività del servizio e il rispetto dei tempi e delle procedure per il disbrigo delle principali pratiche. 19.Il rilascio di certificati è effettuato nel normale orario di apertura della Segreteria al pubblico entro il tempo massimo di tre giorni lavorativi per quelli di iscrizione e frequenza e di cinque giorni per quelli con votazione e giudizi."
	},
	{
		page: 31,
		text: "Per qualsiasi altra certificazione richiesta anche dal personale, resta fissato il rilascio entro i sette giorni lavorativi, salvo differimento del termine per acquisizione di notizie inerenti alla certifica- zione richiesta. 20.Gli attestati e i documenti sostitutivi del diploma sono consegnati “a vista” a partire dal terzo giorno lavorativo successivo alla pubblicazione dei risultati finali. 21.I documenti di valutazione degli alunni sono consegnati direttamente dai docenti in- caricati ai genitori o a chi esercita la potestà genitoriale nelle giornate stabilite e, successivamente, dal personale di segreteria durante gli orari di apertura al pubblico. 22.Presso l’ingresso è presente e riconoscibile un operatore scolastico in grado di fornire all’ utenza le prime informazioni per la fruizione del servizio. 23.Le eventuali telefonate di servizio, tranne quelle che hanno carattere di urgenza, sa- ranno inoltrate al personale addetto non prima delle ore 11,30. 24.È vietato fumare all’interno degli edifici scolastici, anche nei locali non aperti al pubblico, e in tutta l’area di pertinenza dell’edificio (cortile, palestra, parcheggio…). 25.È vietato introdurre e/o consumare bevande alcooliche durante le attività lavorative. 39 ASSISTENTI TECNICI Premessa Il ruolo del personale tecnico è indispensabile anche come supporto all'azione didattica e la valorizzazione delle loro competenze è decisiva per l'efficienza e l'efficacia del servizio e per il conseguimento delle finalità educative."
	},
	{
		page: 31,
		text: "La qualità del rapporto con il pubblico e con il personale è di fondamentale importanza, in quanto esso contribuisce a determinare il clima educativo della scuola e a favorire il processo comunicativo tra le diverse componenti che si muovono dentro o attorno alla scuola. 1. L’Assistente tecnico ha il dovere di attenersi al Codice di comportamento dei dipendenti pubblici e a esercitare con diligenza, equilibrio e professionalità i compiti costituenti l’esplicazione del profilo professionale di titolarità, come riportati nei documenti contrattuali. 2. L’Assistente Tecnico si impegna a offrire la propria collaborazione al Dirigente Scolastico, al Direttore Amministrativo e al personale docente. 3. L’Assistente Tecnico ha il dovere di mantenere una condotta uniformata non solo a"
	},
	{
		page: 32,
		text: "principi generali di correttezza ma, altresì, all'esigenza di coerenza con le specifiche finalità educative dell'intera comunità scolastica; è tenuto ad assumere comporta4. menti ispirati a cortesia, disponibilità e garbo verbale e a non assumere mai comportamenti lesivi della dignità delle persone: un ambiente educativo richiede sobrietà e correttezza. Conseguentemente, sono censurabili comportamenti che non siano rispettosi dei lavoratori e del loro impegno. Nessuna lamentela o rimprovero va fatto ad alta voce ed in pubblico. 5."
	},
	{
		page: 32,
		text: "La soluzione dei problemi della scuola deve costituire impegno attento e motivante; la professionalità risulterà arricchita e rinfrancata se confortata dall’ atteggiamento sereno e disponibile dei collaboratori. 6. L’Assistente Tecnico è tenuto alle norme sulla privacy ed è obbligato al rispetto del segreto d'ufficio, obbligo strettamente connesso con la funzione del personale tecnico il quale può entrare in contatto con dati sensibili del personale scolastico e degli alunni. 7. L’Assistente Tecnico è tenuto a non utilizzare ai fini privati le informazioni di cui disponga per ragioni d'ufficio. 8. L’Assistente Tecnico è nominato dalla Dirigenza “Incaricato del trattamento dei dati personali”."
	},
	{
		page: 32,
		text: "Tale nomina significa che di ogni dato personale o sensibile di cui, a motivo delle proprie mansioni, venga a conoscenza, è tenuto alla riservatezza, non può diffondere notizie riguardanti situazioni personali di alunni, colleghi o docenti, non può rivelare circostanze che riguardino fatti legati alla sfera privata di altri. Il diritto alla riservatezza è tutelato dalla legge e, pertanto, ogni violazione è sanzionata penalmente. 9. L’Assistente Tecnico è tenuto al rispetto rigoroso dell’orario di servizio, posto che l’orario di servizio di tutte le componenti scolastiche si uniforma a criteri di efficienza, efficacia e flessibilità; 10."
	},
	{
		page: 32,
		text: "L’Assistente Tecnico articola l’orario di lavoro nel seguente modo: 11. assistenza tecnica alle esercitazioni didattiche per almeno 24 ore in compre- senza del docente; 12. le restanti 12 ore per la manutenzione e riparazione delle attrezzature tecnico 13. scientifiche del laboratorio o dei laboratori cui sono addetti, nonché per la preparazione del materiale di esercitazione. 14. Nei periodi di sospensione dell’attività didattica gli assistenti tecnici saranno utilizzati inattività di manutenzione del materiale tecnico-scientifico-informatico dei laboratori, officine, reparti di lavorazione o uffici di loro competenza. 15."
	},
	{
		page: 32,
		text: "L’Assistente Tecnico non può allontanarsi dal luogo di lavoro, tranne che per motivi autorizzati dal D.S.G.A. o dal Dirigente Scolastico. In caso di ritardo o di assenza, deve darne comunicazione al Direttore SGA. 16. L’Assistente Tecnico indossa, in modo ben visibile, il tesserino di riconoscimento per l'intero orario di lavoro."
	},
	{
		page: 33,
		text: "17. L’ Assistente Tecnico non utilizza il cellulare durante l’orario di servizio se non per casi di effettiva urgenza personale o circostanziate situazioni per le quali, in carenza, danneggiamento o malfunzionamento degli strumenti di comunicazione messi a disposizione, se ne ravvisi una evidente necessità utile alla prosecuzione dell’attività lavorativa. I telefoni della scuola possono essere utilizzati per motivi personali solo in caso di urgenza. 18. L’Assistente Tecnico non utilizza i device della scuola per fini privati 19. 12.L’Assistente Tecnico collabora con i colleghi. 20."
	},
	{
		page: 33,
		text: "L’Assistente Tecnico deve fornire, con gentilezza e cortesia, ogni forma di informa- zione e di collaborazione con le famiglie e con gli alunni; 21. L’Assistente Tecnico, al fine di promuovere ogni forma di partecipazione, si impegna perché la Scuola garantisca all’utenza la massima semplificazione delle procedure e un’informazione completa e trasparente. 22. L’Assistente Tecnico è consapevole che la qualità del rapporto con il pubblico e con il personale è di fondamentale importanza in quanto esso contribuisce a determinare il clima educativo della scuola. 40 COLLABORATORI SCOLASTICI Premessa I collaboratori scolastici sono una delle componenti attive e dinamiche della istituzione “scuola”."
	},
	{
		page: 33,
		text: "Nella nuova scuola i collaboratori scolastici non sono più meri esecutori di compiti materiali, statici e poco espressivi, ma persone di fiducia, deputati a svolgere compiti delicati e preziosi. 1 I collaboratori scolastici sono tenuti a prestare servizio, salvo diverse disposizioni, nella zona di competenza secondo le mansioni loro assegnate."
	},
	{
		page: 33,
		text: "In ogni turno di lavoro i collaboratori scolastici devono accertare l'efficienza dei dispositivi di sicurezza, individuali e collettivi, e la possibilità di utilizzarli con facilità. 2 I collaboratori scolastici non possono utilizzare i telefoni cellulari e il telefono della scuola per motivi personali durante l’orario di lavoro. 3 I Collaboratori Scolastici sono tenuti alle norme sulla privacy e sono obbligati al rispetto del segreto d'ufficio, obbligo strettamente connesso con la funzione dei Collaboratori Scolastici i quali non devono utilizzare ai fini privati le informazioni di cui disponga per ragioni d'ufficio; non possono diffondere notizie riguardanti situazioni personali di alunni, colleghi o docenti, non possono rivelare circostanze che riguardino fatti legati alla sfera privata di altri."
	},
	{
		page: 33,
		text: "Il diritto alla riservatezza è tutelato dalla legge e, pertanto, ogni violazione è sanzionata penalmente. 1. I collaboratori scolastici: a. indossano, abbigliamento adeguato al ruolo, e consono alle funzioni e ai compiti; b. devono essere facilmente reperibili da parte degli Insegnanti, per qualsiasi evenienza; c. agevolano gli spostamenti degli insegnanti al cambio dell’ora, assicurando la vigilanza"
	},
	{
		page: 34,
		text: "della classe che si trova temporaneamente scoperta; d. collaborano al complessivo funzionamento didattico e formativo; e. vigilano sulla sicurezza e incolumità degli alunni, in particolare durante gli inter- valli, negli spostamenti e nelle uscite degli alunni per recarsi ai servizi o in altri locali; f. collaborano all’entrata e all’uscita degli alunni, disponendosi all’ingresso, vigilando il passaggio degli alunni fino all’entrata degli stessi nelle proprie aule; g. assicurano la continuità della vigilanza in caso di allontanamento temporaneo del docente; h. riaccompagnano nelle loro classi gli alunni che, al di fuori dell'intervallo e senza seri motivi, sostano nei corridoi; i. sorvegliano gli alunni in caso di uscita dalle classi, di ritardo, assenza, o allontanamento momentaneo dell'insegnante; j. comunicano immediatamente al Dirigente Scolastico o ai suoi Collaboratori l'eventuale assenza dell'Insegnante dall'aula, per evitare che la classe resti in custodita; k. sono sempre tolleranti e disponibili con gli alunni, non dimenticando mai che la funzione della scuola è quella di educare specialmente quegli alunni che ne hanno più bisogno; l. controllano i servizi igienici che devono essere sempre, puliti e accessibili; m. vigilano l’ingresso degli edifici e, in particolare, i portoni che devono restare chiusi; n. provvedono, al termine delle lezioni, alla quotidiana pulizia e igienizzazione de- gli spazi di pertinenza; o. non si allontanano dal posto di servizio, tranne che per motivi autorizzati dal Di- rettore S.G.A. o dal Dirigente Scolastico; p. curano che possano accedere alla scuola solo le persone espressamente auto- rizzate dal Dirigente Scolastico; q. prendono visione del calendario delle riunioni dei consigli di classe, dei collegi dei docenti o dei consigli di istituto, tenendosi aggiornati circa l'effettuazione del necessario servizio; r. sorvegliano l'uscita delle classi dai cancelli esterni, prima di dare inizio alle puli- zie; s. accolgono il genitore dell'alunno che vuol richiedere l'autorizzazione all'uscita anticipata senza accompagnarlo in classe. 2."
	},
	{
		page: 34,
		text: "Al termine del servizio tutti i collaboratori scolastici, di qualunque turno e a qualsiasi spazio addetti, dovranno controllare quanto previsto dal mansionario (ovvero che: tutte le luci siano spente, tutti i rubinetti dei servizi igienici siano ben chiusi, siano chiuse le porte delle aule, le finestre e le serrande delle aule e della scuola, ogni cosa sia al proprio posto e in perfetto ordine, vengano chiuse le porte e i cancelli della scuola; gli ausiliari addetti agli uffici controlleranno che siano chiuse tutte le porte degli uffici). 1."
	},
	{
		page: 34,
		text: "È fatto obbligo ai collaboratori scolastici di prendere visione delle mappe di evacuazione dei locali e di controllare quotidianamente la praticabilità ed efficienza delle vie di esodo. 2. È vietato fumare all’ interno degli edifici scolastici, anche nei locali non aperti al pubblico, e"
	},
	{
		page: 35,
		text: "in tutta l’area di pertinenza dell’edificio (cortile, palestra, parcheggio…). 3. È vietato introdurre e/o consumare bevande alcooliche durante le attività lavorative. 4. Dall’inizio delle lezioni fino al termine, gli ingressi (portoni di ingresso all’edificio) devono restare chiusi; della mancata chiusura sono responsabili i collaboratori scolastici. 5. Oltre ai compiti specifici, spetta ai collaboratori scolastici la collaborazione con gli insegnanti nella vigilanza degli alunni durante la giornata scolastica, nell’ambito dell’edificio o del cortile della scuola. 6."
	},
	{
		page: 35,
		text: "In particolare, i collaboratori scolastici possono essere chiamati a vigilare direttamente sugli alunni in caso di momentanea assenza dell’insegnante. Almeno un operatore per ogni piano deve controllare e regolare l’ingresso e l’uscita degli alunni, mantenendosi accanto al portone fino a che non si è concluso il flusso di entrata o di uscita degli alunni e provvedendo infine alla chiusura del portone medesimo. In particolar modo occorre che il personale si attivi nei momenti di maggiore confusione (l'ingresso, l'uscita, i cambi d'ora, l'intervallo all’interno dell’edificio scolastico, l’utilizzo dei servizi igienici, della palestra e laboratori) per garantire un’adeguata presenza e un’attenta sorveglianza."
	},
	{
		page: 35,
		text: "I collaboratori scolastici hanno l'obbligo prioritario della vigilanza di ingressi, atri, corridoi e palestre e sugli alunni. Pertanto, ogni altro obbligo di servizio verrà, nei limiti del possibile, temporaneamente interrotto per adempiere a tale compito primario. Per assicurare la continuità della vigilanza sugli alunni durante il cambio di turno dei docenti, i collaboratori scolastici devono favorire l’avvicendarsi degli insegnanti collaborando nella vigilanza delle classi nel cambio d’ora; al suono della campanella a ogni cambio d’ora devono, perciò, disporsi e stazionare ai piani per coadiuvare nella sorveglianza; questo compito risulta prioritario rispetto a ogni altro obbligo di servizio."
	},
	{
		page: 35,
		text: "Per la vigilanza durante l’intervallo il personale collaboratore scolastico stazionerà lungo i corridoi e in prossimità dell’ingresso dei bagni. I collaboratori scolastici in servizio nei piani sono tenuti a collaborare nell'azione di vigilanza sugli studenti, specie su quelli autorizzati dai docenti ad uscire dalle classi, per validi motivi. Il controllo delle classi scoperte è compito dei collaboratori scolastici in servizio, che devono accertarsi di eventuali ritardi o di assenze dei docenti nelle classi."
	},
	{
		page: 35,
		text: "È, quindi, necessario che questi, all’inizio delle lezioni o durante i cambi d'ora, si spostino per tenere sotto controllo le classi momentaneamente scoperte e segnalino immediatamente aldocente collaboratore del Dirigente Scolastico o al Docente coordinatore di plesso le classi senza insegnanti. 7. È vietato a chiunque non appartenga all'amministrazione scolastica accedere agli edifici scolastici senza preventiva autorizzazione scritta del Dirigente Scolastico o, in caso di emergenza, del collaboratore del DS che autorizzerà, previa comunicazione telefonica al DS."
	},
	{
		page: 35,
		text: "In nessun caso è ammesso l'accesso negli edifici scolastici di persone che richiedono denaro per collette, interventi umanitari o elemosina, anche se vantano o mostrano autorizzazioni o permessi: in tal caso è necessario contattare urgentemente la dirigenza. I"
	},
	{
		page: 36,
		text: "genitori degli alunni non possono accedere alle classi. 8. Il personale ausiliario è tenuto a controllare costantemente la stabilità dell'arredo scola- stico in dotazione alle aule e agli altri spazi comuni e a collocare armadi e mensole in posizione tale che non possano arrecare danno ad alcuno. Il personale docente è comunque tenuto a comunicare eventuali problematiche rilevate rispetto alla sicurezza de- gli alunni. Qualora si evidenziassero situazioni di pericolo negli edifici o negli arredi, dovrà essere inviata immediata segnalazione scritta (telefonica in caso di urgenza) al Dirigente Scolastico tramite il RSPP."
	},
	{
		page: 36,
		text: "Nel frattempo devono essere adottati i provvedi- menti necessari ad evitare che gli alunni e/o gli adulti corrano rischi. Gli insegnanti e il personale collaboratore sono tenuti a leggere attentamente il piano di evacuazione predisposto per ogni edificio scolastico, ad attenersi a esso in caso di necessità e durante le previste esercitazioni e a controllare quotidianamente la praticabilità ed efficienza delle vie di esodo. Gli insegnanti e il personale A.T.A. sono tenuti a esercitare la massima vigilanza sulle attività che si svolgono e sui materiali utilizzati, onde evitare qualsiasi pericolo di incendio. 9."
	},
	{
		page: 36,
		text: "Il personale ha il dovere di stabilire rapporti corretti con tutte le componenti scolastiche, fornendo, su richiesta, un adeguato supporto informativo e operativo in base alle necessità. La qualità del rapporto col pubblico e col personale è di fondamentale importanza, in quanto esso contribuisce a determinare il clima educativo della scuola e a favorire il processo comunicativo tra le diverse componenti che dentro o attorno alla scuola si muovono. TITOLO VI – DISPOSIZIONI FINALI 1. Proposte di emendamenti al presente regolamento possono essere avanzate dalle varie componenti della scuola e il C.d."
	},
	{
		page: 36,
		text: "I. deve riunirsi entro 3 settimane dalla loro presentazione che deve essere corredata da almeno 1/5 delle firme della componente che propone la modifica. È fatto obbligo prima di deliberare decisioni che hanno ripercussioni didattiche prendere atto del parere del Collegio dei Docenti. È opportuno altresì tenere conto di esiti di rilevazioni che potranno coinvolgere il personale ATA, i genitori e gli studenti, anche tramite le loro rappresentanze (per i genitori e alunni nei Consigli di Classe). 2."
	},
	{
		page: 36,
		text: "Nessuna disposizione del presente Regolamento d’Istituto, neppure in via provvisoria, può essere disattesa o annullata, da disposizioni diverse o contrarie, se non a seguito di delibera di annullamento o integrazione, formalmente approvata dal Collegio dei Docenti e dal Consiglio d’Istituto, secondo le rispettive competenze 3. Dopo l’approvazione degli OO.CC., il presente Regolamento d’Istituto potrà essere modificato, emendato o integrato, in tutto o in parte, di norma con cadenza annuale."
	},
	{
		page: 37,
		text: "ORGANI COLLEGIALI Art. 1 Il Consiglio di Istituto Definizioni e compiti Il Consiglio di Istituto trova la sua definizione normativa nel Testo Unico delle disposizioni vigenti in materia di istruzione relative alle scuole di ogni ordine e grado approvato con il Decreto Legislativo 16 aprile 1994, n. 297. Osserva, inoltre, le norme contenute nel Regolamento concernente le “Istruzioni generali sulla gestione amministrativo-contabile delle istituzioni scolastiche” approvato con il Decreto Interministeriale 1° febbraio 2001, n. 44, l’Ordinanza Ministeriale 15 luglio 1991, n. 215, recante “Elezione degli organi collegiali a livello di circoloistituto” e tutte le altre norme che dispongono sul suo funzionamento."
	},
	{
		page: 37,
		text: "Parziali modifiche sono state introdotte dalla L.107/15. Il Consiglio di Istituto, nel quale sono rappresentate tutte le componenti della scuola, è organo di governo unitario dell’Istituto. Ogni membro del Consiglio di Istituto non rappresenta solo la componente della quale è stato eletto, ma l’intera comunità scolastica, facendosi promotore dell’unità di indirizzo di tutte le componenti. Il Presidente è garante di tale unità di indirizzo. E’ obiettivo del Consiglio di Istituto mantenere e sviluppare, nei loro aspetti educativi, le relazioni fra l’attività interna della scuola e la vita della società civile."
	},
	{
		page: 37,
		text: "Il Consiglio di Istituto è organo collegiale di governo ed in quanto tale esercita le funzioni di indirizzo politico-amministrativo, definendo gli obiettivi e i programmi da attuare e verificando la rispondenza dei risultati dell’attività amministrativa e della gestione degli indirizzi impartiti. Le funzioni del Consiglio di Istituto sono dettagliatamente elencate nella normativa sopra citata alla quale integralmente si rimanda. Art. 2 Norme di funzionamento del Consiglio d’Istituto La prima convocazione del C.I.S., immediatamente successiva alla nomina dei relativi membri risultati eletti, è disposta dal dirigente scolastico."
	},
	{
		page: 37,
		text: "Nella prima seduta, il C.I.S. è presieduto dal dirigente scolastico ed elegge, tra i rappresentanti dei genitori membri del Consiglio stesso, il proprio presidente. L’elezione ha luogo a scrutinio segreto. Sono candidati tutti i genitori membri del C.I.S.. E’ considerato eletto il genitore che abbia ottenuto la maggioranza assoluta dei voti rapportata al numero dei componenti del C.I.S. Qualora non si raggiunga detta maggioranza nella prima votazione, il presidente è eletto a maggioranza relativa dei votanti, sempre che siano stati presenti la metà più uno dei componenti in carica. In caso di parità si ripete la votazione finché non si determini una maggioranza relativa (D.M. 26 luglio 1983)."
	},
	{
		page: 37,
		text: "Il C.I.S. può deliberare di eleggere anche un vice presidente, da votarsi fra i genitori componenti il consiglio stesso con le stesse modalità previste per l’elezione del presidente. In caso di impedimento o di assenza del presidente ne assume le funzioni il vice presidente o, in mancanza anche di questi, il consigliere più anziano di età. Il C.I.S. è convocato dal presidente Il presidente del C.I.S. è tenuto a disporre la convocazione del consiglio su richiesta del presidente della Giunta Esecutiva."
	},
	{
		page: 37,
		text: "L’ordine del giorno è formulato dal presidente del C.I.S. su proposta del presidente della Giunta Esecutiva A conclusione di ogni seduta del C.I.S., singoli consiglieri possono indicare argomenti da inserire nell’ordine del giorno della riunione successiva. Il C.I.S. può invitare esperti con funzione consultiva a partecipare ai propri lavori; può inoltre costituire commissioni."
	},
	{
		page: 38,
		text: "Il C.I.S., al fine di rendere più agile e proficua la propria attività, può deliberare le nomine di speciali commissioni di lavoro e/o di studio. Delle commissioni nominate dal C.I.S. possono far parte i membri del consiglio stesso, altri rappresentanti delle varie componenti scolastiche ed eventuali esperti qualificati esterni alla scuola. Le commissioni possono avere potere deliberante nei limiti stabiliti dal C.I.S.; svolgono la propria attività secondo le direttive e le modalità stabilite dall’organo stesso. Ad esso sono tenute a riferire, per il tramite del loro coordinatore, in merito al lavoro svolto ed alle conclusioni cui sono pervenute, nel termine di tempo fissato preventivamente."
	},
	{
		page: 38,
		text: "Delle sedute di commissione viene redatto sintetico processo verbale. Le sedute del C.I.S., ad eccezione di quelle nelle quali si discutono argomenti riguardanti singole persone, sono pubbliche. Possono assistere, compatibilmente con l’idoneità del locale ove si svolgono, gli elettori delle componenti rappresentate e tutti gli altri previsti per legge. Ove il comportamento del pubblico, che comunque non ha diritto di parola, non sia corretto il presidente ha il potere di disporre la sospensione della seduta e la sua prosecuzione in forma non pubblica. La pubblicità degli atti del C.I.S. avviene mediante pubblicazione sul sito della scuola."
	},
	{
		page: 38,
		text: "I verbali e tutti gli atti preparatori delle sedute sono depositati nell’ufficio di segreteria dell’istituto e sono consultabili da chiunque ne abbia titolo su richiesta da esaudire entro due giorni dalla presentazione. Tale richiesta, indirizzata al dirigente scolastico, è orale per docenti, personale a.t.a. e genitori; è, invece, scritta e motivata in tutti gli altri casi. Non sono soggetti a pubblicazione gli atti e le deliberazioni concernenti singole persone, salvo contraria richiesta dell’interessato. Il consigliere assente per tre volte consecutive sarà invitato dalla presidenza a presentare per iscritto le giustificazioni dell’assenza."
	},
	{
		page: 38,
		text: "Ove risultasse assente alla successiva seduta, sarà dichiarato decaduto dal C.I.S. con votazione a maggioranza relativa. Le giustificazioni presentate saranno esaminate dal Consiglio: ove le assenze siano ritenute ingiustificate dalla maggioranza assoluta del Consiglio, il consigliere decade dalla carica. Ogni consigliere giustifica le sue assenze attraverso la segreteria della scuola, al presidente del C.I.S. Art 3 Modalità telematica di convocazione e svolgimento del Consiglio di Istituto Convocazione del consiglio telematico 1."
	},
	{
		page: 38,
		text: "Oltre alla modalità ordinaria, il presidente può convocare l’organo in forma telematica (nel seguito: “consiglio telematico”) qualora ritenga che il punto all’ordine del giorno possa essere esaminato (ovvero: i punti all’ordine del giorno possano essere esaminati) per le vie brevi, ossia senza la necessità di un confronto tra i consiglieri in presenza fisica, per ragioni di urgenza e/o semplicità degli argomenti da trattare. 2. La convocazione del Consiglio telematico da parte del presidente avviene con le modalità previste nel presente articolo. 3."
	},
	{
		page: 38,
		text: "Nella lettera di convocazione del Consiglio telematico il presidente: 1. a) esprime la dicitura, evidenziata in grassetto: “Convocazione del Consiglio telematico”; 2. b) formula l’inizio nel modo seguente: “Il Consiglio d’Istituto è convocato in modalità telematica a mezzo posta elettronica, così come contemplato anche dal Regolamento di Istituto."
	},
	{
		page: 38,
		text: "La procedura in forma telematica si giustifica per l’urgenza (oppure: per il carattere semplice) del punto / dei punti in discussione, dovuta (oppure: dovuto) alla seguente ragione: _____________________________________. 3. c) illustra brevemente l’argomento (oppure gli argomenti) in discussione. 4. d) precisa che il consiglio telematico s’intende aperto sin dall’atto della convocazione, a meno che qualche consigliere non si avvalga della facoltà di richiedere al presidente che il"
	},
	{
		page: 39,
		text: "Consiglio si svolga in modalità ordinaria; 5. e) fissa l’ora di chiusura della discussione nonché l’ora di chiusura dei lavori del Consiglio telematico; 6. f) fissa data ed ora di Consiglio nella eventuale modalità ordinaria. 4. E’ salvaguardata la facoltà di ogni consigliere di richiedere al presidente che il Consiglio si svolga in modalità ordinaria; la richiesta deve essere formulata entro e non oltre 48 ore dall’ora di invio della email di convocazione."
	},
	{
		page: 39,
		text: "Qualora il presidente riceva almeno due richieste in tal senso, purché espresse entro il termine regolamentare delle 48 ore, informa i consiglieri che il Consiglio si svolgerà secondo la modalità tradizionale “in presenza” a prescindere dal rispetto del termine dei 5 giorni. 5. Ad ogni consigliere che concordi sulla modalità telematica è richiesto, comunque, d’inviare una e-mail quale ‘conferma della presenza’ ovvero ‘giustificazione dell’assenza’. In caso di reale effettuazione del Consiglio telematico il consigliere che non avrà inviato alcuna email (o dichiarazione in altra forma) nel corso dell’intera procedura, a verbale risulterà “assente senza giustifica”."
	},
	{
		page: 39,
		text: "In aggiunta a quanto specificato al comma 3, la conclusione della lettera di convocazione riporta testualmente i commi 4) e 5) del presente articolo Svolgimento del Consiglio telematico –Il Consiglio telematico s’intende aperto sin dall’atto della convocazione da parte del presidente. – L’illustrazione dell’argomento (oppure degli argomenti) in discussione è contenuta della lettera di convocazione, come precisato nella sezione soprastante. – Appena ricevuta la convocazione tutti i consiglieri possono esprimere il proprio parere e la preferenza di voto (favorevole, contrario, astenuto) inviando una e-mail al presidente ed in conoscenza a tutti gli altri consiglieri, intestatari della e-mail di convocazione. – La discussione telematica su tutti gli argomenti in discussione termina all’ora fissata dal presidente nella lettera di convocazione. – A seguito della discussione e dell’eventuale modifica del proprio convincimento, ogni consigliere può, fino al momento della chiusura del Consiglio telematico, cambiare la propria preferenza di voto, sempre inviando una e-mail al presidente ed in conoscenza a tutti gli altri consiglieri. – Per la maggioranza prevista per l’approvazione delle delibere e per ogni altra questione non specifica del Consiglio telematico, si fa riferimento alle norme previste per il Consiglio ordinario in presenza. –Successivamente all’ora di conclusione del Consiglio e nel più breve tempo possibile il presidente comunica l’esito della votazione (oppure delle votazioni) a tutti i consiglieri. – Il segretario redige il verbale del Consiglio telematico, inserendovi succintamente le dichiarazioni dei consiglieri. –Le delibere sono pubblicate all'albo, analogamente a quanto accade per lo svolgimento del consiglio ordinario."
	},
	{
		page: 39,
		text: "Art. 4 Norme di funzionamento della Giunta Esecutiva del Consiglio d’Istituto Il C.I.S. nella prima seduta, dopo l’elezione del presidente, che assume immediatamente le sue funzioni, elegge nel suo seno una Giunta Esecutiva composta da un docente, un componente degli a.t.a., due genitori, secondo modalità stabilite dal Consiglio stesso e con voto segreto. Della Giunta fanno parte di diritto il dirigente scolastico, che la presiede ed ha la rappresentanza dell’istituto, ed il DSGA, che svolge anche la funzione di segretario della Giunta stessa. La Giunta Esecutiva prepara i lavori del C.I.S., predisponendo tutto il materiale necessario ad"
	},
	{
		page: 40,
		text: "una corretta informazione dei consiglieri prima della seduta del Consiglio. Art. 5 Norme di funzionamento del Collegio dei Docenti (CD) Il Collegio Docenti è composto da tutti i docenti di ruolo e non di ruolo ivi compresi i supplenti a tempo determinato. Al Collegio sono attribuite tutte le funzioni previste dall’art. 4 del D.P.R. n°416 del 31.05 1974, dall’articolo 7 del Decreto Legislativo n° 297 del 16.04.1994 e dal DPR n 275 del 8/3/199 Regolamento in materia di Autonomia."
	},
	{
		page: 40,
		text: "Il Collegio ha potere deliberante per quanto riguarda il funzionamento didattico dell’istituto (sperimentazione, ricerca, innovazione metodologico - didattica) Esso deve inoltre, nel quadro della legge sull’Autonomia scolastica individuale le Commissioni e la composizione delle Commissioni di lavoro dell’istituto che ritiene opportune per il buon funzionamento dell’istituto Individuare ed eleggere al proprio interno i docenti Funzioni Strumentali Costruire Approvare e verificare LO3LDQR7ULHQQDOHGHOO¶2IIHUWD)RUPDWLYDƒ Approvare la Carta dei servizi dell’Istituto."
	},
	{
		page: 40,
		text: "Esso si insedia in seduta unitaria ad inizio anno scolastico, potrà essere riunito ogni qualvolta il Capo d’Istituto ne ravvisi la necessità, quando almeno un terzo dei suoi componenti ne faccia richiesta e comunque almeno una volta ogni quadrimestre. Sono messi a disposizione dei docenti, i verbali dei collegi ed i relativi materiali ed i materiali utili alle eventuali deliberazioni. Il Collegio ha luogo in ore non coincidenti con l’orario di lezione dei docenti."
	},
	{
		page: 40,
		text: "Art. 6 Norme di funzionamento del Comitato per la valutazione dei docenti La legge 107/15 ha modificato parzialmente le funzioni e la composizione del Comitato, precedentemente normato dal D.L.vo n. 297/94. ƒ Presso ogni istituzione scolastica ed educativa è' istituito, senza nuovi o maggiori oneri per la finanza pubblica, il Comitato per la Valutazione dei docenti. ƒ Il comitato ha durata di tre anni scolastici, è presieduto dal dirigente scolastico ed è costituito dai seguenti componenti: a) tre docenti dell'istituzione scolastica, di cui due scelti dal collegio dei docenti e uno dal consiglio di istituto; b) due rappresentanti dei genitori, per la scuola dell'infanzia e per il primo ciclo di istruzione; c) un componente esterno individuato dall'ufficio scolastico regionale tra docenti, dirigenti scolastici e dirigenti tecnici. ƒ Con quest’ultimo componente il Comitato individua i criteri per l’assegnazione annuale, da parte del DS, del bonus docenti finalizzato alla valorizzazione del merito del personale docente. ƒ Il comitato esprime altresì il proprio parere sul superamento del periodo di formazione e di prova per il personale docente ed educativo."
	},
	{
		page: 40,
		text: "A tal fine il comitato è composto dal dirigente scolastico, che lo presiede, dai docenti di cui alla lettera a, ed è integrato dal docente a cui sono affidate le funzioni di tutor. ƒ 5. Il comitato valuta il servizio su richiesta dell'interessato, previa relazione del dirigente scolastico; nel caso di valutazione del servizio di un docente componente del comitato, ai lavori non partecipa l'interessato e il consiglio di istituto provvede all'individuazione di un sostituto."
	},
	{
		page: 41,
		text: "ƒ Il comitato esercita altresì le competenze per la riabilitazione del personale docente. Art. 7 Norme di funzionamento dei Consigli di Classe Il Consiglio di classe ha funzione propositiva, esprime pareri non vincolanti in ambito educativo didattico e attività di sperimentazione.( Art. 3 del D.P.R. n°416 del 31.05.1974 e dall’articolo 5 del D.lgs n. 297 del 16.04.1994). I Consigli di classe sono presieduti rispettivamente dal Dirigente scolastico oppure da un docente-coordinatore, membro del Consiglio stesso, suo delegato."
	},
	{
		page: 41,
		text: "Di esso fanno parte i 4 rappresentanti dei genitori regolarmente eletti entro il primo trimestre di ogni anno scolastico; si riuniscono in ore non coincidenti con l'orario delle lezioni, col compito di formulare al Collegio dei docenti proposte in ordine all'azione educativa e didattica e ad iniziative di sperimentazione e con quello di agevolare ed estendere i rapporti reciproci tra docenti, genitori ed alunni."
	},
	{
		page: 41,
		text: "Le competenze relative alla realizzazione del coordinamento didattico e dei rapporti interdisciplinari spettano al Consiglio di classe con la sola presenza dei docenti, così come le competenze relative alla valutazione periodica e finale degli alunni spettano al Consiglio di classe con la sola presenza dei docenti. Le funzioni di segretario del Consiglio sono attribuite dal Dirigente scolastico a uno dei docenti membro del Consiglio stesso. Il Consiglio di classe, presenti i genitori, è convocato dal Dirigente scolastico almeno due volte durante l'anno scolastico; può essere convocato inoltre su richiesta motivata di almeno 1/3 dei suoi membri."
	},
	{
		page: 41,
		text: "La convocazione del Consiglio di classe dovrà contenere l'indicazione degli argomenti all'ordine del giorno e dovrà essere comunicata agli interessati almeno 5 giorni prima della data stabilita. Il Consiglio di classe, durante la seduta, può fissare a maggioranza argomenti da inserire all'ordine del giorno della seduta successiva. Inoltre nell'intervallo fra una seduta e l'altra ciascun membro del consiglio può proporre per iscritto nuovi argomenti. La discussione di detti argomenti è subordinata all'approvazione del Consiglio. APPENDICE 1 Criteri generali per l’ammissione."
	},
	{
		page: 41,
		text: "Tenuto conto che le circolari ministeriali inerenti alle iscrizioni stabiliscono che “qualora le richieste di iscrizione fossero in eccedenza, le scuole devono definire i criteri di precedenza nella ammissione, mediante delibera del consiglio d’Istituto”; PATTO EDUCATIVO DI CORRESPONSABILITA' FRA SCUOLA E FAMIGLIE SCUOLA (D.P.R. n. 235 del 21 novembre 2007) Nel pieno rispetto del regolamento interno di istituto, dello statuto delle studentesse e degli studenti elaborato nella scuola, del Ptof si delinea, in sintesi, il seguente Patto formativo tra Istituto e docenti, alunni e genitori LA SCUOLA S’IMPEGNA A … LA FAMIGLIA S’IMPEGNA A … L’ALUNNO S’IMPEGNA A … OFFERTA FORMATIVA • Proporre un’Offerta Formativa che favorisca un “benessere” psico-fisico necessario all’apprendimento e alla maturazione della persona. • Fornire gli strumenti per conoscere i propri diritti e doveri, formando cittadini responsabili e attivi che partecipino pienamente e con consapevolezza alla vita civica, culturale"
	},
	{
		page: 42,
		text: "e sociale della loro comunità. • Prendere visione del Patto Formativo condividerlo e farne motivo di riflessione con i propri figli • Accompagnare i ragazzi nel loro percorso di crescita al fine di aiutarli a diventare cittadini consapevoli • Ascoltare gli insegnanti e porre domande pertinenti quando viene presentato il Piano dell’Offerta Formativa • Comprendere l‘importanza di seguire le regole che regolano la convivenza civile assumendo anche comportamenti corretti nei confronti degli altri RELAZIONALITÁ • Condurre l’alunno ad una sempre più chiara conoscenza di sé, guidandolo alla conquista della propria identità • Creare un clima di fiducia per favorire scambi ed interazioni • Favorire il dialogo, la discussione, i dibattiti, in interventi ordinati, su argomenti che permettono ai docenti stessi di guidare gli alunni nei diversi processi formativi • Ricercare linee educative condivise con i docenti per un’efficace azione comune all’interno della scuola • Ricercare e costruire con i docenti una comunicazione il più possibile chiara e corretta fatta di ascolto reciproco, comunicazione diretta e rispetto di aspettative ed esigenze • Impartire ai figli le regole del vivere civile • Rispettare i compagni e tutto il personale scolastico • Sviluppare rapporti di integrazione e di solidarietà • Non compiere atti che offendano la morale, la civile convivenza ed il regolare svolgimento delle lezioni INTERVENTI EDUCATIVI • Rafforzare il senso di responsabilità e mantenere l'osservanza delle norme di sicurezza da parte degli operatori e degli studenti • Far rispettare le norme di comportamento, anche con riferimento a fenomeni di bullismo e cyber bullismo, i regolamenti e i divieti, in particolare relativamente all’utilizzo di smartphone e altri dispositivi elettronici fornendo anche informazioni per utilizzare in modo responsabile i social network • Prendere visione delle comunicazioni annotate sul registro elettronico e delle circolari pubblicate sulla bacheca di Argo da parte della segreteria e firmare le comunicazioni • Verificare i tempi e le modalità di utilizzo dei social network da parte dei ragazzi • Risolvere eventuali conflitti o situazioni problematiche attraverso il dialogo e la fiducia reciproca • Rispettare le regole per il buon funzionamento della scuola • Osservare le disposizioni di sicurezza nella Scuola • Rispettare il Regolamento d’Istituto • Rispettare le cose proprie ed altrui, gli arredi, i materiali didattici e tutto il patrimonio comune della Scuola • Utilizzare il diario per eseguire puntualmente i lavori assegnati; • Far firmare puntualmente le comunicazioni scuola- famiglia • Utilizzare in modo corretto i social network • Accettare le sanzioni come momento di riflessione • Prendere adeguati provvedimenti disciplinari in caso di infrazioni"
	},
	{
		page: 43,
		text: "• Informare sull’andamento didattico e disciplinare dell’alunno in modo puntuale e trasparente attraverso colloqui (in presenza /a distanza), l’account istituzionale e/o registro • Non fare osservazioni negative sulle decisioni prese dalla scuola • Far riflettere il figlio sul rispetto del regolamento scolastico sui propri errori PARTECIPAZIONE/ INTERVENTI DIDATTICI • Mettere al corrente gli alunni del percorso didattico da svolgere e verificarlo periodicamente • Coinvolgere genitori e alunni nella costruzione del piano didattico educativo della classe • Proporre alle studentesse e agli studenti attività che sollecitino e facilitino l’esplorazione critica degli argomenti di studio e il problem solving • Tenersi aggiornata sull'attività scolastica dei propri figli • Partecipare agli incontri scuola-famiglia, documentandosi sul profitto in ciascuna disciplina nelle forme e ore previste • Collaborare attivamente con il personale educativo • Collaborare con gli insegnanti per l’attuazione di eventuali strategie di recupero e approfondimento • Partecipare con attenzione alle attività scolastiche • Apportare gli utili correttivi al proprio impegno scolastico e al proprio metodo di studio • Impegnarsi assiduamente nello studio per raggiungere gli obiettivi formativi e didattici utili allo sviluppo della sua coscienza critica e all'acquisizione delle competenze necessarie PUNTUALITÁ • Garantire la puntualità dell’inizio delle lezioni ogni giorno con i docenti che arrivano con cinque minuti di anticipo e vigilano all’ingresso gli alunni • Rispettare l’orario di ingresso e limitare al minimo indispensabile le uscite o le entrate fuori orario • Garantire la regolarità della frequenza scolastica giustificando eventuali assenze o ritardi • Frequentare con regolarità rispettando l’ora d’inizio delle lezioni • Rispettare le scadenze per la giustificazione delle assenze, dei ritardi e per la riconsegna dei riscontri COMPITI • Verificare quotidianamente l’adempimento delle consegne per abituare l’alunno ad una corretta responsabilità • Distribuire e calibrare i carichi di studio nell’arco della settimana • Intervenire col recupero nelle aree in cui gli alunni sono più carenti • Controllare che il proprio figlio abbia eseguito i compiti assegnati dopo aver consultato il diario/registro elettronico • Evitare di sostituirsi ai figli nell’esecuzione dei compiti • Eseguire regolarmente i compiti assegnati impegnandosi nello studio e in caso di inadempienza presentare giustificazione scritta dai genitori • Aver cura dei materiali e portarli a Scuola regolarmente • Prestare attenzione durante le lezioni. • Utilizzare il diario per eseguire puntualmente i lavori assegnati"
	},
	{
		page: 44,
		text: "VALUTAZIONE • Garantire l’informazione relativa ai processi di valutazione • Svolgere prove di verifica chiare e precise nella formulazione degli obiettivi da valutare e nelle modalità di correzione e valutazione • Programmare delle verifiche solo al termine di un adeguato percorso • Collaborare per potenziare nel figlio una coscienza delle proprie risorse e dei propri limiti • Adottare un atteggiamento in accordo con quello dell’insegnante • Riconoscere le proprie capacità e le proprie conquiste impegnandosi a superare i propri limiti • Autovalutarsi e apportare gli utili correttivi al proprio impegno scolastico e al proprio metodo di studio didattico Per quanto riguarda le sanzioni si fa riferimento al Regolamento d’Istituto."
	},
	{
		page: 44,
		text: "DIDATTICA DIGITALE INTEGRATA LA SCUOLA S’IMPEGNA A … LA FAMIGLIA S’IMPEGNA A … L’ALUNNO S’IMPEGNA A … • Elaborare il Piano scolastico per la Didattica Digitale Integrata nel rispetto delle specifiche Linee guida ministeriali di cui al Decreto n.89/2020. • Fornire alle Famiglie e agli Studenti specifica informativa e indicazioni per una adeguata partecipazione alle attività didattiche a distanza, anche attraverso la conoscenza/condivisione del Piano scolastico per la didattica digitale integrata. • Realizzare attività didattiche di formazione nei confronti degli studenti: • sui rischi derivanti dall’utilizzo della rete; • sulle regole di sicurezza e di comportamento da adottare per l’utilizzo consapevole degli strumenti tecnologici in generale; • Stimolare il proprio figlio alla partecipazione il più possibile autonoma e responsabile alle attività didattiche a distanza con riferimento a tutte le discipline di studio e allo svolgimento dei compiti assegnati nel rispetto delle scadenze.. • Rendersi disponibile per la collaborazione e il dialogo educativo con la Scuola, al fine di condividere gli interventi educativi • Vigilare, e informarsi tramite i docenti, affinché il comportamento del proprio figlio rispetti le Informative del Dirigente Scolastico, i Regolamenti dalla scuola, le disposizioni normative in materia di privacy. • Assumere una condotta diligente, rispettosa delle disposizioni dei docenti, delle Informative del Dirigente Scolastico, dei Regolamenti dalla scuola e delle disposizioni normative in materia di privacy • Frequentare regolarmente le lezioni di tutte le discipline, impegnandosi in modo responsabile nell’esecuzione dei compiti richiesti. • sulla conoscenza dei vari Regolamenti e Informative di Istituto, nonché di quanto serve a promuovere un uso positivo delle nuove tecnologie al fine di riconoscere, prevenire e rispondere a possibili situazioni problematiche."
	},
	{
		page: 45,
		text: "APPENDICE 2 STATUTO DELLE STUDENTESSE E STUDENTI e REGOLAMENTO DI DISCIPLINA Il regolamento, definito ai sensi del Regolamento in materia di autonomia delle istituzioni scolastiche, del DPR 235/07 che integra il DPR 249/98, sarà vigente fino a successiva delibera del nuovo Consiglio d’Istituto. Premessa La scuola è luogo di formazione e di educazione mediante lo studio, l'acquisizione delle conoscenze e lo sviluppo della coscienza critica. La scuola è una comunità di dialogo, di ricerca, di esperienza sociale volta alla crescita della persona in tutte le sue dimensioni."
	},
	{
		page: 45,
		text: "In essa ognuno, con pari dignità e nella diversità dei ruoli, opera per garantire agli studenti la formazione alla cittadinanza, la realizzazione del diritto allo studio, lo sviluppo delle potenzialità di ciascuno e il recupero delle situazioni di svantaggio."
	},
	{
		page: 45,
		text: "NORME DI COMPORTAMENTO DEGLI ALUNNI a) Gli alunni sono tenuti ad avere nei confronti del Dirigente Scolastico, di tutto il personale e dei compagni, lo stesso rispetto, anche formale, consono ad una convivenza civile. b) Gli alunni sono tenuti a frequentare regolarmente le lezioni, a favorirne lo svolgimento e ad assolvere assiduamente agli impegni di studio. c) La presenza a scuola è obbligatoria anche per tutte le attività organizzate e programmate dal Consiglio di classe. d) Gli alunni, qualora assenti, devono presentare la giustificazione firmata da uno dei genitori o da chi ne fa le veci. e) Gli alunni entrano secondo gli orari e con le modalità che vengono comunicate ai genitori all'inizio dell’anno scolastico con le disposizioni di carattere generale. f) Sono ammessi in classe gli alunni in ritardo solo se questo è imputabile al trasporto scolastico."
	},
	{
		page: 45,
		text: "In tutti gli altri casi un genitore, o persona delegata dalla famiglia, deve accompagnare l’alunno a scuola e motivare il ritardo firmando apposito modulo. • Le assenze sono giustificate dal Docente della prima ora di lezione, previo controllo delle date, che dovranno corrispondere alle assenze riportate sul registro di classe, e delle firme, che dovranno essere uguali a quelle depositate sui libretti. Non vi dovranno essere correzioni o abrasioni."
	},
	{
		page: 45,
		text: "Il motivo dell'assenza non dovrà essere generico ma, sia pure sinteticamente, esplicativo. • Gli alunni che si presenteranno ripetutamente senza giustificazione potranno essere riammessi esclusivamente dalla Direzione ed il docente dovrà annotare sul registro dì classe l'obbligo di portare la giustificazione il giorno successivo. • Non è consentito agli alunni di uscire dall'edificio scolastico prima del termine delle lezioni. In caso di necessità i genitori dovranno prelevare personalmente lo studente (o delegare per iscritto un'altra persona maggiorenne che dovrà essere munita di documento di riconoscimento). Gli alunni inoltre dovranno:"
	},
	{
		page: 46,
		text: "ƒ accettare il controllo dell’adulto e perciò non allontanarsi senza aver ottenuto il permesso; ƒ seguire in modo attento le lezioni evitando d’essere fonte di distrazione per i compagni e di disturbo per l’insegnante; ƒ eseguire con puntualità il lavoro assegnato (lezioni, compiti e altre consegne) e portare tutto il materiale occorrente; ƒ costruire con l’insegnante la lezione collaborando nel lavoro individuale e/o di gruppo ed intervenendo in modo ordinato e pertinente; ƒ manifestare all’insegnante ogni difficoltà nel lavoro di classe e a casa al fine di mettere a punto strategie opportune per superare l’ostacolo; ƒ sottoporsi regolarmente alle verifiche previste dai docenti; ƒ aver cura degli ambienti, delle strutture, degli arredi e degli strumenti al fine di mantenere accogliente e funzionale l’ambiente scolastico; ƒ osservare il divieto di usare il cellulare durante le ore di lezione; ƒ vestire in modo consono all’ambiente e all’istituzione; ƒ osservare le norme di sicurezza indicate dal “Piano di sicurezza della scuola” e collaborare nelle prove di evacuazione e in eventuali eventi di emergenza; ƒ favorire la comunicazione scuola/famiglia con la consegna degli avvisi sul diario o sul libretto personale ad essa adibito; ƒ al cambio d’insegnante, negli spostamenti da un'aula all'altra, all'ingresso e all'uscita gli alunni tenere un comportamento corretto ed educato; ƒ al termine delle lezioni, prepararsi al suono della prima campana, disporsi in fila, quindi avviarsi all’uscita accompagnati dall’insegnante."
	},
	{
		page: 46,
		text: "Tale disposizione è valida anche durante gli spostamenti dell’intera classe per uscite di istruzione. Inoltre: ƒ non è permesso correre, uscire dalla classe senza autorizzazione, gridare nei corridoi e nelle aule, ecc... ƒ gli alunni non possono recarsi nella sala insegnanti, in biblioteca, in palestra, nei laboratori da soli, ma solo se accompagnati da un insegnante o da un collaboratore scolastico."
	},
	{
		page: 46,
		text: "Se hanno bisogno di comunicare con un insegnante, devono chiedere il permesso ai docenti presenti per entrare; ƒ durante gli intervalli, sia nella scuola sia nel cortile, sono da evitare tutti i giochi che possono diventare pericolosi (ad es. spingersi, salire e scendere le scale, ecc...): gli alunni dovranno seguire le indicazioni degli insegnanti e dei collaboratori scolastici; ƒ i servizi vanno utilizzati in modo corretto e devono essere rispettate le più elementari norme di igiene e pulizia; ƒ saranno puniti con severità tutti gli episodi di violenza che dovessero verificarsi tra gli alunni sia all'interno della scuola che fuori."
	},
	{
		page: 46,
		text: "Tutti devono poter frequentare la scuola con serenità senza dover subire le prepotenze di altri; ƒ gli insegnanti ed i collaboratori scolastici segnaleranno in Direzione i nominativi degli alunni o le classi che non rispettano queste regole; ƒ gli alunni sono tenuti a rispettare il lavoro e a seguire le indicazioni dei collaboratori scolastici che assicurano, con i docenti, il buon funzionamento della scuola ed in alcuni momenti possono essere incaricati della sorveglianza di una classe o di un gruppo di alunni. I collaboratori durante le ore di lezione sorvegliano corridoi e servizi; ƒ gli alunni che, per motivi di salute, non potranno seguire le lezioni di Ed."
	},
	{
		page: 46,
		text: "Fisica dovranno presentare al Dirigente Scolastico la domanda di esonero dall'attività pratica, firmata dal genitore unita a certificato del medico di famiglia. Per la partecipazione ai Giochi Sportivi Studenteschi dovrà essere presentato il \"Libretto sanitario dello sportivo\" valido per attività aspecifica non agonistica. che verrà fotocopiato a cura della segreteria. ƒ gli alunni sono tenuti a portare a scuola solo l'occorrente per i compiti e le lezioni e"
	},
	{
		page: 47,
		text: "l'eventuale merenda; non è consigliabile portare somme di denaro e oggetti di valore. La scuola, in ogni caso, non risponde di eventuali furti; ƒ ogni studente è responsabile dell'integrità degli arredi e del materiale didattico che la scuola gli affida: coloro che provocheranno guasti o rotture al materiale e o alle suppellettili della scuola o del Comune, saranno invitati a risarcire i danni."
	},
	{
		page: 47,
		text: "PROVVEDIMENTI DISCIPLINARI ƒ I provvedimenti disciplinari hanno finalità educativa e tendono al rafforzamento del senso di responsabilità ed al ripristino di rapporti corretti all'interno della comunità scolastica. ƒ La responsabilità disciplinare è personale. ƒ Nessuno può essere sottoposto a sanzioni disciplinari senza essere stato prima invitato ad esporre le proprie ragioni. ƒ Nessuna infrazione disciplinare connessa al comportamento può influire sul profitto, ma con l'applicazione della riforma scolastica tutte le mancanze disciplinari incideranno sulla valutazione del comportamento nella scheda. ƒ Le sanzioni sono sempre temporanee, proporzionate all’ infrazione disciplinare, ispirate, per quanto possibile, al principio della riparazione del danno. ƒEsse tengono conto della situazione personale dello studente. ƒ Allo studente è sempre offerta la possibilità di convertirle in attività in favore della comunità scolastica. ƒ Appare opportuna da parte di tutti gli insegnanti una continua opera di sensibilizzazione perché vengano meno gli episodi di intolleranza nei confronti di chi è più debole ed in difficoltà. ƒ In nessun caso può essere sanzionata né direttamente, né indirettamente, la libera espressione di forme di pensiero correttamente manifestate e non lesive dell'altrui personalità."
	},
	{
		page: 47,
		text: "Agli alunni che manchino ai loro doveri scolastici sono inflitte, secondo la gravità della infrazione, le seguenti SANZIONI DISCIPLINARI: a) Rimprovero verbale. b) Consegna da svolgere in classe. c) Consegna da svolgere a casa. d) Invito alla riflessione guidata sotto l'assistenza di un docente. e) Ammonizione scritta sul libretto delle comunicazioni alla famiglia. f) Ammonizione scritta con annotazione sul registro di classe. g) Mancata partecipazione ai viaggi d’istruzione, uscite didattiche, attività ludiche, con obbligo di presenza a scuola. h) Allontanamento dalla comunità scolastica fino ad un massimo di 15 giorni. i) Allontanamento dalla comunità scolastica per un periodo superiore a 15 giorni. j) Allontanamento dalla comunità scolastica per tutto l’anno scolastico. k) Esclusione dallo scrutinio finale o non ammissione all’esame di stato conclusivo del corso di studi Soggetti competenti ad infliggere la sanzione 1."
	},
	{
		page: 47,
		text: "II singolo docente può infliggere le sanzioni fino alla lettera f). 2. Il Dirigente Scolastico può infliggere le sanzioni fino alla lettera f). 3. Il Consiglio di Classe può infliggere le sanzioni fino alla lettera h)."
	},
	{
		page: 48,
		text: "4. Il Consiglio di Classe viene convocato entro due giorni dal Dirigente Scolastico in base al tipo di mancanza o su richiesta della maggioranza dei componenti il Consiglio di Classe (esclusi i rappresentanti dei genitori). 5. Il Consiglio d’istituto deve decidere per le sanzioni di tipo i) - J) – k) dopo la richiesta del Consiglio di classe nella sua forma allargata con i genitori, fatto salvo il principio di astensione dei soggetti interessati ( in questo caso i genitori)."
	},
	{
		page: 48,
		text: "Modalità d’ irrogazione delle sanzioni Prima di irrogare una sanzione disciplinare occorre che lo studente possa esporre le proprie ragioni: 1. verbalmente per le sanzioni fino alla lettera g); 2. verbalmente o per iscritto ed in presenza dei genitori, se possibile, per la lettera h). Nei casi previsti dal presente titolo, i genitori dello studente devono essere prontamente avvisati tramite lettera raccomandata a mano, fonogramma o mail. In essi si dovrà comunicare la data e l'ora di riunione dell'organo collegiale nonché l'invito ai genitori ad assistere il proprio figlio nell'esposizione."
	},
	{
		page: 48,
		text: "Se i genitori e lo studente, pur correttamente avvisati, non parteciperanno alla riunione, il Consiglio di Classe procederà basandosi sugli atti e sulle testimonianze in proprio possesso. Nel caso in cui i genitori avvisino che non potranno essere presenti, il Dirigente Scolastico potrà nominare un tutore che assolverà la funzione dei genitori ed assisterà lo studente. Gli organi collegiali sanzioneranno anche senza la presenza dello studente e dei suoi genitori o dell'eventuale tutore. La sospensione può prevedere l'allontanamento dalle lezioni della classe e l'obbligo di frequenza ad alcune attività interne alla scuola."
	},
	{
		page: 48,
		text: "Su proposta del Consiglio di Classe può essere offerta allo studente la possibilità di convertire la sospensione con attività in favore della comunità scolastica. Infrazioni Disciplinari Per gli allievi che tengono un comportamento negligente non assolvendo agli impegni di studio, non frequentando regolarmente i corsi, disturbando l'ordinato svolgimento delle attività didattiche e mostrando incuria per l'ambiente scolastico, si applicano le sanzioni fino e). Per gli allievi che non rispettino le disposizioni organizzative e di sicurezza dettate all'interno dell'Istituto, si applicano la sanzione e) e nei casi più gravi la sanzione f) - g)."
	},
	{
		page: 48,
		text: "Per gli allievi che vengano meno al dovere di rispetto nei confronti del capo di Istituto, dei docenti, dell'altro personale della scuola e dei loro compagni, si applicano la sanzione f) - g) - h) in base alla gravità dell’azione. Per gli allievi che utilizzano le strutture, i macchinari e i sussidi didattici dell'Istituto in modo scorretto, si applicano le sanzioni a) - e) - f) - g). Nel caso vengano arrecati danni al patrimonio della scuola, fatto salvo l'obbligo del risarcimento, si applicano le sanzioni f) e nei casi più gravi la sanzione g) -h) - i) – j)."
	},
	{
		page: 48,
		text: "In caso di reati che violino la dignità e il rispetto per la persona umana, per atti di grave violenza o connotati da particolare gravità tali da determinare seria apprensione nella comunità scolastica si applicano le sanzioni j) – k)."
	},
	{
		page: 49,
		text: "Per gli allievi che con il loro comportamento impediscono la libertà di espressione, di pensiero, di coscienza e di religione, o assumono atteggiamenti ispirati a concezioni razziste, discriminatorie o sopraffattrici, oltre ad eventuali sanzioni, si attuano interventi di sensibilizzazione attraverso dialoghi, letture, ricerche, ecc. Qualora concorrano circostanze attenuanti e avuto riguardo alla precedente condotta può essere inflitta la sanzione di grado inferiore rispetto a quella stabilita. In caso di recidiva o qualora le infrazioni assumano particolare gravità o abbiano carattere collettivo può essere inflitta la sanzione di grado superiore."
	},
	{
		page: 49,
		text: "Allo studente è sempre offerta la possibilità di convertire le sanzioni di cui ai punti fino a f) con attività formative scelte al momento dal consiglio di classe. L'allontanamento dalla comunità scolastica può essere disposto anche quando siano stati commessi atti che mettano in pericolo l'incolumità della persona. In tal caso la durata dell'allontanamento è commisurata alla gravità del reato ovvero al permanere della situazione di pericolo."
	},
	{
		page: 49,
		text: "IMPUGNAZIONI Contro le sanzioni disciplinari sopra descritte è ammesso ricorso, da parte dei genitori, entro 15 giorni dalla comunicazione della loro irrogazione, ad un apposito Organo di Garanzia interno alla scuola composto da 2 genitori (gli eletti nei Consigli di Classe con il maggior numero di voti) e da 2 docenti eletti all’interno del Consiglio d’Istituto ( uno con funzione di segretario). L’organo presieduto dal Dirigente Scolastico resta in carica per 2 anni scolastici. E’ possibile esporre un reclamo di violazione dello Statuto anche al Direttore dell’Ufficio scolastico regionale."
	},
	{
		page: 50,
		text: "PATTO DI CORRESPONSABILITA’ Visto l’art. 3 del Decreto del Presidente della Repubblica del 21 novembre 2007 n. 235, contestualmente all’iscrizione è richiesta la sottoscrizione da parte dei genitori e degli studenti di un Patto educativo di corresponsabilità, finalizzato a definire in maniera dettagliata e condivisa diritti e doveri nel rapporto tra istituzione scolastica autonoma, studenti e famiglie. Per quanto non specificato nel presente Regolamento, ivi compresi eventuali dettagli applicativi, si fa riferimento alla normativa citata in cappello."
	},
	{
		page: 50,
		text: "APPENDICE 3 REGOLAMENTO DELL’ISTITUZIONE SOLASTICA PER LA DISCIPLINA DELLA STIPULA DEI CONTRATTI DI SPONSORIZZAZIONE PREMESSA Il presente regolamento disciplina modalità e criteri inerenti la stipula dei contratti di sponsorizzazione, Ai sensi degli artt. n.25 bis del D.L. n.29/93,come integrato dal D.L.n.59/98 e n.33 comma 2 e 50 del D.I n.44 del 1.2.01 ART.1 – STIPULA DEI CONTRATTI DI SPONSORIZZAZIONE La stipula dei contratti di sponsorizzazione può essere disposta dal Dirigente Scolastico, nel rispetto delle seguenti condizioni: 1. in nessun caso è consentito concludere contratti in cui siano possibili forme di conflitto di interesse tra l’attività pubblica e quella privata; 2. non è consentito concludere contratti di sponsorizzazione con soggetti le cui finalità ed attività siano in contrasto anche di fatto con la funzione educativa e culturale della scuola; ART.2 – SCELTA DEGLI SPONSOR 1."
	},
	{
		page: 50,
		text: "Nella scelta degli sponsor di dovrà accordare la preferenza: a. Ai soggetti che per finalità statutarie, per le attività svolte, abbiano dimostrato particolare attenzione nei confronti dei problemi dell’infanzia e dell’adolescenza. b. Ai soggetti che, in considerazione della specificità degli indirizzi di studio dell’istituto, attuano o abbiamo manifestato l’intenzione di attuare forme di collaborazione con la scuola, nell’ambito di progetti o attività inseriti nel Ptof."
	},
	{
		page: 50,
		text: "ART.3 - ATTIVITA’ SPONSORZZABILI La sponsorizzazione, che deve sempre realizzare un risparmio di spesa per l’istituto, è ammessa: 1. per la realizzazione di progetti ed attività inseriti nel POF dell’Istituto, anche in relazione ad acquisti di attrezzature e materiali didattici 2. la medesima può comprendere, oltre a quanto previsto al punto 1 del presente articolo, agevolazioni per il personale della scuola, per gli studenti e le loro famiglie, nel rispetto della pluralità di eventuali proposte in merito. ART.4 – MODALITA’ DELLA SPONSORIZZAZIONE Ai fini dell’attuazione di un contratto di sponsorizzazione è possibile: - inserire un nome. Ditta, logo o marchio dello sponsor in spazi pubblicitari nei siti internet istituzionali;"
	},
	{
		page: 51,
		text: "- inserire un nome. Ditta, logo o marchio dello sponsor all’interno di documenti recanti comunicazioni istituzionali; non è invece possibile: 1. comunicare allo sponsor dati personali dei destinatari dell’informazione o comunicazione istituzionale dell’Ente; 2. inserire messaggi pubblicitari all’interno di documenti recanti comunicazioni istituzionali e, in particolare, utilizzare dati personali per differenziare i messaggi pubblicitari in relazione a caratteristiche dei destinatari delle comunicazioni."
	},
	{
		page: 51,
		text: "APPENDICE 5 UTILIZZAZIONE DI LOCALI, BENI O SITI INFORMATICI APPARTENENTI ALL'ISTITUZIONE SCOLASTICA, DA PARTE DI TERZI: La concessione in uso dei locali deve essere compatibile con l’attività educativa svolta nell’istituto stesso, nel senso che non può essere limitativa delle attività didattiche dell’istituto. Le richieste all’uso dei locali e delle attrezzature scolastiche da parte di terzi vanno inoltrate per iscritto all’amministrazione comunale o provinciale, come previsto dal Protocollo sottoscritto dall’Ente Locale e dalla scuola."
	},
	{
		page: 51,
		text: "APPENDICE 4 \"DISCIPLINA DEL CONFERIMENTO DI CONTRATTI DI PRESTAZIONI D’OPERA PER L’ARRICCHIMENTO DELL’OFFERTA FORMATIVA\" ART.1 AMBITO DI APPLICAZIONE - Il presente regolamento disciplina, ai sensi della normativa vigente, le modalità e i criteri per il conferimento di contratti di prestazione di lavoro autonomo di tipo occasionale per attività e insegnamenti, inseriti nella programmazione dell'offerta formativa, che richiedano specifiche e peculiari competenze professionali, cui non possa farsi fronte con personale in servizio. - La normativa di riferimento è contenuta: ƒ Nell’ art.21 della L.15.3.97 n.59; ƒ Nel D.P.R. 8.3.99 n.275 artt.8 e 9; ƒ Nell’’art.10 del D.L.16.4.94 N.297; ƒ negli artt.33 e 40 del D.M."
	},
	{
		page: 51,
		text: "N.44 DEL 1.2.01; ƒ nell'art.7, comma 6 del D.lgs 30/3/2001 n.165, inerente la gestione delle risorse umane; ƒ art.46 della legge133/2008; - Il presente regolamento è finalizzato a garantire la qualità della prestazione, la trasparenza e l’oggettività delle procedure di individuazione degli esperti esterni, nonché la razionalizzazione delle spese per gli stessi. ART.2 PRESUPPOSTI PER IL CONFERIMENTO DEGLI INCARICHI A PERSONALE ESTERNO 1."
	},
	{
		page: 51,
		text: "L'istituzione scolastica può stipulare contratti di prestazione d'opera con esperti per particolari attività ed insegnamenti al fine di: – garantire l'arricchimento dell'offerta formativa, – realizzare particolari progetti didattici, – realizzare specifici programmi di ricerca, sperimentazione e aggiornamento. 2. Condizioni preliminari"
	},
	{
		page: 52,
		text: "Le attività per le quali l’istituzione scolastica può ricorrere ad esperti esterni devono essere: – coerenti col POF e il PTOF; – di natura temporanea e altamente qualificata; – coerenti con le disponibilità finanziarie programmate. Prima di ricorrere all’esperto esterno, è necessario accertare concretamente l’impossibilità di realizzare le attività programmate con personale in servizio interno alla scuola."
	},
	{
		page: 52,
		text: "ART.3 REQUISITI OGGETTIVI ƒ Al fine di soddisfare le esigenze di cui all’articolo precedente, su proposta dei referenti di progetto o del comitato di progetto ed in base alla programmazione dell’offerta formativa, l’istituzione scolastica, verificata l’impossibilità di utilizzare a tal fine il personale interno, in coerenza con la disponibilità finanziaria, può ricorrere alle seguenti procedure alternative: ƒ istituto delle collaborazioni plurime previste dall’art. 35 del CCNL Scuola; ƒ stipula di contratti di lavoro autonomo con esperti di particolare e comprovata specializzazione, ai sensi dell’art. 7, comma 6 del D.Lgs. 30 marzo 2001, n. 165; ƒ Stipula di contratti con Enti, Associazioni, Università, ecc. mediante procedura negoziale ai sen- si del D.Lgs n.50 del 18/4/2016; ƒ affidamento diretto nei casi disciplinati dal successivo art.5 lett.d. ƒ In tutti i casi la proposta di assunzione dell’esperto deve specificare le esigenze didattiche da soddisfare e le specifiche competenze professionali richieste all’esperto."
	},
	{
		page: 52,
		text: "ART.4 REQUISITI SOGGETTIVI d. Il contratto è stipulato con esperti italiani o stranieri, che per la loro posizione professionale, quali dipendenti pubblici o privati o liberi professionisti, o Associazione/Enti, siano in grado di apportare la necessaria esperienza tecnico professionale nell’insegnamento richiesto. e."
	},
	{
		page: 52,
		text: "Nel conferimento dell’incarico si terrà presente quanto disposto dall’art. 46 della Legge 133/2008 che recita testualmente: “Per esigenze cui non possono far fronte con personale in servizio, le amministrazioni pubbliche possono conferire incarichi individuali, con contratti di lavoro autonomo, di natura occasionale o coordinata e continuativa, ad esperti di particolare e comprovata specializzazione anche universitaria”. f."
	},
	{
		page: 52,
		text: "Nella definizione dei requisiti richiesti si tiene conto di quanto stabilito dalla Circolare 5/2006 e Circolare 1/2010 del Dipartimento della Funzione Pubblica in materia di “esperti di provata competenza” secondo l’interpretazione datane dall’art. 46 L.133/2008 che afferma: “Si prescinde dal requisito della comprovata specializzazione universitaria in caso di stipulazione di contratti d'opera per attività che debbano essere svolte da professionisti iscritti in ordini o albi o con soggetti che operino nel campo dell'arte, dello spettacolo o dei mestieri artigianali, ferma restando la necessità di accertare la maturata esperienza nel settore”. g."
	},
	{
		page: 52,
		text: "Nei confronti di pubblici dipendenti, l’affidamento dell’incarico avverrà nel rispetto dell’art.58 del D.L.vo 3.2.93 n.29 e successive modificazioni ed integrazioni. ART.5 PROCEDURA DI AFFIDAMENTO E' demandata al Dirigente Scolastico la scelta della procedura da adottarsi tra quelle indicate nel precedente art.3., previa emanazione di propria determina a contrarre opportunamente motivata. Durante la fase di selezione dell’esperto esterno e/o dell’Associazione, l’Istituto si impegna a: ƒ assicurare la trasparenza nelle procedure e nella selezione; ƒ garantire la qualità della prestazione;"
	},
	{
		page: 53,
		text: "ƒ valutare le proposte sulla base di competenze professionali acquisite e titoli valutabili; 2. scegliere la soluzione più conveniente in termini di costo/beneficio; ƒYDOXWDUHIUDSLRS]LRQLFRQVLGHUDUHO¶RSSRUWXQLWjGLIDUHULFRUVRDOOHFROODERUD]LRQLSOXULPH utilizzando cioè, previa autorizzazione del Dirigente scolastico della scuola di appartenenza, personale docente ed ATA in servizio presso altre scuole statali, ai sensi del CCNL comparto scuola vigente; L'espletamento delle relative procedure dovrà essere conforme ai sotto indicati criteri: A."
	},
	{
		page: 53,
		text: "RICORSO A COLLABORAZIONI PLURIME Emissione di apposito Avviso, da pubblicare sul sito web, rivolto al personale di altre istituzioni scolastiche, con il quale si manifesta l’intenzione di far ricorso ad un docente in servizio presso tali Istituzioni, delineando le caratteristiche della risorsa professionale di cui si necessita e definendo i criteri che informeranno la selezione. Invio alle altre Istituzioni Scolastiche una apposita comunicazione, al fine di rendere nota l’intenzione di far ricorso ad un docente in servizio presso tali Istituzioni."
	},
	{
		page: 53,
		text: "Qualora presso altra Istituzione Scolastica sia accertata la disponibilità di docenti idonei, sarà possibile instaurare un rapporto di collaborazione plurima, mediante apposita lettera di incarico. B. AFFIDAMENTO DI CONTRATTI DI LAVORO AUTONOMOEmissioni di apposito AVVISO da pubblicarsi sul sito web. E’ in facoltà dell’Istituto utilizzare altre forme aggiuntive di pubblicità volta a volta ritenute utili (quali, ad esempio, la trasmissione dell’avviso ad ordini professionali o ad associazioni di categoria; la pubblicazione per estratto su quotidiani locali, altre scuole, ecc.)."
	},
	{
		page: 53,
		text: "Nell'avviso devono essere evidenziate le caratteristiche della risorsa professionale di cui si necessita e definiti i criteri che informeranno la selezione C. CONTRATTI CON ENTI ASSOCIAZIONI, UNIVERSITA', ECC. Emissione di apposito Avviso, da pubblicare sul sito web, o richiesta di offerta, con il quale si manifesta l’intenzione di far ricorso a personale in servizio presso tali Istituzioni, delineando le caratteristiche della risorsa professionale di cui si necessita e definendo i criteri che informeranno la selezione. D."
	},
	{
		page: 53,
		text: "AFFIDAMENTO DIRETTO Il Dirigente è autorizzato a ricorrere all'affidamento diretto, fermo restando il possesso il possesso di idonei titoli culturali e professionali, quando: - per la specificità delle azioni didattiche da intraprendere sia più opportuno e conveniente rivolgersi ad Associazioni/esperti che abbiano già collaborato con l’Istituto nell'ambito di progetti già avviati per i quali si ravvisi come prioritaria la continuità dell'azione didattico/formativa; in tali casi la conferma può essere disposta esclusivamente nell'ambito temporale del Ptof (triennio di riferimento) e previa acquisizione di parere vincolante da parte del Collegio dei Docenti. - per l'attivazione di progetti di formazione rivolti al personale, in ragione della specificità degli interventi e dell'alto livello di qualificazione richiesto. ART. 6 PUBBLICAZIONE DEGLI AVVISI DI SELEZIONE"
	},
	{
		page: 54,
		text: "1) Il Dirigente, sulla base del piano dell’offerta formativa, del PTOF e del Programma Annuale, individua le attività e gli insegnamenti per i quali possono essere conferiti incarichi ad esperti esterni e, nell'ambito delle procedure di affidamento di cui al precedente art.3, ne dà informazione con uno o più avvisi da pubblicare nell’apposita sezione di Pubblicità Legale disponibile sul sito web dell’Istituto ed, eventualmente, con ulteriori forme di pubblicità. 2) Gli avvisi dovranno indicare le modalità e i termini per la presentazione delle domande, i titoli che saranno valutati, la documentazione da produrre, nonché l’elenco dei contratti che si intende stipulare."
	},
	{
		page: 54,
		text: "Per ciascun avviso deve essere specificato: ‫ڹ‬ l’oggetto della prestazione; ‫ڹ‬ L’ambito disciplinare di riferimento ‫ڹ‬ I requisiti e il titolo di studio obbligatorio per accedere all’incarico ‫ڹ‬ Ulteriori titoli culturali e professionali (master, specializzazioni, attestati, corsi formativi, iscrizioni in albi professionali, ecc.) da richiedere in relazione alla specificità dell'intervento ‫ڹ‬ Le esperienze lavorative pregresse coerenti con l'intervento ‫ڹ‬ le esperienze lavorative pregresse svolte presso le scuole della stessa tipologia (istituti comprensivi) ‫ڹ‬ pubblicazioni, interventi formativi, ulteriori titoli artistici e/o professionale da richiedere in relazione alla specificità dell'intervento ‫ڹ‬ il numero di ore di attività previsto ‫ڹ‬ la durata dell’incarico; ‫ڹ‬ il compenso massimo attribuibile; ‫ڹ‬ Le modalità ed il termine per la presentazione delle domande di partecipazione; 3."
	},
	{
		page: 54,
		text: "I criteri di selezione, con la specifica indicazione dei titoli di studio e professionali e degli altri requisiti che saranno oggetto di valutazione, ed i relativi punteggi da attribuire; 4. L’eventuale previsione di un colloquio cui sottoporre l’aspirante. 3) E’ data facoltà al Dirigente di stilare apposite graduatorie per ambiti disciplinari (solo persone fisiche), anche di durata pluriennale."
	},
	{
		page: 54,
		text: "Di tale circostanza, deve comunque essere fatta apposita menzione nell'avviso. 4) I candidati devono essere in possesso dei requisiti per l’accesso al pubblico impiego. 5) Ciascun aspirante in possesso dei requisiti, nel termine che sarà stabilito dal Dirigente Scolastico, può presentare domanda alla scuola ai fini dell’individuazione."
	},
	{
		page: 54,
		text: "ART. 7 VALUTAZIONE DELLE DOMANDE PERVENUTE 1) La valutazione delle domande pervenute è demandata ad un’apposita commissione nominata dal Dirigente Scolastico, successivamente alla ricezione delle offerte, in composizione dispari (due o quattro membri), presieduta dal Dirigente stesso. 2) La valutazione sarà effettuata sulla base dei requisiti professionali e dei criteri già esplicitati nell’art. 6. 3) Sarà compilata una valutazione comparativa, sulla base dell’assegnazione di un punteggio predeterminato espressamente indicato nell'avviso di cui all'art.6. 4) La commissione predispone una formale relazione contenente la specifica e dettagliata"
	},
	{
		page: 55,
		text: "indicazione dei criteri adottati e delle valutazioni comparative effettuate e, formulando una proposta di graduato- ria. 5) Nell’ipotesi di partecipazione di un unico aspirante, è comunque necessario valutarne l’idoneità. 6) La graduatoria è approvata dal Dirigente Scolastico e pubblicata nell’albo dell’Istituzione Scolastica E fatto comunque salvo il diritto di accesso agli atti della procedura e della graduatoria nei limiti di cui alle leggi 7/8/90, n.241 e 31.12.96 n.675 e successive modificazioni ed integrazioni."
	},
	{
		page: 55,
		text: "ART.8 MISURA DEI COMPENSI ATTRIBUIBILI Il compenso attribuibile deve tener conto del/le: - tipo di attività, dell’impegno e delle competenze professionali richieste all’esperto esterno e/o Associazione; - disponibilità finanziarie programmate. Il compenso per attività di insegnamento svolte dall’esperto esterno e/o Associazione deve essere congruo rispetto alla specificità professionale richiesta. Può essere anche previsto un pagamento forfetario, ove più conveniente all’Amministrazione. Sono fatti salvi i compensi previsti in specifici progetti finanziati con fondi comunitari e/o regolamentati dagli stessi enti erogatori per i quali è escluso il regime di forfetizzazione. È fatto divieto di anticipazione di somme. Ai collaboratori non compete alcun trattamento di fine rapporto, comunque denominato."
	},
	{
		page: 55,
		text: "Vengono fissati i sotto indicati compensi intesi nella misura massima ed onnicomprensivi: - fino ad un massimo di €. 60,00 per il personale non laureato fino ad un massimo €. 80,00 orarie per docenti attività di Docenza laureati elevabili fino a €. 100,00 per docenti universitari o per corsi di formazione rivolti al personale ART. 9 (PUBBLICITÀ ED EFFICACIA) ƒ Degli avvisi di cui agli articoli precedenti, dell'esito della procedura comparativa e dell'aggiudicazione dovrà essere data adeguata pubblicità tramite il sito istituzionale. ƒ L'efficacia dei contratti di lavoro autonomo è subordinata agli obblighi di pubblicazione cui all'artico- lo 15 del D.Lgs. n. 33 del 14 marzo 2013. ƒ sul sito istituzionale sono oggetto di pubblicazione e aggiornamento le seguenti informazioni relative ai titolari di collaborazione o consulenza: ƒ gli estremi dell'atto di conferimento dell'incarico; - il curriculum vitae; ƒ i compensi, comunque denominati, relativi al rapporto di consulenza o di collaborazione. ƒ La pubblicazione dei dati di cui sopra avviene in modo tempestivo e per i tre anni successivi alla cessazione dell'incarico."
	},
	{
		page: 55,
		text: "ART. 10 MISURE VOLTE A PREVENIRE SITUAZIONI DI INCOMPATIBILITÀ E CONFLITTO DI INTERESSI - Il Dirigente Scolastico vigilerà sul corretto adempimento delle misure volte a prevenire situazioni di incompatibilità e conflitto di interessi, anche potenziali. - A tale fine:"
	},
	{
		page: 56,
		text: "ƒTXDORUDO LQFDULFRVLDFRQIHULWRDGLSHQGHQWLGLSXEEOLFKHDPPLQLVWUD]LRQLRGLDOWUHLVWLWX]LRQL scolastiche, acquisirà apposita dichiarazione inerente l'espletamento dell'obbligo di preventiva in- formazione all'amministrazione di appartenenza o acquisirà, nei casi previsti, l'autorizzazione dell'amministrazione di appartenenza 1. acquisirà dichiarazione da parte dei componenti delle commissioni di valutazione, resa ai sensi dell'art.47 del D.P.5."
	},
	{
		page: 56,
		text: "N.445/2000 e successive modifiche e integrazioni, inerente l'insussistenza di si- tuazioni di conflitto di interessi con i partecipanti alla selezione, derivanti da rapporti familiari o di parentela/affinità entro il secondo grado, o di altra natura. - procederà al controllo e verifica rilasciando apposita dichiarazione in merito."
	},
	{
		page: 56,
		text: "Art. 11 (INTERVENTI DI ESPERTI A TITOLO GRATUITO) Il Dirigente è delegato dal Consiglio di Istituto a redigere apposite convenzioni con enti e associazioni culturali, onlus e di volontariato finalizzate alla collaborazione di loro esperti nella realizzazione di iniziative progettuali deliberate dagli Organi Collegiali e previsti dal POF e dal PTOF, con particolare riferimento a quelli inclusi nel Ptof del Territorio. La collaborazione di tali esperti esterni alla scuola non produce oneri per l’amministrazione scolastica. Il Dirigente Scolastico è delegato, inoltre, a stipulare convenzioni con le Università e/o scuole superiori al fine di favorire l’inserimento nella nostra realtà scolastica di tirocinanti."
	},
	{
		page: 56,
		text: "Ai fini della stipula dei contratti disciplinati dal presente regolamento con i dipendenti che appartengono ad altra amministrazione pubblica è necessaria la preventiva autorizzazione dell’amministrazione di appartenenza di cui all’art. 53 del D.Lvo 30/3/2001, n. 165 APPENDICE 5 REGOLAMENTO INERENTE LA PARTECIPAZIONE A PROGETTI INTERNAZIONALI PREMESSA Il presente regolamento disciplina modalità e criteri inerenti la partecipazione dell’Istituto a Progetti internazionali, ai sensi degli artt. n.25 bis del D.L. n.29/93,come integrato dal D.L.n.59/98 e n.33 comma 2 e 50 del D.I n.44 del 1.2.01 ART.1 – MODALITA’ DI ADESIONE 1."
	},
	{
		page: 56,
		text: "In coerenza con la disponibilità finanziaria, su proposta del collegio dei docenti, per ogni anno scolastico può essere data adesione a non più di n.2 progetti internazionali, rientrando tra questi quelli relativi a scambi culturali; 2. per la realizzazione degli scambi culturali deve essere preventivamente acquisita la disponibilità delle famiglie ad ospitare gli studenti; 3. nel caso in cui l’Ente promotore non sia l’istituto, deve essere preventivamente acquisita tutta la certificazione attestante le competenze dell’Ente promotore; ART.2 – CONDIZIONI PER L’APPROVAZIONE DEL PROGETTO Il progetto regolarmente approvato dagli organi collegiali dovrà chiaramente prevedere: - gli ambiti di competenza dell’istituto rispetto a quelli eventuali dell’Ente promotore o della Scuola capofila - la specifica degli interventi dell’istituto - i budget di spesa previsti - Le fonti di finanziamento atte a coprire le spese di cui al successivo art.3"
	},
	{
		page: 57,
		text: "- le classi e gli alunni interessati - I docenti coinvolti - La durata del progetto e i periodi di soggiorno all’estero - la certificazione attestante le competenze dell’ente promotore, se diverso dall’istituto ART.3 – FINANZIAMENTI - Le spese da sostenersi inerenti il viaggio ed il soggiorno di studenti e docenti non possono essere poste a carico dei finanziamenti ordinari - I finanziamenti assegnati, vincolati all’attuazione del progetto, saranno utilizzati nel rispetto delle normative contabili-finanziarie che regolano l’attività delle istituzioni scolastiche - Eventuali finanziamenti non vincolati di Enti od Associazioni, possono essere destinati all’attuazione del progetto previa delibera del Consiglio di Istituto ed in subordine alle priorità definite in sede di approvazione del Pof."
	},
	{
		page: 57,
		text: "APPENDICE 6 CRITERI E LIMITI PER LO SVOLGIMENTO DELL'ATTIVITÀ NEGOZIALE DA PARTE DEL DIRIGENTE SCOLASTICO (ART.45, LETT.A - D.M. 129/2018) (delibera C.d.I. n. 32 del 08/02/19) VISTO il D.I. 28 agosto 2018 n.129, art.45, comma 2, lett. a), che attribuisce al Consiglio di istituto la competenza di adottare, in via preventiva alle procedure di attività negoziale delle Istituzioni scolastiche autonome, la deliberazione relativa alla determinazione dei criteri e dei limiti per lo l’affidamento da parte del Dirigente scolastico degli appalti per la fornitura di beni, la prestazione di servizi e l’esecuzione di lavori di importo superiore a 10.000,00 euro; VISTA la normativa vigente per le stazioni appaltanti pubbliche prevista dal D.lgs. 18 aprile 2016 n.50, così come modificato ed integrato dal D.lgs. 19 aprile 2017 n.56, in materia di affidamenti di lavori, servizi e forniture; RITENUTO che l’espletamento in via autonoma delle procedure negoziali dell’istituto non possa prescindere dall’ottimizzazione dei tempi e delle risorse impiegate, nell’ottica della piena attuazione dell’efficacia e dell’economicità dell’azione amministrativa; DISPONE 1. che tutte le attività negoziali da espletare in via autonoma dal Dirigente Scolastico finalizzate all'affidamento di servizi e forniture per importi sotto la soglia di rilevanza comunitaria prevista per le istituzioni scolastiche - (144.000 euro dal 1°gennaio 2018 e fino al 31 dicembre 2019) - si uniformino nella loro realizzazione ai criteri dell’assoluta coerenza e conformità con quanto in materia previsto e regolato dal combinato disposto degli art.36 e ss. del D.lgs.18 aprile 2016 n.50, secondo le sotto riportate modalità: A. acquisizioni di beni e servizi ed esecuzione di lavori di importo inferiore a 40.000,00 euro, IVA esclusa, mediante affidamento diretto, utilizzando le seguenti procedure, fatto salvo l'obbligo di approvvigionamento di beni/servizi attraverso le apposite convenzioni Consip previsto l’art. 46, comma 1 del D.I. 129/2018, quando esistenti: ‫ڹ‬. 1.a.1.indagine di mercato: per importi non superiori a €.10.000,00 l'indagine di mercato"
	},
	{
		page: 58,
		text: "può essere effettuata secondo modalità autonomamente determinate dal Dirigente Scolastico, (comparazione dei listini di mercato, offerte precedenti per commesse identiche o analoghe o analisi dei prezzi praticati ad altre amministrazioni, comparazione di due o più preventivi di spesa, confronto concorrenziali sul Mepa delle offerte già presenti, elenchi di operatori economici)."
	},
	{
		page: 58,
		text: "L'interpello ad un'unica Ditta, ammissibile, deve essere comunque motivato in determina. ‫ڹ‬ 1.a.2 indagine di mercato: per importi superiori a €.10.000,00 e fino a €. 39.999,99 l'indagine di mercato dovrà essere realizzata: ‫ڹ‬ per tutte le tipologie di beni e servizi, esclusi quelli informatici, attraverso l' acquisizione di due o più preventivi di spesa acquisiti sia fuori Mepa, che sul Mepa attraverso la modalità della trattativa diretta; ‫ڹ‬ per i beni / servizi informatici, stante l'obbligo previsto dall'art.1, comma 512 della Legge n. 208/2015 di approvvigionarsi esclusivamente tramite gli strumenti di acquisto e di negoziazione messi a disposizione da Consip S.p.A. (Convenzioni quadro, Accordi quadro, Me.PA., Sistema Dinamico di Acquisizione), attraverso la modalità della trattiva diretta (che si configura come una modalità di negoziazione semplificata rispetto alla tradizionale procedura negoziata), preceduta da indagine di mercato condotta mediante consultazione di elenchi sul portale Consip."
	},
	{
		page: 58,
		text: "In ogni caso, il confronto dei preventivi di spesa forniti da due o più operatori economici rappresenta una best practice anche alla luce del principio di concorrenza. B. affidamenti di importo pari o superiore a 40.000,00 euro, IVA esclusa e inferiore a 144,000 euro, IVA esclusa, per le forniture e i servizi, mediante procedura negoziata previa consultazione di almeno cinque operatori economici sulla base di indagini di mercato o tramite elenchi di operatori economici, nel rispetto del criterio di rotazione degli inviti, secondo quanto previsto e regolato dall’art. 36, comma 2, lett. b) del D.lgs. 18 aprile 2016 n. 50; 2."
	},
	{
		page: 58,
		text: "In considerazione dei criteri sopra esposti, delibera, altresì, di elevare fino a 39.999,99 euro il limite di tutte le attività negoziali, necessarie per le procedure relative agli affidamenti diretti di lavori, servizi e forniture da espletarsi in via autonoma dal Dirigente scolastico, ovviamente nei limiti degli impegni di spesa autorizzati con l’approvazione del Programma annuale e successive modifiche. 3. Il Consiglio di Istituto si riserva di integrare il regolamento sulle procedure dell'attività negoziale a seguito dell'emanazione di specifiche linee guida da parte del Miur."
	},
	{
		page: 58,
		text: "In alternativa alle modalità sopra indicate il Dirigente Scolastico, qualora se ravvisi l'opportunità o la convenienza, può sempre ricorrere alle procedure ordinarie previste dal codice dei contatti (procedure aperte, dialogo competitivo). APPENDICE 7 REGOLAMENTO SULLA GESTIONE DEI BENI E INVENTARI INDICE GENERALE TITOLO I – PRINCIPI GENERALI Art. 1 - Oggetto Art. 2 - Definizioni TITOLO II – CONSEGNATARIO Art. 3 – Consegnatario e sub consegnatario Art.4 - Compiti e responsabilità del Consegnatario e dei Sub- Consegnatari Art. 5 – Passaggio di gestione"
	},
	{
		page: 59,
		text: "TITOLO III - CARICO E SCARICO INVENTARIALE Art. 6 – Classificazione categorie inventariali Art. 7 – Carico inventariale Art. 8 - Eliminazione dei beni dall’inventario Art. 9– Ricognizione dei beni Art.10 – Aggiornamento dei valori e rinnovo delle scritture Art.11 -Vendita di materiali fuori uso e di beni non più utilizzabili Art.12 - Beni mobili non inventariabili TITOLO VI – NORME FINALI Art. 13 – Disposizioni finali e transitorie TITOLO I – PRINCIPI GENERALI ARTICOLO 1 – OGGETTO 1. Il presente Regolamento ha per oggetto le procedure di registrazione inventariale secondo quanto previsto dal D.I. n. 129 del 28/8/2018, Regolamento Generale di Contabilità, e dalle Circolari citate in premessa. 2."
	},
	{
		page: 59,
		text: "Il presente Regolamento disciplina altresì le procedure di carico e scarico dei beni, nonché le modalità di ricognizione e di aggiornamento dei beni. 3. Il presente Regolamento detta disposizioni per la gestione dei beni non soggetti all’iscrizione negli inventari. ARTICOLO 2 – DEFINIZIONI 1."
	},
	{
		page: 59,
		text: "Nel presente Regolamento si intendono per: a) “beni mobili”: oggetti mobili destinati al funzionamento degli uffici e allo svolgimento delle attività istituzionali della scuola, ossia arredi, attrezzature, libri, strumenti scientifici e di laboratorio, collezioni di leggi e decreti, ecc. b) \"consegnatario”: a norma dell’art. 30, c.1 del D.I. 129/2018 si intende il DSGA c) “utilizzatore”: fruitore delle unità cedute dal bene o consumate di materiali destinati dal consegnatario per l’uso, l’impiego o il consumo d) “Sub Consegnatari i docenti che rispondono del materiale affidatogli art. 35, c.1, D.I. 129/2018 e) “macchinari per ufficio”: beni in dotazione agli uffici per lo svolgimento e l’automazione di compiti specifici f) “mobili e arredi per ufficio”: oggetti per l’arredamento di uffici, allo scopo di rendere l’ambiente funzionale rispetto alle sue finalità g) “impianti e attrezzature”: complesso delle macchine e delle attrezzature necessarie allo svolgimento di una attività h) “hardware”: macchine connesse al trattamento automatizzato di dati i) “materiale bibliografico”: libri, pubblicazioni, materiale multimediale j) “opere dell’ingegno”: software, pubblicazioni ecc."
	},
	{
		page: 59,
		text: "TITOLO II – CONSEGNATARIO ARTICOLO 3 – CONSEGNATARIO"
	},
	{
		page: 60,
		text: "La custodia, la conservazione e l'utilizzazione dei beni mobili inventariati è affidata a responsabili che assumono le funzioni di: ƒ Consegnatario; ƒ VRVWLWXWRGHO&RQVHJQDWDULR ƒ6XE&RQVHJQDWDULR ARTICOLO 4 - COMPITI E RESPONSABILITA' DEI CONSEGNATARI E SUB CONSEGNATARI 1. Il consegnatario responsabile dei beni assegnati all’Istituzione Scolastica, in conformità di quanto prescritto dall'art.30 del decreto n.129/2018 è il Direttore dei Servizi Generali ed Amministrativi (DSGA). 2. Il consegnatario è responsabile dei beni ad esso consegnati nonché di qualsiasi danno che possa derivare da sue azioni od omissioni."
	},
	{
		page: 60,
		text: "Egli ha l’obbligo di segnalare, di richiedere o di ordinare interventi di manutenzione, di custodia e di conservazione, nonché di indicare i beni che vengono trasferiti dalla collocazione originaria per dare luogo a utilizzazioni diverse o a cura di strutture o di operatori diversi da quelli originari. 3."
	},
	{
		page: 60,
		text: "Il consegnatario deve, in particolare, curare che vengano correttamente e tempestivamente svolte le seguenti operazioni: a) la corretta tenuta dei registri inventariali; b) l'applicazione delle etichette inventariali su ciascun bene inventariato; c) la compilazione delle schede indicanti i beni custoditi in ciascun locale, suddivisi per plesso e la relativa esposizione all'interno del locale; d) la manutenzione e la riparazione dei beni; e) la verifica del livello delle scorte operative necessarie ad assicurare il regolare funzionamento degli uffici; f) la ricognizione ogni cinque anni e la rivalutazione dei beni inventariati ogni dieci anni; g) comunicare gli eventi dannosi fortuiti o volontari al Dirigente Scolastico al fine della relativa denuncia alle competenti Autorità; h) vigilare sul regolare e corretto uso dei beni affidati agli utilizzatori finali; 4."
	},
	{
		page: 60,
		text: "In caso di assenza o impedimento del consegnatario il medesimo sarà sostituito dal sostituto del consegnatario, appositamente incaricato dal Dirigente Scolastico. 5. In considerazione della dislocazione dell’Istituzione Scolastica su più Plessi, la custodia del materiale didattico, tecnico e scientifico dei Plessi e dei laboratori ubicati in ciascun Plesso è affidata dal Direttore SGA ai docenti (sub consegnatari), mediante elenchi descrittivi in duplice copia sottoscritti dal Direttore stesso e dai docenti interessati, che risponderanno della conservazione dei materiali affidati alla loro custodia."
	},
	{
		page: 60,
		text: "I sub consegnatari dei beni sono individuati con provvedimento del Dirigente Scolastico che assume carattere vincolante anche per il DSGA. 6. I sub consegnatari provvedono alla corretta custodia, conservazione e utilizzazione dei beni affidati alla loro responsabilità."
	},
	{
		page: 60,
		text: "Essi assumono i seguenti compiti: verificare la corretta tenuta e conservazione dei beni nel plesso o nei locali posti sotto il loro controllo; autorizzare il temporaneo spostamento dei beni, all'interno del plesso, previa motivata richiesta scritta da parte dell'utilizzatore, nonché verifica dell'avvenuta ricollocazione originaria; la richiesta di modifica definitiva della collocazione del bene; richiedere al Direttore Sga l'autorizzazione al temporaneo spostamento dei beni, all'esterno del plesso, previa motivata richiesta scritta da parte dell'utilizzatore, nonchè verifica dell'avvenuta"
	},
	{
		page: 61,
		text: "ricollocazione originaria; richiedere al Direttore Sga l'autorizzazione alla modifica definitiva della collocazione del bene; richiedere gli interventi di manutenzione/riparazione o sostituzione dei beni deteriorati/danneggiati; proporre il discarico inventariale per i beni obsoleti/fuori uso/non più utilizzabili; segnalare eventi dannosi, fortuiti o volontari. ARTICOLO 5 – PASSAGGIO DI GESTIONE Quando il Direttore SGA cessa dal suo ufficio, il passaggio di consegne avviene mediante ricognizione materiale dei beni in contradditorio con il consegnatario subentrante in presenza del Dirigente Scolastico e del Presidente del Consiglio di Istituto."
	},
	{
		page: 61,
		text: "L’operazione deve risultare da apposito verbale ed è effettuata entro 60 giorni della cessazione dell’ufficio. TITOLO III – CARICO E SCARICO INVENTARIALE ARTICOLO 6 – CLASSIFICAZIONE CATEGORIE INVENTARIALI 1. Per la classificazione inventariale si fa riferimento agli inventari e alle categorie stabilite dal Regolamento D.I. 129/2018 all’art. 31 e dalla C.M. 8910 del 1/12/2011."
	},
	{
		page: 61,
		text: "I beni che costituiscono il patrimonio delle istituzioni scolastiche si iscrivono in distinti inventari per ciascuna delle seguenti categorie: a) beni mobili; b) beni di valore storico-artistico; c) libri e materiale bibliografico; d) valori mobiliari (beni non presenti); e) veicoli e natanti (beni non presenti); f) beni immobili (beni non presenti). Per tutti questi beni valgono le regole del Codice Civile riguardo all’Inventariazione e quanto dispone la C.M. Miur 8910 del 1/12/2011. 2."
	},
	{
		page: 61,
		text: "Per ogni bene andrà indicato: – Il numero di inventario e la data di iscrizione; – La specie e il numero del documento che dà diritto al carico o allo scarico (fattura, autorizzazione all'alienazione ecc.); – La provenienza o la destinazione del bene; – La descrizione del bene in maniera da essere facilmente individuabile; – Il valore di carico o di scarico che va riportato nelle colonne generali di carico e di scarico e nella colonna corrispondente alla categoria del bene; – Eventuali ricavi da alienazioni; – Eventuali osservazioni ed annotazioni. ARTICOLO 7 – CARICO INVENTARIALE 1."
	},
	{
		page: 61,
		text: "Si iscrivono nell’inventario i soli beni mobili “che non hanno carattere di beni di consumo, non sono fragili e non si deteriorano facilmente” ed i beni mobili di valore pari o superiore a duecento euro, IVA compresa. Al fine di evitare una inventariazione parziale, soprattutto in riferimento agli arredi d’ufficio, si adotta il criterio dell’ “universalità di mobili”"
	},
	{
		page: 62,
		text: "secondo la definizione del C.C., art. 816 (“è considerata universalità di mobili la pluralità di cose che appartengono alla stessa persona e hanno una destinazione unitaria”). Pertanto, nell’inventariare unità composte quali studi o postazioni informatiche, si tiene conto del complesso degli elementi attribuendo un unico numero d’inventario all’universalità. Al fine di consentire discarichi parziali si deve attribuire un sottostante numero d’ordine identificativo agli elementi che compongono l’universalità indicandone il valore.. 2."
	},
	{
		page: 62,
		text: "Relativamente ai beni di valore storico-artistico,viene evidenziata la necessità di una corretta conservazione dei documenti che attestino l'avvenuta stima del valore nonché ogni altro elemento necessario al fine di una puntuale identificazione delle caratteristiche del bene in ordine alla sua specifica qualificazione. 3. Per quanto attiene all'inventario dei libri e del materiale bibliografico dovranno essere seguite modalità di tenuta analoghe a quelle previste per gli altri beni mobili. 4."
	},
	{
		page: 62,
		text: "I beni mobili sono oggetto di inventariazione nel momento in cui entrano a far parte del patrimonio della scuola a seguito di acquisto, donazione, manufatto dalla scuola o altro e sono oggetto di cancellazione dall’inventario nel momento in cui cessano di far parte del patrimonio dell’Istituto per vendita, per distruzione, per perdita, per cessione. 5. All’atto dell’acquisizione o della cancellazione di ciascun elemento del patrimonio le caratteristiche fondamentali di descrizione, classificazione, consistenza, valore, destinazione, collocazione e responsabilità vengono trascritte negli inventari di cui all’art.5. 6."
	},
	{
		page: 62,
		text: "Il consegnatario verifica che siano state applicate le etichette inventariali sui beni acquisiti. 7. Gli inventari contengono la registrazione dei fondamentali elementi identificativi dei singoli beni patrimoniali secondo l’ordine temporale di acquisizione. 8. Gli inventari sono gestiti sulla base di apposite scritture predisposte su supporto informatico atte a garantirne una agevole utilizzazione a fini contabili, gestionali e di programmazione. 9. I beni inventariali possono essere utilizzati in luoghi diversi da quelli previsti dalla ordinaria collocazione. In tal caso i movimenti d’uso saranno annotati in apposite schede. Per luogo di collocazione si intende lo spazio fisico interno ad un fabbricato. 10."
	},
	{
		page: 62,
		text: "Non sono oggetto di inventariazione i beni che per loro natura sono destinati a deteriorarsi rapidamente ed i beni di modico valore, nonché le loro parti di ricambio e accessori ed i beni di valore pari o inferiore a 200 euro IVA compresa. Non si inventariano altresì i bollettini ufficiali, le riviste ed altre pubblicazioni periodiche di qualsiasi genere, i libri destinati alle biblioteche di classe.. ARTICOLO 8 – ELIMINAZIONE DEI BENI DALL’INVENTARIO 5. L’art. 33 del Regolamento indica le procedure di eliminazione dei beni dall’Inventario in sintonia con la Circolare Miur 2233 del 2 aprile 2012. 6."
	},
	{
		page: 62,
		text: "In caso di eliminazione di materiali e beni mancanti per furto, per causa di forza maggiore o divenuti inservibili, il Decreto di eliminazione del Dirigente Scolastico dovrà indicare con un’adeguata motivazione l’avvenuto accertamento di inesistenza di cause di responsabilità amministrativa. Se si tratta di materiali mancanti per furto al Decreto del Dirigente Scolastico va allegata copia della denuncia presentata alla locale autorità di pubblica sicurezza. 7. In caso di eliminazione di materiale reso inservibile all’uso sarà necessario allegare il verbale della Commissione prevista dall’art. 34 del Regolamento."
	},
	{
		page: 62,
		text: "La Commissione è nominata dal Dirigente Scolastico e ne fanno parte non meno di tre unità scelte tra personale docente e ATA. 8. L’art. 34 del D.I. 129/2018 stabilisce che i materiali di risulta, i beni fuori uso, quelli obsoleti e quelli non più utilizzati sono ceduti dall'istituzione previa determinazione del loro"
	},
	{
		page: 63,
		text: "valore, calcolato sulla base del valore di inventario, dedotti gli ammortamenti, ovvero sulla base del valore dell'usato per beni simili, individuato da apposita commissione interna. 9. Per i materiali mancanti per furto o causa di forza maggiore al provvedimento del Dirigente Scolastico va allegata la relazione del Direttore SGA che chiarisca le circostanze che hanno determinato la sottrazione o la perdita del bene. ARTICOLO 9– RICOGNIZIONE E RIVALUTAZIONE DEI BENI 9. In base all’art. 31, c 9 del D.I. 129/2018 ed alla C.M. MIUR prot. n. 8910 del 1/12/2011 si provvede alla ricognizione dei beni almeno ogni cinque anni e almeno ogni dieci anni al rinnovo degli inventari e alla rivalutazione dei beni."
	},
	{
		page: 63,
		text: "Dette operazioni, in quanto improntate a criteri di trasparenza, vengono effettuate da una commissione costituita da almeno tre persone scelte tra il personale in servizio nell’istituzione scolastica. 10. La suddetta commissione viene nominata con provvedimento formale del dirigente scolastico ed è composta da personale docente e ATA. Le operazioni relative devono risultare da apposito processo verbale da redigersi in triplice copia e da sottoscriversi da parte di tutti gli intervenuti. 11."
	},
	{
		page: 63,
		text: "Il processo verbale contiene l’elencazione dei: 1. beni esistenti in uso, ivi compresi quelli rinvenuti e non assunti in carico 2. eventuali beni mancanti 3. beni non più utilizzabili o posti fuori uso per cause tecniche da destinare alla vendita o da cedere gratuitamente agli organismi previsti; qualora tale procedura risultasse infruttuosa è consentito l’invio di questi beni alla distruzione nel rispetto delle vigenti disposizioni in materia ambientale e di smaltimento. 4. Completate le operazioni di ricognizione materiale dei beni esistenti, eventualmente si procede alle opportune sistemazioni contabili in modo da rendere coerente la situazione di fatto con la situazione di diritto. 5."
	},
	{
		page: 63,
		text: "Sulla base del verbale di cui sopra sarà compilato il nuovo inventario dopo aver effettuato le operazioni di aggiornamento dei valori.. ART.10 AGGIORNAMENTO DEI VALORI E RINNOVO DELLE SCRITTURE 1. Dopo aver completato le operazioni di ricognizione e le eventuali sistemazioni contabili, la Commissione per il rinnovo inventariale, avrà cura di procedere ad effettuare l'aggiornamento dei valori dei beni effettivamente esistenti, per la formazione dei nuovi inventari. 2. I valori di tutti i beni mobili vanno aggiornati, osservando il procedimento dell'ammortamento in base a quanto stabilito dalla C.M. 8910 del 1/12/2011. 3."
	},
	{
		page: 63,
		text: "Non devono essere sottoposti all'applicazione del criterio dell'ammortamento e all'aggiornamento dei valori i beni acquisiti nel secondo semestre precedente all’anno del rinnovo. 4. Il criterio dell'ammortamento non si applica alle seguenti tipologie di beni: beni di valore storico-artistico e preziosi in genere; immobili; valori mobiliari e partecipazioni. 5."
	},
	{
		page: 63,
		text: "I beni di valore storico-artistico e i beni preziosi in genere -da considerare alla stregua dei primi -vanno valorizzati con il criterio della valutazione in base a stima (ad esempio: dipinti, statue, stampe, disegni,incisioni, vasi, arazzi, monete, incunaboli, gioielli, ecc.) o, se del caso, secondo il valore intrinseco di mercato (oro, argento, pietre preziose, ecc.). 6. I beni con il valore aggiornato saranno elencati nel nuovo inventario a partire dal numero 1. Su ogni bene materiale sarà posta una targhetta riportante in modo indelebile il nome della scuola, il numero di inventario e la relativa categoria."
	},
	{
		page: 64,
		text: "ARTICOLO 11 – VENDITA DI MATERIALI FUORI USO E DI BENI NON PIÙ UTILIZZABILI 1. Per quanto attiene alla vendita di materiali fuori uso e di beni non più utilizzabili si attiva la procedura prevista dal D.I. n. 129/2018, all’art. 34. 2. Il dirigente scolastico provvede all’emanazione di un avviso d’asta da pubblicare sul sito internet della scuola e da comunicare agli alunni. La pubblicazione deve avvenire almeno 15 giorni prima della data stabilita per l’aggiudicazione della gara. L’avviso d’asta deve contenere il giorno e l’ora in cui avverrà l’aggiudicazione, il prezzo posto a base della gara, nonché le modalità di presentazione delle offerte."
	},
	{
		page: 64,
		text: "Il prezzo da porre a base d’asta è quello del valore del bene risultante dall’inventario o il valore dell’usato di beni simili. Le offerte devono essere segrete e devono pervenire all’istituzione scolastica in busta chiusa entro la data stabilita. Nel giorno stabilito per l’asta, sulla base delle offerte pervenute si procede alla aggiudicazione al concorrente che ha offerto il prezzo migliore, superiore o almeno uguale a quello indicato nell’avviso d’asta. L’asta si conclude con la stesura del verbale di aggiudicazione. 3. Il provvedimento di discarico inventariale di cui all'articolo33, comma1, dà atto dell'avvenuto versamento del corrispettivo di aggiudicazione. 4."
	},
	{
		page: 64,
		text: "Nel caso in cui la gara sia andata deserta, i materiali fuori uso per cause tecniche possono essere ceduti a trattativa privata o a titolo gratuito e, in mancanza, destinati allo smaltimento, nel rispetto delle vigenti normative in materia di tutela ambientale e di smaltimento dei rifiuti. 5. I beni non più utilizzabili per fini istituzionali possono essere ceduti direttamente a trattativa privata ad altre istituzioni scolastiche o altri enti pubblici. 6. Il Dirigente Scolastico autorizza con provvedimento formale, il Consegnatario a provvedere alla cancellazione del bene."
	},
	{
		page: 64,
		text: "ARTICOLO 12 – BENI MOBILI NON INVENTARIABILI Non sono oggetto di inventariazione ai sensi di quanto previsto dall'art.31, comme 5 del Decreto n.129/20418 i beni che per loro natura sono destinati ad esaurirsi o deteriorarsi rapidamente, i beni fragili e di modico valore gli oggetti fragili e di facile consumo, aventi modesto valore, nonchè le loro parti di ricambio e accessori. Sono beni di facile consumo, altresì, è composta in buona misura da materiale didattico e non, soggetto a rapida usura – di norma nell'arco dell'esercizio finanziario nel quale i beni sono stati acquisiti – e destinato ad esercitazioni o all'insegnamento."
	},
	{
		page: 64,
		text: "Sono beni di facile consumo, altresì, gli oggetti di cancelleria e pulizia nonché altri oggetti di modico valore utilizzati quotidianamente nell'attività istituzionale come, ad esempio: timbri, stampati, materiali minuti di laboratorio, cartucce per stampanti, mouse, tastiere, portapenne, cestini, scope, spazzole, tagliacarte, piccole taglierine, raccoglitori, piccole calcolatrici, supporti scrivibili o riscrivibili (quali, audiocassette, videocassette, floppy, cd, dvd e simili), radioregistratori, cuffie da laboratorio, etc; e comunque, tutti i beni di modico valore, indipendentemente dalla loro natura, fino al limite di € 200,00 iva inclusa, salvo che non costituiscano elementi di una universalità di beni mobiliare avente valore superiore al limite stabilito."
	},
	{
		page: 64,
		text: "Inoltre, pur dovendo essere conservati nei modi di uso o con le modalità previste dal regolamento interno, non si inventariano, a norma dell'articolo 31, comma 6 del regolamento di contabilità, i bollettini ufficiali, le riviste e le altre pubblicazioni periodiche di qualsiasi genere, nonché i libri destinati alle biblioteche di classe, i libri dati in consultazione agli alunni, atlanti, vocabolari,"
	},
	{
		page: 65,
		text: "libri di narrativa ecc. I beni sopra indicati sono iscritti nell'apposito registro di magazzino, tra il materiale di facile consumo, con l'evidenza di tutti gli elementi atti ad individuarne la tipologia, la provenienza, la destinazione, il valore. TITOLO VI – NORME FINALI Art. 13– DISPOSIZIONI FINALI E TRANSITORIE 1. Il presente Regolamento ha natura di regolamento interno e rappresenta strumento di attuazione del Regolamento di contabilità, D.I. 28/8/2018, n. 129 e delle Circolari citate in premessa ed è approvato dal Consiglio d’Istituto. 2. Il presente Regolamento entra in vigore a partire dal primo giorno successivo alla data di delibera del Consiglio di Istituto. 3."
	},
	{
		page: 65,
		text: "Il presente Regolamento è inviato all’USR competente in base a quanto disposto dal D.I. 129/2018, art. 29 c 3 e sarà suscettibile di modifiche sulla base delle linee guide di prossima emanazione da parte del Miur. Il Consiglio di Istituto prende atto, infine, dell'informativa del Dirigente Scolastico inerente l'attività di ricognizione inventariale in corso di svolgimento."
	},
	{
		page: 66,
		text: "APPENDICE 8 Regolamento sulle Modalità di svolgimento in via telematica delle sedute degli organi collegiali dell’Istituzione Scolastica IL CONSIGLIO D’ISTITUTO CON DELIBERAZIONE N 74 Visto il D.Lgs. 297/1994 “T.U. in materia di istruzione” con particolare riferimento agli artt. 5, 7, 8, 10, 42 e 43; Visto l’art. 21 della Legge 59/1997; Visto il DPR 275/1999 (Reg. autonomia delle Istituzioni Scolastiche); Visti La Legge 107/2015 e il D.I. 129/2018 Visto il D.P.C.M. 8 Marzo 2020, art. 1/q Viste la Nota M.I.n° 278 del 6 Marzo 2020 e la Nota M.I. n° 279 del 8 Marzo 2020; Premesso che con il D.L. n° 18 “Cura Italia” del 17/03/2020 “Misure di potenziamento del Servizio sanitario nazionale e di sostegno economico per famiglie, lavoratori e imprese connesse all’emergenza epidemiologica da COVID-19” sono state adottate ulteriori misure per il contrasto e il contenimento sull’intero territorio nazionale del diffondersi del virus COVID-19 e in particolare con l’ Art. 73 comma 1 sono state dettate disposizioni per lo svolgimento in via telematica dei consigli comunali e, per analogia, anche degli organi collegiali scolastici; Considerato necessario disciplinare l’eventuale svolgimento delle riunioni del Consiglio di Istituto così come di tutti gli altri OO.CC. attivi nell’istituzione scolastica, (compresa l’eventualità di svolgimento degli scrutini finali e degli Esami di Stato con le modalità e precisazioni oggetto di specifiche ordinanze del M.I. ai sensi di quanto previsto nel D.L. n° 22 del 08/04/2020) in modalità temporaneamente telematica, al fine di consentire il proseguimento delle attività e limitando al contempo la compresenza di più persone nello stesso luogo per la tutela della salute pubblica; Visto il D.L. n° 22 del 8 Aprile 2020 (Misure urgenti sulla regolare conclusione e sullo svolgimento dell’Esame di Stato a.s. 2019/20); Visto il D.P.C.M. del 10 Aprile 2020; DELIBERA (n. 74 – 2020) all’unanimità"
	},
	{
		page: 67,
		text: "di disciplinare e regolamentare con il presente documento le “Modalità di svolgimento in via telematica delle sedute degli organi collegiali scolastici”, come di seguito riportato. Articolo 1 - Oggetto Per “riunione in modalità telematica” si intende la seduta degli Organi Collegiali scolastici, nella quale i componenti partecipano a distanza. La partecipazione on-line, nelle varie modalità e tecnologie possibili, deve avvenire secondo le modalità di cui ai successivi articoli."
	},
	{
		page: 67,
		text: "Articolo 2 - Requisiti per le riunioni telematiche Le adunanze devono svolgersi in video/audio-conferenza, mediante l’utilizzo di tecnologie telematiche che permettono, al contempo: a) la percezione diretta e uditiva dei partecipanti; b) l’identificazione di ciascuno di essi, anche attraverso una procedura di “appello” per verificarne le presenze; c) la possibilità di intervenire, nonché il diritto di voto in tempo reale sugli argomenti affrontati nella discussione."
	},
	{
		page: 67,
		text: "Gli strumenti tecnologici utilizzati per lo svolgimento in via telematica delle sedute degli organi collegiali scolastici, devono assicurare: a) la riservatezza della seduta, ove necessario; b) il collegamento simultaneo tra i partecipanti su un piano di parità; c) la visione degli atti della riunione e/o lo scambio – anche mediante l’invio in data precedente alle sedute degli OO.CC. (mediante avvisi mezzo circolari interne, posta elettronica e/o sistemi informatici di condivisione dei file) di documenti pertinenti per le riunioni stesse; d) la contemporaneità delle decisioni; e) la sicurezza dei dati e delle informazioni."
	},
	{
		page: 67,
		text: "Ai componenti è consentito collegarsi da qualsiasi luogo che assicuri il rispetto delle prescrizioni del presente articolo, purché non pubblico né aperto al pubblico. Nelle riunioni a distanza, ai fini della validità della seduta e delle delibere, devono essere rispettate le prescrizioni contenute nel presente regolamento. Articolo 3 - Convocazione delle sedute a distanza Nell’avviso di convocazione attraverso diretto invio agli interessati per posta elettronica deve essere specificato che la seduta avviene tramite strumenti telematici, indicando la modalità operativa di partecipazione."
	},
	{
		page: 67,
		text: "Al fine di consentire in ogni caso la conoscibilità degli atti della riunione a tutti i partecipanti, è comunque possibile - preventivamente o contestualmente alla seduta – l’utilizzo di posta elettronica istituzionale o di sistemi informatici di condivisione di files in modalità cloud. Articolo 4 – Validità e svolgimento delle sedute a distanza"
	},
	{
		page: 68,
		text: "Per la validità delle sedute in modalità telematica restano fermi i requisiti di validità richiesti per l’adunanza ordinaria: a) regolare convocazione di tutti i componenti con l’elenco degli argomenti indicati all’o.d.g.; b) partecipazione della maggioranza almeno dei convocati (quorum strutturale). Ai fini della determinazione del predetto quorum strutturale, dal numero dei componenti l’organo, si sottraggono coloro che abbiano giustificato con comunicazione scritta la loro assenza; c) raggiungimento della maggioranza dei voti richiesta dalle norme di riferimento (quorum funzionale). Resta ferma il collegio perfetto durante gli scrutini."
	},
	{
		page: 68,
		text: "Nell’ipotesi in cui, all’inizio o durante lo svolgimento della riunione, il collegamento di uno o più componenti risulti impossibile o venga interrotto per problemi tecnici, se il numero legale è assicurato la riunione può comunque svolgersi, dando atto dell’assenza giustificata del/i componente/i impossibilitato/i a mantenere attivo il collegamento. In caso di problemi di connessione durante una votazione, in mancanza di possibilità di ripristino del collegamento in tempi brevi, il Presidente dell’O.C. dichiara nulla la votazione e dispone l’aggiornamento in data da destinarsi della riunione stessa. In tal caso restano comunque valide le deliberazioni adottate fino al momento della sospensione della seduta."
	},
	{
		page: 68,
		text: "Articolo 5 - Espressione del voto e verbalizzazione delle sedute Nel caso in cui si preveda la delibera dell’Organo Collegiale su specifici punti all’ordine del giorno, ogni partecipante alla seduta a distanza deve esprimere il proprio voto attraverso opportuni mezzi tecnici connessi all’utilizzo della piattaforma in uso oppure, nel caso in cui ciò non fosse possibile, nominativamente anche via chat. Oltre a quanto previsto dalle norme vigenti, nel verbale della riunione a distanza devono essere indicati i nominativi dei componenti presenti, accertati anche attraverso una procedura di appello nominativo sulla base di apposito elenco predisposto dalla segreteria."
	},
	{
		page: 68,
		text: "Il verbale viene redatto da un collaboratore del dirigente scolastico (collegio docenti), dal coordinatore di classe o suo delegato (sessioni di scrutinio) o da un segretario nominato a turno fra le componenti docenti (Consiglio di Istituto) ad inizio seduta e sottoscritto dallo stesso e dal Presidente dell’organo collegiale. Qualora non si ritenga opportuno o non sia possibile effettuare la registrazione della seduta, il verbale verrà redatto successivamente nelle forme ordinarie."
	},
	{
		page: 68,
		text: "Articolo 6 - Entrata in vigore e durata Il presente regolamento entra in vigore a far data dalla pubblicazione dello stesso sul sito WEB dell’Istituzione in “Albo on-line”, nella sez. “Amministrazione Trasparente > Atti Generali” ed infine in “Regolamenti di Istituto e protocolli”."
	}
];
//#endregion
//#region src/lib/voto/school-regulations.ts
var SOURCE = "Regolamento d’Istituto Morselli-Sturzo, A.S. 2025/26";
var YEAR_NOTICE = "Verifica eventuali aggiornamenti.";
var normalize$4 = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'");
var hasAny = (query, terms) => terms.some((term) => query.includes(term));
var CORPUS_STOP_WORDS = /* @__PURE__ */ new Set([
	"cosa",
	"come",
	"quale",
	"quali",
	"posso",
	"puo",
	"sono",
	"devo",
	"deve",
	"della",
	"delle",
	"degli",
	"dello",
	"nella",
	"nelle",
	"sulla",
	"sulle",
	"regola",
	"regolamento",
	"norma",
	"norme",
	"scuola",
	"istituto"
]);
var CORPUS_ALIASES = {
	bidello: ["collaboratore scolastico"],
	bidelli: ["collaboratori scolastici"],
	bidella: ["collaboratrice scolastica"],
	bidelle: ["collaboratrici scolastiche"],
	preside: ["dirigente scolastico"],
	vicepreside: ["collaboratore dirigente"],
	dirigente: ["dirigente scolastico"],
	coordinatore: ["coordinatore classe"],
	coordinatrice: ["coordinatrice classe"],
	gita: ["viaggio istruzione"],
	gite: ["viaggi istruzione"],
	rappresentanti: ["rappresentanti studenti"],
	rappresentante: ["rappresentante studenti"],
	consiglio: ["organi collegiali"],
	castigo: ["sanzione disciplinare"],
	punizione: ["sanzione disciplinare"],
	punizioni: ["sanzioni disciplinari"],
	cellulare: ["telefono dispositivo elettronico"],
	smartphone: ["telefono dispositivo elettronico"],
	prof: ["docente"],
	professore: ["docente"],
	professoressa: ["docente"]
};
var REGULATION_TOPICS = [
	"docenti, studenti, famiglie e personale ATA",
	"diritti, doveri, partecipazione e libertà di espressione",
	"cellulari, smartphone e dispositivi elettronici",
	"verifiche, valutazione e comunicazione degli esiti",
	"assenze, giustificazioni, ritardi, ingressi e uscite",
	"bagni, intervallo, distributori e spazi scolastici",
	"assemblee, associazioni e organi collegiali",
	"bullismo, discriminazioni, privacy e riprese video",
	"sanzioni disciplinari, ricorsi e Organo di Garanzia",
	"sicurezza, porte antincendio, farmaci, malori e infortuni",
	"viaggi d’istruzione, visite guidate e uscite didattiche",
	"visitatori, esperti esterni e figure specialistiche",
	"contratti, sponsorizzazioni, beni e inventario",
	"disposizioni finali e regolamenti allegati"
];
function regulationQueryTerms(query) {
	const expanded = (normalize$4(query).match(/[\p{L}\p{N}]+/gu) ?? []).flatMap((term) => [term, ...CORPUS_ALIASES[term] ?? []]);
	return [...new Set(expanded.flatMap((term) => term.split(/\s+/)))].filter((term) => term.length >= 4 && !CORPUS_STOP_WORDS.has(term));
}
function corpusTermMatches(term, token) {
	if (token.includes(term) || term.includes(token)) return true;
	const prefixLength = Math.min(6, term.length, token.length);
	return prefixLength >= 5 && term.slice(0, prefixLength) === token.slice(0, prefixLength);
}
function regulationExcerpt(text, terms) {
	const clean = text.replace(/\s+/g, " ").trim();
	if (clean.length <= 460) return clean;
	const words = clean.split(" ");
	const matchIndex = words.findIndex((word) => terms.some((term) => corpusTermMatches(term, normalize$4(word).replace(/[^\p{L}\p{N}]/gu, ""))));
	const start = Math.max(0, (matchIndex < 0 ? 0 : matchIndex) - 24);
	const excerpt = words.slice(start, start + 68).join(" ");
	return `${start > 0 ? "…" : ""}${excerpt}${start + 68 < words.length ? "…" : ""}`;
}
function requestedDocumentLocation(query) {
	const pageMatch = query.match(/\b(?:pagina|pag|p)\.?\s*(\d{1,2})\b/);
	const articleMatch = query.match(/\b(?:articolo|art)\.?\s*(\d{1,2})\b/);
	const page = pageMatch?.[1] ? Number(pageMatch[1]) : null;
	const article = articleMatch?.[1] ? `art. ${articleMatch[1]}` : null;
	return {
		page: page && page >= 1 && page <= 68 ? page : null,
		article
	};
}
function regulationCorpusAnswer(query) {
	const terms = regulationQueryTerms(query);
	if (terms.length === 0) return null;
	const location = requestedDocumentLocation(query);
	const scopedCorpus = location.page ? REGULATION_CORPUS.filter((chunk) => chunk.page === location.page) : location.article ? REGULATION_CORPUS.filter((chunk) => normalize$4(chunk.text).includes(location.article)) : REGULATION_CORPUS;
	const ranked = (scopedCorpus.length > 0 ? scopedCorpus : REGULATION_CORPUS).map((chunk) => {
		const text = normalize$4(chunk.text);
		const compactText = text.replace(/\s+/g, "");
		const tokens = text.match(/[\p{L}\p{N}]+/gu) ?? [];
		const matched = terms.filter((term) => tokens.some((token) => corpusTermMatches(term, token)) || compactText.includes(term.replace(/\s+/g, "")));
		return {
			chunk,
			score: matched.length * 3 + (matched.length === terms.length ? 4 : 0),
			matched
		};
	}).filter((item) => item.score > 0 && item.matched.length >= Math.min(2, terms.length)).sort((left, right) => right.score - left.score || left.chunk.page - right.chunk.page).slice(0, 3);
	if (ranked.length === 0) return null;
	return withSource(`Ho trovato questi passaggi nel testo completo del regolamento:\n${ranked.map(({ chunk }) => {
		const excerpt = regulationExcerpt(chunk.text, terms);
		return `• p. ${chunk.page}: ${excerpt}`;
	}).join("\n")}`, `p. ${[...new Set(ranked.map(({ chunk }) => chunk.page))].join(", ")}`);
}
var INJURY_TERMS = [
	"malore",
	"malessere",
	"infortun",
	"ferit",
	"mi faccio male",
	"farmi male",
	"mi sono fatto male",
	"mi sono fatta male",
	"mi sento male a scuola",
	"sto male a scuola",
	"mi gira la testa a scuola",
	"incidente a scuola",
	"caduto a scuola",
	"caduta a scuola",
	"svenuto a scuola",
	"svenuta a scuola"
];
var EARLY_EXIT_TERMS = [
	"uscita anticip",
	"uscire prima",
	"esco prima",
	"vado via prima",
	"andare via prima",
	"lasciare la scuola prima"
];
var DAMAGE_TERMS = [
	"oggetto smarrito",
	"furto",
	"smarrimento",
	"perquisizione",
	"perquisire",
	"danneggiare",
	"danneggio",
	"danni agli arredi",
	"rompere un banco",
	"rompo un banco",
	"rompere qualcosa",
	"rompo qualcosa",
	"danneggiare qualcosa",
	"danneggio qualcosa",
	"rompere un oggetto",
	"rompo un oggetto"
];
var withSource = (answer, articles = "") => `${answer} Fonte: ${SOURCE}${articles ? `, ${articles}` : ""}. ${YEAR_NOTICE}`;
/**
* Risposte locali e sintetiche ricavate dal regolamento fornito dall’utente.
* Non carica né invia il PDF durante la conversazione; per casi specifici prevalgono
* le comunicazioni ufficiali e il regolamento completo.
*/
function answerSchoolRegulation(query) {
	const normalized = normalize$4(query);
	const asksAboutRegulation = hasAny(normalized, [
		"regolamento",
		"regola",
		"norma",
		"vietato",
		"posso usare",
		"si puo",
		"come devo"
	]);
	const asksAboutStudentRightsDuties = hasAny(normalized, ["diritt", "dover"]) && hasAny(normalized, [
		"student",
		"alunn",
		"alliev"
	]);
	const asksForPersonalNotes = hasAny(normalized, ["nota", "note"]) && hasAny(normalized, [
		"ho",
		"miei",
		"mie",
		"registrat",
		"visualizza"
	]);
	const asksAboutInjuryOrIllness = hasAny(normalized, INJURY_TERMS);
	const asksAboutAttendanceLimit = !hasAny(normalized, [
		"mi restano",
		"mi rimangono",
		"quanto mi resta",
		"quanto mi manca",
		"mi mancano",
		"quante ore ho fatto",
		"quante ore di assenza ho",
		"quanti giorni ho fatto"
	]) && (normalized.includes("assen") && hasAny(normalized, [
		"posso",
		"limite",
		"massim",
		"troppe",
		"bocciat",
		"rischio",
		"rischiare",
		"perdere l'anno",
		"perdo l'anno",
		"passare l'anno",
		"validita"
	]) || hasAny(normalized, ["tre quarti", "frequenza minima"]));
	const asksAboutDelayRule = normalized.includes("ritard") && hasAny(normalized, [
		"come",
		"regol",
		"regola",
		"entro",
		"dopo",
		"minuti",
		"seconda ora",
		"succede se",
		"posso fare",
		"posso avere",
		"tollerat",
		"massim",
		"limite",
		"consentit"
	]);
	const asksAboutEarlyDeparture = hasAny(normalized, EARLY_EXIT_TERMS);
	const asksAboutSchoolRule = hasAny(normalized, [
		"cellular",
		"telefon",
		"smartphone",
		"iphone",
		"tablet",
		"smartwatch"
	]) || normalized.includes("giustific") && normalized.includes("assen") || asksAboutDelayRule || asksAboutEarlyDeparture || asksAboutAttendanceLimit || normalized.includes("frequenza") && hasAny(normalized, [
		"regol",
		"regola",
		"validita",
		"anno scolastico",
		"tre quarti"
	]) || normalized.includes("verifica") && hasAny(normalized, [
		"regol",
		"regola",
		"esito",
		"risultato",
		"entro",
		"criteri"
	]) || normalized.includes("interrogaz") && hasAny(normalized, [
		"regol",
		"regola",
		"esito",
		"risultato",
		"entro",
		"criteri"
	]) || hasAny(normalized, [
		"copiare",
		"copio",
		"copiato",
		"copia",
		"suggerire",
		"fumare",
		"svapare",
		"svapo",
		"sigaretta",
		"sigarette",
		"vape"
	]) || hasAny(normalized, [
		"sanzion",
		"sospension",
		"ricorso disciplinare",
		"organo di garanzia",
		"provvedimento disciplinare",
		"nota disciplinare",
		"note disciplinari"
	]) && !asksForPersonalNotes || hasAny(normalized, [
		"bagno",
		"servizi igienici",
		"andare in bagno"
	]) || hasAny(normalized, [
		"ascensore",
		"associazion",
		"liberta di espressione",
		"esprimere il mio pensiero",
		"spazi della scuola"
	]) || hasAny(normalized, [
		"distributore",
		"distributori",
		"merenda",
		"snack",
		"macchinetta",
		"macchinette"
	]) || normalized.includes("assemblea") && hasAny(normalized, [
		"regol",
		"regola",
		"richied",
		"convoc",
		"quanto dura",
		"durata",
		"quante volte",
		"quando si fa",
		"una volta al mese"
	]) || hasAny(normalized, [
		"viaggio d'istruzione",
		"viaggio di istruzione",
		"viaggi d'istruzione",
		"viaggi di istruzione",
		"gita scolastica",
		"gite scolastiche",
		"gite",
		"visita guidata",
		"uscita didattica"
	]) || hasAny(normalized, [
		"porta di sicurezza",
		"porte di sicurezza",
		"scala antincendio",
		"scale antincendio",
		"terrazza esterna",
		"corridoio",
		"corridoi",
		"laboratorio da solo",
		"andare in laboratorio da solo",
		"palestra da solo"
	]) || hasAny(normalized, [
		"bullismo",
		"bullizzare",
		"intimidaz",
		"discriminaz",
		"filmare i compagni",
		"filmare docenti",
		"riprendere i compagni",
		"riprendere docenti",
		"foto ai compagni",
		"foto ai docenti",
		"fotografare i compagni",
		"fotografare docenti",
		"registrare i compagni",
		"filmo il compagno",
		"filmo la prof",
		"faccio un video",
		"pubblico foto"
	]) || hasAny(normalized, DAMAGE_TERMS) || hasAny(normalized, [
		"farmaco",
		"farmaci",
		"medicinale",
		"medicinali",
		"salvavita"
	]) || asksAboutInjuryOrIllness || hasAny(normalized, [
		"orario di ingresso",
		"orario scolastico",
		"orario della scuola",
		"a che ora inizia la scuola",
		"a che ora iniziano le lezioni",
		"a che ora si entra a scuola",
		"a che ora finisce la scuola",
		"a che ora finiscono le lezioni",
		"entrare prima delle 8",
		"entrare prima delle otto",
		"a che ora posso entrare",
		"cancello della scuola",
		"intervallo",
		"ricreazione",
		"pausa di socializzazione"
	]) || hasAny(normalized, [
		"ingresso",
		"entrata",
		"seconda ora"
	]) && hasAny(normalized, [
		"orario",
		"ritardo",
		"ritard",
		"a che ora",
		"prima delle",
		"posso entrare",
		"entrata posticipata"
	]) || hasAny(normalized, [
		"abbigliamento",
		"come vestirmi a scuola",
		"vestire a scuola",
		"vestiti a scuola"
	]) || hasAny(normalized, [
		"corridoio",
		"corridoi",
		"laboratorio da solo",
		"andare in laboratorio da solo",
		"palestra da solo"
	]) || hasAny(normalized, [
		"assemblea",
		"diritti degli studenti",
		"liberta di espressione"
	]) && asksAboutRegulation;
	if (!asksAboutRegulation && !asksAboutSchoolRule && !asksAboutStudentRightsDuties) return null;
	if (asksAboutRegulation && hasAny(normalized, [
		"quali argomenti",
		"quali temi",
		"cosa contiene",
		"su cosa posso chiedere",
		"cosa posso chiedere",
		"cosa tratta"
	])) return withSource(`Posso cercare nel testo completo del regolamento questi argomenti:\n${REGULATION_TOPICS.map((topic) => `• ${topic}`).join("\n")}`);
	if (hasAny(normalized, [
		"fonte",
		"documento",
		"pdf",
		"anno scolastico"
	]) && asksAboutRegulation && !hasAny(normalized, [
		"frequenza",
		"inizia",
		"finisce",
		"ritardo"
	])) return withSource("La sintesi che consulto è stata ricavata dal PDF del Regolamento d’Istituto Morselli-Sturzo allegato alla conversazione. Non è una verifica delle circolari successive né sostituisce il documento ufficiale completo.");
	if (asksAboutStudentRightsDuties) return withSource("Gli studenti hanno diritto, tra l’altro, a una formazione qualificata che valorizzi la loro identità, alla riservatezza, a essere informati sulle regole scolastiche, alla partecipazione, alla libertà di apprendimento, al rispetto della propria cultura e religione e a una valutazione trasparente e tempestiva. Tra i doveri: frequentare regolarmente i corsi e assolvere assiduamente agli impegni di studio, rispettare le disposizioni organizzative e di sicurezza, mantenere un comportamento corretto, non copiare né usare strumenti non autorizzati durante le verifiche, rispettare persone e personale e aver cura di strutture e materiali.", "artt. 5–10");
	if (hasAny(normalized, [
		"cellular",
		"telefon",
		"smartphone",
		"iphone",
		"tablet",
		"smartwatch"
	])) return withSource("In base al regolamento, è vietato agli studenti portare il cellulare salvo deroga motivata richiesta dalla famiglia e concessa dalla Direzione. Se autorizzato, va consegnato al docente all’arrivo in classe e ritirato al termine delle lezioni. Sono previste eccezioni per le uscite di almeno un’intera giornata e per alcune attività didattiche o esigenze logistiche, sempre secondo le indicazioni dei docenti. L’uso improprio può comportare il ritiro immediato e provvedimenti disciplinari.", "art. 5");
	if (normalized.includes("giustific") && normalized.includes("assen")) return withSource("L’assenza va giustificata tempestivamente con la funzione online del Registro Elettronico oppure, in alternativa, sul diario. Il regolamento richiede di regolarizzarla entro i 3 giorni successivi: nel frattempo lo studente può essere ammesso con riserva e annotazione; al quarto giorno viene avvisata la famiglia e il giorno seguente può essere richiesto che un genitore accompagni lo studente. Le assenze ingiustificate incidono sulla valutazione del comportamento. Posso spiegare la procedura, ma non inviare una giustificazione direttamente tramite DidUP Famiglia.", "art. 4 e art. 18.2");
	if (asksAboutDelayRule) return withSource("Per un ritardo occasionale non abituale fino a 10 minuti, spiega il motivo al docente della prima ora: se lo ritiene valido può ammetterti segnando una R. Superati i 10 minuti si entra dalla seconda ora; il ritardo deve essere motivato e giustificato. Il regolamento dice che dopo tre ritardi brevi si è riammessi accompagnati dai genitori; per ingressi posticipati oltre tre al mese può servire l’autorizzazione del collaboratore vicario e viene informata la famiglia. Gli ingressi continuativi richiedono una richiesta scritta e autorizzazione preventiva della Dirigenza.", "art. 18.2–18.3");
	if (asksAboutEarlyDeparture) return withSource("L’uscita anticipata, salvo un evento accaduto a scuola, va normalmente preannunciata dal genitore, motivata e giustificata. Per un minorenne deve essere autorizzata dal genitore o da una persona delegata, che compila il modulo e attende all’ingresso: lo studente non esce da solo. Le uscite continuative richiedono autorizzazione preventiva della Dirigenza; oltre tre uscite mensili interviene il collaboratore vicario e vengono informate Dirigente e famiglia. Per un maggiorenne la richiesta è autorizzata dal docente e la segreteria informa almeno un genitore.", "art. 19.1");
	if (asksAboutAttendanceLimit || normalized.includes("frequenza") || normalized.includes("ore di scuola") || normalized.includes("validita dell anno") || normalized.includes("validita dell'anno") || normalized.includes("tre quarti")) return withSource("Non c’è un numero fisso di giorni di assenza uguale per tutti: per la validità dell’anno scolastico il regolamento richiede la frequenza di almeno tre quarti dell’orario annuale personalizzato. Alcune assenze possono essere escluse dal conteggio solo se rientrano nelle deroghe approvate dal Collegio dei Docenti e previste nel PTOF. La documentazione delle deroghe va consegnata all’Ufficio protocollo al rientro e comunque entro 15 giorni; per la documentazione medica il regolamento non ammette certificati prodotti a posteriori per malattie pregresse.", "art. 21");
	if (hasAny(normalized, [
		"a che ora inizia la scuola",
		"a che ora iniziano le lezioni",
		"a che ora finisce la scuola",
		"a che ora finiscono le lezioni",
		"orario scolastico",
		"orario della scuola",
		"intervallo",
		"ricreazione",
		"pausa di socializzazione"
	]) && !hasAny(normalized, ["bagno", "servizi igienici"])) return withSource("Le attività si svolgono normalmente dal lunedì al venerdì, dalle 8:00 alle 14:30, salvo diverse comunicazioni; la scansione delle ore cambia in base al giorno. Il regolamento prevede due pause: 10 minuti tra la terza e la quarta unità oraria e 5 minuti tra la quinta e la sesta, da svolgere in classe. Durante le pause bisogna seguire le indicazioni dei docenti e rientrare in aula entro 5 minuti dalla fine.", "art. 17 e art. 24");
	if (hasAny(normalized, [
		"orario di ingresso",
		"a che ora si entra a scuola",
		"a che ora entro a scuola",
		"a che ora posso entrare",
		"ingresso a scuola",
		"entrare prima delle 8",
		"entrare prima delle otto",
		"cancello della scuola"
	])) return withSource("L’ingresso negli edifici è consentito al suono della campanella delle 8:00; gli alunni attendono nell’atrio entro il cancello principale. Tra le 7:30 e le 8:00 la scuola precisa che non può garantire la vigilanza. L’ammissione in classe alla prima ora è eccezionalmente possibile fino alle 8:10; oltre 10 minuti si entra dalla seconda ora secondo la procedura per i ritardi.", "art. 17 e art. 18.1–18.2");
	if (hasAny(normalized, [
		"bagno",
		"servizi igienici",
		"andare in bagno"
	])) return withSource("Per andare ai servizi durante la lezione serve il permesso del docente; l’uscita viene annotata. Non è consentito andarci durante gli intervalli. L’accesso è previsto dalla seconda ora; alla prima e all’ultima ora è ammesso solo eccezionalmente. Richieste ripetute devono essere giustificate con certificato medico consegnato al coordinatore. Non si può girare per corridoi o entrare in altre aule, laboratori, palestra o uffici senza permesso.", "art. 22");
	if (hasAny(normalized, [
		"distributore",
		"distributori",
		"merenda",
		"snack",
		"macchinetta",
		"macchinette"
	])) return withSource("I distributori automatici, quando attivi, si possono usare prima dell’ingresso in classe (7:45–8:00), poco prima di entrare per chi arriva alla seconda ora e durante la prima ricreazione. Durante le lezioni non si può interrompere l’attività per comprare snack o bevande. È ammesso portare da casa nello zaino un pasto autonomo adatto alla classe, evitando pietanze elaborate o con odori forti; non è consentito far portare vivande da terze persone non autorizzate.", "art. 2, art. 24 e art. 25");
	if (normalized.includes("ascensore")) return withSource("Gli studenti con difficoltà di deambulazione certificate o accertate possono usare l’ascensore solo se accompagnati da un collaboratore scolastico.", "art. 23");
	if (hasAny(normalized, [
		"associazion",
		"liberta di espressione",
		"esprimere il mio pensiero",
		"spazi della scuola"
	])) return withSource("Gli studenti possono associarsi liberamente nell’Istituto; per usare spazi scolastici in orario extracurricolare è necessaria l’autorizzazione del Dirigente o di un suo delegato. La libertà di esprimere il proprio pensiero è riconosciuta nel rispetto dei diritti altrui; per pubblicare o diffondere fogli e periodici negli spazi scolastici servono una fonte manifesta, il rispetto della legge e l’autorizzazione del Dirigente.", "art. 9 e art. 10");
	if (normalized.includes("assemblea")) return withSource("È prevista un’assemblea d’Istituto al mese, esclusi gli ultimi 30 giorni di lezione; la richiesta va presentata almeno 5 giorni prima e l’assemblea deve essere autorizzata dal Dirigente. L’assemblea di classe è consentita una volta al mese (tranne negli ultimi 30 giorni), per al massimo 2 ore; può essere richiesta dai rappresentanti o da almeno la metà più uno della classe e va inoltrata almeno 5 giorni prima con ordine del giorno, data, orario e firme dei docenti interessati. Le assemblee di classe non si tengono nei laboratori.", "art. 11 e art. 12");
	if (hasAny(normalized, [
		"viaggio d'istruzione",
		"viaggio di istruzione",
		"viaggi d'istruzione",
		"viaggi di istruzione",
		"gita scolastica",
		"gite scolastiche",
		"gite",
		"visita guidata",
		"uscita didattica"
	])) return withSource("Per un viaggio d'istruzione è richiesta la partecipazione di almeno due terzi della classe; chi non partecipa deve frequentare a scuola secondo l’orario normale e, se assente, giustificare l’assenza. Alle visite guidate e alle uscite didattiche di un giorno è prevista la partecipazione dell’intera classe; un’eventuale assenza va giustificata. Viaggi e visite guidate non si svolgono di norma negli ultimi 30 giorni di lezione, salvo deroga motivata e autorizzata. Il Consiglio di classe valuta l’eventuale partecipazione di studenti che abbiano ricevuto provvedimenti disciplinari.", "art. 37");
	if (hasAny(normalized, [
		"fumare",
		"svapare",
		"svapo",
		"sigaretta",
		"sigarette",
		"vape"
	])) return withSource("È vietato fumare, comprese le sigarette elettroniche, in tutti i locali dell’Istituto e nelle sue pertinenze esterne. Il regolamento considera la violazione una grave infrazione disciplinare, oltre alle conseguenze previste dalla normativa.", "art. 33");
	if (hasAny(normalized, [
		"bullismo",
		"bullizzare",
		"intimidaz",
		"discriminaz",
		"filmare i compagni",
		"riprendere i compagni",
		"foto ai compagni",
		"fotografare i compagni",
		"registrare i compagni"
	])) return withSource("Il regolamento vieta bullismo, intimidazioni, aggressioni e discriminazioni. Vieta inoltre di riprendere o filmare compagni e docenti con il videotelefono: la diffusione di immagini senza le autorizzazioni necessarie può avere conseguenze ulteriori. Per un episodio concreto, rivolgiti a un docente o alla Dirigenza e verifica le procedure aggiornate della scuola.", "art. 5 e art. 29");
	if (hasAny(normalized, [
		"porta di sicurezza",
		"porte di sicurezza",
		"scala antincendio",
		"scale antincendio",
		"terrazza esterna",
		"corridoio",
		"corridoi",
		"laboratorio da solo",
		"andare in laboratorio da solo",
		"palestra da solo"
	])) return withSource("In condizioni ordinarie non si possono usare le porte di sicurezza per entrare o uscire. Durante i cambi d’ora e le pause è vietato sostare sulle scale antincendio e sulle terrazze esterne. Gli spostamenti in altri ambienti scolastici richiedono il permesso del docente e la vigilanza prevista dal regolamento.", "art. 22 e art. 34");
	if (hasAny(normalized, DAMAGE_TERMS)) return withSource("Il regolamento invita a non portare oggetti di valore e precisa che la scuola non risponde di furto, smarrimento o danneggiamento degli oggetti personali. Il personale scolastico non è autorizzato a perquisire studenti o zaini; il regolamento indica che tali operazioni spettano alle Forze dell’Ordine secondo la legge. I danni alle strutture o alle dotazioni imputabili agli studenti possono comportare provvedimenti e risarcimento.", "art. 29 e art. 30");
	if (hasAny(normalized, [
		"farmaco",
		"farmaci",
		"medicinale",
		"medicinali",
		"salvavita"
	])) return withSource("Il personale scolastico non è autorizzato a somministrare farmaci, salvo la procedura prevista per i farmaci salvavita e le terapie programmate. In quel caso il regolamento richiede autorizzazione scritta dei genitori, prescrizione del medico e istruzioni precise per la somministrazione e l’emergenza. Per un farmaco ordinario è consentito l’ingresso del genitore o di una persona delegata. Concorda sempre il caso concreto con la segreteria.", "art. 36");
	if (asksAboutInjuryOrIllness) return withSource("In caso di malore o infortunio a scuola, il regolamento prevede di chiamare l’addetto al primo soccorso, avvisare i familiari e, nelle situazioni gravi o anche solo presumibilmente gravi, richiedere l’intervento urgente dei servizi sanitari (118). Se sta succedendo ora, avvisa subito un docente o un collaboratore scolastico.", "art. 35");
	if (hasAny(normalized, [
		"sanzion",
		"sospension",
		"ricorso disciplinare",
		"organo di garanzia",
		"provvedimento disciplinare",
		"nota disciplinare",
		"note disciplinari"
	]) && !asksForPersonalNotes) return withSource("Le sanzioni previste vanno dal richiamo verbale e attività educative alle ammonizioni, all’esclusione da alcune uscite e, nei casi più gravi, all’allontanamento dalla scuola. Devono essere proporzionate e lo studente deve poter esporre le proprie ragioni prima della decisione. In sintesi, il documento attribuisce al singolo docente e al Dirigente le sanzioni fino all’ammonizione scritta, al Consiglio di classe quelle fino a 15 giorni e al Consiglio d’Istituto quelle più gravi. Il ricorso dei genitori all’Organo di Garanzia interno è indicato entro 15 giorni dalla comunicazione. Non posso prevedere quale sanzione si applicherebbe a un caso concreto.", "Appendice 2, pp. 46–49");
	if (hasAny(normalized, [
		"copiare",
		"copio",
		"copiato",
		"copia",
		"suggerire"
	])) return withSource("Durante le verifiche non è consentito suggerire, copiare, usare sussidi o sistemi non autorizzati né alterare o falsificare prove o valutazioni. Le eventuali conseguenze dipendono dalla gravità, dalle circostanze e dalla procedura disciplinare; non posso prevedere l’esito di un caso concreto.", "art. 7 e Appendice 2");
	if (normalized.includes("verifica") || normalized.includes("interrogaz")) return withSource("Il regolamento indica che gli esiti delle verifiche orali devono essere comunicati il giorno stesso della prova, mentre per le verifiche scritte, pratiche e le prove autentiche il termine è entro 15 giorni. Gli studenti hanno inoltre diritto a conoscere i criteri di valutazione.", "art. 2 e art. 6");
	if (hasAny(normalized, [
		"abbigliamento",
		"come vestirmi a scuola",
		"vestire a scuola",
		"vestiti a scuola"
	])) return withSource("Il regolamento richiede un abbigliamento e un linguaggio adeguati al luogo e all’istituzione. In questo passaggio non specifica un elenco di capi consentiti o vietati.", "art. 7");
	if (asksAboutRegulation || hasAny(normalized, [
		"consiglio d'istituto",
		"consiglio di istituto",
		"organi collegiali",
		"patto educativo",
		"personale ata",
		"assistente amministrativo",
		"assistente tecnico",
		"collaboratore scolastico",
		"consegnatario",
		"inventario",
		"beni dell'istituto",
		"sponsorizzazione",
		"esperto esterno",
		"contratto",
		"scambio culturale",
		"bidello",
		"bidelli",
		"bidella",
		"bidelle",
		"preside",
		"vicepreside",
		"coordinatore",
		"coordinatrice",
		"gita",
		"gite",
		"gita scolastica",
		"castigo",
		"punizione"
	])) {
		const corpusAnswer = regulationCorpusAnswer(normalized);
		if (corpusAnswer) return corpusAnswer;
	}
	if (asksAboutRegulation) return withSource("Ho il testo completo del Regolamento d’Istituto in una base locale ricercabile, oltre alle risposte sintetiche per i casi più comuni. Posso riportare passaggi e pagine, ma per interpretazioni ufficiali, aggiornamenti o casi disciplinari concreti prevalgono la scuola e l’ultima versione pubblicata.");
	return null;
}
//#endregion
//#region src/lib/voto/assistant.ts
var normalize$3 = (value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
var number = (value) => fmt(Math.round(value * 100) / 100, 2);
function editDistance(left, right) {
	const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
	for (let row = 1; row <= left.length; row += 1) {
		let diagonal = previous[0];
		previous[0] = row;
		for (let column = 1; column <= right.length; column += 1) {
			const above = previous[column];
			previous[column] = left[row - 1] === right[column - 1] ? diagonal : Math.min(diagonal + 1, above + 1, previous[column - 1] + 1);
			diagonal = above;
		}
	}
	return previous[right.length];
}
function subjectTokenMatches(queryToken, subjectToken) {
	if (queryToken === subjectToken) return true;
	if (queryToken.length >= 3 && subjectToken.startsWith(queryToken)) return true;
	if (subjectToken.length >= 3 && queryToken.startsWith(subjectToken)) return true;
	const maxDistance = Math.max(queryToken.length, subjectToken.length) >= 7 ? 2 : 1;
	return queryToken.length >= 4 && subjectToken.length >= 4 && editDistance(queryToken, subjectToken) <= maxDistance;
}
function findSubject(query, data) {
	const normalized = normalize$3(query).replace(/[^\p{L}\p{N}\s]+/gu, " ");
	const exactMatches = data.subjects.filter((subject) => normalized.includes(normalize$3(subject.name)));
	if (exactMatches.length === 1) return exactMatches[0];
	if (exactMatches.length > 1) return void 0;
	const partialMatches = data.subjects.filter((subject) => normalize$3(subject.name).split(/\s+/).filter((token) => token.length >= 4).some((token) => normalized.includes(token)));
	if (partialMatches.length === 1) return partialMatches[0];
	const queryTokens = normalized.split(/\s+/).filter((token) => token.length >= 3);
	const tolerantMatches = data.subjects.filter((subject) => {
		return normalize$3(subject.name).split(/\s+/).filter((token) => token.length >= 4).some((subjectToken) => queryTokens.some((queryToken) => subjectTokenMatches(queryToken, subjectToken)));
	});
	return tolerantMatches.length === 1 ? tolerantMatches[0] : void 0;
}
function targetFrom(query) {
	const match = normalize$3(query).match(/(?:arrivare|raggiungere|obiettivo|media)[^0-9]{0,24}(10(?:[.,]0+)?|[0-9](?:[.,][0-9]+)?)/);
	return match?.[1] ? Number(match[1].replace(",", ".")) : null;
}
function gradeFrom(query) {
	const match = normalize$3(query).match(/(?:prendo|prendessi|prendero|con un nuovo voto|con un voto)[^0-9]{0,16}(10(?:[.,]0+)?|[0-9](?:[.,][0-9]+)?)/);
	return match?.[1] ? Number(match[1].replace(",", ".")) : null;
}
function simulatedAbsenceHours(query) {
	if (![
		"simul",
		"aggiung",
		"se faccio",
		"se facessi",
		"se avessi",
		"ipotizz",
		"considera"
	].some((term) => query.includes(term))) return null;
	const match = query.match(/\b(\d+(?:[.,]\d+)?)\s*(?:ore|h)\b/);
	if (!match?.[1]) return null;
	const value = Number(match[1].replace(",", "."));
	return Number.isFinite(value) && value >= 0 ? value : null;
}
function dayFromQuery(query, now) {
	const normalized = normalize$3(query);
	const namedDay = DAYS.find((day) => normalized.includes(normalize$3(day.label)));
	if (namedDay) return namedDay.id;
	const date = new Date(now);
	const offset = relativeDayOffset(normalized);
	if (offset !== null) date.setDate(date.getDate() + offset);
	const weekday = date.getDay();
	return weekday >= 1 && weekday <= 5 ? DAYS[weekday - 1]?.id ?? null : null;
}
function daysUntil(dateValue, now) {
	if (!dateValue) return null;
	const match = dateValue.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const due = new Date(Date.UTC(year, month - 1, day));
	if (due.getUTCFullYear() !== year || due.getUTCMonth() !== month - 1 || due.getUTCDate() !== day) return null;
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	return Math.round((due.getTime() - today) / 864e5);
}
function displayDate(dateValue) {
	const match = dateValue?.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
	return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}
function isAbsenceJustificationStatusQuery(normalizedQuery) {
	const mentionsAbsence = normalizedQuery.includes("assenza") || normalizedQuery.includes("assenze");
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
		"stato di giustificazione"
	].some((term) => normalizedQuery.includes(term));
	return mentionsAbsence && asksForStatus;
}
function answerAbsenceJustificationStatus(data) {
	const absenceEvents = (data.attendanceEvents ?? []).filter((event) => event.type === "absence").sort((left, right) => right.date.localeCompare(left.date));
	if (absenceEvents.length === 0) return "Nei dati sincronizzati non ci sono date dettagliate delle assenze, quindi non posso controllarne lo stato di giustificazione. Puoi vedere il totale in Altro > Assenze; non invio né modifico giustificazioni.";
	const shown = absenceEvents.slice(0, 5).map((event) => {
		return `• ${displayDate(event.date) ?? event.date}: ${event.justificationStatus?.trim() || "stato non disponibile nei dati sincronizzati"}`;
	});
	const remainder = absenceEvents.length > shown.length ? `\n• altre ${absenceEvents.length - shown.length} assenze non mostrate` : "";
	return `Stato delle assenze nei dati sincronizzati:\n${shown.join("\n")}${remainder}\nRiporto il campo ricevuto dal registro; se manca, non deduco che l’assenza sia giustificata o da giustificare. Non invio né modifico giustificazioni.`;
}
function relativeDayOffset(normalizedQuery) {
	if (normalizedQuery.includes("dopodomani")) return 2;
	if (normalizedQuery.includes("altro ieri") || normalizedQuery.includes("ieri l altro")) return -2;
	if (normalizedQuery.includes("ieri")) return -1;
	if (normalizedQuery.includes("domani")) return 1;
	if (normalizedQuery.includes("oggi")) return 0;
	return null;
}
function relativeDayLabel(offset) {
	if (offset === -2) return "l’altro ieri";
	if (offset === -1) return "ieri";
	if (offset === 0) return "oggi";
	if (offset === 1) return "domani";
	if (offset === 2) return "dopodomani";
	return "nel giorno richiesto";
}
function expandFollowUpQuestion(query, previousQuestion) {
	const previous = previousQuestion?.trim();
	const followUp = query.trim();
	if (!previous || !/^(?:e\s+)?(?:oggi|domani|dopodomani|ieri|l'altro ieri)\??$/i.test(followUp)) return query;
	const day = normalize$3(followUp).replace(/^e\s+/, "").replace(/\?+$/, "").trim();
	return `${previous.replace(/\b(?:oggi|domani|dopodomani|ieri|l'altro ieri)\b/gi, "").replace(/\?+$/, "").trim()} ${day}?`;
}
function localDateKey(date) {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}
function latestGrade(data) {
	return data.subjects.flatMap((subject) => subject.grades.map((grade) => ({
		subject,
		grade
	}))).sort((a, b) => b.grade.date.localeCompare(a.grade.date))[0] ?? null;
}
function recentDashboardUpdates(data, now) {
	const lowerBound = now.getTime() - 864e5;
	const upperBound = now.getTime();
	const updates = [];
	data.subjects.forEach((subject) => {
		subject.grades.forEach((grade) => {
			const occurredAt = parseEventDateTime(grade.date);
			if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
			updates.push({
				date: grade.date,
				occurredAt,
				text: `voto ${grade.label} in ${subject.name}`
			});
		});
	});
	data.assignments.forEach((assignment) => {
		const occurredAt = parseEventDateTime(assignment.assignedDate);
		if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
		updates.push({
			date: assignment.assignedDate,
			occurredAt,
			text: `compito “${assignment.title}”${assignment.subject ? ` di ${assignment.subject}` : ""}`
		});
	});
	data.notifications.forEach((notification) => {
		const occurredAt = parseEventDateTime(notification.date);
		if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
		const kind = notification.type === "grade" ? "notifica di voto" : notification.type === "notice" ? "comunicazione" : notification.type === "note" ? "nota" : "promemoria";
		updates.push({
			date: notification.date,
			occurredAt,
			text: `${kind} “${notification.title}”`
		});
	});
	return updates.sort((left, right) => right.occurredAt - left.occurredAt).map(({ date, text }) => ({
		date,
		text
	}));
}
function gradeToneLabel(value) {
	const tone = gradeTone(value);
	if (tone === "good") return "verde (da 6 in su)";
	if (tone === "ok") return "arancione (da 5 a 5,99)";
	if (tone === "bad") return "rosso (sotto 5)";
	return "grigio (nessun voto)";
}
function noticesByDate(data) {
	return data.notifications.filter((notification) => notification.type === "notice").sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
function remindersByDate(data) {
	return data.notifications.filter((notification) => notification.type === "reminder").sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
}
function noticeLabel(notification) {
	const date = displayDate(notification.date);
	const dateText = date ? ` (${date})` : "";
	const attachment = notification.attachmentName ? ` — allegato: ${notification.attachmentName}` : "";
	return `“${notification.title}”${dateText}${attachment}`;
}
function noticeSearchText(notification) {
	return normalize$3([
		notification.title,
		notification.message,
		notification.extractedText,
		notification.subject,
		notification.teacher
	].filter(Boolean).join(" "));
}
function noticeDetailLabel(notification) {
	const date = displayDate(notification.date);
	const source = notification.message?.trim() || notification.extractedText?.trim();
	if (!source) return noticeLabel(notification);
	const snippet = source.replace(/\s+/g, " ").trim().slice(0, 520);
	return `“${notification.title}”${date ? ` (${date})` : ""}: ${snippet}${source.length > 520 ? "…" : ""}`;
}
function noticeQueryTerms(query) {
	return normalize$3(query).split(/[^a-z0-9àèéìòù]+/i).filter((term) => term.length >= 2).filter((term) => ![
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
		"come"
	].includes(term));
}
function matchesNoticeQuery(query, notification) {
	const content = noticeSearchText(notification);
	return noticeQueryTerms(query).some((term) => content.includes(term));
}
function reminderLabel(notification) {
	const text = notification.message?.trim() || notification.title;
	const date = displayDate(notification.date);
	return `${text}${notification.subject ? ` — ${notification.subject}` : ""}${date ? ` (${date})` : ""}`;
}
function scheduleDayToClear(query) {
	const normalized = normalize$3(query);
	if (!(normalized.includes("cancella") || normalized.includes("elimina") || normalized.includes("svuota")) || !normalized.includes("orario")) return null;
	return DAYS.find((day) => normalized.includes(normalize$3(day.label)))?.id ?? null;
}
function answerQuestion(query, data, schedule = emptySchedule(), now = /* @__PURE__ */ new Date(), interrogazioni = [], context = {}) {
	query = expandFollowUpQuestion(query, context.previousQuestion);
	const normalized = normalize$3(query.trim());
	if (!normalized) return "Scrivimi una domanda, per esempio: “Quanto devo prendere in Inglese per arrivare a 8?”";
	if (isAssistantSearchQuery(query)) return formatAssistantSearchResults(searchAssistantData(query, data, interrogazioni));
	if (isAbsenceJustificationStatusQuery(normalized)) return answerAbsenceJustificationStatus(data);
	const schoolRegulationAnswer = answerSchoolRegulation(normalized);
	if (schoolRegulationAnswer) return schoolRegulationAnswer;
	if (normalized.includes("giustific") && (normalized.includes("assenza") || normalized.includes("assenze"))) return "Posso consultare i conteggi delle assenze presenti nei dati caricati, ma non inviare una giustificazione. Per giustificare un’assenza usa DidUP Famiglia con l’account genitore, se la funzione è abilitata dalla scuola.";
	if (normalized.includes("ntfy") || normalized.includes("notifica push") || normalized.includes("notifiche push") || normalized.includes("notific") && [
		"messaggio",
		"testo",
		"mostra",
		"dice",
		"perche",
		"diverso"
	].some((term) => normalized.includes(term))) return "Le notifiche ntfy del monitor sono brevi: «Ci sono novità in bacheca», «Ci sono novità nei voti» o «Ci sono novità nei compiti». In VOTO, gli avvisi con PDF o DOCX sono Circolari; quelli composti solo da testo sono Comunicazioni. Per ricevere push distinti («Nuove circolari in bacheca» e «Nuove comunicazioni in bacheca») va aggiornato il monitor ntfy esterno, il cui mittente non è incluso in questa app. Per leggere i dettagli apri la sezione corrispondente in VOTO.";
	if ((normalized.includes("cosa devo studiare") || normalized.includes("piano di studio") || normalized.includes("organizza lo studio")) && (normalized.includes("settimana") || normalized.includes("giorni") || normalized.includes("oggi"))) return "Per organizzare lo studio scegli tu ogni sessione nel Planner di studio: apri Studio Lab > Planner di studio e indica argomento, materia, metodo, giorno, orario e durata. Le sessioni restano salvate su questo dispositivo; non creo un piano automatico dal registro.";
	if (normalized.includes("cosa sai fare") || normalized.includes("cosa puoi fare") || normalized.includes("cosa posso chiederti") || normalized.includes("quali funzioni") || normalized.includes("cosa offre l app") || normalized.includes("tutto quello che puoi controllare")) return "Posso consultare i dati già caricati: profilo, voti e medie, compiti, presenze, orario, interrogazioni, diario, note, promemoria, circolari, notifiche di voto e docenti; posso inoltre spiegare i riepiloghi indicativi delle pagelle di primo trimestre e finale e la pagella infraperiodale manuale in Menu > Scrutini infraperiodali, leggere le flashcard di Studio Lab e usare il Planner di studio manuale per pianificare sessioni scegliendo materia, argomento, metodo, data, orario e durata. Posso anche rispondere su una sintesi locale del Regolamento d’Istituto Morselli-Sturzo 2025/2026, indicando sempre che va verificata per l’anno corrente. Se me lo chiedi, posso scegliere a caso un tema completo tra i preset disponibili e applicarlo solo dopo la tua conferma. Posso preparare riepiloghi e filtri per ieri, oggi, domani e dopodomani, calcolare le assenze e i giorni di calendario alla fine delle lezioni se imposti la data in Studio Lab, oltre ad altri calcoli scolastici. Dopo la tua conferma posso segnare un compito come completato o riaprirlo e cancellare un giorno dell’orario. Non accedo autonomamente a DidUP, non invio giustificazioni e non modifico notifiche.";
	if ((normalized.includes("pagell") || normalized.includes("scrutin")) && [
		"ufficial",
		"promosso",
		"promozione",
		"ammesso",
		"ammissione"
	].some((term) => normalized.includes(term))) return "No: in Menu > Scrutini infraperiodali, primo trimestre e scrutinio finale mostrano riepiloghi indicativi calcolati dai voti registrati nel periodo; non sono valutazioni ufficiali della scuola. La pagella infraperiodale è invece compilabile manualmente. Per l’esito ufficiale controlla DidUP o le comunicazioni della scuola.";
	if (normalized.includes("dove trovo") || normalized.includes("dove si trova") || normalized.includes("in quale sezione") || normalized.includes("come apro")) {
		const destination = [
			[["compit", "scadenz"], "Compiti"],
			[[
				"assenza",
				"presenz",
				"ritardo"
			], "Altro > Assenze"],
			[["orario", "lezion"], "Orario"],
			[["interrogaz"], "Interrogazioni"],
			[["scrutin", "pagell"], "Menu > Scrutini infraperiodali"],
			[["diario", "attivita"], "Diario"],
			[["nota"], "Note"],
			[["promemoria"], "Promemoria"],
			[[
				"circolar",
				"bacheca",
				"avviso"
			], "Novità"],
			[["professor", "docent"], "Professori"],
			[[
				"tema oro",
				"tema dorato",
				"tema diamante"
			], "Personalizza > Temi"],
			[[
				"tema",
				"font",
				"personalizz",
				"sfondo"
			], "Personalizza"],
			[["musica", "brano"], "Personalizza > Musica"],
			[[
				"impostazion",
				"sincronizz",
				"collegare i dati"
			], "Impostazioni"],
			[[
				"simulator",
				"calcolo media",
				"voto necessario"
			], "Studio Lab > Calcolo media e simulatore voti"],
			[[
				"pianificatore",
				"piano di studio",
				"cosa devo studiare"
			], "Studio Lab > Planner di studio"],
			[["voto", "materia"], "Voti"],
			[[
				"studio lab",
				"flashcard",
				"ruota del ripasso"
			], "Studio Lab"]
		].find(([terms]) => terms.some((term) => normalized.includes(term)));
		if (destination) return `Trovi questa funzione in ${destination[1]}. Puoi aprirla dal menu dell’app.`;
	}
	if ([
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
		"manca"
	].some((term) => normalized.includes(term)) && [
		"scuola",
		"lezion",
		"anno scolastico"
	].some((term) => normalized.includes(term))) {
		const endDate = context.schoolEndDate;
		const dateLabel = displayDate(endDate);
		const remainingDays = schoolDaysUntilSchoolEnd(endDate, now, context.schoolClosures);
		if (!endDate || !dateLabel || remainingDays === null) return "Per calcolare quando finisce la scuola, imposta prima la data ufficiale in Studio Lab > Fine scuola. La data non è nei dati sincronizzati e non la indovino.";
		if (remainingDays === 0) return `Oggi, ${dateLabel}, è l’ultimo giorno di scuola impostato.`;
		if (remainingDays > 0) return `La fine delle lezioni è impostata per il ${dateLabel}: mancano ${remainingDays} ${remainingDays === 1 ? "giorno" : "giorni"} di lezione (weekend e festività esclusi).`;
		const elapsedDays = Math.abs(remainingDays);
		return `La data di fine lezioni impostata era il ${dateLabel}: è passata da ${elapsedDays} ${elapsedDays === 1 ? "giorno" : "giorni"} di lezione (weekend e festività esclusi).`;
	}
	if (normalized.includes("anno scolastico") && [
		"quando",
		"data",
		"inizia",
		"inizio",
		"comincia"
	].some((term) => normalized.includes(term))) return "Nei dati caricati non è indicata la data di inizio o fine dell’anno scolastico. Controlla le comunicazioni ufficiali della scuola.";
	if (normalized.includes("come mi chiamo") || normalized.includes("qual e il mio nome") || normalized.includes("che classe faccio") || normalized.includes("in che classe sono") || normalized.includes("quale classe frequento") || normalized.includes("qual e il mio anno scolastico") || normalized.includes("che anno scolastico frequento") || normalized.includes("quale anno scolastico frequento") || normalized.includes("in quale anno scolastico sono") || normalized.includes("in che anno scolastico sono") || normalized.includes("in che anno scolastico siamo") || normalized.includes("che anno scolastico e")) {
		const profile = data.student;
		const details = [
			profile.name ? `nome: ${profile.name}` : null,
			profile.className ? `classe: ${profile.className}` : null,
			profile.schoolYear ? `anno scolastico: ${profile.schoolYear}` : null
		].filter((value) => Boolean(value));
		return details.length ? `Nel profilo scolastico risulta ${details.join("; ")}.` : "Nel profilo scolastico caricato non sono presenti nome, classe o anno scolastico.";
	}
	if ((normalized.includes("oro") || normalized.includes("diamante") || normalized.includes("sangue") || normalized.includes("dorato")) && [
		"sblocc",
		"livello",
		"scelg",
		"scegli",
		"attiv"
	].some((term) => normalized.includes(term))) return "I temi completi Oro, Diamante e Sangue sono già selezionabili in Personalizza > Temi.";
	if (normalized.includes("sincron") || normalized.includes("connession") || normalized.includes("sorgente dati") || normalized.includes("dati demo") || normalized.includes("ultimo aggiornamento dati")) {
		if (!context.source) return "Non ho lo stato della sorgente in questa risposta. Puoi controllare la connessione e l’ultimo caricamento in Impostazioni.";
		const sourceLabel = context.source === "remote" ? "sorgente remota configurata" : context.source === "cache" ? "copia in cache dell’ultima sorgente remota" : "dati demo locali";
		const syncDate = context.lastSync ? new Date(context.lastSync).toLocaleString("it-IT") : "nessun caricamento riuscito registrato";
		const errorText = context.syncError ? " È presente un errore nell’ultimo aggiornamento." : "";
		return `Stai usando ${sourceLabel}. ${context.hasRemoteUrl ? "Un URL sorgente è configurato." : "Nessun URL sorgente è configurato."} Ultimo caricamento riuscito: ${syncDate}.${errorText} Questo indica quando l’app ha letto i dati, non quando la scuola li ha aggiornati.`;
	}
	if (normalized.includes("tema") && [
		"che tema",
		"quale tema",
		"mio tema",
		"tema attuale",
		"tema impostato",
		"tema selezionato",
		"sto usando"
	].some((term) => normalized.includes(term)) || normalized.includes("font") || normalized.includes("carattere") || normalized.includes("personalizz") || normalized.includes("densita") || normalized.includes("movimento") || normalized.includes("dimensione interfaccia") || normalized.includes("moduli della home")) {
		if (!context.theme) return "Non ho lo stato delle preferenze in questa risposta. Puoi vedere o modificare tema, font e Home in Personalizza.";
		const themeLabel = context.theme === "original" ? "Originale" : context.theme === "custom" ? "Personalizzato" : context.theme.replaceAll("-", " ");
		const fontLabels = {
			theme: "quello del tema",
			sans: "Sans",
			display: "Display",
			mono: "Monospace",
			serif: "Serif"
		};
		const details = [`tema ${themeLabel}`];
		if (context.mode) details.push(`modalità ${context.mode}`);
		if (context.customFont) details.push(`font ${fontLabels[context.customFont] ?? context.customFont}`);
		if (context.interfaceScale) details.push(`dimensione interfaccia ${context.interfaceScale}%`);
		if (context.density) details.push(`densità ${context.density === "compact" ? "compatta" : "standard"}`);
		if (context.reduceMotion !== void 0) details.push(`movimento ${context.reduceMotion ? "ridotto" : "normale"}`);
		if (context.accent) details.push(`colore accento ${context.accent}`);
		if (context.background) details.push(`sfondo ${context.background}`);
		if (normalized.includes("home") || normalized.includes("moduli")) {
			const labels = {
				media: "Media",
				simulatore: "Simulatore",
				presenze: "Presenze",
				compiti: "Compiti",
				interrogazioni: "Interrogazioni",
				note: "Note",
				promemoria: "Promemoria",
				bacheca: "Bacheca",
				obiettivo: "Obiettivo"
			};
			const enabled = context.homeModules?.filter((module) => module.enabled).map((module) => labels[module.id] ?? module.id) ?? [];
			if (enabled.length) details.push(`moduli Home attivi: ${enabled.join(", ")}`);
			if (context.homeScale) details.push(`scala Home ${context.homeScale}%`);
		}
		return `Preferenze locali attuali: ${details.join("; ")}. Puoi cambiarle in Personalizza; non sono impostazioni di DidUP.`;
	}
	if (normalized.includes("flashcard") || normalized.includes("flash card") || normalized.includes("carte di ripasso")) {
		const cards = context.flashcards ?? [];
		if (!cards.length) return "Non risultano flashcard caricate nella sessione Studio Lab. Puoi crearle o importarle in Studio Lab > Flashcard; restano dati della sessione e non vengono inviati online.";
		const subject = findSubject(query, data);
		const matches = subject ? cards.filter((card) => normalize$3(card.subject).includes(normalize$3(subject.name))) : cards;
		if (!matches.length) return `Non trovo flashcard per ${subject?.name ?? "questa richiesta"} nel mazzo della sessione.`;
		const showAnswers = normalized.includes("risposta") || normalized.includes("mostra") || normalized.includes("elenc");
		const shown = matches.slice(0, 8).map((card) => `• ${card.subject ? `${card.subject}: ` : ""}${card.question}${showAnswers ? ` → ${card.answer}` : ""}`);
		return [
			`${matches.length} ${matches.length === 1 ? "flashcard" : "flashcard"} nella sessione${subject ? ` per ${subject.name}` : ""}:`,
			...shown,
			...matches.length > shown.length ? [`E altre ${matches.length - shown.length}.`] : []
		].join("\n");
	}
	if (normalized.includes("note") || normalized.includes("annotazion") || normalized.includes("nota disciplinare")) {
		const asksUnread = normalized.includes("non lett") || normalized.includes("nuov");
		const requestedDay = relativeDayOffset(normalized);
		const subject = findSubject(query, data);
		const matches = data.notifications.filter((item) => item.type === "note").filter((item) => !asksUnread || !item.read).filter((item) => !subject || normalize$3(item.subject ?? "").includes(normalize$3(subject.name))).filter((item) => requestedDay === null ? true : daysUntil(item.date, now) === requestedDay).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
		if (!matches.length) {
			if (requestedDay !== null) return `Non risultano note${asksUnread ? " non lette" : ""} per ${relativeDayLabel(requestedDay)} nei dati caricati.`;
			if (asksUnread) return "Non risultano note non lette nei dati caricati.";
			return "Non risultano note disciplinari nei dati caricati.";
		}
		const shown = matches.slice(0, 5).map((item) => {
			const date = displayDate(item.date);
			const subjectLabel = item.subject ? ` — ${item.subject}` : "";
			const title = item.title.trim();
			const message = item.message?.trim();
			return `• ${message && message !== title ? `${title}: ${message}` : title}${subjectLabel}${date ? ` (${date})` : ""}${item.read ? "" : " — non letta"}`;
		});
		const remainder = matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
		return `Note${asksUnread ? " non lette" : " disciplinari"}:\n${shown.join("\n")}${remainder}\nLe trovi nella sezione Note.`;
	}
	if (normalized.includes("diario") || normalized.includes("attivita")) {
		const subject = findSubject(query, data);
		const requestedDay = relativeDayOffset(normalized);
		const matches = data.diary.filter((entry) => !subject || normalize$3(entry.subject ?? "").includes(normalize$3(subject.name))).filter((entry) => requestedDay === null ? true : daysUntil(entry.date, now) === requestedDay).sort((a, b) => `${b.date}${b.hour ?? ""}`.localeCompare(`${a.date}${a.hour ?? ""}`));
		if (!matches.length) {
			if (requestedDay !== null) return `Non risultano attività nel Diario per ${relativeDayLabel(requestedDay)}.`;
			return "Non ci sono attività nel Diario che corrispondono alla richiesta.";
		}
		const shown = matches.slice(0, 8).map((entry) => {
			const date = displayDate(entry.date) ?? entry.date;
			const details = [
				entry.subject,
				entry.hour,
				entry.teacher
			].filter((value) => Boolean(value?.trim())).join(", ");
			return `• ${date}${details ? ` — ${details}` : ""}: ${entry.activity}`;
		});
		const remainder = matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
		return `Attività del Diario:\n${shown.join("\n")}${remainder}\nI dati provengono dal Diario caricato nell’app.`;
	}
	const notices = noticesByDate(data);
	const reminders = remindersByDate(data);
	if (normalized.includes("promemoria") || normalized.includes("promemorie") || normalized.includes("ricord") && (normalized.includes("oggi") || normalized.includes("domani") || normalized.includes("cosa") || normalized.includes("quali") || normalized.includes("ho"))) {
		const requestedDay = relativeDayOffset(normalized);
		const asksPastReminders = normalized.includes("scors") || normalized.includes("passat") || normalized.includes("precedent") || normalized.includes("scadut") || normalized.includes("ultim") && normalized.includes("giorn");
		const asksUnread = normalized.includes("non lett") || normalized.includes("nuov");
		const matches = reminders.filter((item) => {
			const days = daysUntil(item.date, now);
			if (requestedDay !== null) return days === requestedDay;
			if (asksPastReminders) return days !== null && days < 0 && days >= -30;
			return days === null || days >= 0;
		}).filter((item) => !asksUnread || !item.read).sort((a, b) => asksPastReminders ? (b.date ?? "").localeCompare(a.date ?? "") : (a.date ?? "9999").localeCompare(b.date ?? "9999"));
		if (!matches.length) {
			if (requestedDay !== null) return `Non risultano promemoria DidUP per ${relativeDayLabel(requestedDay)}.`;
			if (asksUnread) return "Non risultano promemoria non letti nei dati caricati.";
			if (asksPastReminders) return "Non risultano promemoria passati negli ultimi 30 giorni.";
			return "Non risultano promemoria DidUP nei dati sincronizzati.";
		}
		const shown = matches.slice(0, 5);
		const heading = requestedDay !== null ? `Promemoria DidUP di ${relativeDayLabel(requestedDay)}` : asksPastReminders ? "Promemoria passati negli ultimi 30 giorni" : asksUnread ? "Promemoria non letti" : "Promemoria DidUP";
		const remainder = matches.length > shown.length ? `\nE altri ${matches.length - shown.length}.` : "";
		return `${heading}:\n${shown.map((item) => `• ${reminderLabel(item)}`).join("\n")}${remainder}\nLi trovi nella sezione Promemoria.`;
	}
	if (normalized.includes("notific") && !normalized.includes("promemoria") && !normalized.includes("note") && !normalized.includes("circolar") && !normalized.includes("bacheca") && !normalized.includes("avviso")) {
		const requestedType = normalized.includes("vot") || normalized.includes("valutaz") ? "grade" : void 0;
		const unreadOnly = normalized.includes("non lett") || normalized.includes("nuov");
		const requestedDay = relativeDayOffset(normalized);
		const labels = {
			note: "Nota",
			grade: "Voto",
			reminder: "Promemoria",
			notice: "Avviso"
		};
		const matches = data.notifications.filter((item) => !requestedType || item.type === requestedType).filter((item) => !unreadOnly || !item.read).filter((item) => requestedDay === null ? true : daysUntil(item.date, now) === requestedDay).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
		if (!matches.length) return requestedType ? `Non risultano notifiche di voto${requestedDay === null ? "" : ` per ${relativeDayLabel(requestedDay)}`} nei dati caricati.` : `Non risultano notifiche che corrispondono alla richiesta${requestedDay === null ? "" : ` per ${relativeDayLabel(requestedDay)}`} nei dati caricati.`;
		const shown = matches.slice(0, 8).map((item) => {
			const date = displayDate(item.date);
			const message = item.message?.trim();
			const detail = message && message !== item.title ? ` — ${message}` : "";
			const subject = item.subject ? `, ${item.subject}` : "";
			const attachment = item.attachmentName ? `, allegato: ${item.attachmentName}` : "";
			return `• ${labels[item.type] ?? "Notifica"}: ${item.title}${detail}${subject}${date ? ` (${date})` : ""}${attachment}${item.read ? "" : " — non letta"}`;
		});
		const remainder = matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
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
		"scadenz"
	].some((term) => normalized.includes(term));
	const asksDashboardOverview = normalized.includes("dashboard") || normalized.includes("situazione generale") || normalized.includes("cosa e successo") || normalized.includes("cosa è successo") || normalized.includes("ultimo aggiornamento");
	if ((normalized.includes("novit") || normalized.includes("aggiornament") || asksDashboardOverview) && !asksCategorySpecificUpdates) {
		const recentGrade = latestGrade(data);
		const recentUpdates = recentDashboardUpdates(data, now);
		const currentAverage = overallAverage(data.subjects);
		const todayNotices = notices.filter((notification) => notification.date?.slice(0, 10) === localDateKey(now));
		const lines = [];
		if (currentAverage !== null) {
			const delta = data.previousAverage === void 0 ? null : currentAverage - data.previousAverage;
			const trend = delta === null ? "" : delta > .05 ? `, in crescita di ${number(delta)} punti` : delta < -.05 ? `, in calo di ${number(Math.abs(delta))} punti` : ", stabile rispetto all’ultimo dato";
			lines.push(`Media generale: ${number(currentAverage)} su 10${trend}.`);
		} else lines.push("Media generale: non ancora calcolabile perché non ci sono voti sufficienti.");
		if (recentUpdates.length) {
			lines.push(`Evento più recente nelle ultime 24 ore: ${recentUpdates[0].text} (${displayDate(recentUpdates[0].date) ?? recentUpdates[0].date}).`);
			if (recentUpdates.length > 1) lines.push(`Altre novità recenti: ${recentUpdates.slice(1, 4).map((item) => item.text).join("; ")}.`);
		} else lines.push("Nessun nuovo evento registrato nelle ultime 24 ore.");
		if (recentGrade) {
			const date = displayDate(recentGrade.grade.date);
			lines.push(`Ultimo voto: ${recentGrade.grade.label} in ${recentGrade.subject.name}${date ? ` (${date})` : ""}.`);
		}
		if (todayNotices.length) lines.push(`Circolari di oggi: ${todayNotices.map(noticeLabel).join("; ")}.`);
		else if (notices[0]) lines.push(`Ultima circolare: ${noticeLabel(notices[0])}.`);
		const nextReminder = reminders.find((item) => {
			const days = daysUntil(item.date, now);
			return days !== null && days >= 0;
		});
		if (nextReminder) lines.push(`Promemoria: ${reminderLabel(nextReminder)}.`);
		return lines.join("\n");
	}
	if (normalized.includes("orario") || normalized.includes("lezion")) {
		const day = dayFromQuery(query, now);
		if (!day) return "Il tuo orario copre dal lunedì al venerdì. Dimmi un giorno scolastico o chiedi “Che lezioni ho domani?”";
		const lessons = (schedule[day] ?? []).map((subject, index) => subject.trim() ? `${index + 1}ª ora: ${subject.trim()}` : null).filter((lesson) => lesson !== null);
		const label = DAYS.find((item) => item.id === day)?.label ?? day;
		return lessons.length ? `${label}: ${lessons.length} ${lessons.length === 1 ? "lezione" : "lezioni"}. ${lessons.join("; ")}.` : `Non hai lezioni inserite per ${label} nell’orario.`;
	}
	const asksInterrogationPreparation = normalized.includes("checklist") || normalized.includes("prepar") || normalized.includes("ripassare") || normalized.includes("cosa devo studiare");
	if (normalized.includes("interrogaz") && asksInterrogationPreparation) {
		const subject = findSubject(query, data);
		const item = interrogazioni.filter((item) => !item.completed && (daysUntil(item.date, now) ?? -1) >= 0).filter((item) => !subject || normalize$3(item.subject).includes(normalize$3(subject.name))).sort((a, b) => `${a.date}${a.hour ?? 0}`.localeCompare(`${b.date}${b.hour ?? 0}`))[0];
		if (!item) return "Non trovo un’interrogazione futura corrispondente nell’agenda locale. Puoi controllare la sezione Interrogazioni.";
		const date = displayDate(item.date) ?? item.date;
		const preparation = item.checklist.length ? item.checklist.map((step) => `• ${step.done ? "Fatto" : "Da fare"}: ${step.label}`).join("\n") : "Nessun punto di preparazione inserito.";
		return `Preparazione per ${item.subject} (${date}):\n${preparation}\nLa consultazione non modifica la checklist.`;
	}
	if (normalized.includes("interrogaz") && (normalized.includes("completat") || normalized.includes("passat") || normalized.includes("gia fatt"))) {
		const completed = interrogazioni.filter((item) => item.completed).sort((a, b) => b.date.localeCompare(a.date));
		if (!completed.length) return "Non risultano interrogazioni completate nell’agenda locale.";
		const shown = completed.slice(0, 8).map((item) => {
			const date = displayDate(item.date) ?? item.date;
			return `• ${item.subject} (${date})${item.notes ? ` — ${item.notes}` : ""}`;
		});
		return `Interrogazioni completate:\n${shown.join("\n")}${completed.length > shown.length ? `\nE altre ${completed.length - shown.length}.` : ""}`;
	}
	if (normalized.includes("interrogaz")) {
		const requestedDay = relativeDayOffset(normalized);
		const future = interrogazioni.filter((item) => !item.completed).filter((item) => {
			const distance = daysUntil(item.date, now);
			return requestedDay !== null ? distance === requestedDay : distance !== null && distance >= 0;
		}).sort((a, b) => `${a.date}${a.hour ?? 0}`.localeCompare(`${b.date}${b.hour ?? 0}`));
		const matches = requestedDay === null ? future : future.filter((item) => daysUntil(item.date, now) === requestedDay);
		if (!matches.length) {
			if (requestedDay !== null) return `Non hai interrogazioni in agenda per ${relativeDayLabel(requestedDay)}.`;
			return "Non risultano interrogazioni future nella tua agenda locale. Puoi aggiungerle nella sezione Interrogazioni.";
		}
		const shown = matches.slice(0, requestedDay === null ? 3 : matches.length).map((item) => {
			const date = displayDate(item.date) ?? item.date;
			const hour = item.hour ? `, ${item.hour}ª ora` : item.time ? `, ${item.time}` : "";
			const notes = item.notes ? ` — ${item.notes}` : "";
			return `${item.subject} (${date}${hour})${notes}`;
		});
		return `${requestedDay !== null ? `Interrogazioni di ${relativeDayLabel(requestedDay)}` : "Prossime interrogazioni in agenda"}:\n${shown.map((item) => `• ${item}`).join("\n")}${matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : ""}`;
	}
	const asksNoticeDetails = (normalized.includes("cosa dice") || normalized.includes("dettagli") || normalized.includes("classe") || normalized.includes("esce") || normalized.includes("orario") || normalized.includes("a che ora") || normalized.includes("quando")) && notices.some((notification) => matchesNoticeQuery(normalized, notification));
	if (normalized.includes("circolar") || normalized.includes("bacheca") || normalized.includes("avvisi") || normalized.includes("notiz") || asksNoticeDetails) {
		const requestedDay = relativeDayOffset(normalized);
		const asksUnread = normalized.includes("non lett");
		const asksNew = normalized.includes("nuov") || normalized.includes("recent") || normalized.includes("novit") || normalized.includes("aggiornament");
		const asksDetails = asksNoticeDetails;
		let matches = notices;
		if (requestedDay !== null) matches = matches.filter((notification) => daysUntil(notification.date, now) === requestedDay);
		if (asksUnread || asksNew && requestedDay === null) matches = matches.filter((notification) => !notification.read);
		if (asksDetails) {
			const searchTerms = noticeQueryTerms(normalized);
			if (searchTerms.length) matches = matches.filter((notification) => {
				const content = noticeSearchText(notification);
				return searchTerms.some((term) => content.includes(term));
			});
		}
		if (!matches.length) {
			if (requestedDay !== null) return `Non risultano circolari per ${relativeDayLabel(requestedDay)} nei dati caricati.`;
			if (asksUnread || asksNew) return "Non risultano circolari nuove o non lette.";
			return "Non risultano circolari o avvisi nei dati caricati.";
		}
		const latestOnly = normalized.includes("ultima circolare") || normalized.includes("ultimo avviso");
		const shown = matches.slice(0, latestOnly ? 1 : 5);
		const heading = requestedDay !== null ? `Circolari di ${relativeDayLabel(requestedDay)}` : asksUnread || asksNew ? "Circolari nuove o non lette" : "Circolari recenti";
		const remainder = matches.length > shown.length ? `\nE altre ${matches.length - shown.length}.` : "";
		return `${heading}:\n${shown.map((notification) => `• ${asksDetails ? noticeDetailLabel(notification) : noticeLabel(notification)}`).join("\n")}${remainder}\nLe trovi nella sezione Novità.`;
	}
	if ((normalized.includes("riepilog") || normalized.includes("programma") || normalized.includes("agenda")) && relativeDayOffset(normalized) !== null || /\bcosa (?:ho|devo fare|mi aspetta) (?:oggi|ieri|domani|dopodomani)\b/.test(normalized) || /\bche impegni ho (?:oggi|ieri|domani|dopodomani)\b/.test(normalized)) {
		const offset = relativeDayOffset(normalized) ?? 0;
		const date = new Date(now);
		date.setDate(date.getDate() + offset);
		const dateKey = localDateKey(date);
		const dateLabel = date.toLocaleDateString("it-IT", {
			weekday: "long",
			day: "numeric",
			month: "long"
		});
		const weekday = date.getDay();
		const dayId = weekday >= 1 && weekday <= 5 ? DAYS[weekday - 1]?.id : null;
		const sections = [];
		const lessons = dayId ? (schedule[dayId] ?? []).map((lesson, index) => lesson.trim() ? `${index + 1}ª ${lesson.trim()}` : null).filter((lesson) => lesson !== null) : [];
		if (lessons.length) sections.push(`Lezioni: ${lessons.join(", ")}`);
		const assignments = data.assignments.filter((item) => !item.completed && item.dueDate?.slice(0, 10) === dateKey);
		if (assignments.length) sections.push(`Compiti: ${assignments.slice(0, 5).map((item) => `${item.title}${item.subject ? ` (${item.subject})` : ""}${item.details ? ` — ${item.details}` : ""}`).join("; ")}`);
		const diary = data.diary.filter((item) => item.date.slice(0, 10) === dateKey);
		if (diary.length) sections.push(`Diario: ${diary.slice(0, 5).map((item) => `${item.hour ? `${item.hour}ª ora, ` : ""}${item.subject ? `${item.subject}: ` : ""}${item.activity}`).join("; ")}`);
		const interrogations = interrogazioni.filter((item) => !item.completed && item.date.slice(0, 10) === dateKey);
		if (interrogations.length) sections.push(`Interrogazioni in agenda: ${interrogations.map((item) => `${item.subject}${item.hour ? `, ${item.hour}ª ora` : item.time ? `, ${item.time}` : ""}${item.notes ? ` — ${item.notes}` : ""}`).join("; ")}`);
		const notifications = data.notifications.filter((item) => item.date?.slice(0, 10) === dateKey);
		for (const [type, label] of [
			["reminder", "Promemoria"],
			["note", "Note"],
			["notice", "Circolari"],
			["grade", "Notifiche di voto"]
		]) {
			const items = notifications.filter((item) => item.type === type);
			if (items.length) sections.push(`${label}: ${items.slice(0, 4).map((item) => `${item.title}${item.message && item.message !== item.title ? ` — ${item.message}` : ""}`).join("; ")}`);
		}
		return sections.length ? [
			`Riepilogo di ${relativeDayLabel(offset)} (${dateLabel}):`,
			...sections.map((section) => `• ${section}`),
			"Riepilogo basato sui dati già caricati nell’app."
		].join("\n") : `Non trovo lezioni inserite né compiti, attività, interrogazioni o comunicazioni per ${relativeDayLabel(offset)} (${dateLabel}) nei dati caricati.`;
	}
	const subject = findSubject(query, data);
	const target = targetFrom(query);
	const projectedGrade = gradeFrom(query);
	if ((normalized.includes("voto") || normalized.includes("voti") || normalized.includes("valutazion")) && [
		"quali",
		"elenc",
		"lista",
		"mostra",
		"tutti",
		"vedere",
		"novit",
		"aggiornament",
		"nuov",
		"recent"
	].some((term) => normalized.includes(term))) {
		let grades = data.subjects.flatMap((item) => item.grades.map((grade) => ({
			subject: item,
			grade
		})));
		if (subject) grades = grades.filter((entry) => entry.subject.id === subject.id);
		const requestedType = Object.entries({
			orale: ["oral"],
			scritto: ["scritt"],
			pratico: ["pratic"],
			altro: ["altro"]
		}).find(([, terms]) => terms.some((term) => normalized.includes(term)))?.[0];
		if (requestedType) grades = grades.filter((entry) => entry.grade.type === requestedType);
		grades.sort((a, b) => b.grade.date.localeCompare(a.grade.date));
		if (!grades.length) return subject ? `Non risultano voti${requestedType ? ` di tipo ${requestedType}` : ""} in ${subject.name}.` : "Non risultano voti nei dati caricati.";
		const shown = grades.slice(0, 12).map(({ subject: item, grade }) => {
			const date = displayDate(grade.date);
			const weight = grade.weight !== 1 ? `, peso ${number(grade.weight)}` : "";
			const comment = grade.comment?.trim() ? ` — ${grade.comment.trim()}` : "";
			return `• ${item.name}: ${grade.label} (${grade.type}${date ? `, ${date}` : ""}${weight})${comment}`;
		});
		const remainder = grades.length > shown.length ? `\nE altri ${grades.length - shown.length} voti.` : "";
		return `Voti${subject ? ` in ${subject.name}` : " registrati"}${requestedType ? ` (${requestedType})` : ""}:\n${shown.join("\n")}${remainder}`;
	}
	if (!subject && (normalized.includes("mio obiettivo") || normalized.includes("mio target") || normalized.includes("target impostato") || normalized.includes("obiettivo impostato") || normalized.includes("qual e il target") || normalized.includes("qual e il mio obiettivo"))) return context.target === void 0 ? "Non ho il valore dell’obiettivo in questa risposta. Puoi verificarlo nel modulo Obiettivo della Dashboard." : `L’obiettivo della media generale impostato nella Dashboard è ${number(context.target)} su 10. I calcoli dell’assistente sui voti necessari riguardano invece una singola materia.`;
	const asksTeacher = normalized.includes("prof") || normalized.includes("docent") || normalized.includes("insegn") || /\bchi (?:fa|tiene)\b/.test(normalized);
	const asksTeacherList = normalized.includes("chi") || normalized.includes("quali") || normalized.includes("elenco") || normalized.includes("lista") || normalized === "professori" || normalized === "docenti";
	if (asksTeacher && subject) {
		const questionTeachers = teachersForSubjectQuestion(query);
		const teacher = subject.teacher?.trim();
		if (teacher && !asksForLaboratory(query)) return `Il docente registrato per ${subject.name} è ${teacher}.`;
		if (asksForLaboratory(query) && questionTeachers.length) {
			const names = questionTeachers.map(([name]) => name);
			return `Nella sezione Professori, per il laboratorio risult${names.length === 1 ? "a" : "ano"} ${names.join(", ")}.`;
		}
		const classTeachers = (questionTeachers.length ? questionTeachers : teachersForSubject(subject.name)).map(([name]) => name);
		if (classTeachers.length) return `Nella sezione Professori, per ${subject.name} risulta${classTeachers.length === 1 ? "" : "no"} ${classTeachers.join(", ")}.`;
		if (teacher) return `Il docente registrato per ${subject.name} è ${teacher}.`;
		return `Non ho il nome del docente di ${subject.name} nei dati sincronizzati o nella sezione Professori.`;
	}
	if (asksTeacher) {
		const classTeachers = teachersForSubjectQuestion(query).map(([name]) => name);
		if (classTeachers.length) return `Nella sezione Professori, per questa materia risulta${classTeachers.length === 1 ? "" : "no"} ${classTeachers.join(", ")}.`;
	}
	if (asksTeacher && asksTeacherList) {
		const teachers = getClassTeachers();
		if (!teachers.length) return "Non hai ancora inserito professori. Vai in Professori e aggiungi nome e materia: poi potrò riconoscerli anche con domande come ‘chi fa inglese?’ o ‘prof di mate?’.";
		return `Docenti della sezione Professori:\n${teachers.map(([name, subjects]) => `• ${subjects}: ${name}`).join("\n")}`;
	}
	if (!subject && (normalized.includes("ultimo voto") || normalized.includes("ultima valutazione") || normalized.includes("voto piu recente"))) {
		const recent = latestGrade(data);
		if (!recent) return "Non risultano voti registrati.";
		const date = displayDate(recent.grade.date);
		return `L’ultimo voto registrato è ${recent.grade.label} in ${recent.subject.name}${date ? ` (${date})` : ""}.`;
	}
	if ((normalized.includes("previsione") || normalized.includes("che media avro") || normalized.includes("media avro") || normalized.includes("se prendo")) && subject && projectedGrade !== null) {
		const projected = {
			id: "assistant-preview",
			value: projectedGrade,
			label: String(projectedGrade),
			date: "",
			type: "altro",
			weight: 1
		};
		const nextAverage = average([...subject.grades, projected]);
		const current = average(subject.grades);
		return nextAverage === null || current === null ? `In ${subject.name} non ci sono ancora voti sufficienti per fare la previsione.` : `Con un ${number(projectedGrade)} in ${subject.name}, la tua media passerebbe da ${number(current)} a circa ${number(nextAverage)}.`;
	}
	if (subject && (normalized.includes("voto piu alto") || normalized.includes("voto massimo") || normalized.includes("miglior voto"))) {
		const best = subject.grades.reduce((current, grade) => current === null || grade.value > current ? grade.value : current, null);
		return best === null ? `In ${subject.name} non ci sono ancora voti.` : `Il voto più alto in ${subject.name} è ${number(best)}.`;
	}
	if (subject && (normalized.includes("voto piu basso") || normalized.includes("voto minimo") || normalized.includes("peggior voto"))) {
		const lowest = subject.grades.reduce((current, grade) => current === null || grade.value < current ? grade.value : current, null);
		return lowest === null ? `In ${subject.name} non ci sono ancora voti.` : `Il voto più basso in ${subject.name} è ${number(lowest)}.`;
	}
	const asksHighestGrade = normalized.includes("voto piu alto") || normalized.includes("voto massimo") || normalized.includes("miglior voto");
	const asksLowestGrade = normalized.includes("voto piu basso") || normalized.includes("voto minimo") || normalized.includes("peggior voto");
	if (!subject && (asksHighestGrade || asksLowestGrade)) {
		const extreme = data.subjects.flatMap((item) => item.grades.map((grade) => ({
			subject: item,
			grade
		}))).sort((a, b) => asksHighestGrade ? b.grade.value - a.grade.value : a.grade.value - b.grade.value)[0];
		if (!extreme) return "Non risultano voti registrati.";
		return asksHighestGrade ? `Il voto più alto registrato è ${extreme.grade.label} in ${extreme.subject.name}.` : `Il voto più basso registrato è ${extreme.grade.label} in ${extreme.subject.name}.`;
	}
	if (normalized.includes("ultimo voto") && subject) {
		const latest = [...subject.grades].sort((a, b) => b.date.localeCompare(a.date))[0];
		return latest ? `L’ultimo voto in ${subject.name} è ${latest.label}${latest.date ? ` del ${displayDate(latest.date) ?? latest.date}` : ""}.` : `In ${subject.name} non ci sono ancora voti.`;
	}
	if (normalized.includes("quanti voti") || normalized.includes("numero di voti") || normalized.includes("quante valutazioni")) {
		if (subject) return `Hai ${subject.grades.length} ${subject.grades.length === 1 ? "voto" : "voti"} registrati in ${subject.name}.`;
		const total = data.subjects.reduce((count, item) => count + item.grades.length, 0);
		return `Hai ${total} ${total === 1 ? "voto" : "voti"} registrati in ${data.subjects.length} materie.`;
	}
	if ((normalized.includes("quanto devo") || normalized.includes("arrivare") || normalized.includes("raggiungere")) && subject) {
		const current = average(subject.grades);
		if (current === null) return `In ${subject.name} non ci sono ancora voti sufficienti per fare il calcolo.`;
		const wanted = target ?? 8;
		const result = neededGrade(subject.grades, wanted);
		if (result.status === "reached") return `In ${subject.name} hai già una media di ${number(current)}: hai già raggiunto l'obiettivo ${number(wanted)}.`;
		if (result.status === "impossible") return `In ${subject.name} hai una media di ${number(current)}. Per arrivare a ${number(wanted)} con un solo prossimo voto servirebbe ${number(result.needed)}, quindi non è possibile con un voto massimo di 10.`;
		return `In ${subject.name} hai una media di ${number(current)}. Per arrivare a ${number(wanted)} con il prossimo voto dovresti prendere almeno ${number(result.needed)}.`;
	}
	if (normalized.includes("media") && subject) {
		const current = average(subject.grades);
		return current === null ? `In ${subject.name} non ci sono ancora voti.` : `La tua media in ${subject.name} è ${number(current)} su ${subject.grades.length} voti.`;
	}
	if (normalized.includes("media piu bassa") || normalized.includes("materia piu bassa")) {
		const ranked = data.subjects.map((item) => ({
			item,
			avg: average(item.grades)
		})).filter((entry) => entry.avg !== null).sort((a, b) => a.avg - b.avg);
		return ranked[0] ? `La media più bassa è ${number(ranked[0].avg)} in ${ranked[0].item.name}.` : "Non ci sono ancora voti sufficienti.";
	}
	if (normalized.includes("media piu alta") || normalized.includes("materia migliore")) {
		const ranked = data.subjects.map((item) => ({
			item,
			avg: average(item.grades)
		})).filter((entry) => entry.avg !== null).sort((a, b) => b.avg - a.avg);
		return ranked[0] ? `La media più alta è ${number(ranked[0].avg)} in ${ranked[0].item.name}.` : "Non ci sono ancora voti sufficienti.";
	}
	if (normalized.includes("colore") || normalized.includes("colori") || normalized.includes("verde") || normalized.includes("arancion") || normalized.includes("rosso")) {
		if (subject) {
			const current = average(subject.grades);
			return `In ${subject.name} la media è ${current === null ? "—" : number(current)}: fascia ${gradeToneLabel(current)}.`;
		}
		return "La regola dei voti è: verde da 6 in su, arancione da 5 a 5,99, rosso sotto il 5. Le materie senza voti sono grigie.";
	}
	if (normalized.includes("insufficient") || normalized.includes("sotto il 6") || normalized.includes("sotto la sufficienza")) {
		const lowSubjects = data.subjects.map((item) => ({
			item,
			avg: average(item.grades)
		})).filter((entry) => entry.avg !== null && entry.avg < 6);
		return lowSubjects.length ? `Materie sotto la sufficienza: ${lowSubjects.map(({ item, avg }) => `${item.name} (${number(avg)})`).join(", ")}.` : "Non risultano materie sotto la sufficienza nei voti caricati.";
	}
	if (normalized.includes("sto migliorando") || normalized.includes("andamento") || normalized.includes("trend")) {
		const current = overallAverage(data.subjects);
		if (current === null || data.previousAverage === void 0) return "Non ho abbastanza dati per confrontare la media attuale con quella precedente.";
		const delta = current - data.previousAverage;
		if (Math.abs(delta) < .05) return `La media generale è stabile: ${number(current)}, come il dato precedente (${number(data.previousAverage)}).`;
		const direction = delta > 0 ? "aumentata" : "diminuita";
		return `La media generale è ${number(current)}: è ${direction} di ${number(Math.abs(delta))} punti rispetto al dato precedente (${number(data.previousAverage)}).`;
	}
	if (normalized.includes("media generale") || normalized.includes("media complessiva") || normalized === "media") {
		const current = overallAverage(data.subjects);
		return current === null ? "Non ci sono ancora voti sufficienti per calcolare la media generale." : `La tua media generale è ${number(current)}.`;
	}
	const mentionsAbsence = normalized.includes("assenza") || normalized.includes("assenze") || normalized.includes("assent");
	const additionalAbsenceHours = mentionsAbsence ? simulatedAbsenceHours(normalized) : null;
	if (additionalAbsenceHours !== null) {
		const plan = calculateAbsencePlan({
			absenceHours: data.attendance.absenceHours,
			absenceLimitHours: data.attendance.absenceLimitHours,
			annualHours: data.attendance.annualHours,
			simulatedHours: additionalAbsenceHours,
			hoursPerDay: context.absenceHoursPerDay ?? 6
		});
		if (!plan.hasConfiguredLimit) return `Con altre ${number(additionalAbsenceHours)} ore arriveresti a ${number(plan.simulatedTotalHours)} ore di assenza, ma nei dati caricati non è impostato un limite valido per valutare il risultato.`;
		if (plan.simulatedExceededHours > 0) return `Con altre ${number(additionalAbsenceHours)} ore arriveresti a ${number(plan.simulatedTotalHours)} ore di assenza: supereresti il limite di ${number(plan.simulatedExceededHours)} ore.`;
		if (plan.simulatedRemainingHours === 0) return `Con altre ${number(additionalAbsenceHours)} ore arriveresti esattamente al limite di ${number(plan.absenceLimitHours)} ore.`;
		const dayEstimate = plan.fullDaysAfterSimulation === null ? "" : ` Sono circa ${plan.fullDaysAfterSimulation} giornate intere residue, calcolate usando ${number(plan.hoursPerDay)} ore per giornata.`;
		return `Con altre ${number(additionalAbsenceHours)} ore arriveresti a ${number(plan.simulatedTotalHours)} ore: resterebbero ${number(plan.simulatedRemainingHours)} ore prima del limite.${dayEstimate}`;
	}
	const asksForEventDates = normalized.includes("quali") || normalized.includes("quando") || normalized.includes("giorni") || normalized.includes("date");
	if (normalized.includes("tutti gli eventi") || normalized.includes("eventi appello") || normalized.includes("eventi di appello")) return "Puoi vedere assenze, ritardi e uscite nella schermata personalizzata Altro > Assenze > Tutti gli eventi, con filtri separati e gli stati di giustificazione.";
	if (mentionsAbsence && asksForEventDates) {
		const absenceEvents = (data.attendanceEvents ?? []).filter((event) => event.type === "absence").sort((a, b) => b.date.localeCompare(a.date));
		if (absenceEvents.length === 0) return "Nei dati sincronizzati non sono presenti le date dettagliate delle assenze. Puoi comunque vedere il totale nella sezione Altro > Assenze.";
		return `Le tue assenze registrate sono: ${absenceEvents.map((event) => displayDate(event.date)).filter((date) => date !== null).join(", ")}. Per vedere anche ritardi, uscite e giustificazioni apri Altro > Assenze > Tutti gli eventi.`;
	}
	if ((normalized.includes("ritardo") || normalized.includes("ritardi")) && asksForEventDates) {
		const delayEvents = (data.attendanceEvents ?? []).filter((event) => event.type === "delay").sort((a, b) => b.date.localeCompare(a.date));
		if (delayEvents.length === 0) return "Nei dati sincronizzati non sono presenti le date dettagliate dei ritardi. Il conteggio disponibile è quello riportato nella sezione Presenze.";
		return `I ritardi registrati risultano nelle date: ${delayEvents.map((event) => displayDate(event.date)).filter((date) => date !== null).join(", ")}. Puoi controllare tutti gli eventi da Altro > Assenze > Tutti gli eventi.`;
	}
	const asksForRemainingAbsence = [
		"limite",
		"ancora",
		"manca",
		"restan",
		"posso fare",
		"posso assentarmi",
		"posso permettermi"
	].some((term) => normalized.includes(term));
	if (mentionsAbsence && asksForRemainingAbsence) {
		const plan = calculateAbsencePlan({
			absenceHours: data.attendance.absenceHours,
			absenceLimitHours: data.attendance.absenceLimitHours,
			annualHours: data.attendance.annualHours,
			simulatedHours: 0,
			hoursPerDay: context.absenceHoursPerDay ?? 6
		});
		if (!plan.hasConfiguredLimit) return `Nei dati caricati risultano ${number(plan.absenceHours)} ore di assenza, ma non è impostato un limite valido per calcolare quanto margine resta.`;
		if (plan.exceededHours > 0) return `Hai ${number(plan.absenceHours)} ore di assenza e hai già superato il limite di ${number(plan.absenceLimitHours)} ore di ${number(plan.exceededHours)} ore.`;
		if (plan.remainingHours === 0) return `Hai raggiunto il limite di ${number(plan.absenceLimitHours)} ore di assenza.`;
		const dayEstimate = normalized.includes("giorn") && plan.fullDaysRemaining !== null ? ` A ${number(plan.hoursPerDay)} ore per giornata, equivalgono a circa ${plan.fullDaysRemaining} giornate intere.` : "";
		return `Hai ${number(plan.absenceHours)} ore di assenza su ${number(plan.absenceLimitHours)}: ti restano ${number(plan.remainingHours)} ore prima del limite.${dayEstimate}`;
	}
	if (normalized.includes("uscit") && (normalized.includes("anticip") || normalized.includes("uscite"))) {
		const count = data.attendance.earlyExits;
		return `Nei dati caricati risult${count === 1 ? "a" : "ano"} ${count} ${count === 1 ? "uscita anticipata" : "uscite anticipate"}.`;
	}
	if (normalized.includes("assenza") || normalized.includes("assenze") || normalized.includes("ritardo") || normalized.includes("ritardi")) {
		const { attendance } = data;
		const plan = calculateAbsencePlan({
			absenceHours: attendance.absenceHours,
			absenceLimitHours: attendance.absenceLimitHours,
			annualHours: attendance.annualHours,
			simulatedHours: 0,
			hoursPerDay: context.absenceHoursPerDay ?? 6
		});
		const daysLabel = attendance.absenceDays === 1 ? "giorno" : "giorni";
		const delaysLabel = attendance.delays === 1 ? "ritardo" : "ritardi";
		const limitSummary = plan.hasConfiguredLimit ? `Il limite impostato è ${number(plan.absenceLimitHours)} ore.` : "Nei dati caricati non è impostato un limite valido per le assenze.";
		return `Hai ${attendance.absenceDays} ${daysLabel} e ${number(plan.absenceHours)} ore di assenza, con ${attendance.delays} ${delaysLabel}. ${limitSummary}`;
	}
	const asksCompletedAssignments = normalized.includes("completat") || normalized.includes("svolti") || normalized.includes("finiti") || normalized.includes("fatti");
	if ((normalized.includes("compit") || normalized.includes("scadenz")) && (asksCompletedAssignments || subject)) {
		let matches = data.assignments.filter((item) => asksCompletedAssignments ? item.completed : !item.completed);
		if (subject) matches = matches.filter((item) => normalize$3(item.subject ?? "").includes(normalize$3(subject.name)));
		const requestedDay = relativeDayOffset(normalized);
		if (requestedDay !== null) matches = matches.filter((item) => daysUntil(item.dueDate, now) === requestedDay);
		matches.sort((a, b) => {
			const first = daysUntil(a.dueDate, now);
			const second = daysUntil(b.dueDate, now);
			if (first === null) return second === null ? a.title.localeCompare(b.title) : 1;
			if (second === null) return -1;
			return first - second || (a.dueTime ?? "").localeCompare(b.dueTime ?? "");
		});
		if (!matches.length) return `Non risultano compiti ${asksCompletedAssignments ? "completati" : "aperti"}${subject ? ` di ${subject.name}` : ""}${requestedDay === null ? "" : ` per ${relativeDayLabel(requestedDay)}`} nei dati caricati.`;
		const shown = matches.slice(0, 8).map((item) => {
			const dueDate = displayDate(item.dueDate);
			const due = dueDate ? `, ${dueDate}${item.dueTime ? ` alle ${item.dueTime}` : ""}` : "";
			const itemSubject = item.subject ? ` — ${item.subject}` : "";
			const details = item.details?.trim() ? `: ${item.details.trim()}` : "";
			return `• ${item.title}${itemSubject}${due}${details}`;
		});
		const remainder = matches.length > shown.length ? `\nE altri ${matches.length - shown.length}.` : "";
		return `${asksCompletedAssignments ? "Compiti completati" : "Compiti aperti"}${subject ? ` di ${subject.name}` : ""}:\n${shown.join("\n")}${remainder}`;
	}
	if (normalized.includes("compiti") || normalized.includes("scadenze")) {
		const open = data.assignments.filter((assignment) => !assignment.completed);
		if (!open.length) return "Non risultano compiti ancora da completare.";
		const requestedDay = relativeDayOffset(normalized);
		if (requestedDay !== null) {
			const due = open.filter((assignment) => daysUntil(assignment.dueDate, now) === requestedDay);
			return due.length ? `Hai ${due.length} ${due.length === 1 ? "compito" : "compiti"} in scadenza ${relativeDayLabel(requestedDay)}: ${due.map((item) => item.title).join(", ")}.` : `Non hai compiti aperti in scadenza ${relativeDayLabel(requestedDay)}.`;
		}
		if (normalized.includes("in ritardo") || normalized.includes("scaduti")) {
			const overdue = open.filter((assignment) => (daysUntil(assignment.dueDate, now) ?? 0) < 0);
			return overdue.length ? `Hai ${overdue.length} compiti in ritardo: ${overdue.map((item) => item.title).join(", ")}.` : "Non risultano compiti in ritardo.";
		}
		const next = [...open].sort((a, b) => {
			const first = daysUntil(a.dueDate, now);
			const second = daysUntil(b.dueDate, now);
			if (first === null) return second === null ? a.title.localeCompare(b.title) : 1;
			if (second === null) return -1;
			return first - second;
		}).slice(0, 3).map((item) => {
			const days = daysUntil(item.dueDate, now);
			const date = displayDate(item.dueDate);
			const timing = days === null ? "" : days < 0 ? ` (scaduto il ${date})` : days === 0 ? " (scade oggi)" : days === 1 ? " (scade domani)" : ` (scade il ${date})`;
			return `${item.title}${timing}`;
		});
		return `Hai ${open.length} compit${open.length === 1 ? "o" : "i"} da completare. I prossimi: ${next.join("; ")}.`;
	}
	if (normalized.includes("diario") || normalized.includes("attivita")) {
		const latest = [...data.diary].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
		return latest.length ? latest.map((entry) => `${entry.date} — ${entry.subject || "Attività"}: ${entry.activity}`).join("\n") : "Non ci sono ancora attività nel Diario.";
	}
	if ([
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
		"docente"
	].some((term) => normalized.includes(term))) return "Riconosco l’argomento, ma non la forma della richiesta. Prova per esempio “cerca algebra”, “quali compiti ho?” oppure “qual è l’ultimo voto?”. Non ho modificato nessun dato.";
	return "Non ho capito la domanda. Prova a riformularla o scegli uno dei suggerimenti qui sotto.";
}
//#endregion
//#region src/lib/voto/circular-assistant-chat.ts
var MAX_API_DOCUMENT_LENGTH = 6e4;
var CIRCULAR_TERMS = /\b(?:circolar\w*|avvis\w*|bachec\w*)\b/;
var RECENT_TERMS = /\b(?:ultim\w*|recent\w*|nuov\w*)\b/;
var CONTENT_TERMS = /\b(?:cosa dice|di cosa parla|contenut\w*|riassum\w*|spieg\w*|scad\w*|termin\w*|entro|quando|ora|chi deve|a chi|destinatar\w*|rivolt\w*|cosa devo|azioni|obblig\w*|partecip\w*|parl\w*|serve\w*)/;
var SKIP_COMMAND = /^\s*(?:cerca(?:re)?|trova(?:re)?|ricerca(?:\s+rapida)?)\b/i;
var FOLLOW_UP_TERMS = /^(?:quando|dove|chi|a chi|e\s+(?:quando|dove|chi)|quale|quali|perche|perché|e poi|cosa succede)\??\s*$/i;
var COMPARE_TERMS = /\b(?:confronta|confrontare|differenze|differenza|cambiato|cambiate|rispetto)\b/i;
function normalize$2(value) {
	return value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function dateRank(value) {
	const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
	const italian = value?.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
	if (italian) return Date.UTC(Number(italian[3]), Number(italian[2]) - 1, Number(italian[1]));
	return 0;
}
function dateLabel(value) {
	const iso = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
	const italian = value?.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
	if (italian) {
		const [, day, month, year] = italian;
		return `${day?.padStart(2, "0") ?? "00"}/${month?.padStart(2, "0") ?? "00"}/${year ?? "0000"}`;
	}
	return value?.trim() || "data non indicata";
}
function latestNotices(notifications) {
	return notifications.filter((item) => item.type === "notice").sort((left, right) => dateRank(right.date) - dateRank(left.date));
}
function isCircularChatQuestion(question) {
	const normalized = normalize$2(question);
	if (!CIRCULAR_TERMS.test(normalized) || SKIP_COMMAND.test(question)) return false;
	return RECENT_TERMS.test(normalized) || CONTENT_TERMS.test(normalized);
}
function isCircularFollowUpQuestion(question, previousQuestion) {
	return Boolean(previousQuestion && FOLLOW_UP_TERMS.test(question.trim()) && isCircularChatQuestion(previousQuestion));
}
function asksForCircularList(question) {
	const normalized = normalize$2(question);
	return /\b(?:quali|lista|elenco|ultim\w*|recent\w*|mostra)\b/.test(normalized) && !CONTENT_TERMS.test(normalized);
}
function formatCircularList(notices) {
	const recent = notices.slice(0, 3);
	if (recent.length === 0) return "Non trovo circolari nei dati locali. Aggiorna i dati o controlla la Bacheca.";
	return `Le circolari più recenti caricate nell’app sono:\n${recent.map((notice) => {
		const attachments = [notice.attachmentName, ...(notice.attachments ?? []).map((item) => item.name)].filter(Boolean).join(", ");
		return `• ${dateLabel(notice.date)} — ${notice.title}${attachments ? ` (allegati: ${attachments})` : ""}`;
	}).join("\n")}`;
}
function asksForCircularComparison(question) {
	return COMPARE_TERMS.test(normalize$2(question));
}
function normalizeComparisonLine(line) {
	return line.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function chooseNotice(question, notices) {
	if (RECENT_TERMS.test(normalize$2(question))) return notices[0];
	const ignored = /* @__PURE__ */ new Set([
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
		"dimmi"
	]);
	const terms = [...new Set(normalize$2(question).match(/[\p{L}\p{N}]+/gu) ?? [])].filter((term) => term.length >= 3 && !ignored.has(term));
	if (terms.length === 0) return notices[0];
	return notices.map((notice) => {
		const searchable = normalize$2([
			notice.title,
			notice.message,
			notice.extractedText,
			notice.subject,
			notice.attachmentName
		].filter(Boolean).join(" "));
		return {
			notice,
			score: terms.filter((term) => searchable.includes(term)).length
		};
	}).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score)[0]?.notice ?? notices[0];
}
function attachmentPath(notice) {
	return [notice.attachmentPath, ...(notice.attachments ?? []).map((item) => item.path)].find((path) => typeof path === "string" && /^circulars\/[a-f0-9]{64}\.(?:pdf|docx)$/i.test(path));
}
function internalAttachmentUrl(path) {
	return `/api/circulars/mirror?${new URLSearchParams({ path }).toString()}`;
}
async function readNoticeText(notice) {
	const extractedText = notice.extractedText?.trim();
	if (extractedText) return {
		text: extractedText,
		truncated: false
	};
	const path = attachmentPath(notice);
	if (path) {
		const url = internalAttachmentUrl(path);
		const document = path.toLowerCase().endsWith(".docx") ? await extractCircularDocxText(url) : await extractCircularPdfText(url);
		return {
			text: document.text.trim(),
			truncated: document.truncated
		};
	}
	return {
		text: notice.message?.trim() ?? "",
		truncated: false
	};
}
async function answerCircularChatQuestion(question, notifications, mode, previousQuestion) {
	const isFollowUp = isCircularFollowUpQuestion(question, previousQuestion);
	if (!isCircularChatQuestion(question) && !isFollowUp) return null;
	const effectiveQuestion = isFollowUp ? `${previousQuestion} ${question}` : question;
	const notices = latestNotices(notifications);
	if (notices.length === 0) return "Non trovo circolari caricate nei dati locali. Aggiorna la Bacheca e riprova.";
	if (asksForCircularComparison(effectiveQuestion)) {
		if (notices.length < 2) return "Mi servono almeno due circolari locali per fare un confronto.";
		try {
			const [newer, older] = notices;
			if (!newer || !older) return "Mi servono almeno due circolari locali per fare un confronto.";
			const [newerDocument, olderDocument] = await Promise.all([readNoticeText(newer), readNoticeText(older)]);
			const olderLines = new Set(olderDocument.text.split(/\r?\n/).map(normalizeComparisonLine).filter((line) => line.length >= 18));
			const changes = newerDocument.text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length >= 18 && !olderLines.has(normalizeComparisonLine(line))).slice(0, 6);
			return `Confronto locale:\n• Più recente: ${newer.title}\n• Precedente: ${older.title}\n\n${changes.length ? `Elementi presenti nella più recente e non trovati nella precedente:\n${changes.map((line) => `• ${line}`).join("\n")}` : "Non ho trovato differenze testuali evidenti nelle parti estratte."}`;
		} catch {
			return "Non riesco a leggere localmente entrambe le circolari per confrontarle.";
		}
	}
	if (asksForCircularList(effectiveQuestion)) return formatCircularList(notices);
	const notice = chooseNotice(effectiveQuestion, notices);
	if (!notice) return "Non trovo la circolare richiesta nei dati locali.";
	let document;
	try {
		document = await readNoticeText(notice);
	} catch {
		return `Non riesco a leggere localmente l’allegato di “${notice.title}”. Apri la circolare in Bacheca e riprova.`;
	}
	if (!document.text) return `La circolare più recente è “${notice.title}” (${dateLabel(notice.date)}), ma non trovo testo o allegato leggibile nei dati locali. Aprila dalla Bacheca.`;
	const clippedText = document.text.slice(0, MAX_API_DOCUMENT_LENGTH);
	const prefix = `Circolare: ${notice.title} (${dateLabel(notice.date)}).\n\n`;
	if (mode === "api") return `${prefix}${await askAboutCircular({
		question: effectiveQuestion,
		documentText: clippedText,
		documentTruncated: document.truncated || document.text.length > MAX_API_DOCUMENT_LENGTH
	})}`;
	return `${prefix}${answerCircularQuestionLocally(effectiveQuestion, document.text)}${document.truncated ? "\n\nNota: il documento è lungo; ho analizzato solo la parte estratta disponibile." : ""}`;
}
//#endregion
//#region src/lib/voto/school-documents.ts
var SCHOOL_POLICY_TERMS = /\b(?:fum\w*|sigarett\w*|svap\w*|vape\w*|smok\w*|regol\w*|regole|sanzion\w*|disciplin\w*|diviet\w*|infrazion\w*|sospension\w*|cellular\w*|telefon\w*|ritard\w*|assenze?|giustific\w*|uscit\w*|entrate?|permess\w*|comportament\w*|condotta|intervall\w*|ricreazion\w*|espulsion\w*)\b/i;
var SCHOOL_PROFILE_TERMS = /\b(?:morsell\w*|sturzo|gela|clis022009|clrh02202e|cltd02201g|cltf02201t|itt|ite|ipseoa|ptof|pago.?pa|offerta formativa|indirizz\w*|percors\w*|pless\w*|sed(?:e|i)|via pitagora|via liszt|romagnoli|contatt\w*|telefon\w*|email|posta elettronica|codice meccanografico|storia dell.?istituto|storia della scuola|dirigen\w*|enogastronom\w*|alberghier\w*|turismo)\b/i;
var STOP_WORDS = /* @__PURE__ */ new Set([
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
	"viene"
]);
var ITALIAN_SUFFIXES = [
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
	"e"
];
var HIGH_SIGNAL_TERMS = /* @__PURE__ */ new Set([
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
	"pagopa"
]);
function isSchoolPolicyQuestion(question) {
	return SCHOOL_POLICY_TERMS.test(question) || SCHOOL_PROFILE_TERMS.test(question);
}
function normalize$1(value) {
	return value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function stem(word) {
	for (const suffix of ITALIAN_SUFFIXES) if (word.endsWith(suffix) && word.length - suffix.length >= 3) return word.slice(0, -suffix.length);
	return word;
}
function keywords(value) {
	return (normalize$1(value).match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => word.length >= 3 && !STOP_WORDS.has(word)).map(stem).filter((word) => word.length >= 3);
}
var schoolDocumentsPromise;
function loadSchoolDocuments() {
	schoolDocumentsPromise ??= Promise.all([import("./morselli-regulation-data-CpETUVKY.js"), import("./morselli-sturzo-research-data-CeoAoa3u.js")]).then(([officialDocument, userResearch]) => [JSON.parse(officialDocument.default), JSON.parse(userResearch.default)]).catch((error) => {
		schoolDocumentsPromise = void 0;
		throw error;
	});
	return schoolDocumentsPromise;
}
function extractExcerpts(page) {
	const blocks = page.text.split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
	const excerpts = [];
	for (let index = 0; index < blocks.length; index += 1) {
		const block = blocks[index];
		if (!block) continue;
		const body = /^ART(?:ICOLO)?\.?\s*\d+/i.test(block) ? blocks[index + 1] : void 0;
		if (body) index += 1;
		excerpts.push({
			page: page.page,
			text: [block, body].filter(Boolean).join("\n").replace(/\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ")
		});
	}
	return excerpts;
}
function retrieveRelevantExcerpts(question, documents) {
	const queryTerms = [...new Set(keywords(question))];
	if (queryTerms.length === 0) return null;
	const ranked = (SCHOOL_PROFILE_TERMS.test(question) && !SCHOOL_POLICY_TERMS.test(question) ? documents.filter((document) => document.sourceKind === "user-provided") : documents).flatMap((document) => document.pages.flatMap((page) => extractExcerpts(page).map((excerpt) => ({
		document,
		excerpt
	})))).map(({ document, excerpt }) => {
		const termCounts = /* @__PURE__ */ new Map();
		for (const term of keywords(excerpt.text)) termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
		return {
			document,
			excerpt,
			score: queryTerms.reduce((total, term) => {
				const count = termCounts.get(term) ?? 0;
				return total + (HIGH_SIGNAL_TERMS.has(term) ? 4 : 1) * Math.min(count, 3);
			}, 0)
		};
	}).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score || Number(left.document.sourceKind === "user-provided") - Number(right.document.sourceKind === "user-provided") || left.excerpt.page - right.excerpt.page).slice(0, 3);
	if (ranked.length === 0) return null;
	const minimumScore = Math.max(1, Math.ceil(ranked[0].score * .5));
	return { excerpts: ranked.filter(({ score }) => score >= minimumScore).map(({ document, excerpt }) => ({
		...excerpt,
		document
	})) };
}
function fallbackAnswer(regulation) {
	return {
		text: "Non trovo un estratto pertinente nelle fonti scolastiche disponibili. Non voglio inventare dati o regole: verifica il sito ufficiale o un documento più recente.",
		sources: [{
			title: regulation.title,
			...regulation.sourceUrl ? { url: regulation.sourceUrl } : {},
			page: null,
			sourceKind: "official"
		}]
	};
}
async function answerSchoolPolicyQuestion(question, mode) {
	const documents = await loadSchoolDocuments();
	const regulation = documents.find((document) => document.sourceKind !== "user-provided");
	const relevant = retrieveRelevantExcerpts(question, documents);
	if (!relevant) return fallbackAnswer(regulation ?? documents[0]);
	const sourcesByKey = /* @__PURE__ */ new Map();
	for (const { document, page } of relevant.excerpts) {
		const sourceKind = document.sourceKind ?? "official";
		const key = `${document.title}:${page}`;
		if (!sourcesByKey.has(key)) sourcesByKey.set(key, {
			title: document.title,
			...document.sourceUrl ? { url: document.sourceUrl } : {},
			page,
			sourceKind
		});
	}
	const sources = [...sourcesByKey.values()];
	const documentText = relevant.excerpts.map(({ document, page, text }) => {
		return `[${document.sourceKind === "user-provided" ? "Ricerca fornita dall’utente; non verificata" : "Fonte ufficiale"}: ${document.title}; pagina ${page}]\n${text}`;
	}).join("\n\n---\n\n");
	if (mode === "local") return {
		text: `${relevant.excerpts.some(({ document }) => document.sourceKind === "user-provided") ? "Ho trovato questi passaggi. La ricerca PDF fornita dall’utente non è un documento ufficiale verificato: controlla le informazioni sul sito della scuola o con la segreteria." : `Ho trovato questi passaggi nel regolamento ufficiale (A.S. ${regulation?.academicYear ?? "2025-2026"}):`}\n\n${relevant.excerpts.map(({ document, page, text }) => {
			return `${document.sourceKind === "user-provided" ? `Ricerca utente non verificata — ${document.title}` : `Regolamento ufficiale — ${document.title}`}, pagina ${page}:\n${text}`;
		}).join("\n\n")}`,
		sources
	};
	return {
		text: await askWithDocument({
			question,
			documentText,
			documentTruncated: false
		}),
		sources
	};
}
//#endregion
//#region src/lib/voto/assistant-suggestions.ts
var SUGGESTIONS = [
	"Qual è la mia media generale?",
	"Quanto devo prendere in Inglese per arrivare a 8?",
	"Quali materie hanno la media più bassa?",
	"Qual è il mio voto più alto?",
	"Qual è l’ultimo voto ricevuto?",
	"Quali compiti scadono domani?",
	"Quali compiti sono già scaduti?",
	"Quali compiti ho ancora da fare?",
	"Quali compiti ho completato?",
	"Che lezioni ho oggi?",
	"Che lezioni ho domani?",
	"Qual è la prossima lezione?",
	"Quali sono le prossime interrogazioni?",
	"Quali interrogazioni ho questa settimana?",
	"Quali verifiche ho in programma?",
	"Cosa devo preparare per la prossima interrogazione?",
	"Quali promemoria ho?",
	"Quali promemoria ho domani?",
	"Quali promemoria non ho ancora letto?",
	"Quali note disciplinari ho?",
	"Quali note recenti ho ricevuto?",
	"Cosa ho fatto oggi nel Diario?",
	"Cosa ho nel Diario domani?",
	"Chi insegna Inglese?",
	"Quali docenti ho?",
	"Quante assenze ho?",
	"Quanti ritardi ho?",
	"Quanto mi manca al limite delle assenze?",
	"Se aggiungo 5 ore di assenza, cosa succede?",
	"Quando finisce la scuola?",
	"Fammi un riepilogo di oggi.",
	"Fammi un riepilogo di domani.",
	"Quali sono le novità?",
	"Cerca algebra nei miei dati.",
	"Cerca una circolare sull’uscita didattica.",
	"Cerca una verifica di matematica.",
	"Cosa dice l’ultima circolare?",
	"Qual è la scadenza indicata nell’ultima circolare?",
	"A chi è rivolta l’ultima circolare?",
	"Quante flashcard ho nella sessione?",
	"Mostrami le flashcard di Inglese.",
	"Cosa devo studiare questa settimana?",
	"Dove trovo il simulatore dei voti?",
	"Che tema sto usando?",
	"Come scelgo il tema Oro?",
	"Dove trovo il tema Diamante?",
	"Quanti minuti di ritardo sono ammessi?",
	"Quando si può andare in bagno?",
	"Come si richiede un’assemblea di classe?",
	"Cosa contiene il regolamento?",
	"Cosa dice il regolamento a pagina 25?",
	"Dove trovo la pagella infraperiodale?",
	"Qual è lo stato della sincronizzazione?"
];
function suggestionKey(value) {
	return value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}
function pickAssistantSuggestions(random = Math.random) {
	const unique = /* @__PURE__ */ new Map();
	for (const suggestion of SUGGESTIONS) unique.set(suggestionKey(suggestion), suggestion);
	const remaining = [...unique.values()];
	const picked = [];
	while (picked.length < 4 && remaining.length > 0) {
		const rawIndex = Math.floor(random() * remaining.length);
		const index = Math.max(0, Math.min(remaining.length - 1, rawIndex));
		picked.push(remaining.splice(index, 1)[0]);
	}
	return picked;
}
//#endregion
//#region src/lib/voto/assistant-theme-actions.ts
var COMPLETE_THEME_OPTIONS = [
	{
		theme: "oro",
		label: "Oro"
	},
	{
		theme: "diamante",
		label: "Diamante"
	},
	{
		theme: "sangue",
		label: "Sangue"
	},
	{
		theme: "tramonto",
		label: "Tramonto"
	},
	{
		theme: "lavender",
		label: "Lavender"
	},
	{
		theme: "cybercore",
		label: "Cybercore"
	},
	{
		theme: "brutalist",
		label: "Brutalist"
	},
	{
		theme: "retro-os",
		label: "Retro OS"
	},
	{
		theme: "windows-98",
		label: "Windows 98"
	},
	{
		theme: "windows-7",
		label: "Windows 7"
	},
	{
		theme: "dark-academia",
		label: "Dark Academia"
	},
	{
		theme: "glassmorphism",
		label: "Glassmorphism"
	},
	{
		theme: "casino",
		label: "Casinò"
	},
	{
		theme: "calcio",
		label: "Calcio"
	},
	{
		theme: "terminale",
		label: "Terminale"
	},
	{
		theme: "pixel-arcade",
		label: "Pixel Arcade"
	},
	{
		theme: "y2k",
		label: "Y2K"
	},
	{
		theme: "primavera",
		label: "Primavera"
	},
	{
		theme: "estate",
		label: "Estate"
	},
	{
		theme: "autunno",
		label: "Autunno"
	},
	{
		theme: "inverno",
		label: "Inverno"
	}
];
var normalize = (value) => value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function getRandomCompleteThemeIntent(query, currentTheme, random = Math.random) {
	const normalized = normalize(query.trim());
	if (!((normalized.includes("tema") || normalized.includes("temi")) && [
		"casuale",
		"casuali",
		"a caso",
		"random"
	].some((term) => normalized.includes(term)))) return null;
	const candidates = COMPLETE_THEME_OPTIONS.filter((option) => option.theme !== currentTheme);
	if (!candidates.length) return null;
	const sample = random();
	const boundedSample = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 1 - Number.EPSILON) : 0;
	const selected = candidates[Math.floor(boundedSample * candidates.length)] ?? candidates[0];
	return {
		kind: "confirm",
		action: {
			theme: selected.theme,
			label: selected.label,
			expectedTheme: currentTheme
		}
	};
}
//#endregion
//#region src/routes/assistente.tsx?tsr-split=component
var MAX_CHAT_ATTACHMENT_BYTES = 15728640;
var MAX_CHAT_ATTACHMENT_TEXT = 12e4;
var AI_MODE_STORAGE_KEY = "voto.circular-assistant-mode.v1";
var ASSISTANT_MESSAGES_KEY = "voto.assistant-messages.v1";
function Assistant() {
	const v = useVoto();
	const study = useStudy();
	const now = useClock();
	const isOnline = useOnlineStatus();
	const [question, setQuestion] = useState("");
	const [assistantMode, setAssistantMode] = useState("local");
	const [apiQuota, setApiQuota] = useState(() => getLastApiQuota());
	const canUseApi = isOnline && (typeof navigator === "undefined" || navigator.onLine);
	const activeAssistantMode = canUseApi && assistantMode === "api" ? "api" : "local";
	const [isReplying, setIsReplying] = useState(false);
	const [isReadingAttachment, setIsReadingAttachment] = useState(false);
	const [attachment, setAttachment] = useState(null);
	const [attachmentError, setAttachmentError] = useState("");
	const fileInputRef = useRef(null);
	const [suggestions, setSuggestions] = useState([]);
	const [messages, setMessages] = useState(() => {
		if (typeof window === "undefined") return [{
			role: "assistant",
			text: "Ciao! Sono l’assistente di VOTO. In Locale consulto i dati scolastici e i documenti sul dispositivo; con API puoi chiedere anche argomenti generali e avere risposte basate sui documenti pertinenti."
		}];
		try {
			const saved = window.localStorage.getItem(ASSISTANT_MESSAGES_KEY);
			const parsed = saved ? JSON.parse(saved) : null;
			if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-20);
		} catch {}
		return [{
			role: "assistant",
			text: "Ciao! Sono l’assistente di VOTO. In Locale consulto i dati scolastici e i documenti sul dispositivo; con API puoi chiedere anche argomenti generali e avere risposte basate sui documenti pertinenti."
		}];
	});
	const [pendingAction, setPendingAction] = useState(null);
	useEffect(() => {
		try {
			window.localStorage.setItem(ASSISTANT_MESSAGES_KEY, JSON.stringify(messages.slice(-20)));
		} catch {}
	}, [messages]);
	useEffect(() => {
		setSuggestions(pickAssistantSuggestions());
		try {
			const savedMode = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
			if (navigator.onLine && savedMode === "api") setAssistantMode("api");
			else if (savedMode === "device" || savedMode === "vision" || savedMode === "api-vision") {
				setAssistantMode("local");
				window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
			}
			window.localStorage.removeItem("voto.circular-ai-models.v1");
		} catch {}
	}, []);
	useEffect(() => {
		if (canUseApi || assistantMode !== "api") return;
		setAssistantMode("local");
		try {
			window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
		} catch {}
	}, [assistantMode, canUseApi]);
	const changeAssistantMode = (mode) => {
		if (mode === "api" && !canUseApi) return;
		setAssistantMode(mode);
		try {
			window.localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
		} catch {}
	};
	const readImageWithOcr = async (file) => {
		const { createWorker } = await import("tesseract.js");
		const worker = await createWorker("ita", 1);
		try {
			return (await worker.recognize(file)).data.text.trim();
		} finally {
			await worker.terminate();
		}
	};
	const readAttachment = async () => {
		if (!attachment || isReadingAttachment) return;
		setIsReadingAttachment(true);
		setAttachmentError("");
		const objectUrl = URL.createObjectURL(attachment.file);
		try {
			let text = "";
			let truncated = false;
			if (attachment.file.type === "application/pdf") {
				const extracted = await extractCircularPdfText(objectUrl);
				text = extracted.text.trim();
				truncated = extracted.truncated;
				if (!text) {
					const visual = await renderCircularPdfPageImages(objectUrl);
					const { createWorker } = await import("tesseract.js");
					const worker = await createWorker("ita", 1);
					try {
						const pages = [];
						for (const page of visual.pages) {
							const result = await worker.recognize(page.dataUrl);
							pages.push(`[Pagina ${page.pageNumber}]\n${result.data.text.trim()}`);
						}
						text = pages.filter(Boolean).join("\n\n");
						truncated = visual.truncated;
					} finally {
						await worker.terminate();
					}
				}
			} else if (attachment.file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
				const extracted = await extractCircularDocxText(objectUrl);
				text = extracted.text.trim();
				truncated = extracted.truncated;
			} else if (attachment.file.type.startsWith("image/")) text = await readImageWithOcr(attachment.file);
			else throw new Error("Formato non supportato. Scegli un’immagine, un PDF o un DOCX.");
			if (!text) throw new Error("Non ho trovato testo leggibile nell’allegato.");
			setAttachment((current) => current ? {
				...current,
				text: text.slice(0, MAX_CHAT_ATTACHMENT_TEXT),
				truncated: truncated || text.length > MAX_CHAT_ATTACHMENT_TEXT
			} : current);
		} catch (error) {
			setAttachmentError(error instanceof Error ? error.message : "Lettura dell’allegato non riuscita.");
		} finally {
			URL.revokeObjectURL(objectUrl);
			setIsReadingAttachment(false);
		}
	};
	const selectAttachment = (file) => {
		if (!file) return;
		setAttachmentError("");
		if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
			setAttachment(null);
			setAttachmentError("L’allegato supera il limite di 15 MB.");
			return;
		}
		if (!(file.type.startsWith("image/") || ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type))) {
			setAttachment(null);
			setAttachmentError("Formato non supportato. Scegli un’immagine, un PDF o un DOCX.");
			return;
		}
		setAttachment({
			file,
			text: ""
		});
	};
	const ask = async (text = question) => {
		const clean = text.trim();
		if (!clean && !attachment?.text || isReplying || isReadingAttachment) return;
		const attachmentText = attachment?.text.trim() ?? "";
		const attachmentLabel = attachment?.file.name;
		const userMessage = attachmentText ? `${clean || "Leggi questo allegato."}\n\n📎 ${attachmentLabel}\n${attachmentText}${attachment?.truncated ? "\n\n[Testo abbreviato]" : ""}` : clean;
		const requestMode = assistantMode === "api" && canUseApi ? "api" : "local";
		const dayToClear = scheduleDayToClear(clean);
		const expectedLessons = dayToClear ? [...loadSchedule()[dayToClear]] : [];
		const assistantData = {
			...v.data,
			student: {
				...v.data.student,
				name: v.displayName || v.data.student.name
			},
			assignments: v.data.assignments.map((item) => ({
				...item,
				completed: v.isDone(item.id, item.completed)
			})),
			notifications: v.data.notifications.map((item) => ({
				...item,
				read: v.isRead(item.id, item.read)
			}))
		};
		const assignmentIntent = getAssignmentActionIntent(clean, assistantData.assignments);
		const randomThemeIntent = getRandomCompleteThemeIntent(clean, v.theme);
		const nextPendingAction = dayToClear ? {
			type: "clear-day",
			day: dayToClear,
			expectedLessons
		} : randomThemeIntent?.kind === "confirm" ? {
			type: "theme",
			action: randomThemeIntent.action
		} : assignmentIntent?.kind === "confirm" ? {
			type: "assignment",
			action: assignmentIntent.action
		} : null;
		const lessonsToClear = expectedLessons.map((lesson, index) => lesson.trim() ? `${index + 1}ª ora: ${lesson.trim()}` : null).filter((lesson) => lesson !== null);
		const previousQuestion = [...messages].reverse().find((message) => message.role === "user")?.text;
		const hasImmediateActionResponse = Boolean(nextPendingAction) || assignmentIntent?.kind === "clarify" || assignmentIntent?.kind === "already";
		const useCircularAssistant = !hasImmediateActionResponse && (isCircularChatQuestion(clean) || isCircularFollowUpQuestion(clean, previousQuestion));
		const useSchoolPolicyAssistant = !hasImmediateActionResponse && !useCircularAssistant && isSchoolPolicyQuestion(clean);
		const useGeneralApi = !hasImmediateActionResponse && !useCircularAssistant && !useSchoolPolicyAssistant && requestMode === "api" && !isAssistantSearchQuery(clean);
		const useAttachmentApi = Boolean(attachmentText) && requestMode === "api";
		const localAnswer = () => answerQuestion(clean, assistantData, loadSchedule(), now, v.interrogazioni, {
			...previousQuestion ? { previousQuestion } : {},
			source: v.source,
			lastSync: v.lastSync,
			syncError: v.error,
			hasRemoteUrl: Boolean(v.url),
			target: v.target,
			theme: v.theme,
			mode: v.mode,
			accent: v.accent,
			background: v.bg,
			density: v.density,
			reduceMotion: v.reduceMotion,
			customFont: v.customTheme.font,
			interfaceScale: v.interfaceScale,
			homeScale: v.homeScale,
			homeModules: v.homeModules,
			flashcards: study.cards,
			schoolEndDate: loadSchoolEndDate(),
			schoolClosures: loadSchoolClosures(),
			absenceHoursPerDay: loadAbsenceHoursPerDay()
		});
		const response = dayToClear ? `Posso cancellare tutte le lezioni dell’orario di ${DAYS.find((day) => day.id === dayToClear)?.label}.${lessonsToClear.length ? ` Lezioni: ${lessonsToClear.join("; ")}.` : " L’orario risulta già vuoto."} Vuoi confermare?` : randomThemeIntent?.kind === "confirm" ? `Ho scelto a caso il tema completo “${randomThemeIntent.action.label}”. Vuoi applicarlo? Cambierà insieme colori, superfici, caratteri e arrotondamenti.` : assignmentIntent?.kind === "confirm" ? `Posso ${assignmentIntent.action.completed ? "segnare come completato" : "riaprire"} il compito “${assignmentIntent.action.title}”${assignmentIntent.action.subject ? ` di ${assignmentIntent.action.subject}` : ""}. Confermi? Non cambierò nulla finché non confermi. La modifica resta locale a VOTO e non aggiorna DidUP.` : assignmentIntent?.kind === "clarify" || assignmentIntent?.kind === "already" ? assignmentIntent.message : useCircularAssistant || useSchoolPolicyAssistant || useGeneralApi ? "" : localAnswer();
		setPendingAction(nextPendingAction);
		setQuestion("");
		setMessages((current) => [...current, {
			role: "user",
			text: userMessage
		}]);
		setAttachment(null);
		if (useAttachmentApi || useCircularAssistant || useSchoolPolicyAssistant || useGeneralApi) {
			setIsReplying(true);
			try {
				let assistantMessage;
				if (useAttachmentApi) assistantMessage = {
					role: "assistant",
					text: await askWithDocument({
						question: clean || "Riassumi il contenuto dell’allegato.",
						documentText: attachmentText,
						documentTruncated: Boolean(attachment?.truncated)
					})
				};
				else if (useCircularAssistant) assistantMessage = {
					role: "assistant",
					text: await answerCircularChatQuestion(clean, assistantData.notifications, requestMode, previousQuestion) ?? "Non ho trovato una circolare pertinente."
				};
				else if (useSchoolPolicyAssistant) {
					const schoolAnswer = await answerSchoolPolicyQuestion(clean, requestMode === "api" ? "api" : "local");
					assistantMessage = {
						role: "assistant",
						text: schoolAnswer.text,
						sources: schoolAnswer.sources
					};
				} else assistantMessage = {
					role: "assistant",
					text: await askGeneralQuestion(clean)
				};
				setMessages((current) => [...current, assistantMessage]);
				setApiQuota(getLastApiQuota());
			} catch (error) {
				const message = error instanceof Error ? error.message : "La risposta non è disponibile.";
				setMessages((current) => [...current, {
					role: "assistant",
					text: message
				}]);
				setApiQuota(getLastApiQuota());
			} finally {
				setIsReplying(false);
			}
			return;
		}
		setMessages((current) => [...current, {
			role: "assistant",
			text: attachmentText ? `Ho estratto il testo da “${attachmentLabel}”.\n\n${attachmentText}${attachment?.truncated ? "\n\n[Testo abbreviato]" : ""}` : response
		}]);
	};
	const confirmPendingAction = () => {
		if (!pendingAction) return;
		let result;
		if (pendingAction.type === "clear-day") {
			const label = DAYS.find((day) => day.id === pendingAction.day)?.label;
			const clearResult = clearScheduleDayIfUnchanged(loadSchedule(), pendingAction.day, pendingAction.expectedLessons);
			result = clearResult === "cleared" ? `Fatto: ho cancellato tutte le lezioni dell’orario di ${label}.` : clearResult === "empty" ? `L’orario di ${label} è già vuoto. Non ho modificato nulla.` : `L’orario di ${label} è cambiato mentre aspettavi. Non ho cancellato nulla; controllalo e chiedimi di nuovo se vuoi svuotarlo.`;
		} else if (pendingAction.type === "theme") if (v.theme !== pendingAction.action.expectedTheme) result = "Il tema è cambiato mentre aspettavi; non ho applicato quello sorteggiato. Se vuoi, chiedimi di nuovo un tema casuale.";
		else {
			v.setTheme(pendingAction.action.theme);
			result = `Fatto: ho applicato il tema completo “${pendingAction.action.label}”. Puoi cambiarlo in qualsiasi momento da Personalizza > Tema completo.`;
		}
		else {
			const assignment = v.data.assignments.find((item) => item.id === pendingAction.action.id);
			if (!assignment) result = "Non trovo più quel compito nei dati caricati: non ho apportato modifiche.";
			else if (v.isDone(assignment.id, assignment.completed) === pendingAction.action.completed) result = `“${assignment.title}” è già nello stato richiesto; non ho apportato altre modifiche.`;
			else {
				v.toggleDone(assignment.id, assignment.completed);
				result = pendingAction.action.completed ? `Fatto: “${assignment.title}” è stato segnato come completato solo in VOTO. DidUP non è stato modificato.` : `Fatto: “${assignment.title}” è stato riaperto solo in VOTO. DidUP non è stato modificato.`;
			}
		}
		setMessages((current) => [...current, {
			role: "assistant",
			text: result
		}]);
		setPendingAction(null);
	};
	const cancelPendingAction = () => {
		setPendingAction(null);
		setMessages((current) => [...current, {
			role: "assistant",
			text: "Azione annullata. Non ho modificato nulla."
		}]);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Assistente"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Locale consulta i dati dell’app; API risponde a domande generali usando i documenti pertinenti."
				})] }), /* @__PURE__ */ jsx("span", {
					className: "flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(Bot, { className: "h-5 w-5" })
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface mt-5 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 text-xs font-semibold",
							children: [/* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-primary" }), activeAssistantMode === "local" ? "Modalità Locale" : "Modalità API Groq (Qwen)"]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex rounded-xl border border-border p-1",
							role: "group",
							"aria-label": "Modalità assistente",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-pressed": activeAssistantMode === "local",
								disabled: isReplying,
								onClick: () => changeAssistantMode("local"),
								className: `rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${activeAssistantMode === "local" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`,
								children: "Locale"
							}), canUseApi && /* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-pressed": activeAssistantMode === "api",
								disabled: isReplying,
								onClick: () => changeAssistantMode("api"),
								className: `rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${activeAssistantMode === "api" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`,
								children: "API"
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-1 text-[11px] text-muted-foreground",
						children: [
							activeAssistantMode === "local" ? "Locale consulta sul dispositivo il regolamento ufficiale Morselli-Sturzo e la ricerca PDF fornita dall’utente (non verificata). Domande, circolari e dati scolastici non vengono inviati a Groq." : "API invia a Groq la domanda e gli estratti pertinenti dei documenti. Non invia automaticamente dati scolastici o cronologia; i dati personali scritti nella domanda vengono inviati. Per zero spese, scegli Locale o AI telefono.",
							" ",
							!canUseApi && /* @__PURE__ */ jsx("span", {
								className: "font-medium text-primary",
								children: "Offline: API non disponibile; è disponibile Locale."
							}),
							"Verifica sempre eventuali aggiornamenti ufficiali della scuola."
						]
					}),
					activeAssistantMode === "api" && apiQuota && /* @__PURE__ */ jsxs("div", {
						className: "mt-3 rounded-lg border border-border bg-surface/60 px-3 py-2 text-[11px] text-muted-foreground",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex flex-wrap items-center gap-x-4 gap-y-1",
							children: [
								/* @__PURE__ */ jsx("strong", {
									className: "text-foreground",
									children: "Ultima quota Groq ricevuta"
								}),
								/* @__PURE__ */ jsxs("span", { children: [
									"Richieste: ",
									apiQuota.remainingRequests ?? "non disponibile",
									apiQuota.limitRequests !== void 0 ? ` / ${apiQuota.limitRequests}` : ""
								] }),
								/* @__PURE__ */ jsxs("span", { children: [
									"Token: ",
									apiQuota.remainingTokens ?? "non disponibile",
									apiQuota.limitTokens !== void 0 ? ` / ${apiQuota.limitTokens}` : ""
								] })
							]
						}), /* @__PURE__ */ jsxs("p", {
							className: "mt-1",
							children: [
								"Osservata ",
								new Date(apiQuota.observedAt).toLocaleString("it-IT"),
								". È una fotografia dell’ultima chiamata API, non un contatore locale garantito.",
								apiQuota.resetRequests ? ` Reset richieste: ${apiQuota.resetRequests}.` : ""
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-5 space-y-3",
				children: messages.map((message, index) => /* @__PURE__ */ jsxs("div", {
					className: `flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`,
					children: [
						message.role === "assistant" && /* @__PURE__ */ jsx("span", {
							className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary",
							children: /* @__PURE__ */ jsx(Bot, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: `max-w-[86%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-foreground"}`,
							children: [message.role === "assistant" ? /* @__PURE__ */ jsx(AssistantMarkdown, { text: message.text }) : message.text, message.sources?.map((source) => {
								const key = `${source.sourceKind}-${source.title}-${source.page ?? "document"}`;
								const sourceText = `${source.sourceKind === "user-provided" ? "Ricerca fornita dall’utente, non verificata" : "Fonte ufficiale"}: ${source.title}${source.page ? ` · pagina ${source.page}` : ""}`;
								const className = "mt-2 block border-t border-border pt-2 text-xs text-primary underline underline-offset-2";
								return source.url ? /* @__PURE__ */ jsx("a", {
									href: `${source.url}${source.page ? `#page=${source.page}` : ""}`,
									target: "_blank",
									rel: "noreferrer",
									className,
									children: sourceText
								}, key) : /* @__PURE__ */ jsx("p", {
									className: `${className} no-underline`,
									children: sourceText
								}, key);
							})]
						}),
						message.role === "user" && /* @__PURE__ */ jsx("span", {
							className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground",
							children: /* @__PURE__ */ jsx(UserRound, { className: "h-4 w-4" })
						})
					]
				}, `${message.role}-${index}`))
			}),
			isReplying && /* @__PURE__ */ jsxs("p", {
				role: "status",
				className: "mt-3 flex items-center gap-2 text-xs text-muted-foreground",
				children: [/* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }), activeAssistantMode === "api" ? "Preparo la risposta API con la domanda e le fonti pertinenti…" : "Cerco nei documenti sul dispositivo…"]
			}),
			pendingAction && /* @__PURE__ */ jsxs("div", {
				className: "mt-3 flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "flex-1",
						children: pendingAction.type === "clear-day" ? /* @__PURE__ */ jsxs(Fragment, { children: [
							"Confermi la cancellazione dell’orario di",
							" ",
							/* @__PURE__ */ jsx("strong", { children: DAYS.find((day) => day.id === pendingAction.day)?.label }),
							"?",
							pendingAction.expectedLessons.some((lesson) => lesson.trim()) ? /* @__PURE__ */ jsxs("span", {
								className: "mt-1 block",
								children: [
									"Lezioni selezionate:",
									" ",
									pendingAction.expectedLessons.map((lesson, index) => lesson.trim() ? `${index + 1}ª ora: ${lesson.trim()}` : null).filter((lesson) => lesson !== null).join("; ")
								]
							}) : /* @__PURE__ */ jsx("span", {
								className: "mt-1 block",
								children: "Il giorno risulta già vuoto."
							})
						] }) : pendingAction.type === "theme" ? /* @__PURE__ */ jsxs(Fragment, { children: [
							"Ho scelto il tema completo ",
							/* @__PURE__ */ jsxs("strong", { children: [
								"“",
								pendingAction.action.label,
								"”"
							] }),
							". Vuoi applicarlo? Palette, superfici, caratteri e arrotondamenti cambieranno insieme."
						] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
							"Confermi di",
							" ",
							pendingAction.action.completed ? "segnare come completato" : "riaprire",
							" ",
							/* @__PURE__ */ jsxs("strong", { children: [
								"“",
								pendingAction.action.title,
								"”"
							] }),
							pendingAction.action.subject ? ` · ${pendingAction.action.subject}` : "",
							"?",
							pendingAction.action.dueDate ? ` Scadenza: ${pendingAction.action.dueDate.slice(8, 10)}/${pendingAction.action.dueDate.slice(5, 7)}.` : ""
						] })
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: confirmPendingAction,
						className: `press rounded-lg px-3 py-2 font-semibold ${pendingAction.type === "clear-day" ? "bg-danger text-white" : "bg-primary text-primary-foreground"}`,
						children: pendingAction.type === "clear-day" ? "Cancella" : pendingAction.type === "theme" ? "Applica tema" : pendingAction.action.completed ? "Segna completato" : "Riapri"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: cancelPendingAction,
						className: "press rounded-lg border border-border px-3 py-2 font-semibold",
						children: "Annulla"
					})
				]
			}),
			attachment && /* @__PURE__ */ jsxs("div", {
				className: "mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs",
				children: [
					/* @__PURE__ */ jsx(FileText, { className: "h-4 w-4 shrink-0 text-primary" }),
					/* @__PURE__ */ jsxs("span", {
						className: "min-w-0 flex-1 truncate",
						title: attachment.file.name,
						children: [attachment.file.name, attachment.text ? " · testo pronto" : " · premi OCR per leggerlo"]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: readAttachment,
						disabled: isReadingAttachment,
						className: "press inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-soft px-2 py-1.5 font-semibold text-primary disabled:opacity-50",
						"aria-label": "Tessera allegato",
						title: "Tessera allegato",
						children: [isReadingAttachment ? /* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(ScanText, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
							className: "hidden sm:inline",
							children: "OCR"
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setAttachment(null),
						className: "press rounded-lg p-1.5 text-muted-foreground hover:bg-background",
						"aria-label": "Rimuovi allegato",
						title: "Rimuovi allegato",
						children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
					})
				]
			}),
			attachmentError && /* @__PURE__ */ jsx("p", {
				role: "alert",
				className: "mt-2 text-xs text-danger",
				children: attachmentError
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-5 flex flex-wrap gap-2",
				children: suggestions.slice(0, 2).map((suggestion) => /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => ask(suggestion),
					disabled: isReplying,
					className: "press rounded-full border border-border px-3 py-2 text-left text-[11px] text-muted-foreground disabled:opacity-50",
					children: suggestion
				}, suggestion))
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: (event) => {
					event.preventDefault();
					ask();
				},
				className: "sticky bottom-20 mt-5 flex gap-2 rounded-2xl border border-border bg-background/95 p-2 backdrop-blur md:bottom-8",
				children: [
					/* @__PURE__ */ jsx("input", {
						ref: fileInputRef,
						type: "file",
						accept: "image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
						className: "hidden",
						"aria-label": "Allega file alla chat",
						onChange: (event) => {
							selectAttachment(event.target.files?.[0]);
							event.currentTarget.value = "";
						}
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => fileInputRef.current?.click(),
						disabled: isReplying || isReadingAttachment,
						className: "press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-40",
						"aria-label": "Allega file alla chat",
						title: "Allega file alla chat",
						children: /* @__PURE__ */ jsx(Paperclip, { className: "h-4 w-4" })
					}),
					/* @__PURE__ */ jsx("input", {
						value: question,
						onChange: (event) => setQuestion(event.target.value),
						placeholder: "Chiedi sui tuoi dati o sulle circolari…",
						"aria-label": "Domanda all'assistente",
						className: "min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						disabled: !question.trim() && !attachment?.text || isReplying || isReadingAttachment,
						className: "press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40",
						"aria-label": "Invia domanda",
						children: /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" })
					})
				]
			})
		]
	});
}
//#endregion
export { Assistant as component };
