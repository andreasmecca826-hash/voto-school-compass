import { n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { n as load, r as save } from "./storage-D7ptFFhi.js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { jsx } from "react/jsx-runtime";
//#region src/lib/voto/periods.ts
function schoolYearStart(date) {
	const year = Number(date.slice(0, 4));
	return Number(date.slice(5, 7)) >= 9 ? year : year - 1;
}
function defaultBoundary(year, system) {
	return system === "quadrimesters" ? `${year + 1}-01-31` : `${year}-12-31`;
}
function validBoundary(date, year) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
	const parsed = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
	return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && date >= `${year}-09-01` && date < `${year + 1}-08-31`;
}
function filterSubjectsByPeriod(subjects, config) {
	const start = `${config.year}-09-01`;
	const end = `${config.year + 1}-08-31`;
	return subjects.map((subject) => ({
		...subject,
		grades: subject.grades.filter(({ date }) => {
			const day = date.slice(0, 10);
			if (day < start || day > end) return false;
			return config.selection === "all" || (config.selection === "first" ? day <= config.boundary : day > config.boundary);
		})
	}));
}
function periodLabels(system) {
	return system === "quadrimesters" ? {
		all: "Anno intero",
		first: "1° quadrimestre",
		second: "2° quadrimestre"
	} : {
		all: "Anno intero",
		first: "Trimestre",
		second: "Pentamestre"
	};
}
//#endregion
//#region src/lib/voto/periods-context.tsx
var Context = createContext(null);
function SchoolPeriodsProvider({ children }) {
	const v = useVoto();
	const now = useClock();
	const [config, setConfig] = useState({
		year: 2026,
		system: "quadrimesters",
		selection: "all",
		boundary: "2027-01-31"
	});
	const [loaded, setLoaded] = useState(false);
	useEffect(() => {
		if (!v.ready || loaded) return;
		const year = schoolYearStart(now.toISOString());
		const saved = load("voto.periods", {});
		const selectedYear = Number.isInteger(saved.year) && (saved.year ?? 0) >= 2e3 && (saved.year ?? 0) <= 2100 ? saved.year ?? year : year;
		const system = saved.system === "trimester" ? "trimester" : "quadrimesters";
		setConfig({
			year: selectedYear,
			system,
			selection: saved.selection === "first" || saved.selection === "second" ? saved.selection : "all",
			boundary: validBoundary(saved.boundary ?? "", selectedYear) ? saved.boundary ?? "" : defaultBoundary(selectedYear, system)
		});
		setLoaded(true);
	}, [
		v.ready,
		now,
		loaded
	]);
	const subjects = useMemo(() => filterSubjectsByPeriod(v.data.subjects, config), [v.data.subjects, config]);
	const years = [.../* @__PURE__ */ new Set([
		config.year,
		schoolYearStart(now.toISOString()),
		...v.data.subjects.flatMap((s) => s.grades.map((g) => schoolYearStart(g.date)))
	])].filter((year) => year >= 2e3).sort((a, b) => b - a);
	const update = (patch) => setConfig((current) => {
		const next = {
			...current,
			...patch
		};
		if (patch.year !== void 0 || patch.system !== void 0) next.boundary = defaultBoundary(next.year, next.system);
		if (!validBoundary(next.boundary, next.year)) return current;
		save("voto.periods", next);
		return next;
	});
	return /* @__PURE__ */ jsx(Context.Provider, {
		value: {
			config,
			subjects,
			years,
			label: periodLabels(config.system)[config.selection],
			update
		},
		children
	});
}
function useSchoolPeriods() {
	const context = useContext(Context);
	if (!context) throw new Error("SchoolPeriodsProvider mancante");
	return context;
}
//#endregion
export { useSchoolPeriods as n, periodLabels as r, SchoolPeriodsProvider as t };
