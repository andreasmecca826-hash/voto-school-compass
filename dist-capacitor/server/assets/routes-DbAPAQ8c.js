import { t as cn } from "./utils-C_uf36nf.js";
import { t as useOnlineStatus } from "./use-online-status-B-_W9iFn.js";
import { E as requestCircularCheck, T as getCircularCheckStatus, c as resolveHomeModuleScale, n as useClock, r as useVoto, u as presentInterrogazione } from "./store-EhdD6Ug3.js";
import { n as useSchoolPeriods } from "./periods-context-BiByHTyY.js";
import { i as parseEventDateTime, n as fmtDate, r as fmtTime } from "./dates-CdBXaUB1.js";
import { a as selectNotificationsByType, c as selectUpcomingReminders, i as selectDashboardAssignments, n as notificationContentLabel, o as selectOpenInterrogazioni, r as notificationDisplayTitle } from "./selectors-CnCjHj35.js";
import { i as fmt, n as average, o as neededGrade, r as averageHistory, s as overallAverage } from "./calc-DWBiEBUY.js";
import { a as ProgressBar, o as SectionTitle, r as Empty, s as Sparkline } from "./ui-D03OlNCN.js";
import { t as NOTIF_META } from "./notification-meta-C26fazoY.js";
import { t as PeriodPicker } from "./PeriodPicker-ALqNKIz5.js";
import { t as Slider } from "./slider-BjtFJp27.js";
import { i as loadSchedule, r as emptySchedule, t as DAYS } from "./orario-zeGcQdAY.js";
import { t as AssignmentRow } from "./AssignmentRow-CDi9RsJw.js";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, Calculator, CalendarCheck, CalendarDays, CheckCircle2, ChevronRight, Clock3, Github, Megaphone, Minus, RefreshCw, StickyNote } from "lucide-react";
//#region src/components/voto/CircularCheckControl.tsx
var PENDING_CHECK_KEY = "voto.circularCheckRequestedAt";
function CircularCheckControl() {
	const v = useVoto();
	const [checkPending, setCheckPending] = useState(false);
	const [checkNotice, setCheckNotice] = useState(null);
	const [pendingCheckAt, setPendingCheckAt] = useState(null);
	useEffect(() => {
		try {
			const saved = window.localStorage.getItem(PENDING_CHECK_KEY);
			if (saved && Number.isFinite(Date.parse(saved))) {
				setPendingCheckAt(saved);
				setCheckNotice({
					kind: "info",
					text: "Hai un aggiornamento DidUP in corso. Verificane lo stato per aggiornare Supabase."
				});
			} else window.localStorage.removeItem(PENDING_CHECK_KEY);
		} catch {}
	}, []);
	const watchCheck = async (requestedAt) => {
		for (let attempt = 0; attempt < 6; attempt += 1) {
			if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1e4));
			const status = await getCircularCheckStatus(requestedAt);
			if (status.status === "completed") return status.conclusion === "success";
		}
		return null;
	};
	const applyCheckResult = async (result) => {
		if (result === null) {
			setCheckNotice({
				kind: "info",
				text: "L’aggiornamento è ancora in corso. Usa ‘Verifica stato’ più tardi per aggiornare Supabase."
			});
			return;
		}
		setPendingCheckAt(null);
		try {
			window.localStorage.removeItem(PENDING_CHECK_KEY);
		} catch {}
		if (!result) {
			setCheckNotice({
				kind: "error",
				text: "Il controllo non è riuscito. Riprova più tardi."
			});
			return;
		}
		await v.refresh({ silent: true });
		setCheckNotice({
			kind: "success",
			text: "Aggiornamento DidUP terminato: dati Supabase aggiornati."
		});
	};
	const checkCirculars = async () => {
		if (checkPending) return;
		setCheckPending(true);
		setCheckNotice({
			kind: "info",
			text: "Avvio aggiornamento dati da DidUP…"
		});
		try {
			const requestedAt = await requestCircularCheck();
			setPendingCheckAt(requestedAt);
			try {
				window.localStorage.setItem(PENDING_CHECK_KEY, requestedAt);
			} catch {}
			setCheckNotice({
				kind: "info",
				text: "Aggiornamento avviato. Attendo i nuovi dati Supabase…"
			});
			await applyCheckResult(await watchCheck(requestedAt));
		} catch (error) {
			setCheckNotice({
				kind: "error",
				text: error instanceof Error ? error.message : "Impossibile avviare il controllo."
			});
		} finally {
			setCheckPending(false);
		}
	};
	const resumeCircularCheck = async () => {
		if (!pendingCheckAt || checkPending) return;
		setCheckPending(true);
		setCheckNotice({
			kind: "info",
			text: "Verifico lo stato del controllo…"
		});
		try {
			await applyCheckResult(await watchCheck(pendingCheckAt));
		} catch (error) {
			setCheckNotice({
				kind: "error",
				text: error instanceof Error ? error.message : "Impossibile leggere lo stato del controllo."
			});
		} finally {
			setCheckPending(false);
		}
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "mb-3 space-y-2",
		children: [
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				disabled: checkPending,
				onClick: () => void checkCirculars(),
				className: "press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary disabled:opacity-60",
				children: [/* @__PURE__ */ jsx(RefreshCw, { className: cn("h-4 w-4", checkPending && "animate-spin") }), checkPending ? "Aggiornamento in corso…" : "Aggiorna dati da DidUP"]
			}),
			checkNotice && /* @__PURE__ */ jsx("p", {
				role: checkNotice.kind === "error" ? "alert" : "status",
				className: cn("text-xs", checkNotice.kind === "error" && "text-destructive", checkNotice.kind === "success" && "text-primary", checkNotice.kind === "info" && "text-muted-foreground"),
				children: checkNotice.text
			}),
			pendingCheckAt && /* @__PURE__ */ jsx("button", {
				type: "button",
				disabled: checkPending,
				onClick: () => void resumeCircularCheck(),
				className: "press inline-flex h-9 w-full items-center justify-center rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground disabled:opacity-60",
				children: checkPending ? "Verifica in corso…" : "Verifica stato del controllo"
			})
		]
	});
}
//#endregion
//#region src/lib/voto/next-lesson.ts
function getNextScheduledLesson(schedule, now) {
	for (let offset = 0; offset < 7; offset += 1) {
		const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
		const weekdayIndex = date.getDay() - 1;
		if (weekdayIndex < 0 || weekdayIndex >= DAYS.length) continue;
		const day = DAYS[weekdayIndex];
		if (!day) continue;
		const lessons = schedule[day.id] ?? [];
		const hourIndex = lessons.findIndex((subject) => subject.trim().length > 0);
		if (hourIndex < 0) continue;
		return {
			subject: lessons[hourIndex].trim(),
			day: day.id,
			dayLabel: day.label,
			hour: hourIndex + 1,
			date,
			isToday: offset === 0
		};
	}
	return null;
}
//#endregion
//#region src/lib/voto/dashboard-copy.ts
var DAY_MS = 864e5;
function pick(items, seed) {
	return items[Math.floor((Number.isFinite(seed) ? Math.min(Math.max(seed, 0), .999999) : 0) * items.length)];
}
var recentEventPhrases = {
	grade: [
		"È arrivato un voto nuovo: dagli un’occhiata quando vuoi.",
		"Il registro ha appena aggiunto un voto: sorpresa o conferma?",
		"C’è un voto recente da scoprire: respira e controlla con calma."
	],
	assignment: [
		"È arrivato un compito nuovo: affrontalo prima che si moltiplichi.",
		"Un compito recente è in agenda: piccolo passo oggi, grande pace domani.",
		"Nuovo compito in vista: matita pronta, missione attivata."
	],
	other: [
		"È arrivato un aggiornamento nel registro: dagli un’occhiata.",
		"La scuola ha lasciato una novità recente: la trovi qui appena vuoi.",
		"C’è una comunicazione recente da controllare: niente panico, solo un’occhiata."
	]
};
function selectLatestDashboardEvent(notifications, assignments, now) {
	const lowerBound = now.getTime() - DAY_MS;
	const upperBound = now.getTime();
	const candidates = [];
	notifications.forEach((notification) => {
		const occurredAt = parseEventDateTime(notification.date);
		if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
		candidates.push({
			kind: notification.type === "grade" ? "grade" : "other",
			occurredAt
		});
	});
	assignments.forEach((assignment) => {
		const occurredAt = parseEventDateTime(assignment.assignedDate);
		if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
		candidates.push({
			kind: "assignment",
			occurredAt
		});
	});
	return candidates.reduce((latest, candidate) => latest === null || candidate.occurredAt >= latest.occurredAt ? candidate : latest, null);
}
function averagePhrases(average, delta) {
	if (average === null) return ["Nessun voto ancora: il primo ha la strada libera.", "Il tabellone è ancora vuoto: ogni percorso comincia dal primo voto."];
	if (delta !== null && delta > .05) return [
		"Stai migliorando: continua così.",
		"La media è in salita: il tuo impegno sta facendo effetto.",
		"Trend positivo: la costanza sta pagando."
	];
	if (delta !== null && delta < -.05) return [
		"Leggero calo: punta sulle materie più deboli.",
		"Un piccolo calo non decide il finale: si riparte dal prossimo voto.",
		"Serve una rimonta? Il simulatore è pronto a fare i conti con te."
	];
	if (average >= 8) return [
		"Andamento solido e costante.",
		"Media forte: continua a tenere questo ritmo.",
		"La media viaggia bene: merito della costanza."
	];
	if (average >= 6) return [
		"Sei in linea, c’è margine per crescere.",
		"Sei sulla strada giusta: un passo alla volta si sale.",
		"Base solida; il prossimo voto può dare una spinta in più."
	];
	return [
		"Serve un recupero mirato: usa il simulatore.",
		"È il momento di una piccola strategia di recupero: si può fare.",
		"Ogni rimonta comincia da un piano: scegli una materia e parti."
	];
}
function dashboardMicrocopy(context, seed) {
	if (context.latestEvent) return pick(recentEventPhrases[context.latestEvent.kind], seed);
	return pick(averagePhrases(context.average, context.delta), seed);
}
//#endregion
//#region src/lib/voto/tomorrow-school.ts
function localDateKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function tomorrowDate(now) {
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	tomorrow.setHours(0, 0, 0, 0);
	return tomorrow;
}
function tomorrowScheduleDay(now) {
	const index = tomorrowDate(now).getDay() - 1;
	return index >= 0 && index < DAYS.length ? DAYS[index] ?? null : null;
}
function tomorrowSubjects(schedule, now) {
	const day = tomorrowScheduleDay(now);
	if (!day) return [];
	return [...new Set(schedule[day.id].map((subject) => subject.trim()).filter(Boolean))];
}
function openAssignmentsForTomorrow(assignments, isDone, now) {
	const tomorrow = localDateKey(tomorrowDate(now));
	return assignments.filter((assignment) => assignment.dueDate?.slice(0, 10) === tomorrow && !isDone(assignment.id, assignment.completed)).sort((a, b) => {
		if (!a.dueDate) return b.dueDate ? 1 : a.title.localeCompare(b.title, "it");
		if (!b.dueDate) return -1;
		return `${a.dueDate}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate}${b.dueTime ?? ""}`);
	});
}
function isTomorrow(date, now) {
	const dateKey = date.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
	return dateKey === localDateKey(tomorrowDate(now));
}
function upcomingSchoolEvents(interrogazioni, notifications, now) {
	const events = interrogazioni.filter((item) => !item.completed && isTomorrow(item.date, now)).map((item) => {
		const presentation = presentInterrogazione(item);
		return {
			id: `interrogazione-${item.id}`,
			title: presentation.title,
			date: item.date,
			detail: [
				presentation.isVerification ? presentation.subject : "",
				presentation.notes,
				item.hour ? `${item.hour}ª ora` : item.time
			].filter(Boolean).join(" · "),
			source: "interrogazione"
		};
	});
	const assessmentPattern = /verific|interrog|compito in classe|prova|test/i;
	for (const notification of notifications) {
		if (notification.type !== "reminder" || !notification.date) continue;
		const text = `${notification.title} ${notification.message ?? ""} ${notification.subject ?? ""}`;
		if (!assessmentPattern.test(text) || !isTomorrow(notification.date, now)) continue;
		events.push({
			id: `promemoria-${notification.id}`,
			title: notification.subject ? `${notification.title} · ${notification.subject}` : notification.title,
			date: notification.date,
			detail: notification.message,
			source: "promemoria"
		});
	}
	return events.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "it"));
}
//#endregion
//#region src/routes/index.tsx?tsr-split=component
var CircularViewer = lazy(() => import("./CircularViewer-Bbrp2Uts.js").then(({ CircularViewer: Viewer }) => ({ default: Viewer })));
function Dashboard() {
	const v = useVoto();
	const isOnline = useOnlineStatus();
	const { isDone } = v;
	const now = useClock();
	const [attendanceView, setAttendanceView] = useState("hours");
	const [microSeed, setMicroSeed] = useState(0);
	const [schedule, setSchedule] = useState(() => emptySchedule());
	const { subjects, config } = useSchoolPeriods();
	const { assignments, notifications, previousAverage } = v.data;
	const avg = useMemo(() => overallAverage(subjects), [subjects]);
	const history = useMemo(() => averageHistory(subjects), [subjects]);
	const delta = config.selection === "all" && avg !== null && previousAverage !== void 0 ? avg - previousAverage : null;
	const today = useMemo(() => selectDashboardAssignments(assignments, now, isDone), [
		assignments,
		isDone,
		now
	]);
	const attendance = v.data.attendance ?? {
		absenceDays: 0,
		absenceHours: 0,
		delays: 0,
		earlyExits: 0,
		annualHours: 990,
		absenceLimitHours: 264
	};
	const remainingHours = Math.max(0, attendance.absenceLimitHours - attendance.absenceHours);
	const absenceLimitDays = attendance.absenceLimitHours / 6;
	const remainingDays = Math.max(0, absenceLimitDays - attendance.absenceDays);
	const showingDays = attendanceView === "days";
	const notes = useMemo(() => selectNotificationsByType(notifications, "note"), [notifications]);
	const reminders = useMemo(() => selectUpcomingReminders(notifications, now).slice(0, 3), [notifications, now]);
	const bulletin = useMemo(() => selectNotificationsByType(notifications, "notice"), [notifications]);
	const interrogazioni = useMemo(() => selectOpenInterrogazioni(v.interrogazioni), [v.interrogazioni]);
	useEffect(() => {
		setSchedule(loadSchedule());
		setMicroSeed(Math.random());
	}, []);
	const nextLesson = useMemo(() => getNextScheduledLesson(schedule, now), [schedule, now]);
	const lessonPreparation = useMemo(() => {
		if (!nextLesson) return null;
		const normalizedSubject = nextLesson.subject.trim().toLocaleLowerCase("it-IT");
		const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
		return assignments.filter((assignment) => {
			const subject = assignment.subject?.trim().toLocaleLowerCase("it-IT");
			const dueDate = assignment.dueDate;
			return subject === normalizedSubject && dueDate !== void 0 && dueDate >= todayKey && !isDone(assignment.id, assignment.completed);
		}).sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""))[0];
	}, [
		nextLesson,
		assignments,
		isDone,
		now
	]);
	const isHomeModuleVisible = (id) => v.homeModules.find((module) => module.id === id)?.enabled ?? false;
	const homeOrder = (id) => v.homeModules.findIndex((module) => module.id === id);
	const homeModuleScale = (id) => resolveHomeModuleScale(v.homeScale, v.homeModules.find((module) => module.id === id)?.scale ?? 100) / v.homeScale;
	const micro = dashboardMicrocopy({
		average: avg,
		delta,
		latestEvent: selectLatestDashboardEvent(notifications, assignments, now)
	}, microSeed);
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		style: { zoom: v.homeScale / 100 },
		children: [
			v.source === "demo" && /* @__PURE__ */ jsxs(Link, {
				to: "/impostazioni",
				className: "press mb-4 flex items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft p-3.5",
				children: [
					/* @__PURE__ */ jsx(Github, { className: "h-5 w-5 shrink-0 text-primary" }),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-xs font-semibold text-primary",
							children: "Stai vedendo dati DEMO"
						}), /* @__PURE__ */ jsx("p", {
							className: "text-[11px] text-muted-foreground",
							children: "Accedi con Supabase per visualizzare i dati scolastici reali."
						})]
					}),
					/* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4 text-primary" })
				]
			}),
			/* @__PURE__ */ jsx(PeriodPicker, {}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-col",
				children: [
					isHomeModuleVisible("domani-a-scuola") && /* @__PURE__ */ jsx("div", {
						style: {
							order: homeOrder("domani-a-scuola"),
							zoom: homeModuleScale("domani-a-scuola")
						},
						children: /* @__PURE__ */ jsx(TomorrowSchoolCard, {
							now,
							schedule,
							assignments,
							interrogazioni: v.interrogazioni,
							notifications,
							isDone: v.isDone
						})
					}),
					isHomeModuleVisible("media") && /* @__PURE__ */ jsx("div", {
						style: {
							order: homeOrder("media"),
							zoom: homeModuleScale("media")
						},
						children: /* @__PURE__ */ jsxs("section", {
							className: "card-surface relative overflow-hidden p-5",
							"aria-label": "Media generale",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-start justify-between",
									children: [/* @__PURE__ */ jsx("p", {
										className: "text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
										children: "Media generale"
									}), /* @__PURE__ */ jsx(Sparkline, { values: history })]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "-mt-4 flex items-baseline gap-1.5",
									children: [/* @__PURE__ */ jsx("span", {
										className: "tabular font-display text-6xl font-semibold tracking-tight",
										children: avg === null ? "—" : fmt(avg)
									}), /* @__PURE__ */ jsx("span", {
										className: "text-lg text-muted-foreground",
										children: "/10"
									})]
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-3 flex flex-wrap items-center gap-2",
									children: [delta === null ? /* @__PURE__ */ jsx("span", {
										className: "rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted-foreground",
										children: "Trend non disponibile"
									}) : /* @__PURE__ */ jsxs("span", {
										className: cn("tabular inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", delta > .005 ? "bg-success-soft text-success" : delta < -.005 ? "bg-danger-soft text-danger" : "bg-surface text-muted-foreground"),
										children: [
											delta > .005 ? /* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3.5 w-3.5" }) : delta < -.005 ? /* @__PURE__ */ jsx(ArrowDownRight, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(Minus, { className: "h-3.5 w-3.5" }),
											delta > 0 ? "+" : "",
											fmt(delta),
											" vs ",
											fmt(previousAverage)
										]
									}), /* @__PURE__ */ jsx("span", {
										className: "text-xs text-muted-foreground",
										children: micro
									})]
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-4 text-[10.5px] text-muted-foreground",
									children: v.source === "demo" ? "Dati demo" : /* @__PURE__ */ jsxs(Fragment, { children: [v.source === "cache" ? `Cache locale · aggiornato ${fmtTime(v.lastSync)}` : `Aggiornato ${fmtTime(v.lastSync)}`, (!isOnline || v.error) && /* @__PURE__ */ jsx("span", {
										className: "text-danger",
										children: v.error ? " · ultimo aggiornamento non riuscito" : " · offline"
									})] })
								})
							]
						})
					}),
					isHomeModuleVisible("simulatore") && /* @__PURE__ */ jsx("div", {
						style: {
							order: homeOrder("simulatore"),
							zoom: homeModuleScale("simulatore")
						},
						children: /* @__PURE__ */ jsxs(Link, {
							to: "/studio",
							className: "press card-surface mt-3 flex w-full items-center gap-3 p-4 text-left",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary",
									children: /* @__PURE__ */ jsx(Calculator, { className: "h-5 w-5" })
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "flex-1",
									children: [/* @__PURE__ */ jsx("span", {
										className: "block text-sm font-semibold",
										children: "Studio Lab"
									}), /* @__PURE__ */ jsx("span", {
										className: "block text-xs text-muted-foreground",
										children: "Calcolo media e simulatore voti"
									})]
								}),
								/* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4 text-muted-foreground" })
							]
						})
					}),
					isHomeModuleVisible("prossima-lezione") && /* @__PURE__ */ jsxs("div", {
						style: {
							order: homeOrder("prossima-lezione"),
							zoom: homeModuleScale("prossima-lezione")
						},
						children: [/* @__PURE__ */ jsx(SectionTitle, {
							action: /* @__PURE__ */ jsx(Link, {
								to: "/orario",
								className: "text-xs font-medium text-primary",
								children: "Modifica orario"
							}),
							children: "Prossima lezione"
						}), nextLesson ? /* @__PURE__ */ jsxs("section", {
							className: "card-surface flex items-start gap-3 p-4",
							children: [/* @__PURE__ */ jsx("span", {
								className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
								children: /* @__PURE__ */ jsx(BookOpen, { className: "h-5 w-5" })
							}), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ jsxs("p", {
										className: "text-[10px] font-semibold uppercase tracking-wide text-primary",
										children: [
											nextLesson.isToday ? "Oggi" : nextLesson.dayLabel,
											" · ",
											nextLesson.hour,
											"ª ora"
										]
									}),
									/* @__PURE__ */ jsx("h3", {
										className: "mt-1 truncate text-base font-semibold",
										children: nextLesson.subject
									}),
									lessonPreparation ? /* @__PURE__ */ jsxs("p", {
										className: "mt-2 text-xs text-muted-foreground",
										children: [
											/* @__PURE__ */ jsx("span", {
												className: "font-semibold text-foreground",
												children: "Da preparare:"
											}),
											" ",
											lessonPreparation.title
										]
									}) : /* @__PURE__ */ jsx("p", {
										className: "mt-2 text-xs text-muted-foreground",
										children: "Nessun compito aperto registrato per questa materia."
									}),
									/* @__PURE__ */ jsx("p", {
										className: "mt-2 text-[10px] text-muted-foreground",
										children: "Le lezioni sono mostrate nell’ordine inserito: gli orari delle campanelle non sono configurati nell’app."
									})
								]
							})]
						}) : /* @__PURE__ */ jsx(Empty, {
							icon: /* @__PURE__ */ jsx(BookOpen, { className: "h-6 w-6" }),
							title: "Completa il tuo orario",
							text: "Inserisci le materie per vedere qui la prossima lezione."
						})]
					}),
					isHomeModuleVisible("presenze") && /* @__PURE__ */ jsxs("div", {
						style: {
							order: homeOrder("presenze"),
							zoom: homeModuleScale("presenze")
						},
						children: [/* @__PURE__ */ jsx(SectionTitle, { children: "Presenze" }), /* @__PURE__ */ jsxs("section", {
							className: "card-surface p-4",
							children: [
								/* @__PURE__ */ jsx("div", {
									className: "mb-4 grid grid-cols-2 rounded-xl border border-border bg-surface p-1",
									children: ["hours", "days"].map((view) => /* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => setAttendanceView(view),
										className: cn("press rounded-lg px-3 py-2 text-xs font-semibold", attendanceView === view ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"),
										children: view === "hours" ? "Ore" : "Giorni"
									}, view))
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-start gap-3",
									children: [/* @__PURE__ */ jsx("span", {
										className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
										children: /* @__PURE__ */ jsx(Clock3, { className: "h-5 w-5" })
									}), /* @__PURE__ */ jsxs("div", {
										className: "min-w-0 flex-1",
										children: [
											/* @__PURE__ */ jsx("p", {
												className: "text-sm font-semibold",
												children: showingDays ? "Giorni di assenza" : "Ore di assenza"
											}),
											/* @__PURE__ */ jsxs("p", {
												className: "mt-1 tabular font-display text-3xl font-semibold",
												children: [
													fmt(showingDays ? attendance.absenceDays : attendance.absenceHours, showingDays ? 0 : 1),
													" ",
													/* @__PURE__ */ jsxs("span", {
														className: "text-sm font-normal text-muted-foreground",
														children: [
															"/",
															" ",
															fmt(showingDays ? absenceLimitDays : attendance.absenceLimitHours, showingDays ? 0 : 1),
															" ",
															showingDays ? "giorni" : "ore"
														]
													})
												]
											}),
											/* @__PURE__ */ jsx("p", {
												className: cn("mt-1 text-xs", attendance.absenceHours > attendance.absenceLimitHours ? "text-danger" : "text-muted-foreground"),
												children: attendance.absenceHours > attendance.absenceLimitHours ? "Limite del 25% superato" : `Puoi ancora fare ${fmt(showingDays ? remainingDays : remainingHours, showingDays ? 0 : 1)} ${showingDays ? "giorni" : "ore"}`
											})
										]
									})]
								}),
								/* @__PURE__ */ jsx("div", {
									className: "mt-4",
									children: /* @__PURE__ */ jsx(ProgressBar, { value: Math.min(100, attendance.absenceHours / attendance.absenceLimitHours * 100) })
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-3 grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ jsxs("div", {
										className: "rounded-xl bg-surface p-3",
										children: [
											/* @__PURE__ */ jsx("p", {
												className: "text-[11px] text-muted-foreground",
												children: "Ritardi"
											}),
											/* @__PURE__ */ jsx("p", {
												className: "tabular text-xl font-semibold",
												children: attendance.delays
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-[10px] text-muted-foreground",
												children: "non conteggiati nelle ore"
											})
										]
									}), /* @__PURE__ */ jsxs("div", {
										className: "rounded-xl bg-surface p-3",
										children: [
											/* @__PURE__ */ jsx("p", {
												className: "text-[11px] text-muted-foreground",
												children: "Uscite"
											}),
											/* @__PURE__ */ jsx("p", {
												className: "tabular text-xl font-semibold",
												children: attendance.earlyExits
											}),
											/* @__PURE__ */ jsx("p", {
												className: "text-[10px] text-muted-foreground",
												children: "non conteggiate nelle ore"
											})
										]
									})]
								})
							]
						})]
					}),
					isHomeModuleVisible("compiti") && /* @__PURE__ */ jsxs("div", {
						style: {
							order: homeOrder("compiti"),
							zoom: homeModuleScale("compiti")
						},
						children: [/* @__PURE__ */ jsx(SectionTitle, {
							action: /* @__PURE__ */ jsx(Link, {
								to: "/compiti",
								className: "text-xs font-medium text-primary",
								children: "Compiti"
							}),
							children: "Oggi"
						}), today.length === 0 ? /* @__PURE__ */ jsx(Empty, {
							icon: /* @__PURE__ */ jsx(CalendarCheck, { className: "h-6 w-6" }),
							title: "Niente in scadenza",
							text: "Nessun compito per oggi o domani."
						}) : /* @__PURE__ */ jsx("ul", {
							className: "space-y-2",
							children: today.map((a) => /* @__PURE__ */ jsx(AssignmentRow, { a }, a.id))
						})]
					}),
					isHomeModuleVisible("interrogazioni") && /* @__PURE__ */ jsxs("div", {
						style: {
							order: homeOrder("interrogazioni"),
							zoom: homeModuleScale("interrogazioni")
						},
						children: [/* @__PURE__ */ jsx(SectionTitle, {
							action: /* @__PURE__ */ jsx(Link, {
								to: "/interrogazioni",
								className: "text-xs font-medium text-primary",
								children: "Vedi tutte"
							}),
							children: "Interrogazioni"
						}), interrogazioni.length === 0 ? /* @__PURE__ */ jsx(Empty, {
							icon: /* @__PURE__ */ jsx(CalendarDays, { className: "h-6 w-6" }),
							title: "Nessuna interrogazione in programma",
							text: "Aggiungila dalla sezione Interrogazioni."
						}) : /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("ul", {
							className: "space-y-2",
							children: interrogazioni.map((item) => {
								const presentation = presentInterrogazione(item);
								return /* @__PURE__ */ jsxs("li", {
									className: "card-surface flex items-center gap-3 p-3.5",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
											children: /* @__PURE__ */ jsx(CalendarDays, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ jsx("p", {
												className: "truncate text-sm font-semibold",
												children: presentation.title
											}), /* @__PURE__ */ jsxs("p", {
												className: "text-[11px] text-muted-foreground",
												children: [item.date ? fmtDate(item.date) : "Data da definire", item.hour ? ` · ${item.hour}ª ora` : item.time ? ` · ${item.time}` : ""]
											})]
										}),
										presentation.subject && presentation.isVerification && /* @__PURE__ */ jsx("span", {
											className: "max-w-[35%] truncate text-[10px] text-muted-foreground",
											children: presentation.subject
										})
									]
								}, item.id);
							})
						}) })]
					}),
					isHomeModuleVisible("note") && /* @__PURE__ */ jsxs("div", {
						style: {
							order: homeOrder("note"),
							zoom: homeModuleScale("note")
						},
						children: [/* @__PURE__ */ jsx(SectionTitle, { children: "Note" }), notes.length === 0 ? /* @__PURE__ */ jsx(Empty, {
							icon: /* @__PURE__ */ jsx(StickyNote, { className: "h-6 w-6" }),
							title: "Nessuna nota"
						}) : /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("ul", {
							className: "space-y-2",
							children: notes.map((n) => /* @__PURE__ */ jsx(NotifItem, { id: n.id }, n.id))
						}) })]
					}),
					isHomeModuleVisible("promemoria") && /* @__PURE__ */ jsxs("div", {
						style: {
							order: homeOrder("promemoria"),
							zoom: homeModuleScale("promemoria")
						},
						children: [/* @__PURE__ */ jsx(SectionTitle, {
							action: /* @__PURE__ */ jsx(Link, {
								to: "/promemoria",
								className: "text-xs font-medium text-primary",
								children: "Vedi tutti"
							}),
							children: "Promemoria"
						}), reminders.length === 0 ? /* @__PURE__ */ jsx(Empty, {
							icon: /* @__PURE__ */ jsx(Clock3, { className: "h-6 w-6" }),
							title: "Nessun promemoria",
							text: "I promemoria sincronizzati da DidUP compariranno qui."
						}) : /* @__PURE__ */ jsx("ul", {
							className: "space-y-2",
							children: reminders.map((reminder) => /* @__PURE__ */ jsx(NotifItem, { id: reminder.id }, reminder.id))
						})]
					}),
					isHomeModuleVisible("bacheca") && /* @__PURE__ */ jsxs("div", {
						style: {
							order: homeOrder("bacheca"),
							zoom: homeModuleScale("bacheca")
						},
						children: [
							/* @__PURE__ */ jsx(SectionTitle, {
								action: /* @__PURE__ */ jsx(Link, {
									to: "/bacheca",
									className: "text-xs font-medium text-primary",
									children: "Vedi tutte"
								}),
								children: "Bacheca"
							}),
							/* @__PURE__ */ jsx(CircularCheckControl, {}),
							bulletin.length === 0 ? /* @__PURE__ */ jsx(Empty, {
								icon: /* @__PURE__ */ jsx(Megaphone, { className: "h-6 w-6" }),
								title: "Nessuna comunicazione"
							}) : /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("ul", {
								className: "space-y-2",
								children: bulletin.map((n) => /* @__PURE__ */ jsx(NotifItem, { id: n.id }, n.id))
							}) })
						]
					}),
					isHomeModuleVisible("obiettivo") && /* @__PURE__ */ jsx("div", {
						style: {
							order: homeOrder("obiettivo"),
							zoom: homeModuleScale("obiettivo")
						},
						children: /* @__PURE__ */ jsx(GoalWidget, { avg })
					})
				]
			})
		]
	});
}
function TomorrowSchoolCard({ now, schedule, assignments, interrogazioni, notifications, isDone }) {
	const nextDay = tomorrowScheduleDay(now);
	const tomorrow = tomorrowDate(now);
	const tomorrowLabel = new Intl.DateTimeFormat("it-IT", {
		weekday: "long",
		day: "numeric",
		month: "long"
	}).format(tomorrow);
	const titleDate = tomorrowLabel.charAt(0).toLocaleUpperCase("it-IT") + tomorrowLabel.slice(1);
	const materials = tomorrowSubjects(schedule, now);
	const openTasks = openAssignmentsForTomorrow(assignments, isDone, now);
	const events = upcomingSchoolEvents(interrogazioni, notifications, now);
	return /* @__PURE__ */ jsxs("section", {
		className: "card-surface mt-4 overflow-hidden",
		"aria-label": "Domani a scuola",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-3 border-b border-border bg-primary-soft/40 p-4",
			children: [/* @__PURE__ */ jsx("span", {
				className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
				children: /* @__PURE__ */ jsx(CalendarCheck, { className: "h-5 w-5" })
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "font-display text-lg font-semibold",
					children: "Domani a scuola"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted-foreground",
					children: titleDate
				})]
			})]
		}), /* @__PURE__ */ jsxs("div", {
			className: "space-y-4 p-4",
			children: [
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
					className: "mb-2 flex items-center gap-2",
					children: [/* @__PURE__ */ jsx(BookOpen, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ jsx("h3", {
						className: "text-xs font-semibold",
						children: "Libri e quaderni da portare"
					})]
				}), materials.length ? /* @__PURE__ */ jsx("ul", {
					className: "grid grid-cols-1 gap-1.5 sm:grid-cols-2",
					children: materials.map((subject) => /* @__PURE__ */ jsxs("li", {
						className: "flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs",
						children: [/* @__PURE__ */ jsx("span", {
							className: "font-medium",
							children: subject
						}), /* @__PURE__ */ jsx("span", {
							className: "shrink-0 text-[10px] text-muted-foreground",
							children: "Libro · quaderno"
						})]
					}, subject))
				}) : /* @__PURE__ */ jsx("p", {
					className: "rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground",
					children: nextDay ? "Nessuna materia inserita nell’orario di domani." : "Domani non è un giorno scolastico feriale: nessuna lezione prevista nell’orario."
				})] }),
				/* @__PURE__ */ jsxs("div", {
					className: "border-t border-border pt-3",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "mb-2 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ jsx("h3", {
								className: "text-xs font-semibold",
								children: "Compiti con scadenza domani"
							})]
						}), /* @__PURE__ */ jsx(Link, {
							to: "/compiti",
							className: "text-[10px] font-medium text-primary",
							children: "Apri"
						})]
					}), openTasks.length ? /* @__PURE__ */ jsxs("ul", {
						className: "space-y-1.5",
						children: [openTasks.slice(0, 4).map((task) => /* @__PURE__ */ jsxs("li", {
							className: "flex items-start justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "min-w-0 font-medium",
								children: [task.title, task.subject ? /* @__PURE__ */ jsxs("span", {
									className: "font-normal text-muted-foreground",
									children: [" · ", task.subject]
								}) : null]
							}), /* @__PURE__ */ jsx("span", {
								className: "shrink-0 text-[10px] text-muted-foreground",
								children: task.dueDate ? fmtDate(task.dueDate) : "Senza scadenza"
							})]
						}, task.id)), openTasks.length > 4 && /* @__PURE__ */ jsxs("li", {
							className: "px-3 text-[10px] text-muted-foreground",
							children: [
								"e altri ",
								openTasks.length - 4,
								" compiti"
							]
						})]
					}) : /* @__PURE__ */ jsx("p", {
						className: "rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground",
						children: "Nessun compito con scadenza domani."
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "border-t border-border pt-3",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "mb-2 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(CalendarDays, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ jsx("h3", {
								className: "text-xs font-semibold",
								children: "Verifiche e interrogazioni di domani"
							})]
						}), /* @__PURE__ */ jsx(Link, {
							to: "/interrogazioni",
							className: "text-[10px] font-medium text-primary",
							children: "Agenda"
						})]
					}), events.length ? /* @__PURE__ */ jsx("ul", {
						className: "space-y-1.5",
						children: events.slice(0, 4).map((event) => /* @__PURE__ */ jsxs("li", {
							className: "flex items-start justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "min-w-0",
								children: [/* @__PURE__ */ jsx("span", {
									className: "font-medium",
									children: event.title
								}), /* @__PURE__ */ jsxs("span", {
									className: "block text-[10px] text-muted-foreground",
									children: [event.source === "interrogazione" ? "Interrogazione" : "Promemoria DidUP", event.detail ? ` · ${event.detail}` : ""]
								})]
							}), /* @__PURE__ */ jsx("span", {
								className: "shrink-0 text-[10px] text-muted-foreground",
								children: fmtDate(event.date)
							})]
						}, event.id))
					}) : /* @__PURE__ */ jsx("p", {
						className: "rounded-lg bg-surface px-3 py-2 text-xs text-muted-foreground",
						children: "Nessuna verifica o interrogazione in programma per domani."
					})]
				})
			]
		})]
	});
}
function NotifItem({ id }) {
	const v = useVoto();
	const [circularOpen, setCircularOpen] = useState(false);
	const n = v.data.notifications.find((x) => x.id === id);
	const read = v.isRead(n.id, n.read);
	const M = NOTIF_META[n.type];
	const message = n.message && n.message !== n.title ? n.message : "";
	const details = n.type === "grade" ? `${M.label}${n.teacher ? ` · ${n.teacher}` : ""}${message ? `\n${message}` : ""}` : [n.teacher, message].filter(Boolean).join("\n");
	return /* @__PURE__ */ jsxs("li", {
		className: cn("card-surface flex items-center gap-3 p-3.5", !read && "border-primary/30"),
		children: [
			/* @__PURE__ */ jsx("span", {
				className: cn("flex h-9 min-w-11 items-center justify-center rounded-lg bg-surface", !read && "text-primary"),
				children: /* @__PURE__ */ jsx(M.icon, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "truncate text-sm font-medium",
						children: notificationDisplayTitle(n)
					}),
					details && /* @__PURE__ */ jsx("p", {
						className: "whitespace-pre-line text-[11px] text-muted-foreground",
						children: details
					}),
					n.type === "notice" && /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => {
							setCircularOpen(true);
							if (!read) v.markRead([n.id]);
						},
						className: "press mt-2 inline-flex max-w-full items-center rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-semibold text-primary",
						children: notificationContentLabel(n) === "Circolari" ? "Apri circolare" : "Apri comunicazione"
					})
				]
			}),
			read ? /* @__PURE__ */ jsx("span", {
				className: "text-[11px] text-muted-foreground",
				children: fmtDate(n.date)
			}) : /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: () => v.markRead([n.id]),
				className: "press rounded-lg px-2 py-1 text-[11px] font-medium text-primary",
				children: "Letto"
			}),
			n.type === "notice" && circularOpen && /* @__PURE__ */ jsx(Suspense, {
				fallback: null,
				children: /* @__PURE__ */ jsx(CircularViewer, {
					open: circularOpen,
					onOpenChange: setCircularOpen,
					title: n.message ?? n.title,
					fileName: n.attachmentName,
					path: n.attachmentPath,
					attachments: n.attachments,
					url: n.attachmentPath ? n.attachmentUrl : void 0,
					extractedText: n.extractedText ?? n.message ?? n.title
				})
			})
		]
	});
}
function GoalWidget({ avg }) {
	const v = useVoto();
	const { subjects } = useSchoolPeriods();
	const graded = subjects.filter((s) => average(s.grades) !== null);
	const gap = avg === null ? null : v.target - avg;
	let estimate = "Aggiungi voti per una stima.";
	if (avg !== null && gap !== null && graded.length) if (gap <= 0) estimate = "Obiettivo raggiunto: mantieni il ritmo.";
	else {
		const weakest = [...graded].sort((a, b) => average(a.grades) - average(b.grades))[0];
		const sum = graded.reduce((t, s) => t + average(s.grades), 0);
		const needAvg = v.target * graded.length - sum + average(weakest.grades);
		const r = needAvg <= 10 ? neededGrade(weakest.grades, needAvg, 1) : null;
		estimate = r && r.status === "ok" ? `Con un ${fmt(r.needed, 1)} in ${weakest.name} raggiungeresti ${fmt(v.target)}.` : `Serve crescere in più materie: in media +${fmt(gap)} ciascuna.`;
	}
	const pct = avg === null ? 0 : Math.min(100, avg / v.target * 100);
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SectionTitle, { children: "Obiettivo media" }), /* @__PURE__ */ jsxs("section", {
		className: "card-surface p-5",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-end justify-between",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
					className: "text-[11px] text-muted-foreground",
					children: "Obiettivo"
				}), /* @__PURE__ */ jsx("p", {
					className: "tabular font-display text-3xl font-semibold",
					children: fmt(v.target)
				})] }), /* @__PURE__ */ jsxs("div", {
					className: "text-right",
					children: [/* @__PURE__ */ jsx("p", {
						className: "text-[11px] text-muted-foreground",
						children: "Scarto"
					}), /* @__PURE__ */ jsx("p", {
						className: cn("tabular font-display text-lg font-semibold", gap !== null && gap <= 0 ? "text-success" : "text-primary"),
						children: gap === null ? "—" : gap <= 0 ? "Raggiunto" : `−${fmt(gap)}`
					})]
				})]
			}),
			/* @__PURE__ */ jsx(Slider, {
				className: "mt-4",
				min: 6,
				max: 10,
				step: .25,
				value: [v.target],
				onValueChange: (val) => v.setTarget(val[0] ?? v.target),
				"aria-label": "Obiettivo media generale"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-4",
				children: /* @__PURE__ */ jsx(ProgressBar, { value: pct })
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-3 text-xs text-muted-foreground",
				children: estimate
			})
		]
	})] });
}
//#endregion
export { Dashboard as component };
