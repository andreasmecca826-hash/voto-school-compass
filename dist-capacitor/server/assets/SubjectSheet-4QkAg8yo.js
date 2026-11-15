import { n as useSchoolPeriods } from "./periods-context-BiByHTyY.js";
import { n as fmtDate } from "./dates-CdBXaUB1.js";
import { c as subjectStats, i as fmt } from "./calc-DWBiEBUY.js";
import { c as SubjectMark, i as GradePill, n as Chip, s as Sparkline, t as BottomSheet } from "./ui-D03OlNCN.js";
import { t as PeriodPicker } from "./PeriodPicker-ALqNKIz5.js";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Calculator } from "lucide-react";
//#region src/components/voto/SubjectSheet.tsx
var TYPES = [
	"all",
	"scritto",
	"orale",
	"pratico"
];
function SubjectSheet({ id, onClose, onSimulate }) {
	const { subjects } = useSchoolPeriods();
	const [type, setType] = useState("all");
	const s = subjects.find((x) => x.id === id);
	const st = s ? subjectStats(s) : null;
	const grades = s ? [...s.grades].filter((g) => type === "all" || g.type === type).sort((a, b) => b.date.localeCompare(a.date)) : [];
	const history = s ? [...s.grades].sort((a, b) => a.date.localeCompare(b.date)).map((_, i, arr) => {
		const sl = arr.slice(0, i + 1);
		return sl.reduce((t, g) => t + g.value * g.weight, 0) / sl.reduce((t, g) => t + g.weight, 0);
	}) : [];
	return /* @__PURE__ */ jsx(BottomSheet, {
		open: !!s,
		onOpenChange: (o) => !o && onClose(),
		title: s?.name ?? "",
		description: s?.teacher,
		children: s && st && /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx(PeriodPicker, {}),
			/* @__PURE__ */ jsxs("div", {
				className: "card-surface flex items-center justify-between p-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx(SubjectMark, {
						name: s.name,
						color: s.color,
						size: 44
					}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
						className: "text-[11px] uppercase tracking-wider text-muted-foreground",
						children: "Media ponderata"
					}), /* @__PURE__ */ jsx("p", {
						className: "tabular font-display text-3xl font-semibold",
						children: st.avg === null ? "—" : fmt(st.avg)
					})] })]
				}), /* @__PURE__ */ jsx(Sparkline, {
					values: history,
					className: "w-24"
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-3 grid grid-cols-3 gap-2 text-center",
				children: [
					["Max", st.max],
					["Min", st.min],
					["Voti", st.count]
				].map(([l, val]) => /* @__PURE__ */ jsxs("div", {
					className: "rounded-xl bg-card py-2.5",
					children: [/* @__PURE__ */ jsx("p", {
						className: "text-[10px] uppercase tracking-wider text-muted-foreground",
						children: l
					}), /* @__PURE__ */ jsx("p", {
						className: "tabular font-display text-base font-semibold",
						children: val === null ? "—" : l === "Voti" ? val : fmt(val, 2)
					})]
				}, l))
			}),
			/* @__PURE__ */ jsx("div", {
				className: "no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5",
				children: TYPES.map((t) => /* @__PURE__ */ jsx(Chip, {
					active: type === t,
					onClick: () => setType(t),
					children: t === "all" ? "Tutti" : t.charAt(0).toUpperCase() + t.slice(1)
				}, t))
			}),
			/* @__PURE__ */ jsxs("ul", {
				className: "mt-3 divide-y divide-border",
				children: [grades.length === 0 && /* @__PURE__ */ jsx("li", {
					className: "py-6 text-center text-sm text-muted-foreground",
					children: "Nessun voto di questo tipo."
				}), grades.map((g) => /* @__PURE__ */ jsxs("li", {
					className: "flex items-center gap-3 py-3",
					children: [
						/* @__PURE__ */ jsx(GradePill, {
							value: g.value,
							label: g.label
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [g.comment && /* @__PURE__ */ jsx("p", {
								className: "truncate text-sm",
								children: g.comment
							}), /* @__PURE__ */ jsxs("p", {
								className: "text-[11px] capitalize text-muted-foreground",
								children: [
									g.type,
									" · ",
									fmtDate(g.date, {
										day: "numeric",
										month: "long"
									})
								]
							})]
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "tabular rounded-md bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground",
							children: [
								"peso ",
								fmt(g.weight * 100, 0),
								"%"
							]
						})
					]
				}, g.id))]
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: () => onSimulate(s.id),
				className: "press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground",
				children: [/* @__PURE__ */ jsx(Calculator, { className: "h-4 w-4" }), " Che voto mi serve?"]
			})
		] })
	});
}
//#endregion
export { SubjectSheet };
