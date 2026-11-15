import { t as cn } from "./utils-C_uf36nf.js";
import { r as useVoto } from "./store-EhdD6Ug3.js";
import { n as load, r as save, t as KEYS } from "./storage-D7ptFFhi.js";
import { n as useSchoolPeriods } from "./periods-context-BiByHTyY.js";
import { i as fmt, n as average, t as arithmeticMean } from "./calc-DWBiEBUY.js";
import { o as SectionTitle, r as Empty } from "./ui-D03OlNCN.js";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, ChevronRight, GraduationCap, Plus, Trash2, X } from "lucide-react";
//#region src/lib/voto/infraperiodal.ts
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/** Interpreta voti inseriti con la virgola o il punto, limitandoli all’intervallo 1–10. */
function parseReportGrade(input) {
	const normalized = input.trim().replace(",", ".");
	if (!normalized || !/^\d+(?:\.\d*)?$/.test(normalized)) return null;
	const value = Number(normalized);
	return Number.isFinite(value) && value >= 1 && value <= 10 ? value : null;
}
/** Arrotonda al voto intero più vicino; i mezzi voti sono arrotondati per eccesso. */
function roundReportGrade(value) {
	if (value === null || !Number.isFinite(value) || value < 1 || value > 10) return null;
	return Math.min(10, Math.floor(value + .5));
}
function averageRoundedReport(entries) {
	const grades = entries.map((entry) => roundReportGrade(parseReportGrade(entry.rawGrade))).filter((grade) => grade !== null);
	if (grades.length === 0) return null;
	return grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
}
function normalizeManualReports(value) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (!isRecord(item)) return [];
		const { id, title, createdAt, entries: rawEntries } = item;
		if (typeof id !== "string" || typeof title !== "string" || typeof createdAt !== "string" || !Array.isArray(rawEntries)) return [];
		return [{
			id,
			title,
			createdAt,
			entries: rawEntries.flatMap((entry) => {
				if (!isRecord(entry) || typeof entry["id"] !== "string" || typeof entry["subject"] !== "string" || typeof entry["rawGrade"] !== "string") return [];
				return [{
					id: entry["id"],
					subject: entry["subject"],
					rawGrade: entry["rawGrade"]
				}];
			})
		}];
	});
}
//#endregion
//#region src/lib/voto/scrutiny-report.ts
/** Deriva un riepilogo indicativo dal registro; non rappresenta i voti ufficiali dello scrutinio. */
function buildDidupScrutinyRows(subjects, startDate, endDate) {
	return subjects.map((subject) => {
		const grades = subject.grades.filter((grade) => {
			const day = grade.date.slice(0, 10);
			return day >= startDate && day <= endDate;
		});
		const subjectAverage = average(grades);
		return {
			id: subject.id,
			name: subject.name,
			grade: subjectAverage === null ? null : Math.round(subjectAverage),
			mean: subjectAverage,
			gradeCount: grades.length
		};
	}).sort((a, b) => a.name.localeCompare(b.name, "it-IT"));
}
function didupScrutinyAverage(rows) {
	return arithmeticMean(rows.map((row) => row.mean).filter((mean) => mean !== null));
}
//#endregion
//#region src/routes/scrutini-infraperiodali.tsx?tsr-split=component
function makeId() {
	return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function ScrutiniInfraperiodali() {
	const v = useVoto();
	const { config } = useSchoolPeriods();
	const [reports, setReports] = useState([]);
	const [activeId, setActiveId] = useState(null);
	const [loaded, setLoaded] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [titleDraft, setTitleDraft] = useState("");
	const [subjectDraft, setSubjectDraft] = useState("");
	const [didupView, setDidupView] = useState("landing");
	useEffect(() => {
		if (!v.ready) return;
		const saved = normalizeManualReports(load(KEYS.infraperiodalReports, []));
		setReports(saved);
		setActiveId(saved[0]?.id ?? null);
		setLoaded(true);
	}, [v.ready]);
	useEffect(() => {
		if (loaded) save(KEYS.infraperiodalReports, reports);
	}, [loaded, reports]);
	const activeReport = reports.find((report) => report.id === activeId) ?? null;
	function startCreate() {
		setTitleDraft(`Pagella infraperiodale ${reports.length + 1}`);
		setCreateOpen(true);
	}
	function createReport() {
		const title = titleDraft.trim();
		if (!title) return;
		const entries = v.data.subjects.map((subject) => ({
			id: makeId(),
			subject: subject.name,
			rawGrade: ""
		}));
		const report = {
			id: makeId(),
			title,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			entries
		};
		setReports((current) => [report, ...current]);
		setActiveId(report.id);
		setCreateOpen(false);
	}
	function updateReport(reportId, update) {
		setReports((current) => current.map((report) => report.id === reportId ? update(report) : report));
	}
	function updateEntry(reportId, entryId, patch) {
		updateReport(reportId, (report) => ({
			...report,
			entries: report.entries.map((entry) => entry.id === entryId ? {
				...entry,
				...patch
			} : entry)
		}));
	}
	function addSubject() {
		if (!activeReport) return;
		const subject = subjectDraft.trim();
		if (!subject) return;
		if (activeReport.entries.some((entry) => entry.subject.trim().toLocaleLowerCase("it-IT") === subject.toLocaleLowerCase("it-IT"))) return;
		updateReport(activeReport.id, (report) => ({
			...report,
			entries: [...report.entries, {
				id: makeId(),
				subject,
				rawGrade: ""
			}]
		}));
		setSubjectDraft("");
	}
	function removeReport(report) {
		if (!window.confirm(`Vuoi eliminare “${report.title}” e i voti inseriti?`)) return;
		const next = reports.filter((item) => item.id !== report.id);
		setReports(next);
		if (activeId === report.id) setActiveId(next[0]?.id ?? null);
	}
	if (!loaded) return v.registryStyle === "didup" ? /* @__PURE__ */ jsxs("div", {
		className: "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white",
		children: [/* @__PURE__ */ jsx(DidupScrutiniHeader, { studentName: v.data.student.name }), /* @__PURE__ */ jsx("div", {
			className: "px-2 pt-16 text-sm text-white/65",
			children: "Caricamento delle pagelle…"
		})]
	}) : /* @__PURE__ */ jsx("div", {
		className: "pt-3 text-sm text-muted-foreground",
		children: "Caricamento delle pagelle…"
	});
	if (v.registryStyle === "didup" && didupView === "landing") return /* @__PURE__ */ jsx(DidupScrutiniLanding, {
		studentName: v.data.student.name,
		onOpenFirst: () => setDidupView("first"),
		onOpenFinal: () => setDidupView("final"),
		onOpenInfraperiodal: () => setDidupView("manual")
	});
	if (v.registryStyle === "didup" && (didupView === "first" || didupView === "final")) {
		const startDate = `${config.year}-09-15`;
		const firstPeriodEnd = `${config.year}-12-15`;
		const endDate = `${config.year + 1}-08-31`;
		const dateRange = didupView === "first" ? [startDate, firstPeriodEnd] : [startDate, endDate];
		const rows = buildDidupScrutinyRows(v.data.subjects, dateRange[0], dateRange[1]);
		return /* @__PURE__ */ jsx(DidupScrutinyReport, {
			title: didupView === "first" ? "PRIMO TRIMESTRE" : "SCRUTINIO FINALE",
			studentName: v.data.student.name,
			rows,
			average: didupScrutinyAverage(rows),
			onBack: () => setDidupView("landing")
		});
	}
	const average = activeReport ? averageRoundedReport(activeReport.entries) : null;
	const isDidup = v.registryStyle === "didup";
	return /* @__PURE__ */ jsxs("div", {
		className: cn("pb-6", isDidup ? "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white" : "pt-3"),
		children: [
			isDidup ? /* @__PURE__ */ jsx(DidupScrutiniHeader, {
				studentName: v.data.student.name,
				title: "SCRUTINIO INFRAPERIODALE",
				onBack: () => setDidupView("landing")
			}) : /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ jsx("span", {
					className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(GraduationCap, { className: "h-5 w-5" })
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "font-display text-2xl font-semibold",
					children: "Scrutini infraperiodali"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted-foreground",
					children: "Crea e compila le tue pagelle"
				})] })]
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Le tue pagelle" }),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: startCreate,
				className: cn("press flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold", isDidup ? "bg-[#3ed69d] text-[#14382c]" : "bg-primary text-primary-foreground"),
				children: [/* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }), " Crea una pagella"]
			}),
			createOpen && /* @__PURE__ */ jsxs("form", {
				className: cn("card-surface mt-3 p-4", isDidup && "border-white/15 bg-[#262626] text-white"),
				onSubmit: (event) => {
					event.preventDefault();
					createReport();
				},
				children: [
					/* @__PURE__ */ jsx("label", {
						htmlFor: "infraperiodal-title",
						className: "text-xs font-medium text-muted-foreground",
						children: "Nome della pagella"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "infraperiodal-title",
						autoFocus: true,
						value: titleDraft,
						onChange: (event) => setTitleDraft(event.target.value),
						maxLength: 60,
						className: cn("mt-2 h-11 w-full rounded-xl border px-3 text-sm", isDidup ? "border-white/20 bg-[#171717] text-white" : "border-input bg-background")
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 flex gap-2",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "submit",
							disabled: !titleDraft.trim(),
							className: cn("press flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50", isDidup ? "bg-[#3ed69d] text-[#14382c]" : "bg-primary text-primary-foreground"),
							children: [/* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }), " Crea"]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setCreateOpen(false),
							className: "press h-10 rounded-xl border border-border px-4 text-sm font-medium",
							children: "Annulla"
						})]
					})
				]
			}),
			reports.length === 0 ? /* @__PURE__ */ jsx("div", {
				className: "mt-4",
				children: /* @__PURE__ */ jsx(Empty, {
					icon: /* @__PURE__ */ jsx(GraduationCap, { className: "h-6 w-6" }),
					title: "Nessuna pagella creata",
					text: "Crea una pagella e inserisci tu i voti da arrotondare."
				})
			}) : /* @__PURE__ */ jsx("ul", {
				className: "mt-3 space-y-2",
				children: reports.map((report) => {
					const reportAverage = averageRoundedReport(report.entries);
					return /* @__PURE__ */ jsxs("li", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setActiveId(report.id),
							"aria-pressed": activeId === report.id,
							className: cn("press card-surface min-w-0 flex-1 p-3 text-left", isDidup && "border-white/15 bg-[#262626] text-white", activeId === report.id && (isDidup ? "border-[#3ed69d]" : "border-primary/60 bg-primary-soft/40")),
							children: [/* @__PURE__ */ jsx("span", {
								className: "block truncate text-sm font-semibold",
								children: report.title
							}), /* @__PURE__ */ jsxs("span", {
								className: cn("mt-1 block text-[11px]", isDidup ? "text-white/55" : "text-muted-foreground"),
								children: [
									report.entries.filter((entry) => parseReportGrade(entry.rawGrade) !== null).length,
									" ",
									"materie compilate",
									reportAverage !== null && ` · media arrotondata ${fmt(reportAverage, 1)}`
								]
							})]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => removeReport(report),
							"aria-label": `Elimina ${report.title}`,
							className: "press rounded-xl border border-border p-3 text-muted-foreground hover:text-danger",
							children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
						})]
					}, report.id);
				})
			}),
			activeReport && /* @__PURE__ */ jsxs("section", {
				className: "mt-5",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "active-report-title",
								className: cn("text-[10px] font-semibold uppercase tracking-wide", isDidup ? "text-white/55" : "text-muted-foreground"),
								children: "Titolo"
							}), /* @__PURE__ */ jsx("input", {
								id: "active-report-title",
								value: activeReport.title,
								onChange: (event) => updateReport(activeReport.id, (report) => ({
									...report,
									title: event.target.value
								})),
								maxLength: 60,
								className: cn("mt-1 h-10 w-full rounded-xl border px-3 text-sm font-semibold", isDidup ? "border-white/20 bg-[#171717] text-white" : "border-input bg-background")
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: cn("rounded-xl px-3 py-2 text-right", isDidup ? "bg-[#262626]" : "bg-surface"),
							children: [/* @__PURE__ */ jsx("span", {
								className: cn("block text-[9px] font-semibold uppercase", isDidup ? "text-white/55" : "text-muted-foreground"),
								children: "Media pagella"
							}), /* @__PURE__ */ jsx("span", {
								className: cn("tabular text-lg font-bold", isDidup && "text-[#3ed69d]"),
								children: average === null ? "—" : fmt(average, 1)
							})]
						})]
					}),
					/* @__PURE__ */ jsx(SectionTitle, { children: "Voti per materia" }),
					activeReport.entries.length === 0 ? /* @__PURE__ */ jsx(Empty, {
						icon: /* @__PURE__ */ jsx(GraduationCap, { className: "h-6 w-6" }),
						title: "Aggiungi una materia",
						text: "Puoi inserirla manualmente qui sotto."
					}) : /* @__PURE__ */ jsx("ul", {
						className: cn("space-y-2", isDidup && "divide-y divide-[#3a3a3a]"),
						children: activeReport.entries.map((entry) => {
							const parsed = parseReportGrade(entry.rawGrade);
							const rounded = roundReportGrade(parsed);
							const invalid = entry.rawGrade.trim() !== "" && parsed === null;
							return /* @__PURE__ */ jsxs("li", {
								className: cn("card-surface flex items-center gap-3 p-3", isDidup && "rounded-none border-0 bg-black px-1 py-4"),
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ jsx("p", {
											className: cn("truncate text-sm font-medium", isDidup && "font-extrabold uppercase text-white"),
											children: entry.subject
										}), invalid && /* @__PURE__ */ jsx("p", {
											className: "mt-0.5 text-[10px] text-danger",
											children: "Inserisci un voto da 1 a 10."
										})]
									}),
									/* @__PURE__ */ jsxs("label", {
										className: "sr-only",
										htmlFor: `grade-${entry.id}`,
										children: ["Media di ", entry.subject]
									}),
									/* @__PURE__ */ jsx("input", {
										id: `grade-${entry.id}`,
										type: "text",
										inputMode: "decimal",
										autoComplete: "off",
										placeholder: "Es. 6,5",
										value: entry.rawGrade,
										onChange: (event) => updateEntry(activeReport.id, entry.id, { rawGrade: event.target.value }),
										className: cn("h-10 w-[5.5rem] rounded-xl border px-2 text-center text-sm tabular-nums", isDidup ? "border-white/20 bg-[#171717] text-white" : "border-input bg-background")
									}),
									/* @__PURE__ */ jsx("span", {
										className: cn("w-[4.5rem] rounded-lg px-2 py-2 text-center text-xs font-semibold", rounded === null ? isDidup ? "bg-[#262626] text-white/50" : "bg-surface text-muted-foreground" : isDidup ? "bg-[#262626] text-[#3ed69d]" : "bg-primary-soft text-primary"),
										children: rounded === null ? "—" : `Voto ${rounded}`
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => updateReport(activeReport.id, (report) => ({
											...report,
											entries: report.entries.filter((item) => item.id !== entry.id)
										})),
										"aria-label": `Rimuovi ${entry.subject}`,
										className: "press rounded-lg p-1.5 text-muted-foreground hover:text-danger",
										children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
									})
								]
							}, entry.id);
						})
					}),
					/* @__PURE__ */ jsxs("form", {
						className: "mt-3 flex gap-2",
						onSubmit: (event) => {
							event.preventDefault();
							addSubject();
						},
						children: [
							/* @__PURE__ */ jsx("label", {
								htmlFor: "add-report-subject",
								className: "sr-only",
								children: "Nuova materia"
							}),
							/* @__PURE__ */ jsx("input", {
								id: "add-report-subject",
								value: subjectDraft,
								onChange: (event) => setSubjectDraft(event.target.value),
								maxLength: 60,
								placeholder: "Aggiungi una materia",
								className: "h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "submit",
								disabled: !subjectDraft.trim(),
								className: "press flex h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold disabled:opacity-50",
								children: [/* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }), " Aggiungi"]
							})
						]
					})
				]
			})
		]
	});
}
function DidupScrutiniHeader({ studentName, title = "VOTI SCRUTINI", onBack }) {
	return /* @__PURE__ */ jsxs("header", {
		className: "flex min-h-[98px] items-center justify-between gap-3 border-b border-white/20 bg-[#071313] px-2 py-4",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex min-w-0 items-start",
			children: [onBack ? /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: onBack,
				"aria-label": "Torna agli scrutini",
				className: "press flex h-10 w-10 shrink-0 items-center justify-start text-white",
				children: /* @__PURE__ */ jsx(ArrowLeft, {
					className: "h-8 w-8",
					strokeWidth: 1.7
				})
			}) : /* @__PURE__ */ jsx(Link, {
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
					children: title
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-[12px] leading-4",
					children: (studentName || "ANDREA MARIA").toUpperCase()
				})]
			})]
		}), /* @__PURE__ */ jsx("img", {
			src: "/didup-profile.jpg",
			alt: "",
			className: "h-[50px] w-[50px] shrink-0 object-cover"
		})]
	});
}
function DidupScrutiniLanding({ studentName, onOpenFirst, onOpenFinal, onOpenInfraperiodal }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white",
		children: [/* @__PURE__ */ jsx(DidupScrutiniHeader, { studentName }), /* @__PURE__ */ jsxs("div", {
			className: "mt-[78px] px-1",
			children: [
				/* @__PURE__ */ jsx(DidupScrutiniRow, {
					label: "PRIMO TRIMESTRE",
					onClick: onOpenFirst
				}),
				/* @__PURE__ */ jsx(DidupScrutiniRow, {
					label: "SCRUTINIO FINALE",
					onClick: onOpenFinal
				}),
				/* @__PURE__ */ jsx(DidupScrutiniRow, {
					label: "SCRUTINIO INFRAPERIODALE",
					onClick: onOpenInfraperiodal,
					last: true
				})
			]
		})]
	});
}
function DidupScrutinyReport({ title, studentName, rows, average, onBack }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page min-h-dvh bg-black pb-[100px] text-white",
		children: [
			/* @__PURE__ */ jsx(DidupScrutiniHeader, {
				studentName,
				title,
				onBack
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mx-2 mt-6 rounded-[14px] border border-[#3ed69d]/45 bg-[#18382d] px-4 py-3",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-[14px] font-extrabold uppercase tracking-wide text-[#3ed69d]",
					children: "Previsione automatica"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-[11px] leading-relaxed text-white/70",
					children: "VOTO calcola il voto previsto usando la media dei voti registrati nel periodo selezionato. La previsione non modifica i dati e non è il voto ufficiale dello scrutinio."
				})]
			}),
			/* @__PURE__ */ jsx("ul", {
				className: "mt-7 border-b border-[#3a3a3a] px-2",
				children: rows.map((row) => /* @__PURE__ */ jsxs("li", {
					className: "flex min-h-[92px] items-center gap-3 border-t border-[#3a3a3a] py-3 first:border-t-0",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ jsx("p", {
								className: "truncate text-[16px] font-extrabold uppercase leading-tight text-white",
								children: row.name
							}), /* @__PURE__ */ jsxs("p", {
								className: "mt-1 text-[13px] uppercase text-white/90",
								children: ["VOTI REGISTRATI: ", row.gradeCount]
							})]
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "w-[62px] shrink-0 text-[10px] uppercase leading-tight text-white/45",
							children: [
								"VOTO",
								/* @__PURE__ */ jsx("br", {}),
								"previsto"
							]
						}),
						/* @__PURE__ */ jsx("span", {
							className: "w-[42px] shrink-0 text-center text-[20px] font-bold text-[#3ed69d]",
							children: row.grade === null ? "—" : row.grade
						})
					]
				}, row.id))
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mx-2 mt-7 rounded-[14px] border-[3px] border-[#3ed69d] bg-[#262626] px-4 py-4",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-[17px] font-medium uppercase tracking-wide text-[#3ed69d]",
						children: "Riepilogo della previsione"
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-3 text-[14px] uppercase text-[#7189aa]",
						children: ["Media: ", average === null ? "—" : fmt(average, 2)]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-2 text-[11px] leading-relaxed text-white/50",
						children: "Calcolata dai voti registrati nel periodo; non è una valutazione ufficiale dello scrutinio."
					})
				]
			})
		]
	});
}
function DidupScrutiniRow({ label, onClick, last = false }) {
	const content = /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
		className: "text-[17px] font-extrabold tracking-tight",
		children: label
	}), /* @__PURE__ */ jsx(ChevronRight, {
		className: "h-7 w-7 shrink-0",
		strokeWidth: 1.7
	})] });
	return onClick ? /* @__PURE__ */ jsx("button", {
		type: "button",
		onClick,
		className: cn("press flex min-h-[96px] w-full items-center justify-between px-7 text-left", !last && "border-b border-white/25"),
		children: content
	}) : /* @__PURE__ */ jsx("div", {
		className: cn("flex min-h-[96px] items-center justify-between px-7", !last && "border-b border-white/25"),
		children: content
	});
}
//#endregion
export { ScrutiniInfraperiodali as component };
