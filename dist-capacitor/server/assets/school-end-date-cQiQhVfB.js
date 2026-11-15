import { n as load, r as save, t as KEYS } from "./storage-D7ptFFhi.js";
//#region src/lib/voto/absence-calculator.ts
var nonNegative = (value) => Number.isFinite(value) ? Math.max(0, value) : 0;
function calculateAbsencePlan(input) {
	const absenceHours = nonNegative(input.absenceHours);
	const absenceLimitHours = nonNegative(input.absenceLimitHours);
	const annualHours = nonNegative(input.annualHours);
	const simulatedHours = nonNegative(input.simulatedHours);
	const hoursPerDay = nonNegative(input.hoursPerDay);
	const remainingHours = Math.max(0, absenceLimitHours - absenceHours);
	const simulatedTotalHours = absenceHours + simulatedHours;
	const simulatedRemainingHours = Math.max(0, absenceLimitHours - simulatedTotalHours);
	return {
		absenceHours,
		absenceLimitHours,
		annualHours,
		simulatedHours,
		hoursPerDay,
		remainingHours,
		exceededHours: Math.max(0, absenceHours - absenceLimitHours),
		fullDaysRemaining: hoursPerDay > 0 ? Math.floor(remainingHours / hoursPerDay) : null,
		fullDaysAfterSimulation: hoursPerDay > 0 ? Math.floor(simulatedRemainingHours / hoursPerDay) : null,
		currentAnnualPercentage: annualHours > 0 ? absenceHours / annualHours * 100 : null,
		simulatedTotalHours,
		simulatedRemainingHours,
		simulatedExceededHours: Math.max(0, simulatedTotalHours - absenceLimitHours),
		hasConfiguredLimit: absenceLimitHours > 0
	};
}
function loadAbsenceHoursPerDay() {
	const value = load(KEYS.absenceHoursPerDay, 6);
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 6;
}
function saveAbsenceHoursPerDay(value) {
	if (!Number.isFinite(value) || value <= 0) return false;
	save(KEYS.absenceHoursPerDay, value);
	return true;
}
//#endregion
//#region src/lib/voto/school-holidays.ts
var DAY_MS = 864e5;
var ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
function isValidIsoDate$1(value) {
	const match = value.match(ISO_DATE);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function dateKey(date) {
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}
function localDateKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function easterSunday(year) {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = (h + l - 7 * m + 114) % 31 + 1;
	return new Date(Date.UTC(year, month - 1, day));
}
function italianNationalHolidays(year) {
	const fixed = [
		`${year}-01-01`,
		`${year}-01-06`,
		`${year}-04-25`,
		`${year}-05-01`,
		`${year}-06-02`,
		`${year}-08-15`,
		`${year}-11-01`,
		`${year}-12-08`,
		`${year}-12-25`,
		`${year}-12-26`
	];
	const easterMonday = easterSunday(year);
	easterMonday.setUTCDate(easterMonday.getUTCDate() + 1);
	return /* @__PURE__ */ new Set([...fixed, dateKey(easterMonday)]);
}
function loadSchoolClosures() {
	const value = load(KEYS.schoolClosures, []);
	if (!Array.isArray(value)) return [];
	return value.filter((item) => {
		if (!item || typeof item !== "object") return false;
		const period = item;
		return typeof period["start"] === "string" && typeof period["end"] === "string" && isValidIsoDate$1(period["start"]) && isValidIsoDate$1(period["end"]) && period["start"] <= period["end"];
	});
}
function saveSchoolClosures(periods) {
	if (periods.some((period) => !isValidIsoDate$1(period.start) || !isValidIsoDate$1(period.end) || period.start > period.end)) return false;
	save(KEYS.schoolClosures, periods);
	return true;
}
function loadExcludeWeekends() {
	const value = load(KEYS.schoolExcludeWeekends, true);
	return typeof value === "boolean" ? value : true;
}
function saveExcludeWeekends(exclude) {
	save(KEYS.schoolExcludeWeekends, exclude);
}
function schoolDaysUntilSchoolEnd(value, now, closures = [], excludeWeekends = true) {
	if (!value || !isValidIsoDate$1(value)) return null;
	const target = Date.parse(`${value}T00:00:00Z`);
	const todayKey = localDateKey(now);
	const today = Date.parse(`${todayKey}T00:00:00Z`);
	const direction = Math.sign(target - today);
	if (direction === 0) return 0;
	const holidays = /* @__PURE__ */ new Map();
	const isSchoolDay = (time) => {
		const date = new Date(time);
		const weekday = date.getUTCDay();
		if (excludeWeekends && (weekday === 0 || weekday === 6)) return false;
		const year = date.getUTCFullYear();
		let yearHolidays = holidays.get(year);
		if (!yearHolidays) {
			yearHolidays = italianNationalHolidays(year);
			holidays.set(year, yearHolidays);
		}
		const key = dateKey(date);
		if (yearHolidays.has(key)) return false;
		return !closures.some((period) => period.start <= key && key <= period.end);
	};
	let count = 0;
	if (direction > 0) {
		for (let time = today + DAY_MS; time <= target; time += DAY_MS) if (isSchoolDay(time)) count += 1;
		return count;
	}
	for (let time = today; time > target; time -= DAY_MS) if (isSchoolDay(time)) count += 1;
	return -count;
}
//#endregion
//#region src/lib/voto/school-end-date.ts
function isValidIsoDate(value) {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function loadSchoolEndDate() {
	const value = load(KEYS.schoolEndDate, null);
	return typeof value === "string" && isValidIsoDate(value) ? value : void 0;
}
function saveSchoolEndDate(value) {
	const normalized = value.trim();
	if (!isValidIsoDate(normalized)) return false;
	save(KEYS.schoolEndDate, normalized);
	return true;
}
function clearSchoolEndDate() {
	save(KEYS.schoolEndDate, null);
}
//#endregion
export { loadSchoolClosures as a, schoolDaysUntilSchoolEnd as c, calculateAbsencePlan as d, loadExcludeWeekends as i, loadAbsenceHoursPerDay as l, loadSchoolEndDate as n, saveExcludeWeekends as o, saveSchoolEndDate as r, saveSchoolClosures as s, clearSchoolEndDate as t, saveAbsenceHoursPerDay as u };
