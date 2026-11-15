import { r as useVoto } from "./store-EhdD6Ug3.js";
import { n as fmtDate } from "./dates-CdBXaUB1.js";
import { o as SectionTitle, r as Empty } from "./ui-D03OlNCN.js";
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, Check, EyeOff, StickyNote, UserRound } from "lucide-react";
//#region src/routes/note.tsx?tsr-split=component
function Note() {
	const v = useVoto();
	const notes = useMemo(() => v.data.notifications.filter((notification) => notification.type === "note").sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")), [v.data.notifications]);
	const studentName = (v.data.student.name || "ANDREA MARIA").toLocaleUpperCase("it-IT");
	if (v.registryStyle === "didup") return /* @__PURE__ */ jsx(DidupNotesPage, {
		notes,
		studentName,
		isRead: (id, remote) => v.isRead(id, remote),
		markRead: (ids) => v.markRead(ids)
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Note"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Note disciplinari e annotazioni ricevute dal registro."
				})] }), /* @__PURE__ */ jsx("span", {
					className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(StickyNote, { className: "h-5 w-5" })
				})]
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Note dal registro" }),
			notes.length === 0 ? /* @__PURE__ */ jsx(Empty, {
				icon: /* @__PURE__ */ jsx(StickyNote, { className: "h-6 w-6" }),
				title: "Nessuna nota",
				text: v.source === "demo" ? "Le note appariranno quando colleghi i dati reali del registro." : "Non risultano note nei dati sincronizzati."
			}) : /* @__PURE__ */ jsx("ul", {
				className: "space-y-3",
				children: notes.map((note) => {
					const read = v.isRead(note.id, note.read);
					const message = note.message?.trim() && note.message.trim() !== note.title.trim() ? note.message.trim() : "";
					return /* @__PURE__ */ jsx("li", {
						className: `card-surface p-4 ${!read ? "border-primary/30" : ""}`,
						children: /* @__PURE__ */ jsxs("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ jsx("span", {
								className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
								children: /* @__PURE__ */ jsx(StickyNote, { className: "h-5 w-5" })
							}), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center justify-between gap-2",
										children: [/* @__PURE__ */ jsx("h2", {
											className: "text-sm font-semibold",
											children: note.title
										}), !read && /* @__PURE__ */ jsx("span", {
											className: "rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary",
											children: "Nuova"
										})]
									}),
									message ? /* @__PURE__ */ jsx("p", {
										className: "mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground",
										children: message
									}) : /* @__PURE__ */ jsx("p", {
										className: "mt-2 text-xs text-muted-foreground",
										children: "Il registro non ha fornito altri dettagli per questa nota."
									}),
									note.subject && /* @__PURE__ */ jsx("p", {
										className: "mt-2 text-xs text-muted-foreground",
										children: note.subject
									}),
									note.teacher && /* @__PURE__ */ jsxs("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: ["Docente: ", note.teacher]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "mt-3 flex items-center justify-between gap-3",
										children: [/* @__PURE__ */ jsx("span", {
											className: "text-[11px] text-muted-foreground",
											children: fmtDate(note.date, {
												day: "numeric",
												month: "long",
												year: "numeric"
											})
										}), !read && /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => v.markRead([note.id]),
											className: "press inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold",
											children: [/* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }), " Segna come letta"]
										})]
									})
								]
							})]
						})
					}, note.id);
				})
			})
		]
	});
}
function DidupNotesPage({ notes, studentName, isRead, markRead }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page mx-auto min-h-dvh w-full max-w-[480px] bg-black pb-[112px] text-white",
		children: [/* @__PURE__ */ jsxs("header", {
			className: "flex min-h-[112px] items-center justify-between gap-4 px-4 pb-4 pr-2 pt-7",
			children: [
				/* @__PURE__ */ jsx(Link, {
					to: "/",
					"aria-label": "Torna alla Home",
					className: "flex h-10 w-9 shrink-0 items-center justify-start text-white/90",
					children: /* @__PURE__ */ jsx(ArrowLeft, {
						className: "h-7 w-7",
						strokeWidth: 1.8
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ jsx("h1", {
						className: "truncate text-[18px] font-normal uppercase leading-tight tracking-[0.04em]",
						children: "Note"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 truncate text-[12px] uppercase leading-tight text-white/90",
						children: studentName
					})]
				}),
				/* @__PURE__ */ jsx("img", {
					src: "/didup-profile-reference.png",
					alt: "",
					"aria-hidden": "true",
					className: "h-[42px] w-[42px] shrink-0 rounded-full object-contain"
				})
			]
		}), notes.length ? /* @__PURE__ */ jsx("ul", {
			className: "mt-4 space-y-3",
			children: notes.map((note) => {
				const read = isRead(note.id, note.read);
				const noteTime = note.date?.match(/[T ](\d{1,2}:\d{2})(?::\d{2})?/i)?.[1];
				return /* @__PURE__ */ jsxs("li", {
					className: "ml-[10px] mr-[2px] flex min-h-[228px] flex-col rounded-[12px] bg-[#252525] px-4 pb-4 pt-[18px]",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex min-w-0 items-center gap-2 text-white",
								children: [/* @__PURE__ */ jsx(UserRound, { className: "h-4 w-4 shrink-0 fill-[#4169a8] text-[#4169a8]" }), /* @__PURE__ */ jsx("span", {
									className: "truncate text-[16px] font-medium",
									children: note.teacher || "Nota"
								})]
							}), /* @__PURE__ */ jsx(EyeOff, {
								"aria-hidden": "true",
								className: "h-5 w-5 shrink-0 text-white/75"
							})]
						}),
						note.date && /* @__PURE__ */ jsx("time", {
							dateTime: note.date,
							className: "mt-2 block text-[14px] font-medium uppercase tracking-wide text-[#08a5b5]",
							children: fmtDate(note.date, {
								day: "2-digit",
								month: "short",
								year: "2-digit"
							}).replaceAll(".", "").toLocaleUpperCase("it-IT")
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-3 flex flex-wrap items-baseline gap-x-3 text-[15px] leading-5",
							children: [
								noteTime && /* @__PURE__ */ jsxs("span", { children: ["ORE: ", noteTime] }),
								noteTime && /* @__PURE__ */ jsx("span", {
									"aria-hidden": "true",
									children: "−"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "italic text-[#08a5b5]",
									children: note.subject || note.title
								})
							]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-6 whitespace-pre-line text-[16px] leading-[1.4] text-white",
							children: note.message || "Il testo della nota non è disponibile nei dati sincronizzati."
						}),
						/* @__PURE__ */ jsx("div", {
							className: "mt-auto flex justify-end pt-5",
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-pressed": read,
								disabled: read,
								onClick: () => markRead([note.id]),
								className: `min-h-8 rounded-[12px] px-4 text-[12px] font-medium uppercase tracking-[0.04em] text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${read ? "bg-[#087f8d]" : "bg-[#08a5b5] hover:bg-[#0bb3c4]"}`,
								children: "Presa visione"
							})
						})
					]
				}, note.id);
			})
		}) : /* @__PURE__ */ jsx("div", {
			className: "mx-[10px] mt-[14px] rounded-[12px] bg-[#252525] px-5 py-8 text-center text-[15px] text-white/80",
			children: "Nessuna nota nei dati sincronizzati."
		})]
	});
}
//#endregion
export { Note as component };
