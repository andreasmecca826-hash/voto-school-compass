import { r as useVoto } from "./store-EhdD6Ug3.js";
import { n as getClassTeachers, r as saveClassTeachers } from "./teachers-opxojIU-.js";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/professori.tsx?tsr-split=component
function Professori() {
	const voto = useVoto();
	const [teachers, setTeachers] = useState(() => getClassTeachers());
	const [query, setQuery] = useState("");
	const [editingIndex, setEditingIndex] = useState(null);
	const [name, setName] = useState("");
	const [subjects, setSubjects] = useState("");
	const filtered = useMemo(() => {
		const normalized = query.trim().toLocaleLowerCase("it-IT");
		if (!normalized) return teachers.map((entry, index) => ({
			entry,
			index
		}));
		return teachers.map((entry, index) => ({
			entry,
			index
		})).filter(({ entry }) => `${entry[0]} ${entry[1]}`.toLocaleLowerCase("it-IT").includes(normalized));
	}, [query, teachers]);
	const registryTeachers = useMemo(() => {
		const grouped = /* @__PURE__ */ new Map();
		const add = (teacher, subject) => {
			const cleanName = teacher.trim();
			if (!cleanName) return;
			const key = cleanName.toLocaleLowerCase("it-IT");
			const current = grouped.get(key) ?? {
				name: cleanName,
				subjects: /* @__PURE__ */ new Set()
			};
			if (subject.trim()) current.subjects.add(subject.trim());
			grouped.set(key, current);
		};
		voto.data.subjects.forEach((subject) => {
			if (subject.teacher) add(subject.teacher, subject.name);
		});
		teachers.forEach(([teacher, subject]) => add(teacher, subject));
		return [...grouped.values()].map(({ name: teacher, subjects: teacherSubjects }) => [teacher, [...teacherSubjects].join(" // ")]).sort(([a], [b]) => a.localeCompare(b, "it-IT"));
	}, [teachers, voto.data.subjects]);
	const resetForm = () => {
		setEditingIndex(null);
		setName("");
		setSubjects("");
	};
	const saveTeacher = () => {
		const cleanName = name.trim();
		const cleanSubjects = subjects.trim() || "Materia non specificata";
		if (!cleanName) {
			toast.error("Inserisci il nome del professore.");
			return;
		}
		const next = [...teachers];
		const entry = [cleanName, cleanSubjects];
		if (editingIndex === null) next.push(entry);
		else next[editingIndex] = entry;
		setTeachers(next);
		saveClassTeachers(next);
		resetForm();
		toast.success(editingIndex === null ? "Professore aggiunto" : "Professore aggiornato");
	};
	const editTeacher = (index) => {
		const entry = teachers[index];
		if (!entry) return;
		setEditingIndex(index);
		setName(entry[0]);
		setSubjects(entry[1]);
		window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const deleteTeacher = (index) => {
		const next = teachers.filter((_, currentIndex) => currentIndex !== index);
		setTeachers(next);
		saveClassTeachers(next);
		if (editingIndex === index) resetForm();
		toast.success("Professore rimosso");
	};
	const managementTools = /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsxs("section", {
			className: "card-surface mt-5 p-4",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "text-sm font-semibold",
					children: editingIndex === null ? "Aggiungi professore" : "Modifica professore"
				}), editingIndex !== null && /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: resetForm,
					className: "text-xs text-muted-foreground",
					children: [/* @__PURE__ */ jsx(X, { className: "mr-1 inline h-3.5 w-3.5" }), " Annulla"]
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "mt-3 space-y-2",
				children: [
					/* @__PURE__ */ jsx("input", {
						value: name,
						onChange: (event) => setName(event.target.value),
						placeholder: "Nome e cognome",
						"aria-label": "Nome del professore",
						className: "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
					}),
					/* @__PURE__ */ jsx("input", {
						value: subjects,
						onChange: (event) => setSubjects(event.target.value),
						placeholder: "Materia o materie",
						"aria-label": "Materia del professore",
						className: "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: saveTeacher,
						className: "press flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground",
						children: [editingIndex === null ? /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4" }), editingIndex === null ? "Aggiungi" : "Salva modifiche"]
					})
				]
			})]
		}),
		/* @__PURE__ */ jsxs("label", {
			className: "mt-4 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3",
			children: [/* @__PURE__ */ jsx(Search, { className: "h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ jsx("input", {
				value: query,
				onChange: (event) => setQuery(event.target.value),
				placeholder: "Cerca professore o materia...",
				"aria-label": "Cerca professore o materia",
				className: "min-w-0 flex-1 bg-transparent text-sm outline-none"
			})]
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "mt-4 space-y-2",
			children: [filtered.map(({ entry, index }) => /* @__PURE__ */ jsxs("article", {
				className: "card-surface flex items-start gap-3 p-4",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-sm font-bold text-primary",
						children: entry[0].charAt(0).toUpperCase()
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-sm font-semibold",
							children: entry[0]
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: entry[1]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex shrink-0 gap-1",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => editTeacher(index),
							className: "press rounded-lg p-2 text-muted-foreground",
							"aria-label": `Modifica ${entry[0]}`,
							children: /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4" })
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => deleteTeacher(index),
							className: "press rounded-lg p-2 text-danger",
							"aria-label": `Rimuovi ${entry[0]}`,
							children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
						})]
					})
				]
			}, `${entry[0]}-${index}`)), filtered.length === 0 && /* @__PURE__ */ jsx("div", {
				className: "card-surface p-5 text-center text-sm text-muted-foreground",
				children: teachers.length === 0 ? "Non hai ancora inserito professori." : "Nessun professore o materia trovata."
			})]
		}),
		/* @__PURE__ */ jsx("p", {
			className: "mt-3 text-[11px] text-muted-foreground",
			children: "La lista viene salvata solo su questo dispositivo."
		})
	] });
	if (voto.registryStyle === "didup") {
		const studentName = (voto.data.student.name ?? "").toUpperCase();
		return /* @__PURE__ */ jsxs("div", {
			className: "didup-page min-h-dvh bg-black px-0 pb-[100px] text-white",
			children: [
				/* @__PURE__ */ jsxs("header", {
					className: "flex items-start justify-between px-5 pt-5",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex min-w-0 items-start",
						children: [/* @__PURE__ */ jsx(Link, {
							to: "/",
							"aria-label": "Torna alla Home",
							className: "press flex h-10 w-7 shrink-0 items-center justify-start text-white",
							children: /* @__PURE__ */ jsx(ChevronLeft, {
								className: "h-8 w-8",
								strokeWidth: 1.8
							})
						}), /* @__PURE__ */ jsxs("div", {
							className: "ml-10 min-w-0 pt-0.5",
							children: [/* @__PURE__ */ jsx("h1", {
								className: "text-[21px] font-normal leading-6",
								children: "CONDIVISIONE"
							}), studentName && /* @__PURE__ */ jsx("p", {
								className: "mt-0.5 text-[14px] leading-5",
								children: studentName
							})]
						})]
					}), /* @__PURE__ */ jsx("img", {
						src: "/didup-profile.jpg",
						alt: "",
						"aria-hidden": "true",
						className: "h-[50px] w-[50px] shrink-0 object-cover"
					})]
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mx-6 mt-[58px] text-[20px] font-normal leading-7",
					children: "DOCENTI"
				}),
				registryTeachers.length ? /* @__PURE__ */ jsx("ul", {
					className: "mt-8 divide-y divide-[#484848] bg-[#292929]",
					children: registryTeachers.map(([teacher, teacherSubjects]) => /* @__PURE__ */ jsxs("li", {
						className: "flex min-h-[130px] items-start gap-2 px-5 py-6",
						children: [
							/* @__PURE__ */ jsxs("svg", {
								"aria-hidden": "true",
								viewBox: "0 0 24 24",
								className: "h-[20px] w-[20px] shrink-0 fill-[#34558b]",
								children: [/* @__PURE__ */ jsx("circle", {
									cx: "12",
									cy: "7",
									r: "4"
								}), /* @__PURE__ */ jsx("path", { d: "M3 21v-1.5c0-3.7 3.8-6.5 9-6.5s9 2.8 9 6.5V21H3Z" })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ jsx("h3", {
									className: "text-[18px] font-normal uppercase leading-6",
									children: teacher
								}), teacherSubjects && /* @__PURE__ */ jsxs("p", {
									className: "mt-1.5 text-[14px] uppercase leading-5 text-[#16a0ae]",
									children: [
										"(",
										teacherSubjects,
										")"
									]
								})]
							}),
							/* @__PURE__ */ jsx(ChevronRight, {
								"aria-hidden": "true",
								className: "h-6 w-6 shrink-0 self-center text-white/80",
								strokeWidth: 1.7
							})
						]
					}, teacher))
				}) : /* @__PURE__ */ jsx("p", {
					className: "mx-5 mt-8 bg-[#292929] px-5 py-8 text-center text-sm text-white/70",
					children: "Nessun docente disponibile nei dati del registro."
				}),
				/* @__PURE__ */ jsxs("details", {
					className: "mx-4 mt-5 rounded-lg bg-[#292929] p-4",
					children: [/* @__PURE__ */ jsx("summary", {
						className: "cursor-pointer text-sm text-white/80",
						children: "Gestisci elenco manuale"
					}), /* @__PURE__ */ jsx("div", {
						className: "pt-1",
						children: managementTools
					})]
				})
			]
		});
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-3",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "font-display text-2xl font-semibold",
				children: "Professori"
			}), /* @__PURE__ */ jsx("p", {
				className: "mt-1 text-xs text-muted-foreground",
				children: "Inserisci manualmente i docenti della tua classe."
			})] }), /* @__PURE__ */ jsx("span", {
				className: "flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary",
				children: /* @__PURE__ */ jsx(UsersRound, { className: "h-5 w-5" })
			})]
		}), managementTools]
	});
}
//#endregion
export { Professori as component };
