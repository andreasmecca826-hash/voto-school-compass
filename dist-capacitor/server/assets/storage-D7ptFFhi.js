//#region src/lib/voto/storage.ts
var KEYS = {
	url: "voto.url",
	displayName: "voto.displayName",
	cache: "voto.cache",
	demoData: "voto.demoData",
	demoMode: "voto.demoMode",
	lastSync: "voto.lastSync",
	completions: "voto.completions",
	read: "voto.read",
	target: "voto.target",
	accent: "voto.accent",
	bg: "voto.bg",
	mode: "voto.mode",
	glass: "voto.glass",
	density: "voto.density",
	reduceMotion: "voto.reduceMotion",
	performanceMode: "voto.performanceMode",
	performanceOptions: "voto.performanceOptions",
	theme: "voto.theme",
	registryStyle: "voto.registryStyle",
	customTheme: "voto.customTheme",
	emojiThemeEmojis: "voto.emojiThemeEmojis",
	emojiThemeBackgroundColors: "voto.emojiThemeBackgroundColors",
	homeModules: "voto.homeModules",
	homeScale: "voto.homeScale",
	homeAverageHidden: "voto.homeAverageHidden",
	interfaceScale: "voto.interfaceScale",
	interrogazioni: "voto.interrogazioni",
	infraperiodalReports: "voto.infraperiodalReports",
	schoolEndDate: "voto.schoolEndDate",
	absenceHoursPerDay: "voto.absenceHoursPerDay",
	studyWheel: "voto.studyWheel",
	schoolClosures: "voto.schoolClosures",
	schoolExcludeWeekends: "voto.schoolExcludeWeekends"
};
function load(key, fallback) {
	try {
		const v = localStorage.getItem(key);
		return v === null ? fallback : JSON.parse(v);
	} catch {
		return fallback;
	}
}
function save(key, value) {
	try {
		if (value === null || value === void 0) localStorage.removeItem(key);
		else localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}
//#endregion
export { load as n, save as r, KEYS as t };
