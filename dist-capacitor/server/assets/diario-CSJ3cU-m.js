import { r as useVoto } from "./store-EhdD6Ug3.js";
import { a as parseIso, n as fmtDate, s as toIso } from "./dates-CdBXaUB1.js";
import { o as SectionTitle, r as Empty } from "./ui-D03OlNCN.js";
import { useMemo, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, UserRound } from "lucide-react";
//#region src/routes/diario.tsx?tsr-split=component
function Diario() {
	return useVoto().registryStyle === "didup" ? /* @__PURE__ */ jsx(DidupDiario, {}) : /* @__PURE__ */ jsx(StandardDiario, {});
}
function StandardDiario() {
	const v = useVoto();
	const [subject, setSubject] = useState("tutte");
	const subjects = useMemo(() => [...new Set(v.data.diary.map((entry) => entry.subject).filter(Boolean))].sort(), [v.data.diary]);
	const entries = useMemo(() => v.data.diary.filter((entry) => subject === "tutte" || entry.subject === subject).sort((a, b) => `${b.date}${b.hour ?? ""}`.localeCompare(`${a.date}${a.hour ?? ""}`)), [subject, v.data.diary]);
	const days = useMemo(() => {
		const grouped = /* @__PURE__ */ new Map();
		entries.forEach((entry) => grouped.set(entry.date, [...grouped.get(entry.date) ?? [], entry]));
		return [...grouped.entries()];
	}, [entries]);
	return /* @__PURE__ */ jsxs("div", {
		className: "diario-standard-page pt-3",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Diario"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Cosa hanno svolto i professori in classe."
				})] }), /* @__PURE__ */ jsx("span", {
					className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(BookOpen, { className: "h-5 w-5" })
				})]
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Attività svolte" }),
			subjects.length > 0 && /* @__PURE__ */ jsxs("select", {
				value: subject,
				onChange: (event) => setSubject(event.target.value),
				className: "mb-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground",
				"aria-label": "Filtra per materia",
				children: [/* @__PURE__ */ jsx("option", {
					value: "tutte",
					children: "Tutte le materie"
				}), subjects.map((item) => /* @__PURE__ */ jsx("option", {
					value: item,
					children: item
				}, item))]
			}),
			days.length === 0 ? /* @__PURE__ */ jsx(Empty, {
				icon: /* @__PURE__ */ jsx(BookOpen, { className: "h-6 w-6" }),
				title: "Nessuna attività",
				text: v.source === "demo" ? "Il diario apparirà quando colleghi i dati reali del registro." : "Non ci sono attività per questo filtro."
			}) : /* @__PURE__ */ jsx("div", {
				className: "space-y-5",
				children: days.map(([date, dayEntries]) => /* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsxs("div", {
					className: "mb-2 flex items-center gap-2 text-sm font-semibold capitalize",
					children: [/* @__PURE__ */ jsx(CalendarDays, { className: "h-4 w-4 text-primary" }), fmtDate(date, {
						weekday: "long",
						day: "numeric",
						month: "long",
						year: "numeric"
					})]
				}), /* @__PURE__ */ jsx("ul", {
					className: "space-y-2",
					children: dayEntries.map((entry) => /* @__PURE__ */ jsx("li", {
						className: "card-surface p-4",
						children: /* @__PURE__ */ jsxs("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ jsx("span", {
								className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
								children: /* @__PURE__ */ jsx(BookOpen, { className: "h-5 w-5" })
							}), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex flex-wrap items-center gap-x-2 gap-y-1",
										children: [/* @__PURE__ */ jsx("p", {
											className: "diario-entry-copy font-semibold",
											children: entry.subject || "Attività"
										}), entry.hour && /* @__PURE__ */ jsxs("span", {
											className: "text-[11px] text-muted-foreground",
											children: [entry.hour, "ª ora"]
										})]
									}),
									/* @__PURE__ */ jsx("p", {
										className: "diario-entry-copy mt-3 text-sm leading-relaxed text-foreground",
										children: entry.activity
									}),
									entry.teacher && /* @__PURE__ */ jsxs("p", {
										className: "diario-entry-copy mt-3 inline-flex max-w-full flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground",
										children: [/* @__PURE__ */ jsx(UserRound, { className: "h-3.5 w-3.5 shrink-0" }), entry.teacher]
									})
								]
							})]
						})
					}, entry.id))
				})] }, date))
			})
		]
	});
}
function DidupDiario() {
	const voto = useVoto();
	const [selectedDate, setSelectedDate] = useState(null);
	const [tab, setTab] = useState("attivita");
	const latestActivityDate = useMemo(() => {
		const latest = [...voto.data.diary].map((entry) => entry.date).filter(Boolean).sort().at(-1);
		return latest ? parseIso(latest) : /* @__PURE__ */ new Date();
	}, [voto.data.diary]);
	const activeDate = selectedDate ?? latestActivityDate;
	const activeDateKey = toIso(activeDate);
	const activities = useMemo(() => voto.data.diary.filter((entry) => entry.date === activeDateKey).sort((a, b) => lessonNumber(a) - lessonNumber(b)), [activeDateKey, voto.data.diary]);
	const assignments = useMemo(() => voto.data.assignments.filter((assignment) => assignment.dueDate === activeDateKey).sort((a, b) => (a.dueTime ?? "").localeCompare(b.dueTime ?? "")), [activeDateKey, voto.data.assignments]);
	const studentName = (voto.data.student.name ?? "").toUpperCase();
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page touch-pan-y flex h-[calc(100svh-86px)] min-h-0 flex-col overflow-hidden bg-black px-2 text-white",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "flex shrink-0 items-start justify-between px-2 pt-5",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "text-[20px] font-normal leading-6",
					children: "Diario"
				}), studentName && /* @__PURE__ */ jsx("p", {
					className: "mt-0.5 text-[12px] leading-4",
					children: studentName
				})] }), /* @__PURE__ */ jsx("img", {
					src: "/didup-profile.jpg",
					alt: "",
					"aria-hidden": "true",
					className: "h-[50px] w-[50px] shrink-0 object-cover"
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				"aria-label": "Seleziona il giorno del diario",
				className: "mx-2 mt-7 min-h-[164px] shrink-0 rounded-[12px] bg-[#292929] px-3 pb-3 pt-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex h-9 items-center justify-between",
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-label": "Settimana precedente",
								onClick: () => setSelectedDate((current) => shiftWeek(current ?? activeDate, -1)),
								className: "press flex h-9 w-9 items-center justify-center rounded-full text-white",
								children: /* @__PURE__ */ jsx(ChevronLeft, {
									className: "h-7 w-7",
									strokeWidth: 2.2
								})
							}),
							/* @__PURE__ */ jsx("h2", {
								className: "text-[17px] font-normal capitalize",
								children: activeDate.toLocaleDateString("it-IT", {
									month: "long",
									year: "numeric"
								})
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-label": "Settimana successiva",
								onClick: () => setSelectedDate((current) => shiftWeek(current ?? activeDate, 1)),
								className: "press flex h-9 w-9 items-center justify-center rounded-full text-white",
								children: /* @__PURE__ */ jsx(ChevronRight, {
									className: "h-7 w-7",
									strokeWidth: 2.2
								})
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-3 grid grid-cols-7 text-center",
						children: WEEKDAYS.map((day) => /* @__PURE__ */ jsx("span", {
							className: "text-[12px] font-normal text-white/90",
							children: day
						}, day))
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-1 grid grid-cols-7 text-center",
						children: weekDates(activeDate).map((date, index) => {
							const selected = toIso(date) === activeDateKey;
							const sameMonth = date.getMonth() === activeDate.getMonth();
							return /* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-label": date.toLocaleDateString("it-IT", {
									weekday: "long",
									day: "numeric",
									month: "long",
									year: "numeric"
								}),
								"aria-pressed": selected,
								onClick: () => setSelectedDate(date),
								className: `press mx-auto flex h-11 w-11 items-center justify-center rounded-full text-[15px] tabular transition-colors ${selected ? "bg-[#4169a8] text-white" : index > 4 ? "text-[#0aa0b1]" : "text-white"} ${sameMonth ? "" : "opacity-55"}`,
								children: date.getDate()
							}, toIso(date));
						})
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "-mx-2 mt-7 grid h-[58px] shrink-0 grid-cols-2 bg-[#292929]",
				role: "tablist",
				"aria-label": "Sezione Diario",
				children: [["attivita", "Attività"], ["compiti", "Compiti"]].map(([id, label]) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					role: "tab",
					"aria-selected": tab === id,
					onClick: () => setTab(id),
					className: `relative flex items-center justify-center text-[15px] ${tab === id ? "font-semibold text-white" : "font-normal text-white/75"}`,
					children: [label, tab === id && /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 h-[3px] w-[68px] rounded-t-full bg-white" })]
				}, id))
			}),
			tab === "attivita" ? activities.length ? /* @__PURE__ */ jsx("ul", {
				role: "tabpanel",
				"aria-label": "Attività svolte",
				className: "didup-diary-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-[#454545] pb-4",
				children: activities.map((entry, index) => /* @__PURE__ */ jsx(DidupActivityRow, {
					entry,
					fallbackHour: index + 1
				}, entry.id))
			}) : /* @__PURE__ */ jsx("p", {
				role: "tabpanel",
				className: "didup-diary-scroll min-h-0 flex-1 overflow-y-auto px-5 py-10 text-center text-sm text-white/65",
				children: "Nessuna attività registrata per questa data."
			}) : assignments.length ? /* @__PURE__ */ jsx("ul", {
				role: "tabpanel",
				"aria-label": "Compiti assegnati",
				className: "didup-diary-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-[#454545] pb-4",
				children: assignments.map((assignment) => /* @__PURE__ */ jsx(DidupAssignmentRow, { assignment }, assignment.id))
			}) : /* @__PURE__ */ jsx("p", {
				role: "tabpanel",
				className: "didup-diary-scroll min-h-0 flex-1 overflow-y-auto px-5 py-10 text-center text-sm text-white/65",
				children: "Nessun compito assegnato per questa data."
			})
		]
	});
}
function DidupActivityRow({ entry, fallbackHour }) {
	const hour = lessonNumber(entry) || fallbackHour;
	return /* @__PURE__ */ jsxs("li", {
		className: "px-3 py-5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex min-h-[40px] items-center gap-3",
			children: [/* @__PURE__ */ jsxs("span", {
				className: "relative flex h-9 w-9 shrink-0 items-center justify-center",
				children: [/* @__PURE__ */ jsx("img", {
					src: "/didup-diary-clock-icon.png",
					alt: "",
					"aria-hidden": "true",
					className: "h-8 w-8 object-contain"
				}), /* @__PURE__ */ jsxs("span", {
					className: "absolute bottom-0 left-0 text-[11px] font-bold leading-none text-[#0aa0b1]",
					children: [hour, "°"]
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ jsx("p", {
					className: "truncate text-[14px] font-normal uppercase leading-[1.3]",
					children: entry.subject || "Attività"
				}), entry.teacher && /* @__PURE__ */ jsx(TeacherName, { name: entry.teacher })]
			})]
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-4 px-1 text-[14px] leading-[1.45] text-white/90",
			children: entry.activity
		})]
	});
}
function DidupAssignmentRow({ assignment }) {
	return /* @__PURE__ */ jsxs("li", {
		className: "px-3 py-5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex min-h-[40px] items-center gap-3",
			children: [/* @__PURE__ */ jsx("span", {
				className: "relative flex h-9 w-9 shrink-0 items-center justify-center text-[#0aa0b1]",
				"aria-hidden": "true",
				children: /* @__PURE__ */ jsx(CalendarDays, {
					className: "h-7 w-7",
					strokeWidth: 1.8
				})
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ jsx("p", {
					className: "truncate text-[14px] font-normal uppercase leading-[1.3]",
					children: assignment.subject || "Compito"
				}), assignment.teacher && /* @__PURE__ */ jsx(TeacherName, { name: assignment.teacher })]
			})]
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-4 px-1 text-[14px] leading-[1.45] text-white/90",
			children: assignment.details || assignment.title
		})]
	});
}
function TeacherName({ name }) {
	return /* @__PURE__ */ jsxs("p", {
		className: "mt-0.5 flex items-center gap-2 text-[11px] font-medium uppercase leading-4 text-white",
		children: [/* @__PURE__ */ jsxs("svg", {
			"aria-hidden": "true",
			viewBox: "0 0 24 24",
			className: "h-[15px] w-[15px] shrink-0 fill-[#34558b]",
			children: [/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "7",
				r: "4"
			}), /* @__PURE__ */ jsx("path", { d: "M3 21v-1.5c0-3.7 3.8-6.5 9-6.5s9 2.8 9 6.5V21H3Z" })]
		}), name]
	});
}
function lessonNumber(entry) {
	const match = entry.hour?.match(/\d+/);
	return match ? Number(match[0]) : 0;
}
var WEEKDAYS = [
	"lun",
	"mar",
	"mer",
	"gio",
	"ven",
	"sab",
	"dom"
];
function weekDates(date) {
	const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
	return Array.from({ length: 7 }, (_, index) => {
		const day = new Date(monday);
		day.setDate(monday.getDate() + index);
		return day;
	});
}
function shiftWeek(date, delta) {
	const shifted = new Date(date);
	shifted.setDate(shifted.getDate() + delta * 7);
	return shifted;
}
//#endregion
export { Diario as component };
