import { t as cn } from "./utils-C_uf36nf.js";
import { r as useVoto, u as presentInterrogazione } from "./store-EhdD6Ug3.js";
import { n as fmtDate } from "./dates-CdBXaUB1.js";
import { o as SectionTitle, r as Empty } from "./ui-D03OlNCN.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { CalendarDays, Check, Clock3, Plus, Trash2 } from "lucide-react";
//#region src/routes/interrogazioni.tsx?tsr-split=component
function todayIso() {
	const now = /* @__PURE__ */ new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
function Interrogazioni() {
	const v = useVoto();
	const [subject, setSubject] = useState("");
	const [date, setDate] = useState(todayIso);
	const [hour, setHour] = useState(1);
	const [notes, setNotes] = useState("");
	const items = useMemo(() => [...v.interrogazioni].sort((a, b) => Number(a.completed) - Number(b.completed) || `${a.date}${a.hour ?? 0}`.localeCompare(`${b.date}${b.hour ?? 0}`)), [v.interrogazioni]);
	function add() {
		const cleanSubject = subject.trim();
		if (!cleanSubject || !date) return;
		v.addInterrogazione({
			subject: cleanSubject,
			date,
			hour,
			notes: notes.trim() || void 0
		});
		setSubject("");
		setHour(1);
		setNotes("");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "font-display text-2xl font-semibold",
				children: "Interrogazioni"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-1 text-xs text-muted-foreground",
				children: "Segna qui le prossime interrogazioni da ricordare."
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Nuova interrogazione" }),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface p-4",
				children: [
					/* @__PURE__ */ jsx("label", {
						className: "text-xs font-medium text-muted-foreground",
						htmlFor: "interrogazione-materia",
						children: "Materia"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "interrogazione-materia",
						value: subject,
						onChange: (e) => setSubject(e.target.value),
						placeholder: "Es. Matematica",
						className: "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ jsxs("label", {
							className: "text-xs font-medium text-muted-foreground",
							children: ["Data", /* @__PURE__ */ jsx("input", {
								type: "date",
								value: date,
								onChange: (e) => setDate(e.target.value),
								className: "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
							})]
						}), /* @__PURE__ */ jsxs("label", {
							className: "text-xs font-medium text-muted-foreground",
							children: ["Fascia oraria", /* @__PURE__ */ jsx("select", {
								value: hour,
								onChange: (e) => setHour(Number(e.target.value)),
								className: "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm",
								children: [
									1,
									2,
									3,
									4,
									5,
									6
								].map((value) => /* @__PURE__ */ jsxs("option", {
									value,
									children: [value, "ª ora"]
								}, value))
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "mt-3 block text-xs font-medium text-muted-foreground",
						children: ["Note", /* @__PURE__ */ jsx("textarea", {
							value: notes,
							onChange: (e) => setNotes(e.target.value),
							placeholder: "Capitoli, argomenti...",
							rows: 2,
							className: "mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm"
						})]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						disabled: !subject.trim() || !date,
						onClick: add,
						className: "press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50",
						children: [/* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }), " Aggiungi"]
					})
				]
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Le tue interrogazioni" }),
			items.length === 0 ? /* @__PURE__ */ jsx(Empty, {
				icon: /* @__PURE__ */ jsx(CalendarDays, { className: "h-6 w-6" }),
				title: "Nessuna interrogazione",
				text: "Aggiungi una data per non dimenticarla."
			}) : /* @__PURE__ */ jsx("ul", {
				className: "space-y-2",
				children: items.map((item) => {
					const presentation = presentInterrogazione(item);
					const showSubjectLabel = item.notes && presentation.subject && !presentation.isVerification && presentation.subject.toLocaleLowerCase("it-IT") !== "promemoria" && presentation.subject !== item.notes;
					return /* @__PURE__ */ jsxs("li", {
						className: cn("card-surface flex items-start gap-3 p-3.5", item.completed && "opacity-55"),
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => v.toggleInterrogazione(item.id),
								"aria-label": item.completed ? "Segna come da fare" : "Segna come fatta",
								className: cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", item.completed ? "border-success bg-success-soft text-success" : "border-border text-muted-foreground"),
								children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-start justify-between gap-2",
										children: [/* @__PURE__ */ jsx("p", {
											className: cn("min-w-0 flex-1 whitespace-pre-wrap font-semibold leading-relaxed", item.completed && "line-through"),
											children: presentation.title
										}), item.reminderId && /* @__PURE__ */ jsx("span", {
											className: cn("shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold", presentation.isVerification ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-primary-soft text-primary"),
											children: presentation.isVerification ? "Verifica" : "Promemoria"
										})]
									}),
									showSubjectLabel && /* @__PURE__ */ jsx("p", {
										className: "mt-1 text-[11px] text-muted-foreground",
										children: presentation.subject
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground",
										children: [/* @__PURE__ */ jsxs("span", {
											className: "inline-flex items-center gap-1",
											children: [/* @__PURE__ */ jsx(CalendarDays, { className: "h-3.5 w-3.5" }), item.date ? fmtDate(item.date) : "Data da definire"]
										}), (item.hour || item.time) && /* @__PURE__ */ jsxs("span", {
											className: "inline-flex items-center gap-1",
											children: [/* @__PURE__ */ jsx(Clock3, { className: "h-3.5 w-3.5" }), item.hour ? `${item.hour}ª ora` : item.time]
										})]
									}),
									presentation.notes && /* @__PURE__ */ jsx("p", {
										className: "mt-2 text-xs text-muted-foreground",
										children: presentation.notes
									})
								]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => v.removeInterrogazione(item.id),
								"aria-label": `Elimina interrogazione di ${item.subject}`,
								className: "press rounded-lg p-2 text-muted-foreground hover:text-danger",
								children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
							})
						]
					}, item.id);
				})
			})
		]
	});
}
//#endregion
export { Interrogazioni as component };
