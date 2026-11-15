import { t as cn } from "./utils-C_uf36nf.js";
import { n as useSchoolPeriods } from "./periods-context-BiByHTyY.js";
import { c as subjectStats, i as fmt, o as neededGrade } from "./calc-DWBiEBUY.js";
import { c as SubjectMark, i as GradePill } from "./ui-D03OlNCN.js";
import { t as Slider } from "./slider-BjtFJp27.js";
import { useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/voto/SimulatorTool.tsx
function StepLabel({ n, children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "mb-2 flex items-center gap-2",
		children: [/* @__PURE__ */ jsx("span", {
			className: "flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft font-display text-[11px] font-semibold text-primary",
			children: n
		}), /* @__PURE__ */ jsx("span", {
			className: "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
			children
		})]
	});
}
function SimulatorTool({ subjectId }) {
	const { subjects } = useSchoolPeriods();
	const [sid, setSid] = useState(subjectId ?? subjects[0]?.id ?? "");
	const [target, setTarget] = useState(7);
	const [scenario, setScenario] = useState(7);
	const s = subjects.find((x) => x.id === sid) ?? subjects[0];
	const stats = s ? subjectStats(s) : null;
	const current = stats?.avg ?? null;
	useEffect(() => {
		const id = subjectId ?? subjects[0]?.id ?? "";
		setSid(id);
		const sub = subjects.find((x) => x.id === id);
		const a = sub ? subjectStats(sub).avg : null;
		setTarget(a === null ? 6 : Math.min(10, Math.max(6, Math.ceil((a + .25) * 2) / 2)));
	}, [subjectId, subjects]);
	const res = s ? neededGrade(s.grades, target, 1, true) : {
		status: "reached",
		needed: 0
	};
	const scenarioWeightSum = s?.grades.reduce((acc, g) => acc + (g.weight > 0 ? g.weight : 1), 0) ?? 0;
	const scenarioValueSum = s?.grades.reduce((acc, g) => acc + g.value * (g.weight > 0 ? g.weight : 1), 0) ?? 0;
	const scenarioAvg = s && scenarioWeightSum > 0 ? (scenarioValueSum + scenario) / (scenarioWeightSum + 1) : null;
	return !s ? /* @__PURE__ */ jsx("p", {
		className: "text-sm text-muted-foreground",
		children: "Nessuna materia disponibile per simulare il prossimo voto."
	}) : /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("label", {
			className: "mb-1.5 block text-xs text-muted-foreground",
			htmlFor: "sim-subject",
			children: "Materia"
		}),
		/* @__PURE__ */ jsx("select", {
			id: "sim-subject",
			value: s.id,
			onChange: (event) => setSid(event.target.value),
			className: "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm",
			children: subjects.map((subject) => /* @__PURE__ */ jsx("option", {
				value: subject.id,
				children: subject.name
			}, subject.id))
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "card-surface mt-5 p-4",
			children: [/* @__PURE__ */ jsx(StepLabel, {
				n: 1,
				children: "Situazione attuale"
			}), /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [
					/* @__PURE__ */ jsx(SubjectMark, {
						name: s.name,
						color: s.color,
						size: 44
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("p", {
							className: "truncate text-sm font-medium",
							children: s.name
						}), /* @__PURE__ */ jsxs("p", {
							className: "text-xs text-muted-foreground",
							children: [
								stats?.count ?? 0,
								" voti registrati",
								(stats?.max ?? null) !== null && /* @__PURE__ */ jsxs(Fragment, { children: [
									" ",
									"· min ",
									fmt(stats.min, 1),
									" · max ",
									fmt(stats.max, 1)
								] })
							]
						})]
					}),
					/* @__PURE__ */ jsx(GradePill, {
						value: current,
						className: "text-base"
					})
				]
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "card-surface mt-3 p-4",
			children: [
				/* @__PURE__ */ jsx(StepLabel, {
					n: 2,
					children: "Il tuo obiettivo"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-baseline justify-between",
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted-foreground",
						children: "Media che vuoi raggiungere"
					}), /* @__PURE__ */ jsx("span", {
						className: "tabular font-display text-2xl font-semibold",
						children: fmt(target, 2)
					})]
				}),
				/* @__PURE__ */ jsx(Slider, {
					className: "mt-3",
					min: 4,
					max: 10,
					step: .25,
					value: [target],
					onValueChange: (value) => setTarget(value[0] ?? target),
					"aria-label": "Media obiettivo"
				})
			]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: cn("mt-3 rounded-2xl border p-5 text-center", res.status === "impossible" ? "border-danger/30 bg-danger-soft" : res.status === "reached" ? "border-success/30 bg-success-soft" : "border-primary/30 bg-primary-soft"),
			children: [/* @__PURE__ */ jsx(StepLabel, {
				n: 3,
				children: "Risultato"
			}), res.status === "reached" ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
				className: "mt-2 font-display text-xl font-semibold text-success",
				children: "Obiettivo già raggiunto"
			}), /* @__PURE__ */ jsxs("p", {
				className: "mt-1.5 text-xs leading-relaxed text-muted-foreground",
				children: [
					"Qualsiasi voto prendi, la media resta almeno ",
					fmt(target, 2),
					"."
				]
			})] }) : res.status === "impossible" ? /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground",
					children: "Per raggiungere l'obiettivo devi prendere almeno"
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "tabular mt-1 font-display text-5xl font-semibold text-danger",
					children: [fmt(target, 0), "+"]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-1.5 text-xs leading-relaxed text-muted-foreground",
					children: "Non raggiungibile con un solo voto: serviranno più verifiche."
				})
			] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-xs font-medium uppercase tracking-wider text-muted-foreground",
					children: "Per raggiungere l'obiettivo devi prendere almeno"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "tabular mt-1 font-display text-5xl font-semibold text-primary",
					children: fmt(res.needed, 1)
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "mt-1.5 text-xs leading-relaxed text-muted-foreground",
					children: [
						"alla prossima verifica in ",
						s.name,
						"."
					]
				})
			] })]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "card-surface mt-3 p-4",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
					children: "E se invece prendi…"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-2 flex items-center justify-between",
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted-foreground",
						children: "Voto ipotetico alla prossima verifica"
					}), /* @__PURE__ */ jsx("span", {
						className: "tabular font-display text-base font-semibold",
						children: fmt(scenario, 2)
					})]
				}),
				/* @__PURE__ */ jsx(Slider, {
					className: "mt-3",
					min: 1,
					max: 10,
					step: .25,
					value: [scenario],
					onValueChange: (value) => setScenario(value[0] ?? scenario),
					"aria-label": "Voto ipotetico"
				}),
				scenarioAvg !== null && current !== null && /* @__PURE__ */ jsxs("div", {
					className: "mt-3 flex items-center justify-between border-t border-border pt-3 text-xs",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "text-muted-foreground",
						children: [
							"La media di ",
							s.name,
							" diventerebbe"
						]
					}), /* @__PURE__ */ jsxs("span", {
						className: "tabular flex items-center gap-1.5 font-semibold",
						children: [/* @__PURE__ */ jsx(GradePill, { value: scenarioAvg }), /* @__PURE__ */ jsxs("span", {
							className: cn(scenarioAvg >= current ? "text-success" : "text-danger"),
							children: [scenarioAvg >= current ? "+" : "", fmt(scenarioAvg - current)]
						})]
					})]
				})
			]
		})
	] });
}
//#endregion
export { SimulatorTool as t };
