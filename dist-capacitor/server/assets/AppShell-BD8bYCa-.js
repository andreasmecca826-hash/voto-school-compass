import { t as cn } from "./utils-C_uf36nf.js";
import { n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { t as Button } from "./button-PJVP9td7.js";
import { Suspense, createContext, lazy, useContext, useEffect, useId, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, BookOpen, CalendarClock, CalendarDays, CalendarX2, CheckSquare, ClipboardList, Clock3, GraduationCap, LayoutGrid, Menu, MessageCircle, Newspaper, Palette, RefreshCw, Settings, Sparkles, StickyNote, UsersRound, X } from "lucide-react";
//#region src/components/ui/skeleton.tsx
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("animate-pulse rounded-md bg-primary/10", className),
		...props
	});
}
//#endregion
//#region src/components/voto/Windows7Chrome.tsx
function Windows7Orb({ className }) {
	return /* @__PURE__ */ jsx("span", {
		className: cn("windows7-orb", className),
		"aria-hidden": "true",
		children: /* @__PURE__ */ jsxs("svg", {
			className: "windows7-orb-icon",
			viewBox: "0 0 24 24",
			width: "24",
			height: "24",
			fill: "none",
			children: [
				/* @__PURE__ */ jsx("path", {
					d: "M3 4.5 11 3v8H3z",
					fill: "#f25022"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "m13 3 8 1.5V11h-8z",
					fill: "#7fba00"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M3 13h8v8l-8-1.5z",
					fill: "#00a4ef"
				}),
				/* @__PURE__ */ jsx("path", {
					d: "M13 13h8v6.5L13 21z",
					fill: "#ffb900"
				})
			]
		})
	});
}
var isCurrent = (to, path) => to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);
function Windows7Taskbar({ navigation, moreNavigation, currentPath, studentName, now, ready, open, onOpenChange }) {
	const menuId = useId();
	const startRef = useRef(null);
	const menuRef = useRef(null);
	const previousPath = useRef(currentPath);
	const close = () => onOpenChange(false);
	useEffect(() => {
		if (previousPath.current !== currentPath) onOpenChange(false);
		previousPath.current = currentPath;
	}, [currentPath, onOpenChange]);
	useEffect(() => {
		if (!open) return;
		menuRef.current?.querySelector("a")?.focus();
		const handlePointerDown = (event) => {
			if (!(event.target instanceof Node)) return;
			if (!menuRef.current?.contains(event.target) && !startRef.current?.contains(event.target)) onOpenChange(false);
		};
		const handleKeyDown = (event) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			onOpenChange(false);
			startRef.current?.focus();
		};
		document.addEventListener("pointerdown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [open, onOpenChange]);
	const settings = moreNavigation.filter(({ to }) => to === "/personalizza" || to === "/impostazioni");
	const programs = moreNavigation.filter(({ to }) => to !== "/personalizza" && to !== "/impostazioni");
	const timeLabel = ready ? now.toLocaleTimeString("it-IT", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}) : "--:--";
	const dateLabel = ready ? now.toLocaleDateString("it-IT", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric"
	}) : "--/--/----";
	const renderLink = ({ to, label, icon: Icon }) => /* @__PURE__ */ jsxs(Link, {
		to,
		onClick: close,
		"aria-current": isCurrent(to, currentPath) ? "page" : void 0,
		className: "windows7-start-link",
		children: [/* @__PURE__ */ jsx(Icon, {
			className: "windows7-start-link-icon h-5 w-5 shrink-0",
			"aria-hidden": "true"
		}), /* @__PURE__ */ jsx("span", { children: label })]
	}, to);
	return /* @__PURE__ */ jsx("div", {
		className: "windows7-taskbar safe-bottom fixed inset-x-0 bottom-0 z-40 w-full",
		children: /* @__PURE__ */ jsxs("div", {
			className: "windows7-taskbar-inner relative mx-auto flex w-full max-w-[960px] items-center",
			children: [
				/* @__PURE__ */ jsxs("button", {
					ref: startRef,
					type: "button",
					className: cn("windows7-start-button", open && "windows7-start-button-active"),
					"aria-label": "Start",
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					"aria-controls": menuId,
					onClick: () => onOpenChange(!open),
					children: [/* @__PURE__ */ jsx(Windows7Orb, { className: "windows7-start-orb" }), /* @__PURE__ */ jsx("span", {
						className: "windows7-start-label",
						children: "Start"
					})]
				}),
				/* @__PURE__ */ jsx("nav", {
					className: "windows7-taskbar-nav flex min-w-0 flex-1",
					"aria-label": "Navigazione principale",
					children: navigation.map(({ to, label, icon: Icon }) => /* @__PURE__ */ jsxs(Link, {
						to,
						onClick: close,
						"aria-current": isCurrent(to, currentPath) ? "page" : void 0,
						className: cn("windows7-taskbar-item windows7-taskbar-link", isCurrent(to, currentPath) && "windows7-taskbar-link-active"),
						title: label,
						children: [/* @__PURE__ */ jsx(Icon, {
							className: "windows7-taskbar-icon h-5 w-5",
							"aria-hidden": "true"
						}), /* @__PURE__ */ jsx("span", {
							className: "windows7-taskbar-label",
							children: label
						})]
					}, to))
				}),
				/* @__PURE__ */ jsxs("time", {
					className: "windows7-taskbar-clock windows7-clock shrink-0",
					dateTime: ready ? now.toISOString() : void 0,
					"aria-label": ready ? `${timeLabel}, ${dateLabel}` : "Caricamento orologio",
					children: [/* @__PURE__ */ jsx("span", {
						className: "windows7-clock-time block",
						children: timeLabel
					}), /* @__PURE__ */ jsx("span", {
						className: "windows7-clock-date block",
						children: dateLabel
					})]
				}),
				open && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "windows7-start-backdrop",
					"aria-label": "Chiudi menu Start",
					onClick: close
				}), /* @__PURE__ */ jsxs("div", {
					ref: menuRef,
					id: menuId,
					role: "dialog",
					"aria-modal": "false",
					"aria-label": "Menu Start",
					className: "windows7-start-menu absolute bottom-full left-0 mb-2 w-full",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "windows7-start-heading",
						children: [/* @__PURE__ */ jsx("span", { children: "Menu Start" }), /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "windows7-start-close",
							onClick: () => {
								close();
								startRef.current?.focus();
							},
							"aria-label": "Chiudi menu Start",
							children: /* @__PURE__ */ jsx(X, {
								className: "h-5 w-5",
								"aria-hidden": "true"
							})
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "windows7-start-columns",
						children: [/* @__PURE__ */ jsxs("nav", {
							className: "windows7-start-programs",
							"aria-label": "Applicazioni scolastiche",
							children: [
								navigation.map(renderLink),
								programs.map(renderLink),
								renderLink({
									to: "/studio",
									label: "Studio Lab.",
									icon: Sparkles
								}),
								renderLink({
									to: "/assistente",
									label: "Assistente",
									icon: MessageCircle
								})
							]
						}), /* @__PURE__ */ jsxs("aside", {
							className: "windows7-start-sidebar",
							"aria-label": "Profilo e preferenze",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "windows7-start-profile",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "windows7-start-avatar",
										"aria-hidden": "true",
										children: /* @__PURE__ */ jsx(GraduationCap, { className: "h-8 w-8" })
									}),
									/* @__PURE__ */ jsx("span", {
										className: "windows7-start-student",
										children: studentName
									}),
									/* @__PURE__ */ jsx("span", {
										className: "windows7-start-profile-label",
										children: "Registro scolastico VOTO"
									})
								]
							}), /* @__PURE__ */ jsx("nav", {
								className: "windows7-start-settings",
								"aria-label": "Preferenze",
								children: settings.map(renderLink)
							})]
						})]
					})]
				})] })
			]
		})
	});
}
//#endregion
//#region src/components/voto/AppShell.tsx
var NotificationsSheet = lazy(() => import("./NotificationsSheet-C7Y1Nx4i.js").then((module) => ({ default: module.NotificationsSheet })));
var SimulatorSheet = lazy(() => import("./SimulatorSheet-8s7loGNq.js").then((module) => ({ default: module.SimulatorSheet })));
var SubjectSheet = lazy(() => import("./SubjectSheet-4QkAg8yo.js").then((module) => ({ default: module.SubjectSheet })));
var MusicPanel = lazy(() => import("./MusicPanel-DCAiv3wW.js").then((module) => ({ default: module.MusicPanel })));
var DidupDashboard = lazy(() => import("./DidupDashboard-DReQvBP2.js").then((module) => ({ default: module.DidupDashboard })));
var DidupMenu = lazy(() => import("./DidupMenu-ChD5Ue-8.js").then((module) => ({ default: module.DidupMenu })));
var Ui = createContext(null);
var useUi = () => {
	const c = useContext(Ui);
	if (!c) throw new Error("useUi fuori da AppShell");
	return c;
};
var NAV = [{
	to: "/",
	label: "Dashboard",
	icon: LayoutGrid
}, {
	to: "/orario",
	label: "Orario",
	icon: CalendarClock
}];
var MORE_NAV = [
	{
		to: "/voti",
		label: "Voti",
		description: "Voti e medie",
		icon: BookOpen,
		color: "#e56b5d"
	},
	{
		to: "/scrutini-infraperiodali",
		label: "Scrutini infraperiodali",
		description: "Crea una pagella manuale",
		icon: GraduationCap,
		color: "#3c9b88"
	},
	{
		to: "/compiti",
		label: "Compiti assegnati",
		description: "Attività e scadenze",
		icon: CheckSquare,
		color: "#6675e8"
	},
	{
		to: "/interrogazioni",
		label: "Interrogazioni",
		description: "Date e preparazione",
		icon: CalendarDays,
		color: "#a66be1"
	},
	{
		to: "/assenze",
		label: "Assenze",
		description: "Giorni di assenza registrati",
		icon: CalendarX2,
		color: "#e56b6f"
	},
	{
		to: "/diario",
		label: "Diario",
		description: "Attività svolte in classe",
		icon: ClipboardList,
		color: "#16a5b8"
	},
	{
		to: "/bacheca",
		label: "Bacheca",
		description: "Circolari e avvisi della scuola",
		icon: Newspaper,
		color: "#16a5b8"
	},
	{
		to: "/note",
		label: "Note",
		description: "Note disciplinari",
		icon: StickyNote,
		color: "#f28f78"
	},
	{
		to: "/promemoria",
		label: "Promemoria",
		description: "Promemoria dal registro DidUP",
		icon: Clock3,
		color: "#e1a642"
	},
	{
		to: "/professori",
		label: "Professori",
		description: "Docenti e materie",
		icon: UsersRound,
		color: "#4f9bd9"
	},
	{
		to: "/personalizza",
		label: "Personalizza",
		description: "Temi e Home",
		icon: Palette,
		color: "#d97932"
	},
	{
		to: "/impostazioni",
		label: "Impostazioni",
		description: "Connessione e dati",
		icon: Settings,
		color: "#19aab6"
	}
];
var SEASONAL_THEMES = [
	"primavera",
	"estate",
	"autunno",
	"inverno"
];
function AppShell({ children }) {
	const v = useVoto();
	const now = useClock();
	const path = useRouterState({ select: (s) => s.location.pathname });
	const isNavigating = useRouterState({ select: (s) => s.status === "pending" });
	const isWindows7 = v.theme === "windows-7" && v.registryStyle !== "didup";
	const seasonalTheme = v.registryStyle === "voto" && SEASONAL_THEMES.includes(v.theme) ? v.theme : null;
	const routeTitle = [
		...NAV,
		...MORE_NAV,
		{
			to: "/studio",
			label: "Studio Lab."
		},
		{
			to: "/assistente",
			label: "Assistente"
		}
	].find(({ to }) => to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`))?.label || "Registro scolastico";
	const [notif, setNotif] = useState(false);
	const [moreOpen, setMoreOpen] = useState(false);
	const [sim, setSim] = useState({ open: false });
	const [subject, setSubject] = useState(null);
	const [mounted, setMounted] = useState({
		notifications: false,
		simulator: false,
		subject: false
	});
	const [musicMounted, setMusicMounted] = useState(false);
	const [musicOpen, setMusicOpen] = useState(false);
	const pullStartY = useRef(null);
	const pendingPullDistance = useRef(0);
	const pullFrame = useRef(null);
	const pullIndicator = useRef(null);
	const pullIcon = useRef(null);
	const pullLabel = useRef(null);
	const applyPullDistance = (distance) => {
		const boundedDistance = Math.max(0, Math.min(84, distance));
		const indicator = pullIndicator.current;
		if (indicator) {
			indicator.style.height = `${boundedDistance}px`;
			indicator.style.opacity = boundedDistance > 0 ? "1" : "0";
			indicator.setAttribute("aria-hidden", String(boundedDistance === 0));
		}
		pullIcon.current?.classList.toggle("rotate-180", boundedDistance >= 56);
		if (pullLabel.current) pullLabel.current.textContent = boundedDistance >= 56 ? "Rilascia per aggiornare" : "Trascina per aggiornare";
	};
	const cancelPullFrame = () => {
		if (pullFrame.current !== null) {
			window.cancelAnimationFrame(pullFrame.current);
			pullFrame.current = null;
		}
	};
	const schedulePullDistance = (distance) => {
		pendingPullDistance.current = Math.max(0, Math.min(84, distance));
		if (pullFrame.current !== null) return;
		pullFrame.current = window.requestAnimationFrame(() => {
			pullFrame.current = null;
			applyPullDistance(pendingPullDistance.current);
		});
	};
	const resetPullGesture = () => {
		cancelPullFrame();
		pullStartY.current = null;
		pendingPullDistance.current = 0;
		applyPullDistance(0);
	};
	const handlePullStart = (event) => {
		if (v.loading || window.scrollY > 0 || event.touches.length !== 1) {
			resetPullGesture();
			return;
		}
		resetPullGesture();
		pullStartY.current = event.touches[0]?.clientY ?? null;
	};
	const handlePullMove = (event) => {
		if (pullStartY.current === null) return;
		if (v.loading || event.touches.length !== 1) {
			resetPullGesture();
			return;
		}
		const distance = (event.touches[0]?.clientY ?? pullStartY.current) - pullStartY.current;
		if (distance <= 0) {
			schedulePullDistance(0);
			return;
		}
		if (distance > 8) event.preventDefault();
		schedulePullDistance(distance * .55);
	};
	const handlePullEnd = () => {
		const shouldRefresh = pendingPullDistance.current >= 56 && !v.loading;
		resetPullGesture();
		if (shouldRefresh) v.refresh();
	};
	const handlePullCancel = () => resetPullGesture();
	useEffect(() => {
		setMoreOpen(false);
	}, [path]);
	useEffect(() => {
		const root = document.documentElement;
		root.dataset["theme"] = v.theme;
		root.dataset["mode"] = v.mode;
		root.dataset["registryStyle"] = v.registryStyle;
	}, [
		v.theme,
		v.mode,
		v.registryStyle
	]);
	useEffect(() => () => {
		if (pullFrame.current !== null) window.cancelAnimationFrame(pullFrame.current);
	}, []);
	const dateLabel = v.ready ? now.toLocaleDateString("it-IT", {
		weekday: "long",
		day: "numeric",
		month: "long"
	}) : "";
	return /* @__PURE__ */ jsxs(Ui.Provider, {
		value: {
			openMenu: () => setMoreOpen(true),
			openNotifications: () => {
				setMounted((current) => ({
					...current,
					notifications: true
				}));
				setNotif(true);
			},
			openSimulator: (subjectId) => {
				setSubject(null);
				setMounted((current) => ({
					...current,
					simulator: true
				}));
				setSim({
					open: true,
					subjectId
				});
			},
			openSubject: (id) => {
				setMounted((current) => ({
					...current,
					subject: true
				}));
				setSubject(id);
			},
			openMusic: () => {
				setMusicMounted(true);
				setMusicOpen(true);
			}
		},
		children: [
			musicMounted && /* @__PURE__ */ jsx(Suspense, {
				fallback: /* @__PURE__ */ jsx(PanelLoading, { label: "Musica" }),
				children: /* @__PURE__ */ jsx(MusicPanel, {
					open: musicOpen,
					onClose: () => setMusicOpen(false)
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: cn("mx-auto flex min-h-dvh w-full max-w-[480px] flex-col md:my-6 md:min-h-[calc(100dvh-3rem)] md:rounded-[2rem] md:border md:border-border md:shadow-2xl", v.registryStyle !== "didup" && "voto-shell", isWindows7 && "windows7-shell"),
				children: [
					seasonalTheme && /* @__PURE__ */ jsx(SeasonalAtmosphere, { theme: seasonalTheme }),
					v.theme === "sangue" && v.registryStyle !== "didup" && /* @__PURE__ */ jsx(BloodSlidesAtmosphere, {}),
					v.registryStyle === "didup" ? /* @__PURE__ */ jsx("div", {
						className: "hidden",
						"aria-hidden": "true"
					}) : /* @__PURE__ */ jsxs("header", {
						className: cn("glass-panel safe-top sticky top-0 z-30 border-b bg-background/60 md:rounded-t-[2rem]", isWindows7 && "windows7-header"),
						children: [isWindows7 && /* @__PURE__ */ jsxs("div", {
							className: "windows7-titlebar",
							children: [/* @__PURE__ */ jsxs(Link, {
								to: "/",
								className: "windows7-titlebar-brand",
								"aria-label": "VOTO. dashboard",
								children: [/* @__PURE__ */ jsx(Windows7Orb, { className: "windows7-titlebar-icon" }), /* @__PURE__ */ jsx("span", { children: "VOTO" })]
							}), /* @__PURE__ */ jsx("span", {
								className: "windows7-titlebar-title windows7-titlebar-route",
								children: routeTitle
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: cn("flex h-16 items-center justify-between px-5", isWindows7 && "windows7-toolbar"),
							children: [/* @__PURE__ */ jsxs("div", {
								className: cn("min-w-0", isWindows7 && "windows7-toolbar-info"),
								children: [isWindows7 ? /* @__PURE__ */ jsx("span", {
									className: "windows7-toolbar-caption",
									children: "Registro scolastico"
								}) : /* @__PURE__ */ jsxs(Link, {
									to: "/",
									className: "font-display text-xl font-bold tracking-tight",
									"aria-label": "VOTO. dashboard",
									children: ["VOTO", /* @__PURE__ */ jsx("span", {
										className: "text-primary",
										children: "."
									})]
								}), /* @__PURE__ */ jsx("p", {
									className: "truncate text-[11px] capitalize text-muted-foreground",
									children: dateLabel || "\xA0"
								})]
							}), /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-2",
								children: [
									v.source === "demo" && v.ready && /* @__PURE__ */ jsx("span", {
										className: "rounded-md border border-primary/40 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-widest text-primary",
										children: "DEMO"
									}),
									/* @__PURE__ */ jsx(Link, {
										to: "/assistente",
										className: "press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card",
										"aria-label": "Assistente",
										children: /* @__PURE__ */ jsx(MessageCircle, { className: "h-[18px] w-[18px]" })
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										onClick: () => {
											setMounted((current) => ({
												...current,
												notifications: true
											}));
											setNotif(true);
										},
										className: "press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card",
										"aria-label": "Novità",
										title: "Novità",
										children: /* @__PURE__ */ jsx(Newspaper, { className: "h-[18px] w-[18px]" })
									}),
									/* @__PURE__ */ jsxs("button", {
										type: "button",
										onClick: () => v.refresh(),
										disabled: v.loading,
										className: "press flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium disabled:opacity-70",
										"aria-label": "Aggiorna dati",
										children: [/* @__PURE__ */ jsx(RefreshCw, { className: cn("h-4 w-4", v.loading && "animate-spin") }), "Aggiorna"]
									})
								]
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("main", {
						className: cn("relative flex-1", v.registryStyle === "didup" ? "px-0" : "px-5 pb-28", v.registryStyle !== "didup" && path === "/diario" && "diario-standard-main", isWindows7 && "windows7-content"),
						onTouchStart: handlePullStart,
						onTouchMove: handlePullMove,
						onTouchEnd: handlePullEnd,
						onTouchCancel: handlePullCancel,
						children: [/* @__PURE__ */ jsxs("div", {
							ref: pullIndicator,
							className: "pointer-events-none flex items-center justify-center overflow-hidden text-xs font-medium text-primary opacity-0 transition-[height,opacity] duration-150",
							style: {
								height: 0,
								opacity: 0
							},
							"aria-hidden": true,
							children: [/* @__PURE__ */ jsx(RefreshCw, {
								ref: pullIcon,
								className: "mr-2 h-4 w-4"
							}), /* @__PURE__ */ jsx("span", {
								ref: pullLabel,
								children: "Trascina per aggiornare"
							})]
						}), v.ready ? isNavigating ? /* @__PURE__ */ jsx(NavigationLoading, { didup: v.registryStyle === "didup" }) : moreOpen && !isWindows7 ? v.registryStyle === "didup" ? /* @__PURE__ */ jsx(Suspense, {
							fallback: /* @__PURE__ */ jsx(NavigationLoading, { didup: true }),
							children: /* @__PURE__ */ jsx(DidupMenu, {})
						}) : /* @__PURE__ */ jsx(MoreMenu, {
							v,
							currentPath: path,
							onClose: () => setMoreOpen(false)
						}) : v.registryStyle === "didup" && path === "/" ? /* @__PURE__ */ jsx(Suspense, {
							fallback: /* @__PURE__ */ jsx(NavigationLoading, { didup: true }),
							children: /* @__PURE__ */ jsx(DidupDashboard, {})
						}) : children : /* @__PURE__ */ jsx(ShellSkeleton, {})]
					}),
					v.registryStyle === "didup" ? /* @__PURE__ */ jsx(DidupBottomNav, {
						path,
						moreOpen,
						onMenu: () => setMoreOpen((open) => !open)
					}) : isWindows7 ? /* @__PURE__ */ jsx(Windows7Taskbar, {
						navigation: NAV,
						moreNavigation: MORE_NAV,
						currentPath: path,
						studentName: v.displayName || v.data.student.name || "Studente",
						now,
						ready: v.ready,
						open: moreOpen,
						onOpenChange: setMoreOpen
					}) : /* @__PURE__ */ jsx("nav", {
						className: "glass-panel safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[480px] border-t bg-background/60 md:bottom-6 md:rounded-b-[2rem]",
						"aria-label": "Navigazione principale",
						children: /* @__PURE__ */ jsxs("ul", {
							className: "grid grid-cols-3",
							children: [NAV.map(({ to, label, icon: Icon }) => {
								const active = to === "/" ? path === "/" : path.startsWith(to);
								return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
									to,
									onClick: () => setMoreOpen(false),
									"aria-current": active ? "page" : void 0,
									className: cn("press flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium", active ? "text-foreground" : "text-muted-foreground"),
									children: [/* @__PURE__ */ jsx("span", {
										className: cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary-soft text-primary"),
										children: /* @__PURE__ */ jsx(Icon, { className: "h-[19px] w-[19px]" })
									}), label]
								}) }, to);
							}), /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: () => setMoreOpen((open) => !open),
								"aria-expanded": moreOpen,
								"aria-label": "Menu Altro",
								className: cn("press flex h-16 w-full flex-col items-center justify-center gap-1 text-[10.5px] font-medium", moreOpen ? "text-foreground" : "text-muted-foreground"),
								children: [/* @__PURE__ */ jsx("span", {
									className: cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", moreOpen && "bg-primary-soft text-primary"),
									children: moreOpen ? /* @__PURE__ */ jsx(X, { className: "h-[19px] w-[19px]" }) : /* @__PURE__ */ jsx(Menu, { className: "h-[19px] w-[19px]" })
								}), "Altro"]
							}) })]
						})
					})
				]
			}),
			v.ready && (mounted.notifications || mounted.simulator || mounted.subject) && /* @__PURE__ */ jsxs(Fragment, { children: [
				mounted.notifications && /* @__PURE__ */ jsx(Suspense, {
					fallback: /* @__PURE__ */ jsx(PanelLoading, { label: "Novità" }),
					children: /* @__PURE__ */ jsx(NotificationsSheet, {
						open: notif,
						onOpenChange: setNotif
					})
				}),
				mounted.simulator && /* @__PURE__ */ jsx(Suspense, {
					fallback: /* @__PURE__ */ jsx(PanelLoading, { label: "Simulatore" }),
					children: /* @__PURE__ */ jsx(SimulatorSheet, {
						open: sim.open,
						subjectId: sim.subjectId,
						onOpenChange: (o) => setSim((s) => ({
							...s,
							open: o
						}))
					})
				}),
				mounted.subject && /* @__PURE__ */ jsx(Suspense, {
					fallback: /* @__PURE__ */ jsx(PanelLoading, { label: "Materia" }),
					children: /* @__PURE__ */ jsx(SubjectSheet, {
						id: subject,
						onClose: () => setSubject(null),
						onSimulate: (id) => {
							setSubject(null);
							setMounted((current) => ({
								...current,
								simulator: true
							}));
							setSim({
								open: true,
								subjectId: id
							});
						}
					})
				})
			] })
		]
	});
}
function SeasonalAtmosphere({ theme }) {
	const count = theme === "inverno" ? 28 : theme === "estate" ? 12 : 18;
	return /* @__PURE__ */ jsxs("div", {
		className: cn("seasonal-atmosphere", `seasonal-atmosphere-${theme}`),
		"aria-hidden": "true",
		children: [
			theme === "estate" && /* @__PURE__ */ jsx("span", { className: "seasonal-sun" }),
			Array.from({ length: count }, (_, index) => /* @__PURE__ */ jsx("span", { className: "seasonal-particle" }, index)),
			theme === "estate" && /* @__PURE__ */ jsx("span", { className: "seasonal-wave seasonal-wave-one" }),
			theme === "estate" && /* @__PURE__ */ jsx("span", { className: "seasonal-wave seasonal-wave-two" })
		]
	});
}
function BloodSlidesAtmosphere() {
	return /* @__PURE__ */ jsx("div", {
		className: "blood-slides-atmosphere",
		"aria-hidden": "true",
		children: /* @__PURE__ */ jsx("img", {
			src: "/sangue-forense.svg",
			alt: "",
			draggable: false
		})
	});
}
function PanelLoading({ label }) {
	return /* @__PURE__ */ jsxs("div", {
		role: "status",
		className: "fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-border bg-popover px-4 py-3 text-xs font-medium text-foreground shadow-lg",
		children: [
			"Caricamento ",
			label,
			"…"
		]
	});
}
function ShellSkeleton() {
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4 pt-4",
		"aria-busy": "true",
		"aria-label": "Caricamento",
		children: [
			/* @__PURE__ */ jsx(Skeleton, { className: "h-44 rounded-2xl bg-card" }),
			/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-3 gap-3",
				children: [
					0,
					1,
					2
				].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-20 rounded-2xl bg-card" }, i))
			}),
			[
				0,
				1,
				2
			].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-16 rounded-2xl bg-card" }, i))
		]
	});
}
function NavigationLoading({ didup }) {
	return /* @__PURE__ */ jsx("div", {
		role: "status",
		"aria-label": "Caricamento schermata",
		className: cn("flex min-h-[calc(100dvh-8rem)] items-center justify-center text-xs text-muted-foreground", didup && "bg-black text-white/65"),
		children: "Caricamento…"
	});
}
function DidupBottomNav({ path, moreOpen, onMenu }) {
	const homeActive = path === "/" && !moreOpen;
	const diaryActive = path.startsWith("/diario") && !moreOpen;
	const menuActive = moreOpen || !homeActive && !diaryActive;
	return /* @__PURE__ */ jsxs("nav", {
		className: "didup-bottom fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[480px] grid-cols-3 items-end px-0 pb-3 pt-2",
		"aria-label": "Navigazione DidUP",
		children: [
			/* @__PURE__ */ jsxs(Link, {
				to: "/",
				onClick: () => {
					if (moreOpen) onMenu();
				},
				"aria-current": homeActive ? "page" : void 0,
				className: cn("flex w-full flex-col items-center gap-1 text-[14px]", homeActive ? "text-white" : "text-white/65"),
				children: [/* @__PURE__ */ jsx("span", {
					className: cn("relative flex h-11 w-11 items-center justify-center rounded-full", homeActive && "bg-[#4169a8]"),
					children: /* @__PURE__ */ jsx("img", {
						src: "/didup-nav-home.png",
						alt: "",
						"aria-hidden": "true",
						className: cn("h-7 w-7 object-contain", homeActive && "brightness-0 invert")
					})
				}), "Home"]
			}),
			/* @__PURE__ */ jsxs(Link, {
				to: "/diario",
				onClick: () => {
					if (moreOpen) onMenu();
				},
				"aria-current": diaryActive ? "page" : void 0,
				className: cn("flex w-full flex-col items-center gap-1 text-[14px]", diaryActive ? "text-white" : "text-white/65"),
				children: [/* @__PURE__ */ jsx("span", {
					className: cn("flex h-11 w-11 items-center justify-center rounded-full", diaryActive && "bg-[#4169a8]"),
					children: /* @__PURE__ */ jsx("img", {
						src: "/didup-nav-diary.png",
						alt: "",
						"aria-hidden": "true",
						className: cn("h-7 w-7 object-contain", diaryActive && "brightness-0 invert")
					})
				}), "Diario"]
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: onMenu,
				"aria-expanded": moreOpen,
				"aria-current": menuActive ? "page" : void 0,
				"aria-label": "Menu",
				className: cn("flex w-full flex-col items-center gap-1 text-[14px]", menuActive ? "text-white" : "text-white/65"),
				children: [/* @__PURE__ */ jsx("span", {
					className: cn("flex h-11 w-11 items-center justify-center rounded-full", menuActive && "h-14 w-14 bg-[#f5b52e]"),
					children: /* @__PURE__ */ jsx(DidupMenuIcon, { active: menuActive })
				}), "Menu"]
			})
		]
	});
}
function DidupMenuIcon({ active }) {
	return /* @__PURE__ */ jsx("svg", {
		"aria-hidden": "true",
		viewBox: "0 0 24 24",
		className: cn("h-6 w-6", active ? "text-white" : "text-[#263b88]"),
		fill: "currentColor",
		children: [
			5,
			12,
			19
		].flatMap((x) => [
			5,
			12,
			19
		].map((y) => /* @__PURE__ */ jsx("circle", {
			cx: x,
			cy: y,
			r: x === 12 && y === 12 ? 1.8 : 1.35
		}, `${x}-${y}`)))
	});
}
function MoreMenu({ v, currentPath, onClose }) {
	const studentName = v.displayName || v.data.student.name || "Studente";
	return /* @__PURE__ */ jsxs("section", {
		className: "pt-4 pb-5",
		"aria-label": "Menu principale",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "mb-5 flex items-start justify-between",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: onClose,
						className: "press mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground",
						children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }), " Indietro"]
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "font-display text-3xl font-light tracking-tight",
						children: "Menu"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-lg uppercase tracking-wide text-muted-foreground",
						children: studentName
					})
				] }), /* @__PURE__ */ jsx("span", {
					className: "flex h-14 w-14 items-center justify-center text-primary",
					children: /* @__PURE__ */ jsx(GraduationCap, { className: "h-7 w-7" })
				})]
			}),
			/* @__PURE__ */ jsx(Button, {
				asChild: true,
				variant: "outline",
				className: "mb-5 h-auto min-h-24 w-full justify-start gap-4 whitespace-normal rounded-lg bg-card px-4 py-4 text-left",
				children: /* @__PURE__ */ jsxs(Link, {
					to: "/studio",
					onClick: onClose,
					children: [/* @__PURE__ */ jsx("span", {
						className: "flex h-12 w-12 shrink-0 items-center justify-center text-primary",
						children: /* @__PURE__ */ jsx(Sparkles, {})
					}), /* @__PURE__ */ jsx("span", {
						className: "min-w-0 flex-1",
						children: /* @__PURE__ */ jsx("span", {
							className: "block font-display text-lg font-semibold",
							children: "Studio Lab."
						})
					})]
				})
			}),
			/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-2 gap-3",
				children: MORE_NAV.map(({ to, label, description, icon: Icon, color }) => {
					const active = currentPath.startsWith(to);
					const cardContent = /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
						className: "absolute right-3 top-3 flex h-10 w-10 items-center justify-center",
						children: /* @__PURE__ */ jsx(Icon, {
							className: "h-7 w-7",
							style: { color }
						})
					}), /* @__PURE__ */ jsxs("span", {
						className: "pr-1",
						children: [/* @__PURE__ */ jsx("span", {
							className: "block text-center text-base font-bold leading-tight",
							children: label
						}), /* @__PURE__ */ jsx("span", {
							className: "mt-1 block text-center text-[10px] text-muted-foreground",
							children: description
						})]
					})] });
					return active ? /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: onClose,
						className: "press relative flex min-h-40 w-full flex-col justify-end overflow-hidden rounded-2xl border border-primary bg-card p-4 text-left shadow-sm",
						children: cardContent
					}, to) : /* @__PURE__ */ jsx(Link, {
						to,
						onClick: onClose,
						className: "press relative flex min-h-40 flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-4 text-left shadow-sm",
						children: cardContent
					}, to);
				})
			})
		]
	});
}
//#endregion
export { useUi as n, AppShell as t };
