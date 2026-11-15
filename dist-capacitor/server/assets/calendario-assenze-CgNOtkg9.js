import { t as cn } from "./utils-C_uf36nf.js";
import { r as useVoto } from "./store-EhdD6Ug3.js";
import { n as useSchoolPeriods } from "./periods-context-BiByHTyY.js";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, CalendarDays } from "lucide-react";
//#region src/components/voto/AttendanceCalendar.tsx
var MONTHS = [
	"Gennaio",
	"Febbraio",
	"Marzo",
	"Aprile",
	"Maggio",
	"Giugno",
	"Luglio",
	"Agosto",
	"Settembre",
	"Ottobre",
	"Novembre",
	"Dicembre"
];
var EMPTY_EVENTS = [];
function dateKey(year, month, day) {
	return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isWeekday(date) {
	const day = date.getDay();
	return day !== 0 && day !== 6;
}
function createMonths(year, events, today) {
	const eventByDate = new Map(events.map((event) => [event.date.slice(0, 10), event]));
	return Array.from({ length: 10 }, (_, index) => {
		const monthIndex = (8 + index) % 12;
		const monthYear = index < 4 ? year : year + 1;
		const daysInMonth = new Date(monthYear, monthIndex + 1, 0).getDate();
		const days = [];
		for (let day = 1; day <= daysInMonth; day += 1) {
			if (!isWeekday(new Date(monthYear, monthIndex, day))) continue;
			const key = dateKey(monthYear, monthIndex, day);
			const event = eventByDate.get(key);
			const status = key > today ? "future" : event?.type === "absence" ? "absence" : event ? "exception" : "present";
			days.push({
				date: key,
				day,
				status,
				...event ? { event } : {}
			});
		}
		return {
			key: `${monthYear}-${String(monthIndex + 1).padStart(2, "0")}`,
			label: MONTHS[monthIndex] ?? "",
			days
		};
	});
}
var statusLabel = {
	present: "Presente",
	absence: "Assenza",
	exception: "Ritardo o uscita anticipata",
	future: "Giorno futuro"
};
function AttendanceCalendar({ isDidup = false }) {
	const v = useVoto();
	const { config } = useSchoolPeriods();
	const events = v.data.attendanceEvents ?? EMPTY_EVENTS;
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	const months = useMemo(() => createMonths(config.year, events, today), [
		config.year,
		events,
		today
	]);
	const knownAbsences = events.filter((event) => event.type === "absence").length;
	const knownExceptions = events.filter((event) => event.type !== "absence").length;
	return /* @__PURE__ */ jsxs("section", {
		"aria-labelledby": "attendance-calendar-title",
		className: cn("mt-6 space-y-3 rounded-2xl border p-4", isDidup ? "border-white/10 bg-[#202020] text-white" : "border-border bg-card text-foreground"),
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h2", {
					id: "attendance-calendar-title",
					className: "flex items-center gap-2 font-display text-lg font-semibold",
					children: [/* @__PURE__ */ jsx(CalendarDays, { className: cn("h-5 w-5", isDidup ? "text-[#08a5b5]" : "text-primary") }), "Calendario presenze"]
				}), /* @__PURE__ */ jsxs("p", {
					className: cn("mt-1 text-xs", isDidup ? "text-white/55" : "text-muted-foreground"),
					children: [
						"Anno scolastico ",
						config.year,
						"/",
						config.year + 1,
						" · solo giorni feriali"
					]
				})] }), /* @__PURE__ */ jsxs("span", {
					className: cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", isDidup ? "bg-[#263c3f] text-[#57d4df]" : "bg-primary-soft text-primary"),
					children: [knownAbsences, " assenze"]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: cn("flex flex-wrap gap-x-3 gap-y-2 rounded-xl border p-3 text-[10px]", isDidup ? "border-white/10 bg-[#262626] text-white/65" : "border-border bg-surface text-muted-foreground"),
				children: [
					/* @__PURE__ */ jsx(Legend, {
						color: "bg-[#70b51b]",
						label: "Presente"
					}),
					/* @__PURE__ */ jsx(Legend, {
						color: "bg-[#ef3125]",
						label: "Assenza"
					}),
					/* @__PURE__ */ jsx(Legend, {
						color: "bg-[#f39a16]",
						label: "Ritardo / uscita"
					}),
					/* @__PURE__ */ jsx(Legend, {
						color: "bg-[#aeb3b8]",
						label: "Futuro"
					})
				]
			}),
			!events.length && /* @__PURE__ */ jsx("p", {
				className: cn("rounded-xl border p-3 text-xs", isDidup ? "border-white/10 bg-[#262626] text-white/60" : "border-warning/20 bg-warning/10 text-warning"),
				children: "Il registro non ha fornito eventi giornalieri dettagliati: i giorni verdi sono una stima visiva e non sostituiscono il riepilogo ufficiale."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "space-y-2",
				children: months.map((month) => {
					return /* @__PURE__ */ jsxs("div", {
						className: cn("overflow-hidden rounded-2xl border", isDidup ? "border-white/10 bg-[#262626]" : "border-border bg-card"),
						children: [/* @__PURE__ */ jsx("div", {
							className: "flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left",
							children: /* @__PURE__ */ jsxs("span", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-display text-base font-semibold",
									children: month.label
								}), /* @__PURE__ */ jsxs("span", {
									className: cn("mt-1 block text-[10px]", isDidup ? "text-white/45" : "text-muted-foreground"),
									children: [month.days.length, " giorni feriali"]
								})]
							})
						}), /* @__PURE__ */ jsx("div", {
							className: "no-scrollbar flex flex-nowrap gap-[5px] overflow-x-auto px-4 pb-4",
							"aria-label": `Calendario presenze ${month.label}`,
							children: month.days.map((item) => /* @__PURE__ */ jsx("span", {
								title: `${item.day} ${month.label}: ${statusLabel[item.status]}${item.event?.justificationStatus ? ` · ${item.event.justificationStatus}` : ""}`,
								"aria-label": `${item.day} ${month.label}: ${statusLabel[item.status]}`,
								className: cn("h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm transition-transform", item.status === "present" && "bg-[#70b51b]", item.status === "absence" && "bg-[#ef3125]", item.status === "exception" && "bg-[#f39a16]", item.status === "future" && "bg-[#aeb3b8]")
							}, item.date))
						})]
					}, month.key);
				})
			}),
			knownExceptions > 0 && /* @__PURE__ */ jsxs("p", {
				className: cn("text-[10px] leading-4", isDidup ? "text-white/40" : "text-muted-foreground"),
				children: [knownExceptions, " ritardi o uscite anticipate rilevati."]
			})
		]
	});
}
function Legend({ color, label }) {
	return /* @__PURE__ */ jsxs("span", {
		className: "inline-flex items-center gap-1.5",
		children: [/* @__PURE__ */ jsx("span", { className: cn("h-2.5 w-2.5 rounded-full", color) }), label]
	});
}
//#endregion
//#region src/routes/calendario-assenze.tsx?tsr-split=component
function CalendarioAssenze() {
	const isDidup = useVoto().registryStyle === "didup";
	return /* @__PURE__ */ jsxs("main", {
		className: cn("min-h-dvh pb-8", isDidup ? "didup-page bg-black px-3 pb-[110px] text-white" : "pt-2"),
		children: [/* @__PURE__ */ jsxs("header", {
			className: cn("flex items-center gap-3", isDidup ? "pt-3" : "py-2"),
			children: [
				/* @__PURE__ */ jsx(Link, {
					to: "/assenze",
					"aria-label": "Torna ad Assenze",
					className: cn("press flex h-10 w-10 items-center justify-center rounded-full", isDidup ? "text-white" : "border border-border text-foreground"),
					children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-5 w-5" })
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ jsx("p", {
						className: cn("text-[11px] uppercase tracking-wide", isDidup ? "text-white/55" : "text-muted-foreground"),
						children: "Presenze"
					}), /* @__PURE__ */ jsx("h1", {
						className: "truncate font-display text-2xl font-semibold",
						children: "Calendario presenze"
					})]
				}),
				/* @__PURE__ */ jsx(CalendarDays, { className: cn("h-7 w-7", isDidup ? "text-[#08a5b5]" : "text-primary") })
			]
		}), /* @__PURE__ */ jsx(AttendanceCalendar, { isDidup })]
	});
}
//#endregion
export { CalendarioAssenze as component };
