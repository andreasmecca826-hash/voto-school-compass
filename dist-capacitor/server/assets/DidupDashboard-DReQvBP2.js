import { n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { n as load, r as save, t as KEYS } from "./storage-D7ptFFhi.js";
import { n as useSchoolPeriods } from "./periods-context-BiByHTyY.js";
import { n as fmtDate, s as toIso } from "./dates-CdBXaUB1.js";
import { c as selectUpcomingReminders, n as notificationContentLabel, r as notificationDisplayTitle, t as isGenericNoticeTitle } from "./selectors-CnCjHj35.js";
import { i as fmt, s as overallAverage } from "./calc-DWBiEBUY.js";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CalendarX2, FileText } from "lucide-react";
//#region src/components/voto/DidupDashboard.tsx
var LazyCircularViewer = lazy(() => import("./CircularViewer-Bbrp2Uts.js").then(({ CircularViewer: Viewer }) => ({ default: Viewer })));
function updatedLabel(value, now) {
	const parsed = value ? new Date(value) : now;
	const date = Number.isNaN(parsed.getTime()) ? now : parsed;
	return `Dati aggiornati alle ${date.toLocaleTimeString("it-IT", {
		hour: "2-digit",
		minute: "2-digit"
	})} del ${date.toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit"
	})}`;
}
function shortDate(iso) {
	if (!iso) return "";
	return fmtDate(iso, {
		day: "2-digit",
		month: "short",
		year: "2-digit"
	}).toUpperCase();
}
function dueDateLabel(iso) {
	if (!iso) return "DATA DA DEFINIRE";
	const date = /* @__PURE__ */ new Date(`${iso.slice(0, 10)}T12:00:00`);
	if (Number.isNaN(date.getTime())) return "DATA DA DEFINIRE";
	return date.toLocaleDateString("it-IT", {
		weekday: "long",
		day: "2-digit",
		month: "long"
	}).toUpperCase();
}
function tomorrowLabel(now) {
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	return tomorrow.toLocaleDateString("it-IT", {
		weekday: "long",
		day: "2-digit",
		month: "long",
		year: "2-digit"
	}).toUpperCase();
}
function DidupDashboard() {
	const v = useVoto();
	const now = useClock();
	const [averageHidden, setAverageHidden] = useState(false);
	useEffect(() => {
		setAverageHidden(load(KEYS.homeAverageHidden, false));
	}, []);
	const { subjects, assignments, notifications, attendance } = v.data;
	const { subjects: periodSubjects, label: periodLabel } = useSchoolPeriods();
	const [selectedCircular, setSelectedCircular] = useState(null);
	const [viewerRequested, setViewerRequested] = useState(false);
	const today = toIso(now);
	const isDone = v.isDone;
	const avg = useMemo(() => overallAverage(periodSubjects), [periodSubjects]);
	const periodDateRange = useMemo(() => {
		const dates = periodSubjects.flatMap((subject) => subject.grades.map((grade) => grade.date)).sort();
		if (!dates.length) return periodLabel.toUpperCase();
		const format = (date) => fmtDate(date, {
			day: "2-digit",
			month: "2-digit",
			year: "2-digit"
		});
		return `${format(dates[0] ?? "")} – ${format(dates[dates.length - 1] ?? "")}`;
	}, [periodSubjects, periodLabel]);
	const openAssignments = useMemo(() => assignments.filter((item) => !isDone(item.id, item.completed) && (!item.dueDate || item.dueDate.slice(0, 10) >= today)).sort((a, b) => `${a.dueDate ?? "9999"}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate ?? "9999"}${b.dueTime ?? ""}`)), [
		assignments,
		today,
		isDone
	]);
	const latestGrades = useMemo(() => subjects.flatMap((subject) => subject.grades.map((grade) => ({
		subject,
		grade
	}))).sort((a, b) => b.grade.date.localeCompare(a.grade.date)), [subjects]);
	const notices = useMemo(() => notifications.filter((item) => item.type === "notice").sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")), [notifications]);
	const reminders = useMemo(() => selectUpcomingReminders(notifications, now), [notifications, now]);
	const reminderCards = reminders.length ? reminders : [{
		id: "empty-reminder",
		type: "reminder",
		title: "Nessun promemoria",
		message: "I prossimi promemoria appariranno qui.",
		read: true
	}];
	const studentName = (v.data.student.name || "ANDREA MARIA").toUpperCase();
	const progress = avg === null ? 0 : Math.max(0, Math.min(100, avg * 10));
	const teacherForSubject = (subjectName) => {
		const normalizedName = subjectName?.trim().toLocaleLowerCase("it-IT");
		if (!normalizedName) return void 0;
		return subjects.find((subject) => subject.name.trim().toLocaleLowerCase("it-IT") === normalizedName)?.teacher;
	};
	const attendanceEvents = useMemo(() => [...v.data.attendanceEvents ?? []].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3), [v.data.attendanceEvents]);
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page min-h-dvh bg-black px-2 pb-[108px] text-white",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "flex items-center justify-between px-2.5 pb-[32px] pt-5",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "text-[20px] font-normal leading-none tracking-tight",
					children: studentName
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-2 text-[11px] leading-none text-white/80",
					children: updatedLabel(v.data.updatedAt || v.lastSync, now)
				})] }), /* @__PURE__ */ jsx("img", {
					src: "/didup-profile.jpg",
					alt: "",
					className: "h-[50px] w-[50px] object-cover"
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: `didup-card overflow-hidden px-5 pb-2 ${averageHidden ? "pt-[14px]" : "pt-[26px]"}`,
				children: [/* @__PURE__ */ jsxs("div", {
					className: `relative grid gap-4 ${averageHidden ? "min-h-[68px] grid-cols-[0.72fr_1.28fr]" : "grid-cols-2"}`,
					children: [
						!averageHidden && /* @__PURE__ */ jsx("span", {
							"aria-hidden": "true",
							className: "absolute left-1/2 top-[40px] h-[34px] w-[2px] -translate-x-1/2 bg-[#0aa0b1]"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							"aria-label": averageHidden ? "Mostra la media" : "Nascondi la media",
							"aria-pressed": averageHidden,
							onClick: () => {
								const next = !averageHidden;
								setAverageHidden(next);
								save(KEYS.homeAverageHidden, next);
							},
							className: "press absolute -left-1 top-[1px] z-10 flex h-7 w-7 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0aa0b1]",
							children: /* @__PURE__ */ jsx(DidupEyeIcon, { hidden: averageHidden })
						}),
						averageHidden ? /* @__PURE__ */ jsx("div", {
							className: "flex min-h-[68px] items-start justify-center",
							children: /* @__PURE__ */ jsx(BackpackIllustration, { className: "mx-auto -mt-5 translate-x-3 h-[76px] w-[68px] object-contain object-center" })
						}) : /* @__PURE__ */ jsxs("div", {
							className: "text-center",
							children: [
								/* @__PURE__ */ jsx("h2", {
									className: "text-[16px] font-extrabold leading-none",
									children: "Media"
								}),
								/* @__PURE__ */ jsx("div", {
									className: "didup-average-ring mx-auto mt-[22px]",
									style: { "--progress": `${progress}%` },
									children: /* @__PURE__ */ jsx("span", { children: avg === null ? "—" : fmt(avg) })
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-[22px] text-[12px] italic leading-5 text-white/90",
									children: "Calcolata nel periodo"
								}),
								/* @__PURE__ */ jsx("p", {
									className: "text-[12px] italic leading-5 text-white/90",
									children: periodDateRange
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "text-center",
							children: [
								/* @__PURE__ */ jsx("h2", {
									className: "text-[16px] font-extrabold leading-none",
									children: "Prepara lo zaino!"
								}),
								!averageHidden && /* @__PURE__ */ jsx(BackpackIllustration, {}),
								averageHidden ? /* @__PURE__ */ jsxs("div", {
									className: "mt-2 text-[11px] italic leading-4 text-white/90",
									children: [/* @__PURE__ */ jsx("p", {
										className: "whitespace-nowrap",
										children: "Controlla le materie di domani,"
									}), /* @__PURE__ */ jsx("p", {
										className: "whitespace-nowrap",
										children: tomorrowLabel(now)
									})]
								}) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
									className: "mt-4 text-[12px] italic leading-5 text-white/90",
									children: "Controlla le materie di"
								}), /* @__PURE__ */ jsxs("p", {
									className: "text-[12px] italic leading-5 text-white/90",
									children: ["domani, ", tomorrowLabel(now)]
								})] })
							]
						})
					]
				}), /* @__PURE__ */ jsx("div", {
					className: `${averageHidden ? "mt-2" : "mt-3"} border-t-2 border-[#0aa0b1] pt-2`,
					children: /* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-3 text-center text-[10px] font-extrabold uppercase",
						children: [
							/* @__PURE__ */ jsxs("span", { children: ["Assenze", /* @__PURE__ */ jsx("strong", {
								className: "mt-1 block text-[15px]",
								children: Math.round(attendance.absenceDays)
							})] }),
							/* @__PURE__ */ jsxs("span", { children: ["Ritardi", /* @__PURE__ */ jsx("strong", {
								className: "mt-1 block text-[15px]",
								children: attendance.delays
							})] }),
							/* @__PURE__ */ jsxs("span", { children: ["Uscite", /* @__PURE__ */ jsx("strong", {
								className: "mt-1 block text-[15px]",
								children: attendance.earlyExits
							})] })
						]
					})
				})]
			}),
			/* @__PURE__ */ jsx(DidupSectionTitle, {
				title: "Prossimi compiti",
				href: "/compiti"
			}),
			/* @__PURE__ */ jsx(DidupScroller, { children: openAssignments.length > 0 ? openAssignments.slice(0, 5).map((item) => /* @__PURE__ */ jsxs("article", {
				className: "didup-tile didup-task-tile flex min-h-[172px] w-[84%] shrink-0 flex-col overflow-hidden px-5 pb-5 pt-[18px]",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ jsx("p", {
							className: "truncate text-[16px] font-medium uppercase text-white/90",
							children: item.subject ?? "COMPITO"
						}), /* @__PURE__ */ jsx(DidupPinIcon, {})]
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-[9px] line-clamp-3 text-[14px] leading-5 text-white/90",
						children: [item.title, item.details ? `: ${item.details}` : ""]
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-auto border-t border-white/30 pt-3 text-right text-[10px] uppercase text-black/80",
						children: ["Consegna ", dueDateLabel(item.dueDate)]
					})
				]
			}, item.id)) : /* @__PURE__ */ jsx(EmptyTile, {
				text: "Nessun compito in scadenza",
				variant: "task"
			}) }),
			/* @__PURE__ */ jsxs("section", {
				className: "didup-card relative mt-9 overflow-hidden px-5 pb-2 pt-4",
				children: [
					/* @__PURE__ */ jsx("img", {
						src: "/didup-event-badge-transparent.png",
						alt: "",
						"aria-hidden": "true",
						className: "absolute right-0 top-0 h-9 w-9 select-none"
					}),
					/* @__PURE__ */ jsx("h2", {
						className: "pr-10 text-[18px] font-extrabold leading-6",
						children: "Eventi appello"
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-2",
						children: attendanceEvents.length > 0 ? attendanceEvents.map((event, index) => {
							const title = event.type === "absence" ? "Assenza" : event.type === "delay" ? "Ritardo" : "Uscita";
							const icon = event.type === "absence" ? /* @__PURE__ */ jsx(AbsenceIcon, {}) : event.type === "delay" ? /* @__PURE__ */ jsx("img", {
								src: "/didup-delay-icon.png",
								alt: "",
								"aria-hidden": "true",
								className: "h-7 w-6 object-contain"
							}) : /* @__PURE__ */ jsx(CalendarX2, { className: "h-5 w-5" });
							return /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-4 py-3",
								children: [/* @__PURE__ */ jsx("span", {
									className: "flex w-[22px] shrink-0 items-center justify-center text-[#0aa0b1]",
									children: icon
								}), /* @__PURE__ */ jsx("div", {
									className: `min-w-0 flex-1 pb-3 ${index < attendanceEvents.length - 1 ? "border-b border-white/15" : ""}`,
									children: /* @__PURE__ */ jsxs("div", {
										className: "flex items-start justify-between gap-3",
										children: [/* @__PURE__ */ jsx("div", {
											className: "min-w-0",
											children: /* @__PURE__ */ jsx("p", {
												className: "text-[16px] leading-5",
												children: title
											})
										}), /* @__PURE__ */ jsx("time", {
											dateTime: event.date,
											className: "whitespace-nowrap pt-1 text-[12px] font-semibold text-[#0aa0b1]",
											children: shortDate(event.date)
										})]
									})
								})]
							}, event.id);
						}) : /* @__PURE__ */ jsx("p", {
							className: "py-5 text-center text-[13px] text-white/70",
							children: attendance.absenceDays > 0 || attendance.delays > 0 || attendance.earlyExits > 0 ? "Dettagli degli eventi non disponibili nei dati sincronizzati." : "Nessun evento di appello."
						})
					})
				]
			}),
			/* @__PURE__ */ jsx(DidupSectionTitle, {
				title: "Ultimi voti",
				href: "/voti",
				compact: true
			}),
			/* @__PURE__ */ jsx(DidupScroller, { children: latestGrades.slice(0, 5).map(({ subject, grade }) => {
				const badgeImage = grade.value < 5 ? "/didup-grade-badge-red.png" : grade.value < 6 ? "/didup-grade-badge-orange.png" : "/didup-grade-badge.png";
				const teacher = grade.teacher || subject.teacher;
				return /* @__PURE__ */ jsxs("article", {
					className: "didup-tile relative min-h-[154px] w-[84%] shrink-0 overflow-hidden p-4",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "absolute right-0 top-0 flex h-[60px] w-[60px] items-center justify-center text-[20px] font-extrabold text-white",
							children: [/* @__PURE__ */ jsx("img", {
								src: badgeImage,
								alt: "",
								"aria-hidden": "true",
								className: "absolute inset-0 h-full w-full select-none"
							}), /* @__PURE__ */ jsx("span", {
								className: "relative z-10",
								children: grade.label
							})]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-[12px] text-[#0aa0b1]",
							children: shortDate(grade.date)
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-5 text-[16px] uppercase",
							children: subject.name
						}),
						grade.comment && /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-[13px] text-white/90",
							children: grade.comment
						}),
						teacher && /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-[11px] text-white/65",
							children: teacher
						})
					]
				}, grade.id);
			}) }),
			/* @__PURE__ */ jsx(DidupSectionTitle, {
				title: "Bacheca",
				href: "/bacheca",
				compact: true,
				linkLabel: "Vedi tutte"
			}),
			/* @__PURE__ */ jsx(DidupScroller, { children: notices.length > 0 ? notices.slice(0, 5).map((item) => {
				const attachmentCount = item.attachments?.length || (item.attachmentPath || item.attachmentUrl ? 1 : 0);
				const contentLabel = notificationContentLabel(item);
				const hasFiles = contentLabel === "Circolari";
				const teacher = item.teacher || teacherForSubject(item.subject);
				const subtitle = [item.subject, teacher].filter(Boolean).join(" · ");
				const summary = item.message && item.message !== item.title ? item.message : isGenericNoticeTitle(item) ? "" : notificationDisplayTitle(item);
				return /* @__PURE__ */ jsxs("article", {
					className: "didup-tile relative flex min-h-[206px] w-[84%] shrink-0 flex-col overflow-hidden p-4",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "pr-12 text-[12px] text-[#0aa0b1]",
							children: shortDate(item.date)
						}),
						/* @__PURE__ */ jsx("img", {
							src: "/didup-bacheca-badge-transparent.png",
							alt: "",
							"aria-hidden": "true",
							className: "absolute right-0 top-0 h-[40px] w-[40px] select-none"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 text-[18px] uppercase",
							children: contentLabel
						}),
						subtitle && /* @__PURE__ */ jsx("p", {
							className: "text-[13px]",
							children: subtitle
						}),
						summary && /* @__PURE__ */ jsx("p", {
							className: "mt-7 line-clamp-1 text-[14px] leading-6",
							children: summary
						}),
						hasFiles && /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								setViewerRequested(true);
								setSelectedCircular(item);
								v.markRead([item.id]);
							},
							"aria-label": `Apri circolare, ${attachmentCount} ${attachmentCount === 1 ? "allegato" : "allegati"}: ${item.title}`,
							className: "press mt-auto inline-flex items-center text-left text-[12px] text-white/90",
							children: [/* @__PURE__ */ jsx(FileText, { className: "mr-2 h-4 w-4" }), attachmentCount]
						}),
						!hasFiles && (item.message || item.extractedText || item.title) && /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								setViewerRequested(true);
								setSelectedCircular(item);
								v.markRead([item.id]);
							},
							"aria-label": `Apri comunicazione: ${item.title}`,
							className: "press mt-auto inline-flex items-center text-left text-[12px] text-white/90",
							children: [/* @__PURE__ */ jsx(FileText, { className: "mr-2 h-4 w-4" }), "Leggi comunicazione"]
						})
					]
				}, item.id);
			}) : /* @__PURE__ */ jsx(EmptyTile, {
				text: "Nessuna circolare o comunicazione",
				variant: "notice"
			}) }),
			/* @__PURE__ */ jsx(DidupSectionTitle, {
				title: "Promemoria",
				href: "/promemoria",
				compact: true
			}),
			/* @__PURE__ */ jsx(DidupScroller, { children: reminderCards.slice(0, 5).map((item) => {
				const teacher = item.teacher || teacherForSubject(item.subject);
				return /* @__PURE__ */ jsxs("article", {
					className: "didup-tile relative min-h-[155px] w-[84%] shrink-0 overflow-hidden p-4",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "pr-12 text-[12px] text-[#0aa0b1]",
							children: shortDate(item.date) || "DATA DA DEFINIRE"
						}),
						/* @__PURE__ */ jsx("img", {
							src: "/didup-reminder-badge-transparent.png",
							alt: "",
							"aria-hidden": "true",
							className: "absolute right-0 top-0 h-[40px] w-[40px] select-none"
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "mt-2 text-[13px]",
							children: [item.subject || "Promemoria", teacher ? ` · ${teacher}` : ""]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-8 text-[15px] leading-6",
							children: item.message || item.title
						})
					]
				}, item.id);
			}) }),
			viewerRequested && /* @__PURE__ */ jsx(Suspense, {
				fallback: /* @__PURE__ */ jsx("div", {
					role: "status",
					className: "fixed inset-0 z-[100] grid place-items-center bg-background/70 text-sm",
					children: "Caricamento del contenuto…"
				}),
				children: /* @__PURE__ */ jsx(LazyCircularViewer, {
					open: selectedCircular !== null,
					onOpenChange: (open) => {
						if (!open) setSelectedCircular(null);
					},
					title: selectedCircular?.message ?? selectedCircular?.title ?? "Circolare",
					fileName: selectedCircular?.attachmentName,
					path: selectedCircular?.attachmentPath,
					attachments: selectedCircular?.attachments,
					url: selectedCircular?.attachmentPath ? selectedCircular.attachmentUrl : void 0,
					extractedText: selectedCircular?.extractedText ?? selectedCircular?.message ?? selectedCircular?.title
				})
			})
		]
	});
}
function BackpackIllustration({ className }) {
	return /* @__PURE__ */ jsx("img", {
		src: "/didup-backpack-transparent.png",
		alt: "",
		className: className ?? "mx-auto mt-3 h-[85px] w-[84px] object-contain object-top"
	});
}
function DidupEyeIcon({ hidden }) {
	return /* @__PURE__ */ jsxs("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 24 24",
		className: "h-[15px] w-[15px]",
		children: [
			/* @__PURE__ */ jsx("path", {
				d: "M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12Z",
				fill: "#0aa0b1"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "3.2",
				fill: "#292929"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: "12",
				cy: "12",
				r: "1.3",
				fill: "#0aa0b1"
			}),
			hidden && /* @__PURE__ */ jsx("path", {
				d: "M4 20 20 4",
				fill: "none",
				stroke: "#0aa0b1",
				strokeLinecap: "round",
				strokeWidth: "3"
			})
		]
	});
}
function DidupPinIcon() {
	return /* @__PURE__ */ jsxs("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 24 24",
		className: "h-[17px] w-[17px] shrink-0 rotate-45",
		children: [/* @__PURE__ */ jsx("path", {
			d: "M8 3.5h8l-1.1 5.7 3.1 2.9v1.8H6v-1.8l3.1-2.9L8 3.5Z",
			fill: "#e84834"
		}), /* @__PURE__ */ jsx("path", {
			d: "M12 14v8",
			fill: "none",
			stroke: "#d7d7d7",
			strokeLinecap: "round",
			strokeWidth: "1.5"
		})]
	});
}
function AbsenceIcon() {
	return /* @__PURE__ */ jsx("img", {
		src: "/didup-absence-icon.png",
		alt: "",
		"aria-hidden": "true",
		className: "h-[23px] w-[18px] shrink-0 object-contain"
	});
}
function EmptyTile({ text, variant }) {
	return /* @__PURE__ */ jsx("article", {
		className: `didup-tile ${variant === "task" ? "didup-task-tile min-h-[172px] p-5" : "min-h-[206px] p-4"} flex w-[84%] shrink-0 items-center justify-center text-center text-sm text-white/70`,
		children: text
	});
}
function DidupSectionTitle({ title, href, compact = false, linkLabel = "Vedi tutti" }) {
	return /* @__PURE__ */ jsxs("div", {
		className: `${compact ? "mt-6" : "mt-9"} flex items-center justify-between px-3.5`,
		children: [/* @__PURE__ */ jsx("h2", {
			className: "text-[22px] font-extrabold",
			children: title
		}), /* @__PURE__ */ jsxs(Link, {
			to: href,
			className: "text-[13px] text-white/90",
			children: [linkLabel, " ›"]
		})]
	});
}
function DidupScroller({ children }) {
	return /* @__PURE__ */ jsx("div", {
		className: "no-scrollbar mt-1 flex gap-4 overflow-x-auto px-0.5",
		children
	});
}
//#endregion
export { DidupDashboard };
