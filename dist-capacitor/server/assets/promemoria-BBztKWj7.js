import { d as reminderDateToIso, n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { n as fmtDate } from "./dates-CdBXaUB1.js";
import { c as selectUpcomingReminders, s as selectPastReminders } from "./selectors-CnCjHj35.js";
import { r as Empty } from "./ui-D03OlNCN.js";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, CalendarPlus, Check, ChevronDown, Clock3 } from "lucide-react";
//#region src/routes/promemoria.tsx?tsr-split=component
function Promemoria() {
	return useVoto().registryStyle === "didup" ? /* @__PURE__ */ jsx(DidupPromemoria, {}) : /* @__PURE__ */ jsx(StandardPromemoria, {});
}
function reminderDate(value) {
	if (!value) return "DATA NON DISPONIBILE";
	const date = /* @__PURE__ */ new Date(`${value.slice(0, 10)}T12:00:00`);
	if (Number.isNaN(date.getTime())) return "DATA NON DISPONIBILE";
	return fmtDate(value, {
		day: "2-digit",
		month: "short",
		year: "2-digit"
	}).replace(/[.]/g, "").toLocaleUpperCase("it-IT");
}
function DidupPromemoria() {
	const v = useVoto();
	const now = useClock();
	const upcoming = useMemo(() => selectUpcomingReminders(v.data.notifications, now), [now, v.data.notifications]);
	const past = useMemo(() => [...selectPastReminders(v.data.notifications, now, 30)].reverse(), [now, v.data.notifications]);
	const [showPast, setShowPast] = useState(true);
	const studentName = (v.data.student.name || "STUDENTE").toLocaleUpperCase("it-IT");
	const renderReminder = (reminder) => /* @__PURE__ */ jsxs("li", {
		className: "min-h-[162px] border-b border-[#414141] bg-[#262729] px-[26px] pb-[18px] pt-[26px] last:border-b-0",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "relative h-[44px]",
			children: [
				/* @__PURE__ */ jsx("img", {
					src: "/didup-icons/person.png",
					alt: "",
					"aria-hidden": "true",
					className: "absolute left-0 top-[2px] h-[20px] w-[21px] object-contain"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "absolute left-[28px] right-0 top-[1px] truncate text-[18px] font-semibold leading-5 uppercase",
					children: reminder.teacher || reminder.subject || "SCUOLA"
				}),
				/* @__PURE__ */ jsx("time", {
					dateTime: reminder.date,
					className: "absolute left-0 top-[25px] whitespace-nowrap text-[15px] font-medium leading-4 text-[#0aa0b1]",
					children: reminderDate(reminder.date)
				})
			]
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-[32px] whitespace-pre-line break-words text-[18px] leading-[1.4] text-white/90",
			children: reminder.message?.trim() || reminder.title
		})]
	}, reminder.id);
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page min-h-dvh bg-black pb-[112px] text-white",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "flex items-center gap-[42px] pl-4 pr-[17px] pb-[44px] pt-[21px]",
				children: [
					/* @__PURE__ */ jsx(Link, {
						to: "/",
						"aria-label": "Torna alla home",
						className: "press flex h-10 w-8 shrink-0 items-center justify-start text-white",
						children: /* @__PURE__ */ jsx(ArrowLeft, {
							className: "h-7 w-7",
							strokeWidth: 1.7
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("h1", {
							className: "text-[24px] font-normal leading-none tracking-tight",
							children: "PROMEMORIA"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-[2px] truncate text-[14px] leading-none text-white/85",
							children: studentName
						})]
					}),
					/* @__PURE__ */ jsx("img", {
						src: "/didup-profile.jpg",
						alt: "",
						"aria-hidden": "true",
						className: "-translate-y-[4px] h-[62px] w-[62px] shrink-0 object-cover"
					})
				]
			}),
			upcoming.length > 0 ? /* @__PURE__ */ jsx("ul", {
				"aria-label": "Promemoria futuri",
				children: upcoming.map(renderReminder)
			}) : /* @__PURE__ */ jsx("p", {
				className: "bg-[#262729] px-[39px] py-9 text-[17px] text-white/80",
				children: "Nessun promemoria futuro."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex min-h-[59px] items-center justify-between gap-4 bg-black px-[26px]",
				children: [/* @__PURE__ */ jsx("span", {
					className: "text-[16px] italic tracking-wide text-white/90",
					children: "Mostra promemoria precedenti"
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					role: "switch",
					"aria-checked": showPast,
					"aria-label": "Mostra promemoria precedenti",
					onClick: () => setShowPast((current) => !current),
					className: `press relative h-[30px] w-[51px] shrink-0 rounded-full transition-colors ${showPast ? "bg-[#0aa0b1]" : "bg-[#55585a]"}`,
					children: /* @__PURE__ */ jsx("span", { className: `absolute top-[3px] h-[24px] w-[24px] rounded-full bg-white shadow-sm transition-[left] ${showPast ? "left-[24px]" : "left-[3px]"}` })
				})]
			}),
			showPast && (past.length > 0 ? /* @__PURE__ */ jsx("ul", {
				"aria-label": "Promemoria precedenti",
				children: past.map(renderReminder)
			}) : /* @__PURE__ */ jsx("p", {
				className: "border-t border-[#414141] bg-[#262729] px-[26px] py-5 text-[15px] text-white/75",
				children: "Nessun promemoria precedente negli ultimi 30 giorni."
			}))
		]
	});
}
function StandardPromemoria() {
	const v = useVoto();
	const now = useClock();
	const upcoming = useMemo(() => selectUpcomingReminders(v.data.notifications, now), [now, v.data.notifications]);
	const past = useMemo(() => selectPastReminders(v.data.notifications, now, 30), [now, v.data.notifications]);
	const renderReminder = (reminder) => {
		const read = v.isRead(reminder.id, reminder.read);
		const message = reminder.message?.trim() && reminder.message.trim() !== reminder.title.trim() ? reminder.message.trim() : "";
		const addedToVerifications = v.interrogazioni.some((item) => item.reminderId === reminder.id);
		return /* @__PURE__ */ jsx("li", {
			className: `card-surface p-4 ${!read ? "border-primary/30" : ""}`,
			children: /* @__PURE__ */ jsxs("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ jsx("span", {
					className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(Clock3, { className: "h-5 w-5" })
				}), /* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex flex-wrap items-center justify-between gap-2",
							children: [/* @__PURE__ */ jsx("h2", {
								className: "text-sm font-semibold",
								children: reminder.title
							}), !read && /* @__PURE__ */ jsx("span", {
								className: "rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary",
								children: "Nuovo"
							})]
						}),
						message ? /* @__PURE__ */ jsx("p", {
							className: "mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground",
							children: message
						}) : /* @__PURE__ */ jsx("p", {
							className: "mt-2 text-xs text-muted-foreground",
							children: "DidUP non ha fornito altri dettagli per questo promemoria."
						}),
						reminder.subject && /* @__PURE__ */ jsx("p", {
							className: "mt-2 text-xs text-muted-foreground",
							children: reminder.subject
						}),
						reminder.teacher && /* @__PURE__ */ jsxs("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: ["Docente: ", reminder.teacher]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-3 flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[11px] text-muted-foreground",
								children: reminder.date ? fmtDate(reminder.date, {
									day: "numeric",
									month: "long",
									year: "numeric"
								}) : "Senza data"
							}), !read && /* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: () => v.markRead([reminder.id]),
								className: "press inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold",
								children: [/* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }), " Segna come letto"]
							})]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							disabled: addedToVerifications,
							onClick: () => {
								const date = reminderDateToIso(reminder.date);
								const title = reminder.title.trim();
								const subject = reminder.subject?.trim() || "Promemoria";
								const notes = [
									title && title !== subject ? title : void 0,
									reminder.message?.trim(),
									!date ? "Data non specificata nel promemoria: da definire." : void 0
								].filter(Boolean).join("\n\n");
								v.addInterrogazione({
									subject,
									date: date ?? "",
									notes: notes || void 0,
									reminderId: reminder.id
								});
							},
							className: "press mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary disabled:border-success/30 disabled:bg-success-soft disabled:text-success",
							children: addedToVerifications ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }), " Aggiunto a Verifiche"] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(CalendarPlus, { className: "h-3.5 w-3.5" }), " Aggiungi a Verifiche"] })
						})
					]
				})]
			})
		}, reminder.id);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Promemoria"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Promemoria sincronizzati dal registro DidUP."
				})] }), /* @__PURE__ */ jsx("span", {
					className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(Clock3, { className: "h-5 w-5" })
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mt-5",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "mb-3 text-sm font-semibold",
					children: "Oggi e prossimamente"
				}), upcoming.length === 0 ? /* @__PURE__ */ jsx(Empty, {
					icon: /* @__PURE__ */ jsx(Clock3, { className: "h-6 w-6" }),
					title: "Nessun promemoria futuro",
					text: v.source === "demo" ? "I promemoria futuri appariranno quando colleghi i dati reali del registro." : "Non risultano promemoria futuri nei dati sincronizzati da DidUP."
				}) : /* @__PURE__ */ jsx("ul", {
					className: "space-y-3",
					children: upcoming.map(renderReminder)
				})]
			}),
			/* @__PURE__ */ jsxs("details", {
				className: "card-surface mt-5 overflow-hidden",
				children: [/* @__PURE__ */ jsxs("summary", {
					className: "flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold",
					children: [/* @__PURE__ */ jsx("span", { children: "Promemoria passati" }), /* @__PURE__ */ jsxs("span", {
						className: "flex items-center gap-2 text-xs font-medium text-muted-foreground",
						children: ["Ultimi 30 giorni ", /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })]
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "border-t border-border p-4",
					children: past.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted-foreground",
						children: "Non ci sono promemoria passati negli ultimi 30 giorni."
					}) : /* @__PURE__ */ jsx("ul", {
						className: "space-y-3",
						children: past.map(renderReminder)
					})
				})]
			})
		]
	});
}
//#endregion
export { Promemoria as component };
