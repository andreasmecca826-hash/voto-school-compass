import { n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { n as fmtDate, t as daysBetween } from "./dates-CdBXaUB1.js";
import { n as Chip, o as SectionTitle, r as Empty } from "./ui-D03OlNCN.js";
import { t as AssignmentRow } from "./AssignmentRow-CDi9RsJw.js";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, CalendarCheck, ChevronDown, ChevronUp, Share2, UserRound } from "lucide-react";
//#region src/lib/voto/didup-assignments.ts
function groupDidupAssignments(assignments, sortBy) {
	const sorted = [...assignments].sort((a, b) => {
		if (sortBy === "subject") return (a.subject || "").localeCompare(b.subject || "", "it") || (a.dueDate || "").localeCompare(b.dueDate || "");
		if (sortBy === "assignment") return (b.assignedDate || "").slice(0, 10).localeCompare((a.assignedDate || "").slice(0, 10)) || (a.dueDate || "").localeCompare(b.dueDate || "") || (a.subject || "").localeCompare(b.subject || "", "it");
		return (b.dueDate || "").localeCompare(a.dueDate || "");
	});
	const groupKey = (assignment) => {
		if (sortBy === "subject") return assignment.subject?.trim() || "Materia non specificata";
		return (sortBy === "assignment" ? assignment.assignedDate : assignment.dueDate)?.slice(0, 10) || "";
	};
	const buckets = /* @__PURE__ */ new Map();
	sorted.forEach((assignment) => {
		const key = groupKey(assignment);
		buckets.set(key, [...buckets.get(key) ?? [], assignment]);
	});
	return [...buckets.entries()].sort(([a], [b]) => {
		if (sortBy === "subject") return a.localeCompare(b, "it");
		return b.localeCompare(a);
	}).map(([key, items]) => ({
		key: key || (sortBy === "assignment" ? "no-assignment-date" : "no-due-date"),
		label: sortBy === "subject" ? key : key ? `${sortBy === "assignment" ? "ASSEGNATI IL" : "DA CONSEGNARE IL"} ${fmtDate(key, {
			day: "2-digit",
			month: "long"
		}).toLocaleUpperCase("it-IT")}` : sortBy === "assignment" ? "DATA DI ASSEGNAZIONE NON DISPONIBILE" : "SENZA DATA DI CONSEGNA",
		items
	}));
}
//#endregion
//#region src/routes/compiti.tsx?tsr-split=component
function Compiti() {
	const v = useVoto();
	const now = useClock();
	const [subj, setSubj] = useState("all");
	const subjects = [...new Set(v.data.assignments.map((a) => a.subject).filter(Boolean))];
	const all = v.data.assignments.filter((a) => subj === "all" || a.subject === subj).sort((a, b) => `${a.dueDate ?? "9"}${a.dueTime ?? ""}`.localeCompare(`${b.dueDate ?? "9"}${b.dueTime ?? ""}`));
	const done = all.filter((a) => v.isDone(a.id, a.completed));
	const open = all.filter((a) => !v.isDone(a.id, a.completed));
	const today = open.filter((a) => a.dueDate && daysBetween(now, a.dueDate) <= 0);
	const next = open.filter((a) => !a.dueDate || daysBetween(now, a.dueDate) > 0);
	if (v.registryStyle === "didup") return /* @__PURE__ */ jsx(DidupCompitiPage, {
		assignments: v.data.assignments,
		studentName: (v.data.student.name || "ANDREA MARIA").toLocaleUpperCase("it-IT")
	});
	const group = (title, items) => /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(SectionTitle, { children: [
		title,
		" ",
		/* @__PURE__ */ jsxs("span", {
			className: "text-muted-foreground",
			children: ["· ", items.length]
		})
	] }), items.length ? /* @__PURE__ */ jsx("ul", {
		className: "space-y-2",
		children: items.map((a) => /* @__PURE__ */ jsx(AssignmentRow, { a }, a.id))
	}) : /* @__PURE__ */ jsx(Empty, {
		icon: /* @__PURE__ */ jsx(CalendarCheck, { className: "h-6 w-6" }),
		title: "Niente qui"
	})] });
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "font-display text-2xl font-semibold",
				children: "Compiti"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "no-scrollbar mt-4 flex gap-2 overflow-x-auto",
				children: [/* @__PURE__ */ jsx(Chip, {
					active: subj === "all",
					onClick: () => setSubj("all"),
					children: "Tutte"
				}), subjects.map((s) => /* @__PURE__ */ jsx(Chip, {
					active: subj === s,
					onClick: () => setSubj(s),
					children: s
				}, s))]
			}),
			group("Oggi", today),
			group("Prossimi", next),
			group("Completati", done)
		]
	});
}
function DidupCompitiPage({ assignments, studentName }) {
	const [sortBy, setSortBy] = useState("assignment");
	const [openSubjects, setOpenSubjects] = useState({});
	const [showAllBySubject, setShowAllBySubject] = useState({});
	const groups = groupDidupAssignments(assignments, sortBy);
	function shareGroup(group) {
		const text = group.items.map((assignment) => {
			return `${assignment.subject ? `${assignment.subject}: ` : ""}${assignment.details || assignment.title}`;
		}).join("\n");
		if (navigator.share) navigator.share({
			title: group.label,
			text
		}).catch(() => {});
		else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page mx-auto min-h-dvh w-full max-w-[480px] bg-black pb-[112px] text-white",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "flex min-h-[112px] items-center justify-between gap-4 px-4 pb-4 pr-[14px] pt-7",
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
							children: "Compiti"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 truncate text-[12px] uppercase leading-tight text-white/90",
							children: studentName
						})]
					}),
					/* @__PURE__ */ jsx("img", {
						src: "/didup-profile-reference.png",
						alt: "",
						"aria-hidden": "true",
						className: "h-[43px] w-[43px] shrink-0 rounded-full object-contain"
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mx-5 mt-4",
				"aria-label": "Ordina compiti",
				children: [/* @__PURE__ */ jsx("p", {
					className: "pl-[10px] text-[12px] uppercase tracking-wide text-white/65",
					children: "Ordina per"
				}), /* @__PURE__ */ jsx("div", {
					className: "mt-2 grid grid-cols-3 overflow-hidden rounded-[8px] bg-[#252525]",
					children: [
						["delivery", "Consegna"],
						["subject", "Materia"],
						["assignment", "Assegnazione"]
					].map(([value, label]) => /* @__PURE__ */ jsx("button", {
						type: "button",
						"aria-pressed": sortBy === value,
						onClick: () => setSortBy(value),
						className: `min-h-[48px] px-2 text-[12px] font-normal uppercase tracking-[0.025em] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${sortBy === value ? "bg-[#08a5b5] text-white" : "text-white/90 hover:bg-white/10"}`,
						children: label
					}, value))
				})]
			}),
			groups.length ? sortBy === "subject" ? /* @__PURE__ */ jsx("div", {
				className: "mt-[20px] space-y-0",
				children: groups.map((group) => {
					const isOpen = Boolean(openSubjects[group.key]);
					const showAll = Boolean(showAllBySubject[group.key]);
					const visibleItems = showAll ? group.items : group.items.slice(0, 1);
					return /* @__PURE__ */ jsxs("section", {
						className: `overflow-hidden rounded-[4px] bg-[#252525] ${isOpen ? "mt-4" : ""}`,
						"aria-label": group.label,
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							"aria-expanded": isOpen,
							onClick: () => setOpenSubjects((current) => ({
								...current,
								[group.key]: !current[group.key]
							})),
							className: "flex min-h-[58px] w-full items-center justify-between gap-4 border-b border-white/15 px-8 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#08a5b5]",
							children: [/* @__PURE__ */ jsx("span", {
								className: "text-[14px] font-normal uppercase leading-tight tracking-[0.035em]",
								children: group.label
							}), isOpen ? /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4 shrink-0 text-white/65" }) : /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-white/65" })]
						}), isOpen && /* @__PURE__ */ jsxs("div", {
							className: "px-5 pb-5 pt-4",
							children: [visibleItems.map((assignment) => {
								const description = assignment.details || assignment.title;
								return /* @__PURE__ */ jsxs("article", {
									className: "py-2",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "space-y-1",
											children: [assignment.assignedDate && /* @__PURE__ */ jsxs("div", {
												className: "flex items-center gap-2 text-[12px] uppercase leading-5",
												children: [/* @__PURE__ */ jsx("img", {
													src: "/didup-calendar-reference.png",
													alt: "",
													"aria-hidden": "true",
													className: "h-4 w-4 shrink-0 object-contain"
												}), /* @__PURE__ */ jsxs("span", { children: [
													"Assegnato il",
													" ",
													fmtDate(assignment.assignedDate, {
														day: "2-digit",
														month: "long"
													}).toLocaleUpperCase("it-IT")
												] })]
											}), assignment.teacher && /* @__PURE__ */ jsxs("div", {
												className: "flex items-center gap-2 text-[12px] uppercase leading-5",
												children: [/* @__PURE__ */ jsx(UserRound, { className: "h-4 w-4 shrink-0 fill-[#4169a8] text-[#4169a8]" }), /* @__PURE__ */ jsx("span", { children: assignment.teacher })]
											})]
										}),
										description && /* @__PURE__ */ jsx("p", {
											className: "mt-6 whitespace-pre-line text-[14px] leading-[1.45] text-white/90",
											children: description
										}),
										assignment.dueDate && /* @__PURE__ */ jsxs("div", {
											className: "mt-6 flex items-center justify-end gap-2 text-[12px] uppercase tracking-wide text-[#08a5b5]",
											children: [/* @__PURE__ */ jsx("img", {
												src: "/didup-clock-reference.png",
												alt: "",
												"aria-hidden": "true",
												className: "h-4 w-4 shrink-0 object-contain"
											}), /* @__PURE__ */ jsxs("span", { children: [
												"Consegna il",
												" ",
												fmtDate(assignment.dueDate, {
													weekday: "long",
													day: "2-digit",
													month: "long"
												}).toLocaleUpperCase("it-IT")
											] })]
										})
									]
								}, assignment.id);
							}), group.items.length > 1 && /* @__PURE__ */ jsx("div", {
								className: "mt-5 flex justify-end border-t border-white/15 pt-4",
								children: /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => setShowAllBySubject((current) => ({
										...current,
										[group.key]: !current[group.key]
									})),
									className: "rounded-full bg-[#08a5b5] px-5 py-2 text-[13px] italic text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
									children: showAll ? "Mostra meno" : "Mostra tutto"
								})
							})]
						})]
					}, group.key);
				})
			}) : /* @__PURE__ */ jsx("div", {
				className: "mt-[56px] space-y-10",
				children: groups.map((group) => /* @__PURE__ */ jsxs("section", {
					"aria-label": group.label,
					children: [/* @__PURE__ */ jsxs("div", {
						className: `flex items-center gap-3 px-5 ${sortBy === "assignment" ? "justify-start" : "justify-between"}`,
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex min-w-0 items-center gap-1.5",
							children: [/* @__PURE__ */ jsx("img", {
								src: "/didup-calendar-reference.png",
								alt: "",
								"aria-hidden": "true",
								className: "h-4 w-4 shrink-0 object-contain"
							}), /* @__PURE__ */ jsx("h2", {
								className: "truncate text-[12px] font-normal uppercase tracking-[0.035em]",
								children: group.label
							})]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							"aria-label": `Condividi ${group.label.toLocaleLowerCase("it-IT")}`,
							onClick: () => shareGroup(group),
							className: "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/75 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08a5b5]",
							children: /* @__PURE__ */ jsx(Share2, { className: "h-4 w-4" })
						})]
					}), /* @__PURE__ */ jsx("ul", {
						className: "mt-6 space-y-9",
						children: group.items.map((assignment) => {
							const title = assignment.subject || assignment.title;
							const description = assignment.details || (assignment.subject && assignment.title !== assignment.subject ? assignment.title : "");
							const assignmentFooter = sortBy === "assignment" ? assignment.dueDate ? `Da consegnare il ${fmtDate(assignment.dueDate, {
								weekday: "long",
								day: "2-digit",
								month: "long"
							}).toLocaleUpperCase("it-IT")}` : null : assignment.assignedDate ? `Assegnati il ${fmtDate(assignment.assignedDate, {
								day: "2-digit",
								month: "long"
							}).toLocaleUpperCase("it-IT")}` : "Assegnato";
							return /* @__PURE__ */ jsxs("li", {
								className: "ml-5 mr-3 flex min-h-[180px] flex-col rounded-[12px] bg-[#252525] pb-3 pl-5 pr-3 pt-6",
								children: [
									/* @__PURE__ */ jsx("h3", {
										className: "text-[15px] font-medium uppercase leading-[1.3] tracking-[0.02em]",
										children: title
									}),
									assignment.teacher && /* @__PURE__ */ jsxs("div", {
										className: "mt-1 flex items-center gap-2 text-[13px] uppercase text-white/95",
										children: [/* @__PURE__ */ jsx(UserRound, { className: "h-4 w-4 shrink-0 fill-[#4169a8] text-[#4169a8]" }), /* @__PURE__ */ jsx("span", { children: assignment.teacher })]
									}),
									description && /* @__PURE__ */ jsx("p", {
										className: "mt-[36px] whitespace-pre-line text-[15px] leading-[1.4] text-white/90",
										children: description
									}),
									assignmentFooter && /* @__PURE__ */ jsxs("div", {
										className: `flex items-center justify-end gap-2 text-[12px] uppercase tracking-wide text-[#08a5b5] ${description ? "mt-[26px]" : "mt-auto pt-6"}`,
										children: [/* @__PURE__ */ jsx("img", {
											src: sortBy === "assignment" ? "/didup-clock-reference.png" : "/didup-calendar-reference.png",
											alt: "",
											"aria-hidden": "true",
											className: "h-4 w-4 shrink-0 object-contain"
										}), /* @__PURE__ */ jsx("span", { children: assignmentFooter })]
									})
								]
							}, assignment.id);
						})
					})]
				}, group.key))
			}) : /* @__PURE__ */ jsx("div", {
				className: "mx-5 mt-[60px] text-center text-[15px] text-white/75",
				children: "Nessun compito nei dati sincronizzati."
			})
		]
	});
}
//#endregion
export { Compiti as component };
