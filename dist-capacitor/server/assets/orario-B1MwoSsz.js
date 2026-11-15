import { r as useVoto } from "./store-EhdD6Ug3.js";
import { o as SectionTitle } from "./ui-D03OlNCN.js";
import { t as Button } from "./button-PJVP9td7.js";
import { a as saveSchedule, i as loadSchedule, t as DAYS } from "./orario-zeGcQdAY.js";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CwLzEEob.js";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, CalendarClock, CalendarPlus, ChevronLeft, ChevronRight, Clock3, Download } from "lucide-react";
import { toast } from "sonner";
//#region src/lib/voto/schedule-calendar.ts
var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
var TIME_ONLY = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
var encoder = new TextEncoder();
var BY_DAY = {
	lunedi: "MO",
	martedi: "TU",
	mercoledi: "WE",
	giovedi: "TH",
	venerdi: "FR"
};
function isValidDate(value) {
	if (!DATE_ONLY.test(value)) return false;
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function compactDate(value) {
	return value.replace(/-/g, "");
}
function addDays(value, days) {
	const date = /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}
function nextWeekday(fromDate, weekday) {
	const date = /* @__PURE__ */ new Date(`${fromDate}T00:00:00.000Z`);
	const offset = (weekday - date.getUTCDay() + 7) % 7;
	date.setUTCDate(date.getUTCDate() + offset);
	return date.toISOString().slice(0, 10);
}
function escapeText(value) {
	return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function foldLine(line) {
	let output = "";
	let segment = "";
	let byteLength = 0;
	for (const character of line) {
		const characterBytes = encoder.encode(character).length;
		if (byteLength + characterBytes > 75) {
			output += `${segment}\r\n `;
			segment = character;
			byteLength = 1 + characterBytes;
		} else {
			segment += character;
			byteLength += characterBytes;
		}
	}
	return output + segment;
}
function formatUtcDateTime(date) {
	return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function formatTime(minutes) {
	const hours = Math.floor(minutes / 60);
	const remainder = minutes % 60;
	return `${String(hours).padStart(2, "0")}${String(remainder).padStart(2, "0")}00`;
}
function eventLines(event, untilDate, stamp) {
	return [
		"BEGIN:VEVENT",
		`UID:${event.uid}`,
		`DTSTAMP:${stamp}`,
		`DTSTART:${compactDate(event.date)}T${formatTime(event.startMinutes)}`,
		`DTEND:${compactDate(event.endDate)}T${formatTime(event.endMinutes)}`,
		`RRULE:FREQ=WEEKLY;BYDAY=${event.byDay};UNTIL=${compactDate(untilDate)}T235959`,
		`SUMMARY:${escapeText(event.summary)}`,
		`DESCRIPTION:${escapeText(event.description)}`,
		"CATEGORIES:Orario scolastico",
		"END:VEVENT"
	].map(foldLine);
}
function createScheduleCalendarIcs(schedule, options) {
	if (!isValidDate(options.fromDate) || !isValidDate(options.untilDate) || options.fromDate > options.untilDate) throw new RangeError("Seleziona un intervallo di date valido.");
	if (!TIME_ONLY.test(options.firstLessonTime)) throw new RangeError("Inserisci un orario di inizio valido.");
	if (!Number.isInteger(options.lessonMinutes) || options.lessonMinutes < 1 || options.lessonMinutes > 360) throw new RangeError("La durata della lezione deve essere compresa tra 1 e 360 minuti.");
	if (!Number.isInteger(options.breakMinutes) || options.breakMinutes < 0 || options.breakMinutes > 120) throw new RangeError("L’intervallo tra le lezioni deve essere compreso tra 0 e 120 minuti.");
	const firstStart = Number(options.firstLessonTime.slice(0, 2)) * 60 + Number(options.firstLessonTime.slice(3, 5));
	const step = options.lessonMinutes + options.breakMinutes;
	const events = [];
	DAYS.forEach(({ id }, weekdayIndex) => {
		const lessons = schedule[id] ?? [];
		const firstDate = nextWeekday(options.fromDate, weekdayIndex + 1);
		if (firstDate > options.untilDate) return;
		lessons.forEach((rawSubject, lessonIndex) => {
			const subject = rawSubject.trim();
			if (!subject) return;
			const startMinutes = firstStart + lessonIndex * step;
			const endMinutes = startMinutes + options.lessonMinutes;
			if (startMinutes >= 1440 || endMinutes > 1440) throw new RangeError("Gli orari delle lezioni superano la mezzanotte; controlla durata e intervallo.");
			const endsAtMidnight = endMinutes === 1440;
			events.push({
				uid: `orario-${id}-${lessonIndex + 1}@voto.app`,
				date: firstDate,
				startMinutes,
				endDate: endsAtMidnight ? addDays(firstDate, 1) : firstDate,
				endMinutes: endsAtMidnight ? 0 : endMinutes,
				summary: `${subject} · ${lessonIndex + 1}ª ora`,
				description: "Lezione ricorrente dell’orario scolastico VOTO.",
				byDay: BY_DAY[id]
			});
		});
	});
	if (events.length === 0) return {
		content: "",
		eventCount: 0
	};
	const stamp = formatUtcDateTime(options.now ?? /* @__PURE__ */ new Date());
	return {
		content: `${[
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//VOTO//Orario scolastico 3.0.0//IT",
			"CALSCALE:GREGORIAN",
			"METHOD:PUBLISH",
			"X-WR-CALNAME:VOTO - Orario scolastico",
			...events.flatMap((event) => eventLines(event, options.untilDate, stamp)),
			"END:VCALENDAR"
		].map(foldLine).join("\r\n")}\r\n`,
		eventCount: events.length
	};
}
function localDateString(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getDefaultSchoolYearEnd(date = /* @__PURE__ */ new Date()) {
	return `${date.getFullYear() + (date.getMonth() >= 6 ? 1 : 0)}-06-30`;
}
//#endregion
//#region src/components/voto/ScheduleCalendarExport.tsx
function ScheduleCalendarExport({ schedule, isDidup = false }) {
	const [open, setOpen] = useState(false);
	const [firstLessonTime, setFirstLessonTime] = useState("08:00");
	const [lessonMinutes, setLessonMinutes] = useState("60");
	const [breakMinutes, setBreakMinutes] = useState("0");
	const [untilDate, setUntilDate] = useState(() => getDefaultSchoolYearEnd());
	const [createdCount, setCreatedCount] = useState(null);
	const lessonCount = Object.values(schedule).flat().filter((subject) => subject.trim()).length;
	const inputStyle = isDidup ? "border-white/20 bg-black text-white" : "border-input bg-background text-foreground";
	const exportSchedule = () => {
		try {
			const { content, eventCount } = createScheduleCalendarIcs(schedule, {
				fromDate: localDateString(/* @__PURE__ */ new Date()),
				untilDate,
				firstLessonTime,
				lessonMinutes: Number(lessonMinutes),
				breakMinutes: Number(breakMinutes)
			});
			if (eventCount === 0) {
				toast("Nessuna lezione da esportare", { description: "Inserisci almeno una materia e scegli una data di fine futura." });
				return;
			}
			const fileUrl = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
			const link = document.createElement("a");
			link.href = fileUrl;
			link.download = "voto-orario-scolastico.ics";
			document.body.append(link);
			link.click();
			link.remove();
			window.setTimeout(() => URL.revokeObjectURL(fileUrl), 6e4);
			setCreatedCount(eventCount);
			toast.success("File calendario pronto", { description: "Apri il file .ics scaricato e scegli Calendario per importare le lezioni." });
		} catch (error) {
			toast.error("Impossibile creare il calendario", { description: error instanceof Error ? error.message : "Controlla i dati inseriti." });
		}
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Button, {
		type: "button",
		variant: isDidup ? "secondary" : "default",
		onClick: () => setOpen(true),
		className: `h-11 w-full gap-2 ${isDidup ? "border border-white/15 bg-[#292929] text-white hover:bg-white/10" : ""}`,
		children: [/* @__PURE__ */ jsx(CalendarPlus, { className: "h-4 w-4" }), " Aggiungi al calendario del telefono"]
	}), /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: `w-[calc(100%-2rem)] max-w-md ${isDidup ? "border-white/15 bg-[#202020] text-white" : ""}`,
			children: [
				/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Aggiungi l’orario al calendario" }), /* @__PURE__ */ jsx(DialogDescription, {
					className: isDidup ? "text-white/70" : "",
					children: "Creerò un file .ics con un evento settimanale per ogni lezione compilata. Dopo il download, apri il file e scegli l’app Calendario del telefono."
				})] }),
				/* @__PURE__ */ jsx("p", {
					className: `text-xs ${isDidup ? "text-white/70" : "text-muted-foreground"}`,
					children: lessonCount ? `${lessonCount} ${lessonCount === 1 ? "lezione inserita" : "lezioni inserite"}. Orari uguali ogni settimana fino alla data scelta.` : "L’orario è vuoto: inserisci le materie prima di esportarlo."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-3",
					children: [
						/* @__PURE__ */ jsxs("label", {
							className: "space-y-1 text-xs text-muted-foreground",
							children: ["Inizio prima ora", /* @__PURE__ */ jsx("input", {
								type: "time",
								value: firstLessonTime,
								onChange: (event) => setFirstLessonTime(event.target.value),
								className: `h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`
							})]
						}),
						/* @__PURE__ */ jsxs("label", {
							className: "space-y-1 text-xs text-muted-foreground",
							children: ["Durata lezione (min)", /* @__PURE__ */ jsx("input", {
								type: "number",
								min: 1,
								max: 360,
								step: 1,
								value: lessonMinutes,
								onChange: (event) => setLessonMinutes(event.target.value),
								className: `h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`
							})]
						}),
						/* @__PURE__ */ jsxs("label", {
							className: "space-y-1 text-xs text-muted-foreground",
							children: ["Intervallo tra ore (min)", /* @__PURE__ */ jsx("input", {
								type: "number",
								min: 0,
								max: 120,
								step: 1,
								value: breakMinutes,
								onChange: (event) => setBreakMinutes(event.target.value),
								className: `h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`
							})]
						}),
						/* @__PURE__ */ jsxs("label", {
							className: "space-y-1 text-xs text-muted-foreground",
							children: ["Ripeti fino al", /* @__PURE__ */ jsx("input", {
								type: "date",
								value: untilDate,
								min: localDateString(/* @__PURE__ */ new Date()),
								onChange: (event) => setUntilDate(event.target.value),
								className: `h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`
							})]
						})
					]
				}),
				createdCount !== null && /* @__PURE__ */ jsxs("p", {
					role: "status",
					className: `text-xs ${isDidup ? "text-white/75" : "text-muted-foreground"}`,
					children: [
						"File creato con ",
						createdCount,
						" ",
						createdCount === 1 ? "lezione ricorrente" : "lezioni ricorrenti",
						". Aprilo dai download per importarlo."
					]
				}),
				/* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsxs(Button, {
					type: "button",
					onClick: exportSchedule,
					disabled: !lessonCount || !untilDate,
					className: `h-11 w-full ${isDidup ? "bg-[#08a5b5] text-white hover:bg-[#0795a3]" : ""}`,
					children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), " Scarica file per il calendario"]
				}) })
			]
		})
	})] });
}
//#endregion
//#region src/routes/orario.tsx?tsr-split=component
var WEEK_LABELS = [
	"lun",
	"mar",
	"mer",
	"gio",
	"ven",
	"sab",
	"dom"
];
var WEEKDAY_IDS = [
	"lunedi",
	"martedi",
	"mercoledi",
	"giovedi",
	"venerdi",
	null,
	null
];
function Orario() {
	const voto = useVoto();
	const [selectedDay, setSelectedDay] = useState(DAYS[0].id);
	const [selectedDate, setSelectedDate] = useState(() => /* @__PURE__ */ new Date());
	const [schedule, setSchedule] = useState(() => loadSchedule());
	const day = DAYS.find(({ id }) => id === selectedDay);
	const updateSubject = (dayId, hour, subject) => {
		setSchedule((current) => {
			const next = {
				...current,
				[dayId]: current[dayId].map((item, index) => index === hour ? subject : item)
			};
			saveSchedule(next);
			return next;
		});
	};
	if (voto.registryStyle === "didup") {
		const studentName = (voto.data.student.name || "ANDREA MARIA").toUpperCase();
		const selectedDayId = WEEKDAY_IDS[(selectedDate.getDay() + 6) % 7] ?? null;
		const selectedLessons = selectedDayId ? schedule[selectedDayId] : [];
		return /* @__PURE__ */ jsxs("div", {
			className: "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "flex items-start justify-between px-2 pt-5",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex min-w-0 items-start",
						children: [/* @__PURE__ */ jsx(Link, {
							to: "/",
							"aria-label": "Torna alla Home",
							className: "press flex h-10 w-10 shrink-0 items-center justify-start text-white",
							children: /* @__PURE__ */ jsx(ArrowLeft, {
								className: "h-8 w-8",
								strokeWidth: 1.7
							})
						}), /* @__PURE__ */ jsxs("div", {
							className: "ml-4 pt-0.5",
							children: [/* @__PURE__ */ jsx("h1", {
								className: "text-[17px] font-normal leading-5",
								children: "ORARIO"
							}), /* @__PURE__ */ jsx("p", {
								className: "mt-1 text-[12px] leading-4",
								children: studentName
							})]
						})]
					}), /* @__PURE__ */ jsx("img", {
						src: "/didup-profile.jpg",
						alt: "",
						className: "h-[50px] w-[50px] shrink-0 object-cover"
					})]
				}),
				/* @__PURE__ */ jsxs("section", {
					"aria-label": "Seleziona il giorno dell’orario",
					className: "mx-1.5 mt-[66px] rounded-[12px] bg-[#292929] px-3 pb-3 pt-4",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex h-8 items-center justify-between",
							children: [
								/* @__PURE__ */ jsx("button", {
									type: "button",
									"aria-label": "Mese precedente",
									onClick: () => setSelectedDate((current) => shiftMonth(current, -1)),
									className: "press flex h-9 w-9 items-center justify-center rounded-full text-white",
									children: /* @__PURE__ */ jsx(ChevronLeft, {
										className: "h-7 w-7",
										strokeWidth: 2.2
									})
								}),
								/* @__PURE__ */ jsx("h2", {
									className: "text-[17px] font-normal capitalize",
									children: selectedDate.toLocaleDateString("it-IT", {
										month: "long",
										year: "numeric"
									})
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									"aria-label": "Mese successivo",
									onClick: () => setSelectedDate((current) => shiftMonth(current, 1)),
									className: "press flex h-9 w-9 items-center justify-center rounded-full text-white",
									children: /* @__PURE__ */ jsx(ChevronRight, {
										className: "h-7 w-7",
										strokeWidth: 2.2
									})
								})
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "mt-4 grid grid-cols-7 text-center",
							children: WEEK_LABELS.map((label) => /* @__PURE__ */ jsx("span", {
								className: "text-[12px] font-normal text-white/90",
								children: label
							}, label))
						}),
						/* @__PURE__ */ jsx("div", {
							className: "mt-2 grid grid-cols-7 text-center",
							children: weekDates(selectedDate).map((date, index) => {
								const isSelected = sameDate(date, selectedDate);
								const isWeekend = index > 4;
								const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
								return /* @__PURE__ */ jsx("button", {
									type: "button",
									"aria-label": date.toLocaleDateString("it-IT", {
										weekday: "long",
										day: "numeric",
										month: "long",
										year: "numeric"
									}),
									"aria-pressed": isSelected,
									onClick: () => setSelectedDate(date),
									className: `press mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[15px] tabular transition-colors ${isSelected ? "bg-[#4169a8] text-white" : isWeekend ? "text-[#0aa0b1]" : "text-white"} ${isCurrentMonth ? "" : "opacity-55"}`,
									children: date.getDate()
								}, date.toISOString());
							})
						})
					]
				}),
				selectedDayId ? /* @__PURE__ */ jsx("section", {
					className: "-mx-2 mt-6 overflow-hidden rounded-t-[12px] bg-[#292929]",
					"aria-label": "Lezioni del giorno",
					children: selectedLessons.map((subject, index) => /* @__PURE__ */ jsxs("label", {
						className: `flex min-h-[69px] items-center gap-4 px-4 ${index < selectedLessons.length - 1 ? "border-b border-white/80" : ""}`,
						children: [/* @__PURE__ */ jsxs("span", {
							className: "relative flex h-9 w-8 shrink-0 items-start justify-center text-[#4169a8]",
							children: [/* @__PURE__ */ jsx("img", {
								src: "/didup-clock-icon.png",
								alt: "",
								"aria-hidden": "true",
								className: "h-7 w-7 object-contain"
							}), /* @__PURE__ */ jsx("span", {
								className: "absolute bottom-0 left-0 text-[11px] font-bold leading-none text-white",
								children: index + 1
							})]
						}), /* @__PURE__ */ jsx("input", {
							value: subject,
							onChange: (event) => updateSubject(selectedDayId, index, event.target.value),
							"aria-label": `${selectedDate.toLocaleDateString("it-IT", { weekday: "long" })}, ${index + 1}ª ora`,
							placeholder: " ",
							className: "min-h-[68px] min-w-0 flex-1 bg-transparent p-0 text-[15px] font-medium uppercase text-white outline-none placeholder:text-white/0 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/60"
						})]
					}, `${selectedDayId}-${index}`))
				}) : /* @__PURE__ */ jsx("p", {
					className: "mt-6 rounded-[12px] bg-[#292929] px-4 py-8 text-center text-sm text-white/70",
					children: "Nessuna lezione prevista nel fine settimana."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mx-1.5 mt-4",
					children: /* @__PURE__ */ jsx(ScheduleCalendarExport, {
						schedule,
						isDidup: true
					})
				})
			]
		});
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ jsx("span", {
					className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(CalendarClock, { className: "h-5 w-5" })
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Orario"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted-foreground",
					children: "Sei ore al giorno, dal lunedì al venerdì."
				})] })]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "no-scrollbar mt-5 flex gap-2 overflow-x-auto",
				role: "tablist",
				"aria-label": "Giorni della settimana",
				children: DAYS.map((item) => /* @__PURE__ */ jsx("button", {
					type: "button",
					role: "tab",
					"aria-selected": selectedDay === item.id,
					onClick: () => setSelectedDay(item.id),
					className: `press min-w-[62px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${selectedDay === item.id ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground"}`,
					children: item.short
				}, item.id))
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: day.label }),
			/* @__PURE__ */ jsx("div", {
				className: "space-y-2",
				children: schedule[selectedDay].map((subject, index) => /* @__PURE__ */ jsxs("label", {
					className: "card-surface flex items-center gap-3 p-3.5",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-muted-foreground",
						children: [/* @__PURE__ */ jsx(Clock3, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ jsxs("span", {
							className: "tabular text-[9px] font-semibold",
							children: [index + 1, "ª"]
						})]
					}), /* @__PURE__ */ jsxs("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "block text-[10px] text-muted-foreground",
							children: [index + 1, "ª ora"]
						}), /* @__PURE__ */ jsx("input", {
							value: subject,
							onChange: (event) => updateSubject(selectedDay, index, event.target.value),
							placeholder: "Inserisci materia",
							"aria-label": `${day.label}, ${index + 1}ª ora`,
							className: "mt-0.5 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
						})]
					})]
				}, index))
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-4 text-center text-[11px] text-muted-foreground",
				children: "Le modifiche vengono salvate automaticamente sul dispositivo."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-4",
				children: /* @__PURE__ */ jsx(ScheduleCalendarExport, { schedule })
			})
		]
	});
}
function weekDates(value) {
	const monday = new Date(value.getFullYear(), value.getMonth(), value.getDate());
	monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(monday);
		date.setDate(monday.getDate() + index);
		return date;
	});
}
function shiftMonth(value, offset) {
	const day = value.getDate();
	const targetMonth = new Date(value.getFullYear(), value.getMonth() + offset, 1);
	const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
	targetMonth.setDate(Math.min(day, lastDay));
	return targetMonth;
}
function sameDate(left, right) {
	return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
//#endregion
export { Orario as component };
