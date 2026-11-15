import { r as useVoto } from "./store-EhdD6Ug3.js";
import { n as useSchoolPeriods } from "./periods-context-BiByHTyY.js";
import { a as gradeTone, c as subjectStats, i as fmt, s as overallAverage } from "./calc-DWBiEBUY.js";
import { a as ProgressBar, c as SubjectMark, i as GradePill, n as Chip } from "./ui-D03OlNCN.js";
import { t as PeriodPicker } from "./PeriodPicker-ALqNKIz5.js";
import { n as useUi } from "./AppShell-BD8bYCa-.js";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, Calculator, ChevronRight, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
//#region src/routes/voti.tsx?tsr-split=component
var DIDUP_PERIODS = [
	{
		value: "first",
		label: "Primo trimestre"
	},
	{
		value: "second",
		label: "Scrutinio finale"
	},
	{
		value: "all",
		label: "Intero anno"
	}
];
function Voti() {
	const { subjects, config, update } = useSchoolPeriods();
	const v = useVoto();
	const ui = useUi();
	const [sort, setSort] = useState("nome");
	const [didupPeriod, setDidupPeriod] = useState("first");
	const firstPeriodEnd = `${config.year}-12-15`;
	const schoolYearStart = `${config.year}-09-15`;
	const schoolYearEnd = `${config.year + 1}-08-31`;
	const list = subjects.map((s) => ({
		s,
		st: subjectStats(s),
		latestGrade: [...s.grades].sort((a, b) => b.date.localeCompare(a.date))[0]
	})).sort((a, b) => sort === "nome" ? a.s.name.localeCompare(b.s.name) : sort === "alta" ? (b.st.avg ?? 0) - (a.st.avg ?? 0) : (a.st.avg ?? 0) - (b.st.avg ?? 0));
	const didupList = useMemo(() => v.data.subjects.map((subject) => ({
		...subject,
		grades: subject.grades.filter((grade) => {
			const day = grade.date.slice(0, 10);
			if (day < schoolYearStart || day > schoolYearEnd) return false;
			if (didupPeriod === "first") return day <= firstPeriodEnd;
			if (didupPeriod === "second") return day > firstPeriodEnd;
			return true;
		})
	})).sort((a, b) => a.name.localeCompare(b.name)), [
		v.data.subjects,
		schoolYearStart,
		schoolYearEnd,
		firstPeriodEnd,
		didupPeriod
	]);
	const didupRange = didupPeriod === "first" ? [schoolYearStart, firstPeriodEnd] : didupPeriod === "second" ? [`${config.year}-12-16`, schoolYearEnd] : [schoolYearStart, schoolYearEnd];
	if (v.registryStyle === "didup") return /* @__PURE__ */ jsx(DidupVotiPage, {
		studentName: (v.displayName || v.data.student.name || "ANDREA MARIA").toUpperCase(),
		subjects: didupList,
		period: didupPeriod,
		dateRange: didupRange,
		onBack: ui.openMenu,
		onPeriodChange: (period) => {
			setDidupPeriod(period);
			update({
				selection: period,
				boundary: firstPeriodEnd
			});
		},
		onOpenSubject: ui.openSubject
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Voti"
				}), /* @__PURE__ */ jsxs(Link, {
					to: "/studio",
					className: "press inline-flex h-9 items-center gap-1.5 rounded-full bg-primary-soft px-3 text-xs font-medium text-primary",
					children: [/* @__PURE__ */ jsx(Calculator, { className: "h-4 w-4" }), " Studio Lab"]
				})]
			}),
			/* @__PURE__ */ jsx(PeriodPicker, {}),
			/* @__PURE__ */ jsxs("div", {
				className: "no-scrollbar mt-4 flex gap-2 overflow-x-auto",
				children: [
					/* @__PURE__ */ jsx(Chip, {
						active: sort === "nome",
						onClick: () => setSort("nome"),
						children: "A–Z"
					}),
					/* @__PURE__ */ jsx(Chip, {
						active: sort === "alta",
						onClick: () => setSort("alta"),
						children: "Media più alta"
					}),
					/* @__PURE__ */ jsx(Chip, {
						active: sort === "bassa",
						onClick: () => setSort("bassa"),
						children: "Media più bassa"
					})
				]
			}),
			/* @__PURE__ */ jsx(SubjectMap, { subjects }),
			/* @__PURE__ */ jsx("ul", {
				className: "mt-4 space-y-2",
				children: list.map(({ s, st, latestGrade }) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => ui.openSubject(s.id),
					className: "press card-surface flex w-full items-center gap-3 p-4 text-left",
					children: [
						/* @__PURE__ */ jsx(SubjectMark, {
							name: s.name,
							color: s.color
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ jsx("p", {
									className: "text-sm font-medium",
									children: s.name
								}),
								s.teacher && /* @__PURE__ */ jsx("p", {
									className: "text-[11px] text-muted-foreground",
									children: s.teacher
								}),
								latestGrade?.comment && /* @__PURE__ */ jsx("p", {
									className: "truncate text-[11px] text-muted-foreground",
									children: latestGrade.comment
								}),
								/* @__PURE__ */ jsxs("p", {
									className: "tabular mb-1.5 text-[11px] text-muted-foreground",
									children: [
										st.count,
										" voti",
										st.max !== null && ` · max ${fmt(st.max, 1)} · min ${fmt(st.min ?? 0, 1)}`
									]
								}),
								/* @__PURE__ */ jsx(ProgressBar, {
									value: (st.avg ?? 0) / 10 * 100,
									color: s.color
								})
							]
						}),
						/* @__PURE__ */ jsx(GradePill, { value: st.avg })
					]
				}) }, s.id))
			})
		]
	});
}
function SubjectMap({ subjects }) {
	const ranked = subjects.map((subject) => ({
		subject,
		stats: subjectStats(subject)
	})).filter(({ stats }) => stats.avg !== null).sort((a, b) => (b.stats.avg ?? 0) - (a.stats.avg ?? 0));
	const strongest = ranked[0];
	const weakest = ranked[ranked.length - 1];
	const average = overallAverage(subjects);
	return /* @__PURE__ */ jsxs("section", {
		className: "card-surface mt-4 space-y-3 p-4",
		"aria-labelledby": "subject-map-title",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs("h2", {
				id: "subject-map-title",
				className: "flex items-center gap-2 text-sm font-semibold",
				children: [/* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-primary" }), " Mappa delle materie"]
			}) }), /* @__PURE__ */ jsxs("span", {
				className: "rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary",
				children: ["Media ", average === null ? "—" : fmt(average, 2)]
			})]
		}), ranked.length === 0 ? /* @__PURE__ */ jsx("p", {
			className: "rounded-lg bg-surface p-3 text-xs text-muted-foreground",
			children: "Aggiungi almeno un voto per visualizzare la mappa."
		}) : /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", {
			className: "grid grid-cols-2 gap-2 text-xs",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "rounded-lg bg-success-soft p-3",
				children: [
					/* @__PURE__ */ jsxs("p", {
						className: "flex items-center gap-1 font-semibold text-success",
						children: [/* @__PURE__ */ jsx(TrendingUp, { className: "h-3.5 w-3.5" }), " Punto di forza"]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 truncate text-sm font-medium",
						children: strongest?.subject.name
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-0.5 text-muted-foreground",
						children: fmt(strongest?.stats.avg ?? 0, 1)
					})
				]
			}), /* @__PURE__ */ jsxs("div", {
				className: "rounded-lg bg-danger-soft p-3",
				children: [
					/* @__PURE__ */ jsxs("p", {
						className: "flex items-center gap-1 font-semibold text-danger",
						children: [/* @__PURE__ */ jsx(TrendingDown, { className: "h-3.5 w-3.5" }), " Punto di debolezza"]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 truncate text-sm font-medium",
						children: weakest?.subject.name
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-0.5 text-muted-foreground",
						children: fmt(weakest?.stats.avg ?? 0, 1)
					})
				]
			})]
		}) })]
	});
}
function DidupVotiPage({ studentName, subjects, period, dateRange, onBack, onPeriodChange, onOpenSubject }) {
	const formatDate = (date) => `${date.slice(8, 10)}-${date.slice(5, 7)}-${date.slice(0, 4)}`;
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page min-h-dvh bg-black pb-[88px] text-white",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "flex min-h-[98px] items-center justify-between gap-3 border-b border-white/20 px-4 py-4",
				children: [
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: onBack,
						"aria-label": "Torna al Menu",
						className: "flex h-10 w-9 shrink-0 items-center justify-start text-white/90",
						children: /* @__PURE__ */ jsx(ArrowLeft, {
							className: "h-7 w-7",
							strokeWidth: 1.8
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("h1", {
							className: "truncate text-[20px] font-normal uppercase leading-tight tracking-[0.04em]",
							children: "Voti giornalieri"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-[12px] uppercase leading-tight text-white/90",
							children: studentName
						})]
					}),
					/* @__PURE__ */ jsx("img", {
						src: "/didup-profile.jpg",
						alt: "",
						"aria-hidden": "true",
						className: "h-[52px] w-[52px] shrink-0 object-cover"
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "border-b border-white/15 px-5 pb-5 pt-2",
				"aria-label": "Periodo scolastico",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-[12px] font-normal uppercase tracking-[0.04em] text-white/55",
						children: "Periodo scolastico"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-2 grid grid-cols-3 overflow-hidden rounded-[8px] border border-white/10 bg-[#252525]",
						role: "tablist",
						"aria-label": "Seleziona periodo",
						children: DIDUP_PERIODS.map((item) => /* @__PURE__ */ jsx("button", {
							type: "button",
							role: "tab",
							"aria-selected": period === item.value,
							onClick: () => onPeriodChange(item.value),
							className: `min-h-[46px] px-1 text-[11px] font-normal uppercase leading-tight tracking-[0.015em] ${period === item.value ? "bg-[#08a5b5] text-white" : "bg-[#252525] text-white/90"}`,
							children: item.label
						}, item.value))
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-5 text-center text-[12px] text-white/90",
						children: [
							"(dal ",
							formatDate(dateRange[0]),
							" al ",
							formatDate(dateRange[1]),
							")"
						]
					})
				]
			}),
			/* @__PURE__ */ jsx("ul", {
				className: "border-b border-[#3a3a3a]",
				children: subjects.map((subject) => {
					const stats = subjectStats(subject);
					const tone = gradeTone(stats.avg);
					const toneClass = tone === "good" ? "bg-[#3ed69d] text-[#14382c]" : tone === "ok" ? "bg-[#f2a93b] text-[#3d2b0d]" : tone === "bad" ? "bg-[#ec6c62] text-[#3d1613]" : "bg-[#e8e8e8] text-[#555]";
					return /* @__PURE__ */ jsx("li", {
						className: "border-t border-[#3a3a3a] first:border-t-0",
						children: /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => onOpenSubject(subject.id),
							"aria-label": `Apri voti ${subject.name}`,
							className: "flex min-h-[90px] w-full items-center gap-4 bg-[#262626] px-[15px] py-3 text-left",
							children: [
								/* @__PURE__ */ jsx("span", {
									"aria-hidden": "true",
									className: `grid h-[48px] w-[48px] shrink-0 place-items-center rounded-full text-[16px] font-normal ${toneClass}`,
									children: stats.avg === null ? "—" : fmt(stats.avg, 1)
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ jsx("span", {
										className: "block truncate text-[14px] font-normal uppercase leading-tight tracking-[0.01em] text-white/95",
										children: subject.name
									}), /* @__PURE__ */ jsx("span", {
										className: "mt-1 block truncate text-[11px] uppercase leading-tight tracking-[0.015em] text-white/60",
										children: stats.count === 0 ? "Voti non presenti o disponibili" : `${stats.count} voti disponibili`
									})]
								}),
								/* @__PURE__ */ jsx(ChevronRight, {
									className: "h-5 w-5 shrink-0 text-white/75",
									strokeWidth: 1.8
								})
							]
						})
					}, subject.id);
				})
			})
		]
	});
}
//#endregion
export { Voti as component };
