//#region src/lib/voto/teachers.ts
var TEACHERS_STORAGE_KEY = "voto.teachers";
function getClassTeachers() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(TEACHERS_STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((entry) => Array.isArray(entry) && entry.length === 2 && typeof entry[0] === "string" && typeof entry[1] === "string" && entry[0].trim().length > 0);
	} catch {
		return [];
	}
}
function saveClassTeachers(teachers) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(teachers));
}
var normalize = (value) => value.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—,-]/g, " ").replace(/\s+/g, " ").trim();
var normalizeSubject = (value) => normalize(value).replace(/\b(?:english|ing|inglese)\b/g, "inglese").replace(/\b(?:mate|mat|matematica)\b/g, "matematica").replace(/\b(?:ita|italiano|letteratura)\b/g, "italiano").replace(/\b(?:fis|fisica)\b/g, "fisica").replace(/\b(?:chim|chimica)\b/g, "chimica").replace(/\b(?:scienza|scienze)\b/g, "scienze").replace(/\b(?:tec|tecnologia|tecnologie)\b/g, "tecnologie").replace(/\s+/g, " ").trim();
function teachersForSubject(subject, teachers = getClassTeachers()) {
	const normalizedSubject = normalizeSubject(subject);
	if (!normalizedSubject) return [];
	const asksLab = asksForLaboratory(subject);
	if (normalizedSubject.includes("disegno tecnico")) {
		const officialSubject = asksLab ? "laboratorio di disegno" : "tecnologie e tecniche di rappresentazione grafica";
		return teachers.filter(([, subjects]) => normalizeSubject(subjects).includes(officialSubject));
	}
	const subjectCore = normalizedSubject.replace(/\b(?:laboratori|laboratorio|lab)\b/g, " ").replace(/\bdi\b/g, " ").replace(/\s+/g, " ").trim();
	const matches = teachers.filter(([, subjects]) => {
		const normalizedSubjects = normalizeSubject(subjects);
		return normalizedSubjects.includes(normalizedSubject) || subjectCore.length > 0 && normalizedSubjects.includes(subjectCore);
	});
	if (asksLab) return matches.filter(([, subjects]) => asksForLaboratory(subjects));
	const nonLabMatches = matches.filter(([, subjects]) => !asksForLaboratory(subjects));
	return nonLabMatches.length ? nonLabMatches : matches;
}
function asksForLaboratory(query) {
	return /\b(?:lab|laboratorio|laboratori)\b/.test(normalize(query));
}
function teachersForSubjectQuestion(question) {
	return teachersForSubject(normalizeSubject(question).replace(/[?!.,:;]/g, " ").replace(/^(?:chi (?:insegna|fa|tiene)|quale (?:docente|professore|professoressa|prof) insegna|chi e (?:il|la) (?:docente|professore|professoressa|prof) di|(?:docente|professore|professoressa|prof) di)\s*/, "").replace(/^(?:la|il|lo|i|gli|le|l)\s+/, "").trim());
}
//#endregion
export { teachersForSubjectQuestion as a, teachersForSubject as i, getClassTeachers as n, saveClassTeachers as r, asksForLaboratory as t };
