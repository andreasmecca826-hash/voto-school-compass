import { t as cn } from "./utils-C_uf36nf.js";
import { r as useVoto } from "./store-EhdD6Ug3.js";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, CalendarDays, CalendarX2, ChevronRight } from "lucide-react";
//#region src/routes/assenze.tsx?tsr-split=component
function formatDate(date) {
	const parsed = /* @__PURE__ */ new Date(`${date.slice(0, 10)}T12:00:00`);
	if (Number.isNaN(parsed.getTime())) return date;
	return new Intl.DateTimeFormat("it-IT", {
		weekday: "long",
		day: "2-digit",
		month: "long",
		year: "numeric"
	}).format(parsed);
}
function Assenze() {
	const v = useVoto();
	const isDidup = v.registryStyle === "didup";
	const absences = useMemo(() => (v.data.attendanceEvents ?? []).filter((event) => event.type === "absence").sort((a, b) => b.date.localeCompare(a.date)), [v.data.attendanceEvents]);
	return /* @__PURE__ */ jsxs("div", {
		className: cn("min-h-dvh pb-8", isDidup ? "didup-page bg-black px-3 pb-[110px] text-white" : "pt-2"),
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: cn("flex items-center gap-3", isDidup ? "pt-3" : "py-2"),
				children: [
					/* @__PURE__ */ jsx(Link, {
						to: "/",
						"aria-label": "Torna alla dashboard",
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
							children: "Assenze"
						})]
					}),
					/* @__PURE__ */ jsx(CalendarX2, { className: cn("h-7 w-7", isDidup ? "text-[#e56b6f]" : "text-danger") })
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				"aria-label": "Riepilogo assenze",
				className: cn("mt-4 rounded-2xl border p-4", isDidup ? "border-white/10 bg-[#262626]" : "card-surface"),
				children: [/* @__PURE__ */ jsx("p", {
					className: cn("text-xs uppercase tracking-wide", isDidup ? "text-white/55" : "text-muted-foreground"),
					children: "Giorni di assenza"
				}), /* @__PURE__ */ jsx("p", {
					className: cn("mt-1 font-display text-4xl font-bold", isDidup ? "text-[#e56b6f]" : "text-danger"),
					children: Math.round(v.data.attendance.absenceDays)
				})]
			}),
			/* @__PURE__ */ jsxs(Link, {
				to: "/calendario-assenze",
				className: cn("press mt-4 flex min-h-12 w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold", isDidup ? "border-white/10 bg-[#262626] text-white" : "border-border bg-card text-foreground"),
				children: [/* @__PURE__ */ jsxs("span", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(CalendarDays, { className: cn("h-5 w-5", isDidup ? "text-[#08a5b5]" : "text-primary") }), "Apri calendario presenze"]
				}), /* @__PURE__ */ jsx(ChevronRight, { className: cn("h-4 w-4", isDidup ? "text-white/55" : "text-muted-foreground") })]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-6 flex items-center justify-between",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "font-display text-lg font-semibold",
					children: "Giorni registrati"
				}), /* @__PURE__ */ jsxs(Link, {
					to: "/eventi-appello",
					className: cn("press flex items-center gap-1 text-xs font-semibold", isDidup ? "text-[#08a5b5]" : "text-primary"),
					children: ["Tutti gli eventi ", /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" })]
				})]
			}),
			absences.length === 0 ? /* @__PURE__ */ jsxs("section", {
				className: cn("mt-3 rounded-2xl border p-8 text-center", isDidup ? "border-white/10 bg-[#262626] text-white/60" : "card-surface text-muted-foreground"),
				children: [/* @__PURE__ */ jsx(CalendarDays, { className: "mx-auto h-8 w-8 opacity-60" }), /* @__PURE__ */ jsx("p", {
					className: "mt-3 text-sm",
					children: "Non ci sono date di assenza dettagliate nei dati sincronizzati."
				})]
			}) : /* @__PURE__ */ jsx("ul", {
				className: cn("mt-3 divide-y", isDidup ? "divide-white/10" : "divide-border"),
				children: absences.map((event) => /* @__PURE__ */ jsxs("li", {
					className: cn("flex items-center gap-3 px-2 py-4", isDidup ? "text-white" : "text-foreground"),
					children: [/* @__PURE__ */ jsx("span", {
						className: cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", isDidup ? "bg-[#45282b] text-[#e56b6f]" : "bg-danger-soft text-danger"),
						children: /* @__PURE__ */ jsx(CalendarX2, { className: "h-5 w-5" })
					}), /* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-sm font-semibold capitalize",
							children: formatDate(event.date)
						}), /* @__PURE__ */ jsxs("p", {
							className: cn("mt-0.5 text-xs", isDidup ? "text-white/55" : "text-muted-foreground"),
							children: ["Assenza", event.justificationStatus ? ` · ${event.justificationStatus}` : " registrata"]
						})]
					})]
				}, event.id))
			})
		]
	});
}
//#endregion
export { Assenze as component };
