import { t as cn } from "./utils-C_uf36nf.js";
import { r as useVoto } from "./store-EhdD6Ug3.js";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, CalendarDays, CalendarX2, CheckCircle2, Clock3, LogOut } from "lucide-react";
//#region src/routes/eventi-appello.tsx?tsr-split=component
function formatDate(iso) {
	const parsed = /* @__PURE__ */ new Date(`${iso.slice(0, 10)}T12:00:00`);
	if (Number.isNaN(parsed.getTime())) return iso;
	return new Intl.DateTimeFormat("it-IT", {
		weekday: "long",
		day: "2-digit",
		month: "long",
		year: "numeric"
	}).format(parsed);
}
function isJustified(event) {
	const status = event.justificationStatus?.trim().toLocaleLowerCase("it-IT");
	if (!status || status.includes("da giustificare") || status.includes("non giustificat")) return false;
	return status.startsWith("giustificat") || [
		"ok",
		"approved",
		"complete",
		"completata",
		"completato"
	].includes(status);
}
var FILTERS = [
	{
		value: "all",
		label: "Tutti"
	},
	{
		value: "absence",
		label: "Assenze"
	},
	{
		value: "delay",
		label: "Ritardi"
	},
	{
		value: "earlyExit",
		label: "Uscite"
	}
];
function eventMeta(type) {
	if (type === "absence") return {
		label: "Assenza",
		description: "Giorno di assenza",
		icon: CalendarX2,
		tone: "text-danger bg-danger-soft"
	};
	if (type === "delay") return {
		label: "Ritardo",
		description: "Ingresso in ritardo",
		icon: Clock3,
		tone: "text-warning bg-warning-soft"
	};
	return {
		label: "Uscita anticipata",
		description: "Uscita registrata",
		icon: LogOut,
		tone: "text-primary bg-primary-soft"
	};
}
function EventiAppello() {
	const v = useVoto();
	const [filter, setFilter] = useState("all");
	const [onlyPending, setOnlyPending] = useState(false);
	const events = useMemo(() => [...v.data.attendanceEvents ?? []].sort((a, b) => b.date.localeCompare(a.date)), [v.data.attendanceEvents]);
	const visibleEvents = useMemo(() => events.filter((event) => (filter === "all" || event.type === filter) && (!onlyPending || !isJustified(event))), [
		events,
		filter,
		onlyPending
	]);
	const counts = useMemo(() => ({
		absence: events.filter((event) => event.type === "absence").length,
		delay: events.filter((event) => event.type === "delay").length,
		earlyExit: events.filter((event) => event.type === "earlyExit").length
	}), [events]);
	const pendingCount = events.filter((event) => !isJustified(event)).length;
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-dvh pb-8",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "flex items-center gap-3 py-2",
				children: [
					/* @__PURE__ */ jsx(Link, {
						to: "/",
						"aria-label": "Torna alla dashboard",
						className: "press flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground",
						children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-[11px] uppercase tracking-wide text-muted-foreground",
							children: "Presenze"
						}), /* @__PURE__ */ jsx("h1", {
							className: "truncate font-display text-2xl font-semibold",
							children: "Tutti gli eventi"
						})]
					}),
					/* @__PURE__ */ jsx(CalendarDays, { className: "h-7 w-7 text-primary" })
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface mt-4 p-4",
				"aria-label": "Riepilogo eventi",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-xs uppercase tracking-wide text-muted-foreground",
					children: "Riepilogo personale"
				}), /* @__PURE__ */ jsxs("div", {
					className: "mt-3 grid grid-cols-3 gap-2",
					children: [
						/* @__PURE__ */ jsx(Summary, {
							value: counts.absence || Math.round(v.data.attendance.absenceDays),
							label: "Assenze",
							tone: "danger"
						}),
						/* @__PURE__ */ jsx(Summary, {
							value: counts.delay || v.data.attendance.delays,
							label: "Ritardi",
							tone: "warning"
						}),
						/* @__PURE__ */ jsx(Summary, {
							value: counts.earlyExit || v.data.attendance.earlyExits,
							label: "Uscite",
							tone: "primary"
						})
					]
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-6 flex gap-2 overflow-x-auto pb-1",
				role: "tablist",
				"aria-label": "Filtra eventi",
				children: FILTERS.map((item) => /* @__PURE__ */ jsx("button", {
					type: "button",
					role: "tab",
					"aria-selected": filter === item.value,
					onClick: () => setFilter(item.value),
					className: cn("press shrink-0 rounded-full border px-4 py-2 text-xs font-semibold", filter === item.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"),
					children: item.label
				}, item.value))
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				"aria-pressed": onlyPending,
				onClick: () => setOnlyPending((current) => !current),
				className: cn("mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm", onlyPending ? "border-warning bg-warning-soft" : "border-border bg-card"),
				children: [/* @__PURE__ */ jsx("span", { children: "Mostra solo da giustificare" }), /* @__PURE__ */ jsx("span", {
					className: "rounded-full bg-background px-2 py-0.5 text-xs font-semibold",
					children: pendingCount
				})]
			}),
			/* @__PURE__ */ jsx("h2", {
				className: "mt-6 font-display text-lg font-semibold",
				children: "Eventi registrati"
			}),
			visibleEvents.length === 0 ? /* @__PURE__ */ jsxs("section", {
				className: "card-surface mt-3 p-8 text-center text-sm text-muted-foreground",
				children: [/* @__PURE__ */ jsx(CalendarDays, { className: "mx-auto h-8 w-8 opacity-60" }), /* @__PURE__ */ jsx("p", {
					className: "mt-3",
					children: events.length === 0 ? "Non ci sono date dettagliate negli eventi sincronizzati." : onlyPending ? "Non ci sono eventi da giustificare." : "Nessun evento per questo filtro."
				})]
			}) : /* @__PURE__ */ jsx("ul", {
				className: "mt-3 space-y-2",
				children: visibleEvents.map((event) => {
					const meta = eventMeta(event.type);
					const Icon = meta.icon;
					const justified = isJustified(event);
					return /* @__PURE__ */ jsxs("li", {
						className: "card-surface flex items-center gap-3 p-3",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", meta.tone),
								children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ jsx("p", {
										className: "text-sm font-semibold",
										children: meta.label
									}),
									/* @__PURE__ */ jsx("time", {
										dateTime: event.date,
										className: "mt-0.5 block text-xs capitalize text-muted-foreground",
										children: formatDate(event.date)
									}),
									/* @__PURE__ */ jsx("p", {
										className: "mt-1 text-[11px] text-muted-foreground",
										children: meta.description
									})
								]
							}),
							/* @__PURE__ */ jsxs("span", {
								className: cn("flex shrink-0 items-center gap-1 text-[10px] font-semibold", justified ? "text-success" : "text-danger"),
								children: [justified ? /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }) : null, justified ? "Giustificato" : "Da giustificare"]
							})
						]
					}, event.id);
				})
			})
		]
	});
}
function Summary({ value, label, tone }) {
	const toneClass = {
		danger: "text-danger",
		warning: "text-warning",
		primary: "text-primary"
	}[tone];
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-xl bg-surface p-3 text-center",
		children: [/* @__PURE__ */ jsx("p", {
			className: cn("tabular text-2xl font-bold", toneClass),
			children: value
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-1 text-[10px] uppercase text-muted-foreground",
			children: label
		})]
	});
}
//#endregion
export { EventiAppello as component };
