import { a as supabasePublishableKey, i as supabaseProjectUrl, r as supabase, t as PRIVATE_SCHOOL_DATA_URL } from "./supabase-auth-BEdIbH2_.js";
import { n as load, r as save, t as KEYS } from "./storage-D7ptFFhi.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { jsx } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/lib/voto/circulars.ts
async function checkResponse(response) {
	try {
		return await response.json();
	} catch {
		throw new Error("Risposta non valida dal servizio di controllo.");
	}
}
async function checkRequestHeaders() {
	const key = supabasePublishableKey();
	const { data } = await supabase.auth.getSession();
	return {
		apikey: key,
		Authorization: `Bearer ${data.session?.access_token ?? key}`,
		"Content-Type": "application/json"
	};
}
var CIRCULAR_CHECK_ENDPOINT = `${supabaseProjectUrl()}/functions/v1/request-circular-check`;
async function requestCircularCheck() {
	let response;
	try {
		response = await fetch(CIRCULAR_CHECK_ENDPOINT, {
			method: "POST",
			headers: await checkRequestHeaders(),
			body: "{}"
		});
	} catch {
		throw new Error("Impossibile raggiungere il servizio di controllo.");
	}
	const body = await checkResponse(response);
	if (typeof body.requestedAt === "string" && body.ok !== false) return body.requestedAt;
	if (typeof body.error === "string") {
		if (typeof body.retryAfterSeconds === "number") {
			const minutes = Math.max(1, Math.ceil(body.retryAfterSeconds / 60));
			throw new Error(`Il registro è stato controllato di recente. Riprova tra circa ${minutes} min.`);
		}
		throw new Error(body.error);
	}
	throw new Error("Non è stato possibile avviare il controllo.");
}
async function getCircularCheckStatus(after) {
	const url = new URL(CIRCULAR_CHECK_ENDPOINT);
	url.searchParams.set("after", after);
	let response;
	try {
		response = await fetch(url, {
			headers: await checkRequestHeaders(),
			cache: "no-store"
		});
	} catch {
		throw new Error("Impossibile leggere lo stato del controllo.");
	}
	const body = await checkResponse(response);
	if (typeof body.error === "string") throw new Error(body.error);
	if (!response.ok || typeof body.status !== "string") throw new Error("Stato del controllo non disponibile.");
	return {
		status: body.status,
		conclusion: typeof body.conclusion === "string" ? body.conclusion : null
	};
}
//#endregion
//#region src/lib/voto/parse.ts
var SchemaError = class extends Error {};
var isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var str = (v) => typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : void 0;
/** Converte voti come 7, "7,5", "7+", "7-", "7½", "6/7" in numero. Restituisce null se non numerico. */
function parseGradeValue(v) {
	if (typeof v === "number") return Number.isFinite(v) && v >= 0 && v <= 10 ? v : null;
	if (typeof v !== "string") return null;
	let s = v.trim().replace(",", ".").replace("½", ".5");
	let delta = 0;
	if (/^\d+(\.\d+)?\s*\+$/.test(s)) {
		delta = .15;
		s = s.replace("+", "");
	} else if (/^\d+(\.\d+)?\s*-$/.test(s)) {
		delta = -.15;
		s = s.replace("-", "");
	}
	const range = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
	const n = range ? (parseFloat(range[1] ?? "0") + parseFloat(range[2] ?? "0")) / 2 : Number(s);
	if (!Number.isFinite(n)) return null;
	const r = n + delta;
	return r >= 0 && r <= 10 ? r : null;
}
var ITALIAN_GRADE_WORDS = [
	"zero",
	"uno",
	"due",
	"tre",
	"quattro",
	"cinque",
	"sei",
	"sette",
	"otto",
	"nove",
	"dieci"
];
function normalizedGradeText(value) {
	return value.trim().toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").replace(/[.,!?;:]+$/g, "");
}
function gradeCommentOrUndefined(comment, label, value) {
	if (!comment?.trim()) return void 0;
	const normalizedComment = normalizedGradeText(comment);
	const numericLabel = label.trim().match(/^(\d+)\s*[+-]?$/);
	const spokenGrade = Number.isInteger(value) ? ITALIAN_GRADE_WORDS[value] : numericLabel ? ITALIAN_GRADE_WORDS[Number(numericLabel[1])] : ITALIAN_GRADE_WORDS[Math.floor(value)];
	return [
		normalizedGradeText(label),
		normalizedGradeText(String(value)),
		normalizedGradeText(new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(value)),
		spokenGrade,
		...value % 1 === .5 && spokenGrade ? [`${spokenGrade} e mezzo`, `${spokenGrade} mezzo`] : [],
		...numericLabel?.[1] ? [normalizedGradeText(numericLabel[1])] : []
	].filter((form) => Boolean(form)).includes(normalizedComment) ? void 0 : comment.trim();
}
/** Corregge i valori numerici in cache usando il voto originale quando include + o -. */
function normalizeCachedGradeValues(data) {
	let changed = false;
	const subjects = data.subjects.map((subject) => {
		const grades = subject.grades.map((grade) => {
			const parsedLabel = parseGradeValue(grade.label);
			const value = /[+-]\s*$/.test(grade.label) && parsedLabel !== null ? parsedLabel : grade.value;
			const comment = gradeCommentOrUndefined(grade.comment, grade.label, value);
			if (value === grade.value && comment === grade.comment) return grade;
			changed = true;
			return {
				...grade,
				value,
				comment
			};
		});
		return grades.some((grade, index) => grade !== subject.grades[index]) ? {
			...subject,
			grades
		} : subject;
	});
	return changed ? {
		...data,
		subjects
	} : data;
}
var isSignedGradeLabel = (value) => typeof value === "string" && /^\d+(?:[.,]\d+)?\s*[+-]$/.test(value.trim());
var gradeType = (v) => {
	const s = String(v ?? "").toLowerCase();
	if (s.startsWith("or")) return "orale";
	if (s.startsWith("scr")) return "scritto";
	if (s.startsWith("pra") || s.startsWith("lab")) return "pratico";
	return "altro";
};
var notifType = (v) => {
	const s = String(v ?? "").toLowerCase();
	if (s === "grade" || s === "voto") return "grade";
	if (s === "reminder" || s === "promemoria") return "reminder";
	if ([
		"notice",
		"avviso",
		"comunicazione",
		"comunicazioni",
		"communication",
		"communications",
		"circolare",
		"circolari"
	].includes(s)) return "notice";
	return "note";
};
var attendanceEventType = (v) => {
	const s = String(v ?? "").toLowerCase();
	if (s === "a" || s === "absence" || s === "assenza") return "absence";
	if (s === "i" || s === "delay" || s === "ritardo") return "delay";
	if (s === "u" || s === "earlyexit" || s === "early-exit" || s === "uscita") return "earlyExit";
};
function parseCircularAttachment(raw) {
	if (typeof raw === "string") {
		const value = raw.trim();
		if (!value) return void 0;
		const isInternalPath = /^circulars\/[a-f0-9]{64}\.(pdf|docx)$/.test(value);
		const name = isInternalPath ? value.split("/").at(-1) : value.split(/[/?#]/).filter(Boolean).at(-1);
		return {
			...name ? { name } : {},
			...isInternalPath ? { path: value } : {}
		};
	}
	if (!isObj(raw)) return void 0;
	const rawPath = str(raw["path"] ?? raw["attachmentPath"]);
	const rawUrl = str(raw["url"] ?? raw["attachmentUrl"]);
	const path = rawPath && /^\/?circulars\/[a-f0-9]{64}\.(pdf|docx)$/i.test(rawPath) ? rawPath.replace(/^\/+/, "") : void 0;
	const url = rawUrl ?? (rawPath && /^https?:\/\//i.test(rawPath) ? rawPath : void 0);
	const name = str(raw["name"] ?? raw["fileName"] ?? raw["filename"] ?? raw["attachmentName"] ?? raw["nome"]);
	const tableCount = typeof raw["tableCount"] === "number" && raw["tableCount"] > 0 ? Math.floor(raw["tableCount"]) : void 0;
	const extractionMethod = [
		"pdf-text",
		"ocr",
		"docx",
		"text",
		"unavailable"
	].includes(String(raw["extractionMethod"] ?? "")) ? String(raw["extractionMethod"]) : void 0;
	const extractionQuality = [
		"high",
		"medium",
		"low"
	].includes(String(raw["extractionQuality"] ?? "")) ? String(raw["extractionQuality"]) : void 0;
	if (!path && !url && !name) return void 0;
	return {
		...name ? { name } : {},
		...path ? { path } : {},
		...url ? { url } : {},
		...raw["hasTables"] === true || tableCount ? { hasTables: true } : {},
		...tableCount ? { tableCount } : {},
		...extractionMethod ? { extractionMethod } : {},
		...extractionQuality ? { extractionQuality } : {}
	};
}
var slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
function parseVotoData(raw) {
	if (!isObj(raw)) throw new SchemaError("I dati Supabase ricevuti non hanno un formato valido.");
	if (!Array.isArray(raw["subjects"])) throw new SchemaError("Campo \"subjects\" mancante o non è un array.");
	for (const key of [
		"assignments",
		"notifications",
		"diary",
		"attendanceEvents"
	]) {
		const value = raw[key];
		if (value != null && !Array.isArray(value)) throw new SchemaError(`Campo "${key}" ricevuto in un formato non valido.`);
	}
	if (raw["student"] != null && !isObj(raw["student"])) throw new SchemaError("Campo \"student\" ricevuto in un formato non valido.");
	if (raw["attendance"] != null && !isObj(raw["attendance"])) throw new SchemaError("Campo \"attendance\" ricevuto in un formato non valido.");
	const subjects = raw["subjects"].map((sub, i) => {
		if (!isObj(sub)) throw new SchemaError(`subjects[${i}] non è un oggetto.`);
		const name = str(sub["name"]);
		if (!name) throw new SchemaError(`subjects[${i}] non ha un "name".`);
		const rawGrades = sub["grades"];
		if (rawGrades != null && !Array.isArray(rawGrades)) throw new SchemaError(`subjects[${i}].grades non è un array.`);
		const grades = [];
		(Array.isArray(rawGrades) ? rawGrades : []).forEach((gr, j) => {
			if (!isObj(gr)) return;
			const label = str(gr["label"]);
			const value = parseGradeValue(isSignedGradeLabel(label) ? label : gr["value"]);
			if (value === null) return;
			const w = typeof gr["weight"] === "number" && gr["weight"] > 0 ? gr["weight"] : parseFloat(String(gr["weight"] ?? "").replace(",", "."));
			const gradeLabel = label ?? str(gr["value"]) ?? String(value);
			grades.push({
				id: str(gr["id"]) ?? `${slug(name)}-${j}`,
				value,
				label: gradeLabel,
				date: str(gr["date"]) ?? "",
				type: gradeType(gr["type"]),
				weight: Number.isFinite(w) && w > 0 ? w : 1,
				comment: gradeCommentOrUndefined(str(gr["comment"]), gradeLabel, value),
				teacher: str(gr["teacher"]) ?? str(gr["docente"]) ?? str(gr["prof"])
			});
		});
		return {
			id: str(sub["id"]) ?? slug(name),
			name,
			color: str(sub["color"]),
			teacher: str(sub["teacher"]) ?? str(sub["docente"]) ?? str(sub["prof"]),
			grades
		};
	});
	const assignments = (Array.isArray(raw["assignments"]) ? raw["assignments"] : []).filter(isObj).map((a, i) => ({
		id: str(a["id"]) ?? `a-${i}`,
		title: str(a["title"]) ?? "Compito",
		subject: str(a["subject"]),
		dueDate: str(a["dueDate"]),
		dueTime: str(a["dueTime"]),
		assignedDate: str(a["assignedDate"]) ?? str(a["assignmentDate"]),
		completed: a["completed"] === true,
		details: str(a["details"]) ?? str(a["description"]),
		teacher: str(a["teacher"]) ?? str(a["docente"]) ?? str(a["prof"])
	}));
	const notifications = (Array.isArray(raw["notifications"]) ? raw["notifications"] : []).filter(isObj).map((n, i) => {
		const rawAttachments = n["attachments"] ?? n["allegati"] ?? n["attachmentPaths"];
		const attachments = Array.isArray(rawAttachments) ? rawAttachments.map(parseCircularAttachment).filter((item) => item !== void 0) : void 0;
		const legacyPath = str(n["attachmentPath"]);
		const legacyInternalPath = legacyPath && /^\/?circulars\/[a-f0-9]{64}\.(pdf|docx)$/i.test(legacyPath) ? legacyPath.replace(/^\/+/, "") : void 0;
		const legacyUrl = str(n["attachmentUrl"]) ?? (legacyPath && /^https?:\/\//i.test(legacyPath) ? legacyPath : void 0);
		return {
			id: str(n["id"]) ?? `n-${i}`,
			type: notifType(n["type"]),
			title: str(n["title"]) ?? "Avviso",
			message: str(n["message"]) ?? str(n["description"]) ?? str(n["details"]),
			date: str(n["date"]),
			subject: str(n["subject"]),
			teacher: str(n["teacher"]) ?? str(n["docente"]) ?? str(n["prof"]),
			attachmentPath: legacyInternalPath,
			attachmentUrl: legacyUrl,
			attachmentName: str(n["attachmentName"]),
			...attachments?.length ? { attachments } : {},
			extractedText: str(n["extractedText"]),
			hasTables: n["hasTables"] === true,
			tableCount: typeof n["tableCount"] === "number" && n["tableCount"] > 0 ? Math.floor(n["tableCount"]) : void 0,
			extractionMethod: [
				"pdf-text",
				"ocr",
				"docx",
				"text",
				"unavailable"
			].includes(String(n["extractionMethod"] ?? "")) ? String(n["extractionMethod"]) : void 0,
			extractionQuality: [
				"high",
				"medium",
				"low"
			].includes(String(n["extractionQuality"] ?? "")) ? String(n["extractionQuality"]) : void 0,
			read: n["read"] === true
		};
	});
	const diary = (Array.isArray(raw["diary"]) ? raw["diary"] : []).filter(isObj).map((entry, i) => ({
		id: str(entry["id"]) ?? `diary-${i}`,
		date: str(entry["date"]) ?? "",
		subject: str(entry["subject"]),
		teacher: str(entry["teacher"]),
		hour: str(entry["hour"]),
		activity: str(entry["activity"]) ?? "Attività non specificata"
	})).filter((entry) => entry.date || entry.activity);
	const attendanceEvents = (Array.isArray(raw["attendanceEvents"]) ? raw["attendanceEvents"] : []).filter(isObj).flatMap((event, i) => {
		const type = attendanceEventType(event["type"]);
		const date = str(event["date"]);
		if (!type || !date) return [];
		const justificationStatus = str(event["justificationStatus"]);
		return [{
			id: str(event["id"]) ?? `appello-${i}`,
			type,
			date: date.slice(0, 10),
			...justificationStatus ? { justificationStatus } : {}
		}];
	});
	const st = isObj(raw["student"]) ? raw["student"] : {};
	const prev = typeof raw["previousAverage"] === "number" && Number.isFinite(raw["previousAverage"]) ? raw["previousAverage"] : void 0;
	const attendanceRaw = isObj(raw["attendance"]) ? raw["attendance"] : {};
	const attendance = {
		absenceDays: typeof attendanceRaw["absenceDays"] === "number" ? attendanceRaw["absenceDays"] : 0,
		absenceHours: typeof attendanceRaw["absenceHours"] === "number" ? attendanceRaw["absenceHours"] : 0,
		delays: typeof attendanceRaw["delays"] === "number" ? attendanceRaw["delays"] : 0,
		earlyExits: typeof attendanceRaw["earlyExits"] === "number" ? attendanceRaw["earlyExits"] : 0,
		annualHours: typeof attendanceRaw["annualHours"] === "number" ? attendanceRaw["annualHours"] : 990,
		absenceLimitHours: typeof attendanceRaw["absenceLimitHours"] === "number" ? attendanceRaw["absenceLimitHours"] : 264
	};
	return {
		student: {
			name: str(st["name"]),
			className: str(st["className"]),
			schoolYear: str(st["schoolYear"])
		},
		updatedAt: str(raw["updatedAt"]),
		previousAverage: prev,
		subjects,
		assignments,
		notifications,
		diary,
		attendance,
		attendanceEvents
	};
}
function gradeCount(data) {
	return data.subjects.reduce((count, subject) => count + subject.grades.length, 0);
}
function validateSnapshotContinuity(previous, next, raw) {
	if (Boolean(previous.student.schoolYear) && Boolean(next.student.schoolYear) && previous.student.schoolYear !== next.student.schoolYear) return;
	const payload = isObj(raw) ? raw : {};
	for (const [key, label] of [
		["assignments", "compiti"],
		["notifications", "avvisi"],
		["diary", "diario"],
		["attendanceEvents", "assenze e ritardi"]
	]) {
		const previousSection = previous[key];
		if (previousSection && previousSection.length > 0 && !Array.isArray(payload[key])) throw new SchemaError(`La risposta del registro è incompleta: manca la sezione ${label}. Mantengo gli ultimi dati validi.`);
	}
	const previousAttendance = previous.attendance;
	if ((previousAttendance.absenceDays > 0 || previousAttendance.absenceHours > 0 || previousAttendance.delays > 0 || previousAttendance.earlyExits > 0) && !isObj(payload["attendance"])) throw new SchemaError("La risposta del registro è incompleta: manca la sezione presenze. Mantengo gli ultimi dati validi.");
	if (previous.subjects.length > 0 && next.subjects.length === 0) throw new SchemaError("La risposta del registro non contiene materie; mantengo gli ultimi dati validi.");
	if (gradeCount(previous) >= 3 && gradeCount(next) === 0) throw new SchemaError("La risposta del registro non contiene più i voti già salvati; mantengo gli ultimi dati validi.");
	if (previous.student.name && !next.student.name) throw new SchemaError("La risposta del registro è incompleta: manca il nome dello studente. Mantengo gli ultimi dati validi.");
}
function validateUrl(url) {
	try {
		if (new URL(url).protocol !== "https:") return "L'URL deve iniziare con https://";
		return null;
	} catch {
		return "URL non valido.";
	}
}
async function fetchVotoData(url, timeoutMs = 1e4, previousData) {
	const privateSource = url === PRIVATE_SCHOOL_DATA_URL;
	const err = privateSource ? null : validateUrl(url);
	if (err) throw new SchemaError(err);
	let accessToken;
	if (privateSource) {
		const { data } = await supabase.auth.getSession();
		if (!data.session) throw new Error("PRIVATE_DATA_UNAUTHENTICATED: Accedi per aggiornare i dati.");
		accessToken = data.session.access_token;
	}
	const request = async (token) => {
		const ctrl = new AbortController();
		const t = setTimeout(() => ctrl.abort(), timeoutMs);
		const sep = url.includes("?") ? "&" : "?";
		try {
			return await fetch(`${url}${sep}_t=${Date.now()}`, {
				cache: "no-store",
				signal: ctrl.signal,
				...token ? { headers: {
					apikey: supabasePublishableKey(),
					Authorization: `Bearer ${token}`
				} } : {}
			});
		} catch (e) {
			if (e.name === "AbortError") throw new Error("Tempo scaduto: il server non risponde.");
			throw new Error(typeof navigator !== "undefined" && !navigator.onLine ? "Sei offline. Mostro gli ultimi dati salvati." : "Impossibile raggiungere l'URL (rete o CORS).");
		} finally {
			clearTimeout(t);
		}
	};
	let res = await request(accessToken);
	if (privateSource && res.status === 401) {
		const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
		if (!refreshError && refreshed.session) res = await request(refreshed.session.access_token);
		else {
			await new Promise((resolve) => setTimeout(resolve, 500));
			const { data: latest } = await supabase.auth.getSession();
			if (latest.session) res = await request(latest.session.access_token);
		}
		if (res.status === 401) throw new Error("PRIVATE_DATA_UNAUTHENTICATED: La sessione è scaduta; accedi di nuovo.");
	}
	if (privateSource && res.status === 403) throw new Error("PRIVATE_DATA_FORBIDDEN: Questo account non è autorizzato al registro.");
	if (privateSource && res.status === 503) throw new Error("I dati privati non sono ancora disponibili; riprova tra poco.");
	if (!res.ok) throw new Error(res.status === 404 ? "Dati Supabase non trovati (404). Verifica che il servizio sia disponibile." : `Errore del server (${res.status}).`);
	let json;
	try {
		json = await res.json();
	} catch {
		throw new SchemaError("La risposta di Supabase non contiene dati validi.");
	}
	const parsed = parseVotoData(json);
	if (privateSource && parsed.subjects.length === 0) throw new SchemaError("La risposta del registro non contiene materie; mantengo gli ultimi dati validi.");
	if (previousData) validateSnapshotContinuity(previousData, parsed, json);
	return parsed;
}
//#endregion
//#region src/lib/voto/demo.ts
function canResetDemoData(source, url) {
	return source === "demo" && url.trim().length === 0;
}
var iso = (offset) => {
	const d = /* @__PURE__ */ new Date();
	d.setDate(d.getDate() + offset);
	const p = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/** Dati DEMO generati relativamente alla data odierna. Chiamare solo lato client. */
function makeDemoRaw() {
	return {
		student: {
			name: "Studente Demo",
			className: "4B",
			schoolYear: "2026/2027"
		},
		updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		previousAverage: 7.21,
		subjects: [
			{
				id: "matematica",
				name: "Matematica",
				color: "#E85D5D",
				teacher: "Prof.ssa Rossi",
				grades: [
					{
						id: "m1",
						value: 6.5,
						date: iso(-34),
						type: "scritto",
						weight: 1,
						comment: "Disequazioni"
					},
					{
						id: "m2",
						value: 7,
						date: iso(-20),
						type: "orale",
						weight: .5,
						comment: "Interrogazione funzioni"
					},
					{
						id: "m3",
						value: "7+",
						date: iso(-5),
						type: "scritto",
						weight: 1,
						comment: "Equazioni esponenziali"
					}
				]
			},
			{
				id: "italiano",
				name: "Italiano",
				color: "#D9A441",
				teacher: "Prof. Gallo",
				grades: [{
					id: "i1",
					value: 7.5,
					date: iso(-30),
					type: "scritto",
					weight: 1,
					comment: "Tema argomentativo"
				}, {
					id: "i2",
					value: 8,
					date: iso(-12),
					type: "orale",
					weight: 1,
					comment: "Dante, Inferno XXVI"
				}]
			},
			{
				id: "inglese",
				name: "Inglese",
				color: "#5DA9E8",
				teacher: "Prof. Bianchi",
				grades: [
					{
						id: "e1",
						value: 8.5,
						date: iso(-26),
						type: "orale",
						weight: 1,
						comment: "Speaking: travel"
					},
					{
						id: "e2",
						value: 7.75,
						date: iso(-9),
						type: "scritto",
						weight: 1,
						comment: "Grammar and reading comprehension"
					},
					{
						id: "e3",
						value: 9,
						date: iso(-2),
						type: "orale",
						weight: .5,
						comment: "Speaking: future plans"
					}
				]
			},
			{
				id: "fisica",
				name: "Fisica",
				color: "#8FC27A",
				teacher: "Prof. Verdi",
				grades: [{
					id: "f1",
					value: 5.5,
					date: iso(-28),
					type: "scritto",
					weight: 1,
					comment: "Cinematica"
				}, {
					id: "f2",
					value: 6.5,
					date: iso(-7),
					type: "pratico",
					weight: .5,
					comment: "Relazione di laboratorio"
				}]
			},
			{
				id: "storia",
				name: "Storia",
				color: "#B48AD9",
				teacher: "Prof.ssa Neri",
				grades: [{
					id: "s1",
					value: 7,
					date: iso(-18),
					type: "orale",
					weight: 1,
					comment: "Rivoluzione francese"
				}]
			},
			{
				id: "scienze",
				name: "Scienze",
				color: "#4FC1A6",
				teacher: "Prof.ssa Conti",
				grades: [{
					id: "c1",
					value: 8,
					date: iso(-22),
					type: "scritto",
					weight: 1,
					comment: "Genetica"
				}, {
					id: "c2",
					value: "giust.",
					date: iso(-4),
					type: "orale",
					weight: 1,
					comment: "Assente giustificato"
				}]
			}
		],
		assignments: [
			{
				id: "a1",
				title: "Esercizi pagina 42",
				subject: "Matematica",
				dueDate: iso(0),
				dueTime: "18:00",
				completed: false,
				details: "Esercizi 1–8, logaritmi",
				teacher: "Prof.ssa Rossi"
			},
			{
				id: "a2",
				title: "Ripasso capitolo 3",
				subject: "Storia",
				dueDate: iso(0),
				dueTime: "17:00",
				completed: false,
				details: "Età napoleonica",
				teacher: "Prof.ssa Neri"
			},
			{
				id: "a3",
				title: "Relazione laboratorio pendolo",
				subject: "Fisica",
				dueDate: iso(1),
				dueTime: "08:00",
				completed: false,
				details: "Misurare il periodo con almeno 10 oscillazioni e allegare tabella e conclusioni.",
				teacher: "Prof. Verdi"
			},
			{
				id: "a4",
				title: "Essay: My future career",
				subject: "Inglese",
				dueDate: iso(3),
				dueTime: "23:59",
				completed: false,
				details: "250 parole",
				teacher: "Prof. Bianchi"
			},
			{
				id: "a5",
				title: "Analisi del testo: Leopardi",
				subject: "Italiano",
				dueDate: iso(6),
				dueTime: "08:00",
				completed: false,
				details: "Parafrasi, analisi delle immagini poetiche e commento personale.",
				teacher: "Prof. Gallo"
			},
			{
				id: "a6",
				title: "Schema sulla mitosi",
				subject: "Scienze",
				dueDate: iso(-1),
				dueTime: "08:00",
				completed: true,
				details: "Ripassare le fasi della mitosi e completare lo schema sul quaderno.",
				teacher: "Prof.ssa Conti"
			}
		],
		notifications: [
			{
				id: "n1",
				type: "grade",
				title: "Nuovo voto in Inglese",
				message: "Orale: 9",
				date: iso(-2),
				subject: "Inglese",
				read: false
			},
			{
				id: "n2",
				type: "notice",
				title: "Uscita anticipata",
				message: "Venerdì le lezioni terminano alle 12:10 per assemblea d'istituto.",
				date: iso(-1),
				read: false
			},
			{
				id: "n3",
				type: "reminder",
				title: "Verifica di Fisica",
				message: "Dinamica, capitoli 4 e 5.",
				date: iso(4),
				subject: "Fisica",
				teacher: "Prof. Verdi",
				read: false
			},
			{
				id: "n4",
				type: "note",
				title: "Nota disciplinare di classe",
				message: "Ritardo collettivo al rientro dall'intervallo.",
				date: iso(-8),
				teacher: "Prof.ssa Neri",
				read: true
			}
		],
		diary: [
			{
				id: "d1",
				date: iso(0),
				subject: "Matematica",
				teacher: "Prof.ssa Rossi",
				hour: "1",
				activity: "Ripasso delle equazioni esponenziali e introduzione ai logaritmi."
			},
			{
				id: "d2",
				date: iso(0),
				subject: "Inglese",
				teacher: "Prof. Bianchi",
				hour: "2",
				activity: "Speaking activity: describing future plans and career goals."
			},
			{
				id: "d3",
				date: iso(-1),
				subject: "Fisica",
				teacher: "Prof. Verdi",
				hour: "3",
				activity: "Esperienza di laboratorio sul pendolo semplice e raccolta delle misure."
			},
			{
				id: "d4",
				date: iso(-1),
				subject: "Storia",
				teacher: "Prof.ssa Neri",
				hour: "4",
				activity: "L'età napoleonica: principali riforme e conseguenze in Europa."
			},
			{
				id: "d5",
				date: iso(-3),
				subject: "Italiano",
				teacher: "Prof. Gallo",
				hour: "2",
				activity: "Analisi del testo poetico e figure retoriche in Leopardi."
			}
		]
	};
}
var makeDemoData = () => parseVotoData(makeDemoRaw());
//#endregion
//#region src/lib/voto/circular-index.ts
var DB_NAME = "voto-circular-index";
var STORE_NAME = "documents";
var DB_VERSION = 1;
function normalize(value) {
	return value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
function indexedEntry(notification) {
	const searchableText = normalize([
		notification.title,
		notification.subject,
		notification.message,
		notification.extractedText,
		notification.attachmentName,
		...(notification.attachments ?? []).flatMap((attachment) => [attachment.name])
	].filter(Boolean).join(" "));
	const pages = notification.extractedText?.match(/^\[Pagina\s+\d+\]$/gim)?.length ?? 0;
	return {
		id: notification.id,
		title: notification.title,
		...notification.date ? { date: notification.date } : {},
		searchableText,
		pages,
		hasTables: notification.hasTables === true || (notification.tableCount ?? 0) > 0,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function openDatabase() {
	return new Promise((resolve, reject) => {
		if (typeof indexedDB === "undefined") {
			reject(/* @__PURE__ */ new Error("indexeddb_unavailable"));
			return;
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? /* @__PURE__ */ new Error("indexeddb_open_failed"));
	});
}
async function indexCircularNotifications(notifications) {
	if (typeof indexedDB === "undefined") return;
	const database = await openDatabase();
	try {
		await new Promise((resolve, reject) => {
			const transaction = database.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			notifications.filter((item) => item.type === "notice").forEach((item) => store.put(indexedEntry(item)));
			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error ?? /* @__PURE__ */ new Error("indexeddb_write_failed"));
		});
	} finally {
		database.close();
	}
}
//#endregion
//#region src/lib/school-auth-context.ts
var SchoolAuthContext = createContext(null);
function useSchoolAuth() {
	const value = useContext(SchoolAuthContext);
	if (!value) throw new Error("useSchoolAuth deve essere usato dentro SchoolDataAuthGate.");
	return value;
}
var MAX_INPUT_FILE_BYTES = 25165824;
var MAX_OUTPUT_FILE_BYTES = 716800;
var MAX_IMAGE_SIDE = 1920;
var ALLOWED_IMAGE_TYPES = /* @__PURE__ */ new Set([
	"image/jpeg",
	"image/png",
	"image/webp"
]);
var BACKGROUND_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
function isValidCustomThemeBackground(value) {
	return value === "" || typeof value === "string" && value.length <= 95e4 && BACKGROUND_DATA_URL.test(value);
}
function sanitizeCustomThemeBackground(value) {
	return isValidCustomThemeBackground(value) ? value : "";
}
function canvasBlob(canvas, type, quality) {
	return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}
function blobDataUrl(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Non riesco a preparare l’immagine."));
		reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(/* @__PURE__ */ new Error("Formato immagine non valido."));
		reader.readAsDataURL(blob);
	});
}
async function processCustomThemeBackground(file, fallbackColor) {
	if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Scegli un’immagine JPG, PNG o WebP.");
	if (!file.size || file.size > MAX_INPUT_FILE_BYTES) throw new Error("L’immagine deve pesare meno di 24 MB.");
	const objectUrl = URL.createObjectURL(file);
	try {
		const image = new Image();
		image.src = objectUrl;
		try {
			await image.decode();
		} catch {
			throw new Error("Non riesco ad aprire questo file immagine.");
		}
		const naturalWidth = image.naturalWidth;
		const naturalHeight = image.naturalHeight;
		if (!naturalWidth || !naturalHeight) throw new Error("Le dimensioni dell’immagine non sono valide.");
		const canvas = document.createElement("canvas");
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Il browser non può elaborare questa immagine.");
		let scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(naturalWidth, naturalHeight));
		let quality = .84;
		const backdrop = /^#[\da-f]{6}$/i.test(fallbackColor) ? fallbackColor : "#12151c";
		for (let attempt = 0; attempt < 8; attempt += 1) {
			canvas.width = Math.max(1, Math.round(naturalWidth * scale));
			canvas.height = Math.max(1, Math.round(naturalHeight * scale));
			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = "high";
			context.fillStyle = backdrop;
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.drawImage(image, 0, 0, canvas.width, canvas.height);
			const webp = await canvasBlob(canvas, "image/webp", quality);
			let output = webp?.type === "image/webp" ? webp : null;
			if (!output || output.size > MAX_OUTPUT_FILE_BYTES) output = await canvasBlob(canvas, "image/jpeg", quality);
			if (output && output.size <= MAX_OUTPUT_FILE_BYTES) {
				const dataUrl = await blobDataUrl(output);
				if (isValidCustomThemeBackground(dataUrl)) return dataUrl;
			}
			scale *= .82;
			quality = Math.max(.55, quality - .05);
		}
		throw new Error("L’immagine è troppo complessa. Prova con una foto più piccola.");
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
//#endregion
//#region src/lib/voto/emoji-theme.ts
var DEFAULT_EMOJI_THEME_EMOJIS = [
	"📚",
	"✏️",
	"🎒",
	"✨"
];
var DEFAULT_EMOJI_THEME_BACKGROUND_COLORS = {
	scuro: "#1d192a",
	chiaro: "#fff4e9"
};
var HEX_COLOR = /^#[\da-f]{6}$/i;
function normalizeEmojiThemeBackgroundColors(value) {
	const colors = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
	const normalize = (candidate, fallback) => typeof candidate === "string" && HEX_COLOR.test(candidate) ? candidate.toLowerCase() : fallback;
	return {
		scuro: normalize(colors["scuro"], DEFAULT_EMOJI_THEME_BACKGROUND_COLORS.scuro),
		chiaro: normalize(colors["chiaro"], DEFAULT_EMOJI_THEME_BACKGROUND_COLORS.chiaro)
	};
}
var EMOJI_PATTERN = /\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:\uFE0F|\p{Emoji_Modifier})?)*/gu;
function normalizeEmojiThemeEmojis(value) {
	const inputs = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
	const emojis = /* @__PURE__ */ new Set();
	for (const input of inputs) {
		if (typeof input !== "string") continue;
		for (const emoji of input.match(EMOJI_PATTERN) ?? []) {
			emojis.add(emoji);
			if (emojis.size >= 8) return [...emojis];
		}
	}
	return [...emojis];
}
function parseEmojiThemeInput(value) {
	return normalizeEmojiThemeEmojis(value);
}
function escapeXml(value) {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
function createEmojiThemePattern(value) {
	const emojis = normalizeEmojiThemeEmojis(value);
	if (!emojis.length) return "none";
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240"><g font-family="system-ui,Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif" font-size="24" opacity="0.2">${[
		[18, 44],
		[132, 82],
		[62, 136],
		[190, 166],
		[158, 34],
		[14, 194],
		[112, 218],
		[224, 112]
	].map(([x, y], index) => {
		return `<text x="${x}" y="${y}">${escapeXml(emojis[index % emojis.length] ?? "")}</text>`;
	}).join("")}</g></svg>`;
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
//#endregion
//#region src/lib/voto/interrogazioni.ts
var DEFAULT_PREPARATION = [
	{
		id: "appunti",
		label: "Ripassare gli appunti",
		done: false
	},
	{
		id: "argomenti",
		label: "Studiare gli argomenti",
		done: false
	},
	{
		id: "domande",
		label: "Preparare le domande",
		done: false
	},
	{
		id: "ripetere",
		label: "Ripetere a voce",
		done: false
	}
];
function presentInterrogazione(item) {
	const subject = item.subject.trim();
	const notes = item.notes?.trim() ?? "";
	const lines = notes.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
	const firstNote = lines[0] ?? "";
	const isVerification = Boolean(item.reminderId && (/^verifica\b/i.test(subject) || /\bverifica\b/i.test(notes)));
	const title = isVerification && /^verifica\b/i.test(firstNote) ? firstNote : subject;
	const detailNotes = isVerification && firstNote === title ? lines.slice(1).join("\n") : notes;
	return {
		title,
		subject,
		...detailNotes ? { notes: detailNotes } : {},
		isVerification
	};
}
function reminderDateToIso(value) {
	const raw = value?.trim();
	if (!raw) return null;
	const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
	const italian = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:$|\s)/);
	const parts = iso ? [
		Number(iso[1]),
		Number(iso[2]),
		Number(iso[3])
	] : italian ? [
		Number(italian[3]),
		Number(italian[2]),
		Number(italian[1])
	] : null;
	if (!parts) return null;
	const [year = 0, month = 0, day = 0] = parts;
	const check = new Date(Date.UTC(year, month - 1, day));
	if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
	return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
//#endregion
//#region src/lib/voto/home-customization.ts
var DEFAULT_HOME_MODULES = [
	{
		id: "media",
		enabled: true,
		scale: 100
	},
	{
		id: "simulatore",
		enabled: true,
		scale: 100
	},
	{
		id: "prossima-lezione",
		enabled: true,
		scale: 100
	},
	{
		id: "domani-a-scuola",
		enabled: true,
		scale: 100
	},
	{
		id: "presenze",
		enabled: true,
		scale: 100
	},
	{
		id: "compiti",
		enabled: true,
		scale: 100
	},
	{
		id: "interrogazioni",
		enabled: true,
		scale: 100
	},
	{
		id: "note",
		enabled: true,
		scale: 100
	},
	{
		id: "promemoria",
		enabled: true,
		scale: 100
	},
	{
		id: "bacheca",
		enabled: true,
		scale: 100
	},
	{
		id: "obiettivo",
		enabled: true,
		scale: 100
	}
];
function normalizeHomeScale(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return 100;
	return Math.round(Math.min(100, Math.max(80, value)) / 5) * 5;
}
function resolveHomeModuleScale(globalScale, moduleScale) {
	return Math.min(100, Math.max(80, globalScale * moduleScale / 100));
}
function normalizeHomeModules(value) {
	if (!Array.isArray(value)) return DEFAULT_HOME_MODULES;
	const ids = /* @__PURE__ */ new Set();
	const result = [];
	value.forEach((item) => {
		const config = typeof item === "object" && item !== null ? item : null;
		const id = typeof item === "string" ? item : config?.id;
		if (typeof id === "string" && DEFAULT_HOME_MODULES.some((module) => module.id === id) && !ids.has(id)) {
			ids.add(id);
			result.push({
				id,
				enabled: config?.enabled !== false,
				scale: normalizeHomeScale(config?.scale)
			});
		}
	});
	DEFAULT_HOME_MODULES.forEach((module) => {
		if (!ids.has(module.id)) result.push(module);
	});
	return result;
}
//#endregion
//#region src/lib/voto/store.tsx
var DEFAULT_PERFORMANCE_OPTIONS = {
	blur: true,
	animations: true,
	shadows: true,
	wallpapers: true
};
function normalizePerformanceOptions(value) {
	const candidate = value && typeof value === "object" ? value : {};
	return {
		blur: typeof candidate["blur"] === "boolean" ? candidate["blur"] : true,
		animations: typeof candidate["animations"] === "boolean" ? candidate["animations"] : true,
		shadows: typeof candidate["shadows"] === "boolean" ? candidate["shadows"] : true,
		wallpapers: typeof candidate["wallpapers"] === "boolean" ? candidate["wallpapers"] : true
	};
}
var THEME_VALUES = [
	"original",
	"emoji",
	"lavender",
	"cybercore",
	"brutalist",
	"retro-os",
	"windows-98",
	"windows-7",
	"dark-academia",
	"glassmorphism",
	"casino",
	"calcio",
	"terminale",
	"pixel-arcade",
	"y2k",
	"primavera",
	"estate",
	"autunno",
	"inverno",
	"tramonto",
	"oro",
	"diamante",
	"sangue",
	"custom"
];
var ACCENT_VALUES = [
	"rosso",
	"ambra",
	"viola",
	"blu",
	"verde",
	"azzurro",
	"rosa",
	"arancio",
	"turchese",
	"indaco",
	"lime",
	"oro",
	"corallo",
	"menta",
	"mono"
];
var BG_VALUES = [
	"nero",
	"carbone",
	"grafite",
	"chiaro",
	"rosso",
	"oceano",
	"notteblu",
	"bosco",
	"prugna",
	"carta"
];
function oneOf(value, values, fallback) {
	return typeof value === "string" && values.includes(value) ? value : fallback;
}
var DEFAULT_CUSTOM_THEME = {
	bgDark: "#12151c",
	cardDark: "#1d2330",
	surfaceDark: "#273246",
	fgDark: "#f5f7fb",
	mutedDark: "#aeb9cb",
	bgLight: "#eef2f8",
	cardLight: "#ffffff",
	surfaceLight: "#dfe7f2",
	fgLight: "#172033",
	mutedLight: "#5c6a80",
	primary: "#61a7ff",
	radius: 1,
	font: "theme",
	backgroundImage: ""
};
function normalizeInterfaceScale(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return 100;
	return Math.round(Math.min(140, Math.max(80, value)) / 5) * 5;
}
function normalizeInterrogazioni(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((item) => !!item && typeof item === "object" && typeof item.id === "string" && typeof item.subject === "string" && typeof item.date === "string").map((item) => {
		const firstNote = (typeof item.notes === "string" ? item.notes.trim() : "").split(/\r?\n/)[0]?.trim() ?? "";
		const subject = item.reminderId && item.subject.trim().toLocaleLowerCase("it-IT") === "promemoria" && /^verifica\s+di\s+.+/i.test(firstNote) ? firstNote.replace(/^verifica\s+di\s+/i, "").trim() : item.subject;
		return {
			...item,
			subject,
			completed: item.completed === true,
			checklist: Array.isArray(item.checklist) ? item.checklist : DEFAULT_PREPARATION.map((prep) => ({ ...prep }))
		};
	});
}
var VotoCtx = createContext(null);
var VotoDataCtx = createContext(null);
var ClockCtx = createContext(null);
var EMPTY = {
	student: {},
	subjects: [],
	assignments: [],
	notifications: [],
	diary: [],
	attendance: {
		absenceDays: 0,
		absenceHours: 0,
		delays: 0,
		earlyExits: 0,
		annualHours: 990,
		absenceLimitHours: 264
	}
};
function parseStoredData(raw) {
	if (raw == null) return null;
	try {
		return normalizeCachedGradeValues(parseVotoData(raw));
	} catch {
		return null;
	}
}
function VotoProvider({ children }) {
	const consumePrefetchedData = useContext(SchoolAuthContext)?.consumePrefetchedData;
	const prefetchedDataRef = useRef(void 0);
	const [ready, setReady] = useState(false);
	const [data, setData] = useState(EMPTY);
	const [displayName, setDisplayNameS] = useState("");
	const [source, setSource] = useState("demo");
	const [url, setUrl] = useState("");
	const [lastSync, setLastSync] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [completions, setCompletions] = useState({});
	const [readIds, setReadIds] = useState({});
	const [target, setTargetS] = useState(8);
	const [accent, setAccentS] = useState("rosso");
	const [bg, setBgS] = useState("nero");
	const [mode, setModeS] = useState("scuro");
	const [glass, setGlassS] = useState(true);
	const [density, setDensityS] = useState("standard");
	const [reduceMotion, setReduceMotionS] = useState(false);
	const [performanceMode, setPerformanceModeS] = useState(false);
	const [performanceOptions, setPerformanceOptionsS] = useState({ ...DEFAULT_PERFORMANCE_OPTIONS });
	const [theme, setThemeS] = useState("original");
	const [registryStyle, setRegistryStyleS] = useState("voto");
	const [customTheme, setCustomThemeS] = useState(DEFAULT_CUSTOM_THEME);
	const [emojiThemeEmojis, setEmojiThemeEmojisS] = useState([...DEFAULT_EMOJI_THEME_EMOJIS]);
	const [emojiThemeBackgroundColors, setEmojiThemeBackgroundColorsS] = useState({ ...DEFAULT_EMOJI_THEME_BACKGROUND_COLORS });
	const [interfaceScale, setInterfaceScaleS] = useState(100);
	const [homeModules, setHomeModulesS] = useState(DEFAULT_HOME_MODULES);
	const [homeScale, setHomeScaleS] = useState(100);
	const [interrogazioni, setInterrogazioni] = useState([]);
	const [now, setNow] = useState(() => /* @__PURE__ */ new Date(0));
	const urlRef = useRef("");
	const lastValidSnapshotRef = useRef(null);
	const refreshImpl = useCallback(async (u, silent = false) => {
		if (!u) {
			if (!silent) toast("Modalità demo", { description: "Accedi con Supabase nelle Impostazioni per visualizzare i dati reali." });
			return false;
		}
		setLoading(true);
		try {
			const previousSnapshot = lastValidSnapshotRef.current;
			const d = await fetchVotoData(u, 1e4, previousSnapshot?.url === u ? previousSnapshot.data : void 0);
			const ts = (/* @__PURE__ */ new Date()).toISOString();
			lastValidSnapshotRef.current = {
				url: u,
				data: d
			};
			setData(d);
			setSource("remote");
			setLastSync(ts);
			setError(null);
			save(KEYS.cache, d);
			save(KEYS.lastSync, ts);
			if (!silent) toast.success("Dati aggiornati");
			return true;
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Aggiornamento non riuscito.";
			setError(msg);
			if (!silent || e instanceof SchemaError) toast.error("Aggiornamento non riuscito", { description: msg });
			return false;
		} finally {
			setLoading(false);
			setNow(/* @__PURE__ */ new Date());
		}
	}, []);
	useEffect(() => {
		const storedUrl = load(KEYS.url, "");
		if (prefetchedDataRef.current === void 0) prefetchedDataRef.current = consumePrefetchedData?.() ?? null;
		const candidate = prefetchedDataRef.current;
		const prefetchedData = candidate && (!storedUrl || candidate.url === storedUrl) ? candidate : null;
		const u = storedUrl || prefetchedData?.url || "";
		const cache = parseStoredData(load(KEYS.cache, null));
		urlRef.current = u;
		lastValidSnapshotRef.current = null;
		setUrl(u);
		setCompletions(load(KEYS.completions, {}));
		setReadIds(load(KEYS.read, {}));
		setDisplayNameS(load(KEYS.displayName, ""));
		setTargetS(load(KEYS.target, 8));
		setGlassS(load(KEYS.glass, true));
		const savedDensity = load(KEYS.density, "standard");
		setDensityS(savedDensity === "compact" ? "compact" : "standard");
		setReduceMotionS(load(KEYS.reduceMotion, false));
		setPerformanceModeS(load(KEYS.performanceMode, false) === true);
		setPerformanceOptionsS(normalizePerformanceOptions(load(KEYS.performanceOptions, DEFAULT_PERFORMANCE_OPTIONS)));
		const savedTheme = oneOf(load(KEYS.theme, "original"), THEME_VALUES, "original");
		setThemeS(savedTheme);
		const savedRegistryStyle = load(KEYS.registryStyle, "voto");
		setRegistryStyleS(savedRegistryStyle === "didup" ? "didup" : "voto");
		setAccentS(oneOf(load(KEYS.accent, "rosso"), ACCENT_VALUES, "rosso"));
		setBgS(oneOf(load(KEYS.bg, "nero"), BG_VALUES, "nero"));
		setModeS(load(KEYS.mode, "scuro") === "chiaro" ? "chiaro" : "scuro");
		const savedCustomTheme = load(KEYS.customTheme, {});
		setCustomThemeS({
			...DEFAULT_CUSTOM_THEME,
			...savedCustomTheme,
			backgroundImage: sanitizeCustomThemeBackground(savedCustomTheme.backgroundImage),
			font: oneOf(savedCustomTheme.font, [
				"theme",
				"sans",
				"display",
				"mono",
				"serif"
			], "theme")
		});
		setEmojiThemeEmojisS(normalizeEmojiThemeEmojis(load(KEYS.emojiThemeEmojis, DEFAULT_EMOJI_THEME_EMOJIS)));
		setEmojiThemeBackgroundColorsS(normalizeEmojiThemeBackgroundColors(load(KEYS.emojiThemeBackgroundColors, DEFAULT_EMOJI_THEME_BACKGROUND_COLORS)));
		setInterfaceScaleS(normalizeInterfaceScale(load(KEYS.interfaceScale, 100)));
		setHomeModulesS(normalizeHomeModules(load(KEYS.homeModules, DEFAULT_HOME_MODULES)));
		setHomeScaleS(normalizeHomeScale(load(KEYS.homeScale, 100)));
		setInterrogazioni(normalizeInterrogazioni(load(KEYS.interrogazioni, [])));
		setLastSync(load(KEYS.lastSync, null));
		const demoData = parseStoredData(load(KEYS.demoData, null));
		if (u && prefetchedData) {
			const normalizedData = normalizeCachedGradeValues(prefetchedData.data);
			lastValidSnapshotRef.current = {
				url: u,
				data: normalizedData
			};
			setData(normalizedData);
			setSource("remote");
			setLastSync(prefetchedData.lastSync);
			setError(null);
			if (normalizedData !== prefetchedData.data) save(KEYS.cache, normalizedData);
		} else if (u && cache) {
			lastValidSnapshotRef.current = {
				url: u,
				data: cache
			};
			setData(cache);
			setSource("cache");
		} else if (!u && demoData) {
			setData(demoData);
			setSource("demo");
		} else {
			setData(makeDemoData());
			setSource("demo");
		}
		setNow(/* @__PURE__ */ new Date());
		setReady(true);
		if (u && !prefetchedData) refreshImpl(u, true);
		const t = setInterval(() => setNow(/* @__PURE__ */ new Date()), 6e4);
		return () => clearInterval(t);
	}, [refreshImpl, consumePrefetchedData]);
	useEffect(() => {
		if (!ready) return;
		indexCircularNotifications(data.notifications).catch(() => {});
	}, [data.notifications, ready]);
	useEffect(() => {
		if (!ready || !url) return;
		let cancelled = false;
		let timer;
		const wait = (ms) => new Promise((resolve) => {
			timer = setTimeout(resolve, ms);
		});
		(async () => {
			let requestedAt;
			try {
				requestedAt = await requestCircularCheck();
			} catch {
				return;
			}
			const deadline = Date.now() + 6e5;
			let pollInterval = 5e3;
			while (!cancelled && Date.now() < deadline) {
				await wait(pollInterval);
				pollInterval = Math.min(pollInterval * 2, 3e4);
				if (cancelled) return;
				try {
					const status = await getCircularCheckStatus(requestedAt);
					if (status.status === "completed") {
						if (status.conclusion === "success" && !cancelled) await refreshImpl(urlRef.current, true);
						return;
					}
				} catch {}
			}
		})();
		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
		};
	}, [
		ready,
		url,
		refreshImpl
	]);
	useEffect(() => {
		if (!ready) return;
		const root = document.documentElement;
		const didupActive = registryStyle === "didup";
		root.dataset["accent"] = didupActive ? "turchese" : accent;
		root.dataset["bg"] = didupActive ? "nero" : bg;
		root.dataset["mode"] = didupActive ? "scuro" : mode;
		root.dataset["glass"] = didupActive ? "off" : glass ? "on" : "off";
		root.dataset["density"] = density;
		root.dataset["reduceMotion"] = reduceMotion ? "on" : "off";
		root.dataset["performance"] = performanceMode ? "on" : "off";
		root.dataset["performanceBlur"] = performanceMode && performanceOptions.blur ? "on" : "off";
		root.dataset["performanceAnimations"] = performanceMode && performanceOptions.animations ? "on" : "off";
		root.dataset["performanceShadows"] = performanceMode && performanceOptions.shadows ? "on" : "off";
		root.dataset["performanceWallpapers"] = performanceMode && performanceOptions.wallpapers ? "on" : "off";
		root.dataset["theme"] = didupActive ? "original" : theme;
		root.dataset["registryStyle"] = registryStyle;
		root.dataset["font"] = registryStyle === "voto" && theme === "original" ? customTheme.font : "theme";
		root.style.fontSize = `${interfaceScale}%`;
		const custom = {
			"--custom-bg-dark": customTheme.bgDark,
			"--custom-card-dark": customTheme.cardDark,
			"--custom-surface-dark": customTheme.surfaceDark,
			"--custom-fg-dark": customTheme.fgDark,
			"--custom-muted-dark": customTheme.mutedDark,
			"--custom-bg-light": customTheme.bgLight,
			"--custom-card-light": customTheme.cardLight,
			"--custom-surface-light": customTheme.surfaceLight,
			"--custom-fg-light": customTheme.fgLight,
			"--custom-muted-light": customTheme.mutedLight,
			"--custom-primary": customTheme.primary,
			"--custom-radius": `${customTheme.radius}rem`,
			"--custom-font": customTheme.font === "mono" ? "\"JetBrains Mono\", monospace" : customTheme.font === "serif" ? "Georgia, serif" : customTheme.font === "display" ? "\"Space Grotesk\", sans-serif" : "\"Manrope\", sans-serif",
			"--custom-background-image": isValidCustomThemeBackground(customTheme.backgroundImage) ? customTheme.backgroundImage ? `url("${customTheme.backgroundImage}")` : "none" : "none",
			"--emoji-theme-pattern": createEmojiThemePattern(emojiThemeEmojis),
			"--emoji-theme-bg-dark": emojiThemeBackgroundColors.scuro,
			"--emoji-theme-bg-light": emojiThemeBackgroundColors.chiaro
		};
		Object.entries(custom).forEach(([key, value]) => root.style.setProperty(key, value));
	}, [
		accent,
		bg,
		mode,
		glass,
		density,
		reduceMotion,
		performanceMode,
		performanceOptions,
		theme,
		registryStyle,
		customTheme,
		emojiThemeEmojis,
		emojiThemeBackgroundColors,
		interfaceScale,
		ready
	]);
	const dataValue = useMemo(() => ({
		ready,
		data,
		displayName,
		source,
		url,
		lastSync,
		loading,
		error
	}), [
		ready,
		data,
		displayName,
		source,
		url,
		lastSync,
		loading,
		error
	]);
	const value = useMemo(() => ({
		ready,
		density,
		reduceMotion,
		performanceMode,
		performanceOptions,
		data,
		displayName,
		source,
		url,
		lastSync,
		loading,
		error,
		target,
		accent,
		bg,
		mode,
		glass,
		theme,
		registryStyle,
		customTheme,
		emojiThemeEmojis,
		emojiThemeBackgroundColors,
		interfaceScale,
		homeModules,
		homeScale,
		interrogazioni,
		isDone: (id, remote) => completions[id] ?? remote,
		toggleDone: (id, remote) => setCompletions((c) => {
			const next = {
				...c,
				[id]: !(c[id] ?? remote)
			};
			save(KEYS.completions, next);
			return next;
		}),
		isRead: (id, remote) => remote || !!readIds[id],
		markRead: (ids) => setReadIds((r) => {
			const next = { ...r };
			ids.forEach((i) => next[i] = true);
			save(KEYS.read, next);
			return next;
		}),
		refresh: async (opts) => {
			await refreshImpl(urlRef.current, opts?.silent);
		},
		connect: async (u) => {
			const clean = u.trim();
			const ok = await refreshImpl(clean, true);
			if (ok) {
				urlRef.current = clean;
				setUrl(clean);
				save(KEYS.url, clean);
				toast.success("Connesso", { description: "I dati remoti sono ora la tua fonte." });
			} else toast.error("Connessione non riuscita");
			return ok;
		},
		disconnect: () => {
			urlRef.current = "";
			lastValidSnapshotRef.current = null;
			setUrl("");
			save(KEYS.url, null);
			save(KEYS.cache, null);
			save(KEYS.lastSync, null);
			setLastSync(null);
			setError(null);
			setData(makeDemoData());
			setSource("demo");
			toast("URL rimosso", { description: "Stai visualizzando i dati demo." });
		},
		resetDemo: () => {
			if (!canResetDemoData(source, urlRef.current)) {
				toast.error("Il ripristino è disponibile solo in modalità demo.");
				return;
			}
			urlRef.current = "";
			lastValidSnapshotRef.current = null;
			setUrl("");
			[
				KEYS.url,
				KEYS.cache,
				KEYS.demoData,
				KEYS.lastSync,
				KEYS.completions,
				KEYS.read
			].forEach((k) => save(k, null));
			setCompletions({});
			setReadIds({});
			setLastSync(null);
			setError(null);
			setData(makeDemoData());
			setSource("demo");
			toast.success("Dati demo ripristinati");
		},
		setDemoData: (next) => {
			if (urlRef.current) return;
			lastValidSnapshotRef.current = null;
			setData(next);
			setSource("demo");
			setError(null);
			save(KEYS.demoData, next);
			toast.success("Dati demo aggiornati");
		},
		setDisplayName: (name) => {
			const next = name.trim().replace(/\s+/g, " ").slice(0, 80);
			setDisplayNameS(next);
			save(KEYS.displayName, next || null);
		},
		setTarget: (n) => {
			setTargetS(n);
			save(KEYS.target, n);
		},
		setAccent: (a) => {
			setAccentS(a);
			save(KEYS.accent, a);
		},
		setBg: (b) => {
			setBgS(b);
			save(KEYS.bg, b);
		},
		setMode: (m) => {
			setModeS(m);
			save(KEYS.mode, m);
		},
		setGlass: (enabled) => {
			setGlassS(enabled);
			save(KEYS.glass, enabled);
		},
		setDensity: (next) => {
			setDensityS(next);
			save(KEYS.density, next);
		},
		setReduceMotion: (enabled) => {
			setReduceMotionS(enabled);
			save(KEYS.reduceMotion, enabled);
		},
		setPerformanceMode: (enabled) => {
			setPerformanceModeS(enabled);
			save(KEYS.performanceMode, enabled);
		},
		setPerformanceOption: (option, enabled) => {
			setPerformanceOptionsS((current) => {
				const next = {
					...current,
					[option]: enabled
				};
				save(KEYS.performanceOptions, next);
				return next;
			});
		},
		setTheme: (next) => {
			setThemeS(next);
			save(KEYS.theme, next);
		},
		setRegistryStyle: (next) => {
			setRegistryStyleS(next);
			save(KEYS.registryStyle, next);
		},
		setCustomTheme: (patch) => setCustomThemeS((current) => {
			const next = {
				...current,
				...patch
			};
			save(KEYS.customTheme, next);
			return next;
		}),
		setEmojiThemeEmojis: (emojis) => {
			const next = normalizeEmojiThemeEmojis(emojis);
			setEmojiThemeEmojisS(next);
			save(KEYS.emojiThemeEmojis, next);
		},
		setEmojiThemeBackgroundColor: (selectedMode, color) => setEmojiThemeBackgroundColorsS((current) => {
			const next = normalizeEmojiThemeBackgroundColors({
				...current,
				[selectedMode]: color
			});
			save(KEYS.emojiThemeBackgroundColors, next);
			return next;
		}),
		setInterfaceScale: (scale) => {
			const next = normalizeInterfaceScale(scale);
			setInterfaceScaleS(next);
			save(KEYS.interfaceScale, next);
		},
		resetCustomTheme: () => {
			setCustomThemeS(DEFAULT_CUSTOM_THEME);
			save(KEYS.customTheme, DEFAULT_CUSTOM_THEME);
		},
		toggleHomeModule: (id) => setHomeModulesS((current) => {
			const next = current.map((module) => module.id === id ? {
				...module,
				enabled: !module.enabled
			} : module);
			save(KEYS.homeModules, next);
			return next;
		}),
		moveHomeModule: (id, direction) => setHomeModulesS((current) => {
			const index = current.findIndex((module) => module.id === id);
			const targetIndex = index + direction;
			if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
			const next = [...current];
			const moved = next[index];
			next[index] = next[targetIndex];
			next[targetIndex] = moved;
			save(KEYS.homeModules, next);
			return next;
		}),
		setHomeScale: (scale) => {
			const next = normalizeHomeScale(scale);
			setHomeScaleS(next);
			save(KEYS.homeScale, next);
		},
		setHomeModuleScale: (id, scale) => setHomeModulesS((current) => {
			const next = current.map((module) => module.id === id ? {
				...module,
				scale: normalizeHomeScale(scale)
			} : module);
			save(KEYS.homeModules, next);
			return next;
		}),
		setHomeCustomization: (settings) => {
			const modules = normalizeHomeModules(settings.homeModules);
			const scale = normalizeHomeScale(settings.homeScale);
			setHomeModulesS(modules);
			save(KEYS.homeModules, modules);
			setHomeScaleS(scale);
			save(KEYS.homeScale, scale);
		},
		resetHomeModules: () => {
			setHomeModulesS(DEFAULT_HOME_MODULES);
			save(KEYS.homeModules, DEFAULT_HOME_MODULES);
			setHomeScaleS(100);
			save(KEYS.homeScale, 100);
		},
		addInterrogazione: (item) => setInterrogazioni((current) => {
			if (item.reminderId && current.some((entry) => entry.reminderId === item.reminderId)) return current;
			const next = [{
				...item,
				id: crypto.randomUUID(),
				completed: false,
				checklist: DEFAULT_PREPARATION.map((prep) => ({ ...prep }))
			}, ...current];
			save(KEYS.interrogazioni, next);
			return next;
		}),
		toggleInterrogazione: (id) => setInterrogazioni((current) => {
			const next = current.map((item) => item.id === id ? {
				...item,
				completed: !item.completed
			} : item);
			save(KEYS.interrogazioni, next);
			return next;
		}),
		toggleInterrogazionePrep: (id, preparationId) => setInterrogazioni((current) => {
			const next = current.map((item) => item.id === id ? {
				...item,
				checklist: item.checklist.map((prep) => prep.id === preparationId ? {
					...prep,
					done: !prep.done
				} : prep)
			} : item);
			save(KEYS.interrogazioni, next);
			return next;
		}),
		removeInterrogazione: (id) => setInterrogazioni((current) => {
			const next = current.filter((item) => item.id !== id);
			save(KEYS.interrogazioni, next);
			return next;
		})
	}), [
		ready,
		data,
		displayName,
		source,
		url,
		lastSync,
		loading,
		error,
		target,
		accent,
		bg,
		mode,
		glass,
		theme,
		customTheme,
		emojiThemeEmojis,
		emojiThemeBackgroundColors,
		homeModules,
		interrogazioni,
		completions,
		readIds,
		registryStyle,
		density,
		reduceMotion,
		performanceMode,
		performanceOptions,
		refreshImpl,
		homeScale,
		interfaceScale
	]);
	return /* @__PURE__ */ jsx(ClockCtx.Provider, {
		value: now,
		children: /* @__PURE__ */ jsx(VotoDataCtx.Provider, {
			value: dataValue,
			children: /* @__PURE__ */ jsx(VotoCtx.Provider, {
				value,
				children
			})
		})
	});
}
function useVoto() {
	const c = useContext(VotoCtx);
	if (!c) throw new Error("useVoto fuori dal provider");
	return c;
}
function useVotoData() {
	const c = useContext(VotoDataCtx);
	if (!c) throw new Error("useVotoData fuori dal provider");
	return c;
}
function useClock() {
	const now = useContext(ClockCtx);
	if (!now) throw new Error("useClock fuori dal provider");
	return now;
}
//#endregion
export { fetchVotoData as C, requestCircularCheck as E, canResetDemoData as S, getCircularCheckStatus as T, isValidCustomThemeBackground as _, DEFAULT_HOME_MODULES as a, SchoolAuthContext as b, resolveHomeModuleScale as c, reminderDateToIso as d, DEFAULT_EMOJI_THEME_BACKGROUND_COLORS as f, parseEmojiThemeInput as g, normalizeEmojiThemeEmojis as h, useVotoData as i, DEFAULT_PREPARATION as l, normalizeEmojiThemeBackgroundColors as m, useClock as n, normalizeHomeModules as o, DEFAULT_EMOJI_THEME_EMOJIS as p, useVoto as r, normalizeHomeScale as s, VotoProvider as t, presentInterrogazione as u, processCustomThemeBackground as v, parseVotoData as w, useSchoolAuth as x, sanitizeCustomThemeBackground as y };
