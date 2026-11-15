//#region src/lib/voto/orario.ts
var DAYS = [
	{
		id: "lunedi",
		label: "Lunedì",
		short: "Lun"
	},
	{
		id: "martedi",
		label: "Martedì",
		short: "Mar"
	},
	{
		id: "mercoledi",
		label: "Mercoledì",
		short: "Mer"
	},
	{
		id: "giovedi",
		label: "Giovedì",
		short: "Gio"
	},
	{
		id: "venerdi",
		label: "Venerdì",
		short: "Ven"
	}
];
var STORAGE_KEY = "voto.orario";
var HOURS = 6;
function emptySchedule() {
	return Object.fromEntries(DAYS.map(({ id }) => [id, Array.from({ length: HOURS }, () => "")]));
}
function loadSchedule() {
	const fallback = emptySchedule();
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
		if (!parsed || typeof parsed !== "object") return fallback;
		return Object.fromEntries(DAYS.map(({ id }) => [id, Array.from({ length: HOURS }, (_, index) => typeof parsed[id]?.[index] === "string" ? parsed[id][index] : "")]));
	} catch {
		return fallback;
	}
}
function saveSchedule(schedule) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
	} catch {}
}
function clearScheduleDay(schedule, day) {
	const next = {
		...schedule,
		[day]: Array.from({ length: HOURS }, () => "")
	};
	saveSchedule(next);
	return next;
}
function clearScheduleDayIfUnchanged(schedule, day, expectedLessons) {
	const currentLessons = schedule[day];
	if (currentLessons.length !== expectedLessons.length || currentLessons.some((lesson, index) => lesson !== expectedLessons[index])) return "changed";
	if (!currentLessons.some((lesson) => lesson.trim())) return "empty";
	clearScheduleDay(schedule, day);
	return "cleared";
}
//#endregion
export { saveSchedule as a, loadSchedule as i, clearScheduleDayIfUnchanged as n, emptySchedule as r, DAYS as t };
