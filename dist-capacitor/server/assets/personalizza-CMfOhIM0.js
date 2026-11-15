import { t as cn } from "./utils-C_uf36nf.js";
import { g as parseEmojiThemeInput, p as DEFAULT_EMOJI_THEME_EMOJIS, r as useVoto, v as processCustomThemeBackground } from "./store-EhdD6Ug3.js";
import { o as SectionTitle } from "./ui-D03OlNCN.js";
import { n as useUi } from "./AppShell-BD8bYCa-.js";
import * as React from "react";
import { useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, BadgeCheck, ChevronDown, ChevronUp, Eye, EyeOff, Home, Moon, Music2, Palette, RotateCcw, SlidersHorizontal, Sun, Type, Upload } from "lucide-react";
import { toast } from "sonner";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
//#region src/components/ui/accordion.tsx
var Accordion = AccordionPrimitive.Root;
var AccordionItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(AccordionPrimitive.Item, {
	ref,
	className: cn("border-b", className),
	...props
}));
AccordionItem.displayName = "AccordionItem";
var AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsx(AccordionPrimitive.Header, {
	className: "flex",
	children: /* @__PURE__ */ jsxs(AccordionPrimitive.Trigger, {
		ref,
		className: cn("flex flex-1 items-center justify-between py-4 text-sm font-medium cursor-pointer transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180", className),
		...props,
		children: [children, /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" })]
	})
}));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;
var AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsx(AccordionPrimitive.Content, {
	ref,
	className: "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
	...props,
	children: /* @__PURE__ */ jsx("div", {
		className: cn("pb-4 pt-0", className),
		children
	})
}));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;
//#endregion
//#region src/components/voto/PersonalizationPanel.tsx
var ACCENTS = [
	{
		id: "rosso",
		label: "Rosso",
		sw: "oklch(0.68 0.17 25)"
	},
	{
		id: "ambra",
		label: "Ambra",
		sw: "oklch(0.68 0.15 70)"
	},
	{
		id: "viola",
		label: "Viola",
		sw: "oklch(0.68 0.15 300)"
	},
	{
		id: "blu",
		label: "Blu",
		sw: "oklch(0.68 0.16 250)"
	},
	{
		id: "verde",
		label: "Verde",
		sw: "oklch(0.68 0.14 145)"
	},
	{
		id: "azzurro",
		label: "Azzurro",
		sw: "oklch(0.68 0.15 205)"
	},
	{
		id: "menta",
		label: "Menta",
		sw: "oklch(0.68 0.14 165)"
	},
	{
		id: "rosa",
		label: "Rosa",
		sw: "oklch(0.68 0.15 345)"
	},
	{
		id: "arancio",
		label: "Arancio",
		sw: "oklch(0.68 0.18 45)"
	},
	{
		id: "turchese",
		label: "Turchese",
		sw: "oklch(0.68 0.15 180)"
	},
	{
		id: "indaco",
		label: "Indaco",
		sw: "oklch(0.68 0.16 275)"
	},
	{
		id: "lime",
		label: "Lime",
		sw: "oklch(0.68 0.16 115)"
	},
	{
		id: "oro",
		label: "Oro",
		sw: "oklch(0.68 0.19 85)"
	},
	{
		id: "corallo",
		label: "Corallo",
		sw: "oklch(0.68 0.19 12)"
	},
	{
		id: "mono",
		label: "Mono",
		sw: "oklch(0.92 0 0)"
	}
];
var BGS = [
	{
		id: "nero",
		label: "Nero",
		sw: "oklch(0.13 0 0)"
	},
	{
		id: "carbone",
		label: "Carbone",
		sw: "oklch(0.18 0.004 260)"
	},
	{
		id: "grafite",
		label: "Grafite",
		sw: "oklch(0.23 0.006 250)"
	},
	{
		id: "chiaro",
		label: "Chiaro",
		sw: "oklch(0.97 0.008 90)"
	},
	{
		id: "rosso",
		label: "Rosso",
		sw: "oklch(0.14 0.045 25)"
	},
	{
		id: "oceano",
		label: "Oceano",
		sw: "oklch(0.14 0.04 235)"
	},
	{
		id: "notteblu",
		label: "Notte blu",
		sw: "oklch(0.14 0.035 255)"
	},
	{
		id: "bosco",
		label: "Bosco",
		sw: "oklch(0.15 0.035 155)"
	},
	{
		id: "prugna",
		label: "Prugna",
		sw: "oklch(0.15 0.035 315)"
	},
	{
		id: "carta",
		label: "Carta",
		sw: "oklch(0.95 0.025 75)"
	}
];
var THEMES = [
	{
		id: "original",
		label: "Originale",
		description: "Lo stile VOTO attuale",
		sw: "linear-gradient(135deg,#151515,#e85d5d)"
	},
	{
		id: "custom",
		label: "Personalizzato",
		description: "Crea il tuo tema",
		sw: "linear-gradient(135deg,#12151c,#61a7ff)"
	},
	{
		id: "diamante",
		label: "Diamante",
		description: "Zaffiro profondo, vetro glaciale e riflessi azzurri",
		sw: "radial-gradient(circle at 73% 20%,#fff 0 1.4%,#d5f5ff 2.4%,transparent 11%),conic-gradient(from 210deg at 70% 42%,#f3fdff 0deg,#74b9e4 28deg,#dff8ff 53deg,#3273a5 90deg,#f5fcff 120deg,#93d3f3 164deg,#f9ffff 208deg,#1c4770 260deg,#d9f4ff 320deg,#f3fdff 360deg),linear-gradient(135deg,#102039 0%,#244b70 26%,#e8fcff 38%,#79c8ed 45%,#f7ffff 52%,#416e9e 65%,#101d35 100%)"
	},
	{
		id: "oro",
		label: "Oro",
		description: "Ossidiana, oro satinato e riflessi champagne",
		sw: "radial-gradient(ellipse at 16% 14%,#fff8d8 0 1.5%,#f2d16f 2.3%,transparent 19%),repeating-linear-gradient(0deg,#fff3c21a 0 1px,transparent 1px 3px),linear-gradient(102deg,#33220a 0%,#8b6420 13%,#eed06a 17%,#694710 25%,#d6ad4a 38%,#fff1b0 43%,#8b6320 51%,#d3ae54 67%,#6a4914 80%,#e7c762 91%,#221708 100%)"
	},
	{
		id: "emoji",
		label: "Emoji",
		description: "Palette pastello e sfondo con le emoji che scegli",
		sw: "linear-gradient(135deg,#29223a 0%,#8d557b 52%,#f2a35e 100%)"
	},
	{
		id: "tramonto",
		label: "Tramonto",
		description: "Caldo, tra corallo e ambra",
		sw: "linear-gradient(135deg,#291622,#f08a60)"
	},
	{
		id: "lavender",
		label: "Lavender",
		description: "Aurora lilla, vetro satinato e bagliori viola",
		sw: "radial-gradient(circle at 78% 22%,#f6c8ff 0 4%,transparent 5%),radial-gradient(circle at 24% 28%,#a995ff 0 3%,transparent 4%),linear-gradient(135deg,#17102d 0%,#4e2d73 42%,#b987e8 68%,#261540 100%)"
	},
	{
		id: "cybercore",
		label: "Cybercore",
		description: "Neon e futuristico",
		sw: "linear-gradient(135deg,#050b0f,#00f0c8)"
	},
	{
		id: "brutalist",
		label: "Brutalist",
		description: "Forte e senza fronzoli",
		sw: "linear-gradient(135deg,#f4f000,#111)"
	},
	{
		id: "retro-os",
		label: "Retro OS",
		description: "Computer vintage",
		sw: "linear-gradient(135deg,#c0c0c0,#083c83)"
	},
	{
		id: "windows-98",
		label: "Windows 98",
		description: "Grigio classico, blu navy e bordi in rilievo",
		sw: "linear-gradient(135deg,#dfdfdf 0%,#c0c0c0 42%,#808080 48%,#000080 52%,#1084d0 100%)"
	},
	{
		id: "windows-7",
		label: "Windows 7",
		description: "Aero originale, finestre chiare, menu Start e taskbar",
		sw: "radial-gradient(ellipse at 28% 82%,#87e6f7 0%,transparent 44%),linear-gradient(155deg,#053c79 0%,#087fc3 46%,#55c8e8 67%,#0b5394 100%)"
	},
	{
		id: "sangue",
		label: "Sangue",
		description: "Borgogna, colature cremisi e riflessi rubino",
		sw: "radial-gradient(ellipse 7px 14px at 22% 0%,#9a2039 0 52%,transparent 62%),radial-gradient(ellipse 6px 13px at 48% 38%,#d72d4d99 0 50%,transparent 62%),radial-gradient(ellipse 4px 10px at 55% 43%,#8c2038aa 0 50%,transparent 62%),radial-gradient(ellipse 5px 11px at 31% 0%,#d73b56 0 52%,transparent 62%),radial-gradient(circle at 78% 18%,#ff9ba9 0 2%,#d72d4d 3%,transparent 17%),repeating-linear-gradient(135deg,transparent 0 20px,#ff536a18 20px 22px),linear-gradient(145deg,#090a11 0%,#35101c 32%,#7b1730 62%,#c8324d 84%,#230c16 100%)"
	},
	{
		id: "dark-academia",
		label: "Dark Academia",
		description: "Cuoio antico, pergamena e dettagli in ottone",
		sw: "radial-gradient(circle at 72% 18%,#fff0c277 0 1px,transparent 8%),repeating-linear-gradient(0deg,transparent 0 6px,#d9bd8520 6px 7px),linear-gradient(90deg,#100a06 0 8%,#a1814f 8% 10%,#27180e 10% 15%,#4a301c 15% 84%,#c0a06a 84% 86%,#24160c 86% 93%,#100a06 93% 100%),linear-gradient(135deg,#20140d,#82603a,#1b1009)"
	},
	{
		id: "glassmorphism",
		label: "Glassmorphism",
		description: "Vetro satinato, riflessi aurora e superfici traslucide",
		sw: "radial-gradient(ellipse at 18% 20%,#63e4f3 0%,transparent 43%),radial-gradient(ellipse at 85% 15%,#9b78ff 0%,transparent 48%),linear-gradient(145deg,#17172f,#28365f)"
	},
	{
		id: "casino",
		label: "Casinò",
		description: "Panno verde, oro satinato e dettagli color rubino",
		sw: "radial-gradient(circle at 78% 30%,#f7d878 0 4%,transparent 5%),linear-gradient(135deg,#102d25,#1f6849 48%,#c59b3b 72%,#592c37)"
	},
	{
		id: "calcio",
		label: "Calcio",
		description: "Campo verde, linee da stadio e luci della partita",
		sw: "radial-gradient(ellipse at 50% 20%,#fff3b0 0%,transparent 35%),repeating-linear-gradient(90deg,#164c31 0 22%,#1f633b 22% 44%)"
	},
	{
		id: "terminale",
		label: "Terminale",
		description: "Console scura, testo monospaziato e verde fosforo",
		sw: "repeating-linear-gradient(0deg,#07140c 0 7px,#0b1c10 7px 8px),linear-gradient(135deg,#07140c,#144322)"
	},
	{
		id: "pixel-arcade",
		label: "Pixel Arcade",
		description: "Console 8-bit, viola profondo e colori arcade",
		sw: "linear-gradient(135deg,#211442 0 32%,#7146c7 32% 55%,#25d8ca 55% 75%,#f2cb4c 75%)"
	},
	{
		id: "y2k",
		label: "Y2K",
		description: "Portale web 2000: cromo, ciano e fucsia",
		sw: "linear-gradient(135deg,#edfaff 0%,#829fba 18%,#192c56 38%,#ff63c5 57%,#53dcf5 76%,#f6fbff 100%)"
	},
	{
		id: "primavera",
		label: "Primavera",
		description: "Salvia, fiori di ciliegio e luce morbida",
		sw: "radial-gradient(ellipse at 18% 82%,#f5b7cd 0 13%,transparent 14%),radial-gradient(circle at 80% 18%,#ffe3a0 0 8%,transparent 9%),linear-gradient(145deg,#143e30 0%,#3e815c 54%,#f0bfd0 100%)"
	},
	{
		id: "estate",
		label: "Estate",
		description: "Mare turchese, riflessi d’onda e sole dorato",
		sw: "radial-gradient(circle at 81% 21%,#ffe99d 0 10%,transparent 11%),repeating-linear-gradient(170deg,transparent 0 18px,#d2fbef26 18px 20px),linear-gradient(150deg,#102c52 0%,#0b7189 54%,#48c8c3 100%)"
	},
	{
		id: "autunno",
		label: "Autunno",
		description: "Ambra, rame e foglie color ruggine",
		sw: "radial-gradient(circle at 78% 22%,#f3c879 0 10%,transparent 11%),linear-gradient(145deg,#271613 0%,#6b3024 43%,#b65d32 74%,#e0a04e 100%)"
	},
	{
		id: "inverno",
		label: "Inverno",
		description: "Blu notte, brina e bagliori di ghiaccio",
		sw: "radial-gradient(ellipse at 82% 16%,#d8f7ff 0 8%,transparent 9%),radial-gradient(ellipse at 14% 86%,#8bcbe6 0 10%,transparent 11%),linear-gradient(145deg,#0a1832 0%,#23496f 56%,#b6dce9 100%)"
	}
];
var CUSTOM_COLORS = [
	{
		key: "bgDark",
		label: "Sfondo scuro"
	},
	{
		key: "cardDark",
		label: "Schede scure"
	},
	{
		key: "surfaceDark",
		label: "Superfici scure"
	},
	{
		key: "fgDark",
		label: "Testo scuro"
	},
	{
		key: "mutedDark",
		label: "Testo secondario scuro"
	},
	{
		key: "bgLight",
		label: "Sfondo chiaro"
	},
	{
		key: "cardLight",
		label: "Schede chiare"
	},
	{
		key: "surfaceLight",
		label: "Superfici chiare"
	},
	{
		key: "fgLight",
		label: "Testo chiaro"
	},
	{
		key: "mutedLight",
		label: "Testo secondario chiaro"
	},
	{
		key: "primary",
		label: "Colore principale"
	}
];
var FONTS = [
	{
		id: "theme",
		label: "Come il tema",
		sample: "Aa"
	},
	{
		id: "sans",
		label: "Sans moderno",
		sample: "Aa"
	},
	{
		id: "display",
		label: "Display morbido",
		sample: "Aa"
	},
	{
		id: "mono",
		label: "Monospace",
		sample: "01"
	},
	{
		id: "serif",
		label: "Serif classico",
		sample: "Aa"
	}
];
var HOME_MODULE_META = [
	{
		id: "media",
		label: "Media generale"
	},
	{
		id: "simulatore",
		label: "Studio Lab"
	},
	{
		id: "prossima-lezione",
		label: "Prossima lezione"
	},
	{
		id: "domani-a-scuola",
		label: "Domani a scuola"
	},
	{
		id: "presenze",
		label: "Presenze"
	},
	{
		id: "compiti",
		label: "Compiti di oggi"
	},
	{
		id: "interrogazioni",
		label: "Interrogazioni"
	},
	{
		id: "note",
		label: "Note"
	},
	{
		id: "promemoria",
		label: "Promemoria DidUP"
	},
	{
		id: "bacheca",
		label: "Bacheca"
	},
	{
		id: "obiettivo",
		label: "Obiettivo media"
	}
];
var DENSITY_OPTIONS = [{
	id: "standard",
	label: "Standard",
	description: "Spazi originali dell’app"
}, {
	id: "compact",
	label: "Compatto",
	description: "Schede più raccolte"
}];
var MOTION_OPTIONS = [{
	id: false,
	label: "Normali",
	description: "Transizioni e animazioni"
}, {
	id: true,
	label: "Ridotte",
	description: "Meno movimento nell’interfaccia"
}];
function PersonalizationPanel() {
	const v = useVoto();
	const { openMusic } = useUi();
	const [view, setView] = useState("menu");
	const [moreBackgrounds, setMoreBackgrounds] = useState(false);
	const [backgroundProcessing, setBackgroundProcessing] = useState(false);
	const customBackgroundInput = useRef(null);
	const availableThemes = THEMES;
	const hiddenThemeName = availableThemes.slice(4).find((theme) => theme.id === v.theme)?.label;
	const hiddenAccentName = ACCENTS.slice(6).find((accent) => accent.id === v.accent)?.label;
	const pageClassName = v.registryStyle === "didup" ? "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white" : "pt-3";
	if (view === "menu") return /* @__PURE__ */ jsxs("div", {
		className: pageClassName,
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "font-display text-2xl font-semibold",
				children: "Personalizza"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-1 text-xs text-muted-foreground",
				children: "Scegli cosa vuoi modificare."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-5 grid grid-cols-2 gap-3",
				children: [
					v.registryStyle === "voto" && /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setView("themes"),
							className: "press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary",
									children: /* @__PURE__ */ jsx(Palette, { className: "h-7 w-7" })
								}),
								/* @__PURE__ */ jsx("span", {
									className: "font-semibold",
									children: "Temi"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "text-center text-[11px] text-muted-foreground",
									children: "Colori, sfondi e aspetto"
								})
							]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setView("home"),
							className: "press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary",
									children: /* @__PURE__ */ jsx(Home, { className: "h-7 w-7" })
								}),
								/* @__PURE__ */ jsx("span", {
									className: "font-semibold",
									children: "Home"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "text-center text-[11px] text-muted-foreground",
									children: "Moduli e ordine della Home"
								})
							]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setView("experience"),
							className: "press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary",
									children: /* @__PURE__ */ jsx(SlidersHorizontal, { className: "h-7 w-7" })
								}),
								/* @__PURE__ */ jsx("span", {
									className: "font-semibold",
									children: "Esperienza"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "text-center text-[11px] text-muted-foreground",
									children: "Formato e animazioni"
								})
							]
						})
					] }),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => setView("registry"),
						className: "press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary",
								children: /* @__PURE__ */ jsx(BadgeCheck, { className: "h-7 w-7" })
							}),
							/* @__PURE__ */ jsx("span", {
								className: "font-semibold",
								children: "Stile del registro"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "text-center text-[11px] text-muted-foreground",
								children: "Scegli l’aspetto VOTO o DidUP"
							})
						]
					}),
					v.theme === "original" && v.registryStyle === "voto" && /* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => setView("typography"),
						className: "press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary",
								children: /* @__PURE__ */ jsx(Type, { className: "h-7 w-7" })
							}),
							/* @__PURE__ */ jsx("span", {
								className: "font-semibold",
								children: "Tipografia"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "text-center text-[11px] text-muted-foreground",
								children: "Font e dimensione dell’interfaccia"
							})
						]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: openMusic,
						className: "press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary",
								children: /* @__PURE__ */ jsx(Music2, { className: "h-7 w-7" })
							}),
							/* @__PURE__ */ jsx("span", {
								className: "font-semibold",
								children: "Musica"
							}),
							/* @__PURE__ */ jsx("span", {
								className: "text-center text-[11px] text-muted-foreground",
								children: "Brani dal dispositivo o da URL"
							})
						]
					})
				]
			})
		]
	});
	if (view === "typography") return /* @__PURE__ */ jsxs("div", {
		className: pageClassName,
		children: [
			/* @__PURE__ */ jsx(BackButton, {
				onClick: () => setView("menu"),
				title: "Tipografia"
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Font dell’app" }),
			/* @__PURE__ */ jsx("p", {
				className: "mb-3 text-[11px] text-muted-foreground",
				children: "Il font scelto si applica a tutti i temi. “Come il tema” ripristina lo stile tipografico previsto da ciascun tema."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-2 gap-2",
				children: FONTS.map((font) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-pressed": v.customTheme.font === font.id,
					onClick: () => v.setCustomTheme({ font: font.id }),
					className: cn("press card-surface flex items-center gap-3 p-3 text-left", v.customTheme.font === font.id && "border-primary"),
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-2xl text-primary",
						style: { fontFamily: font.id === "theme" ? "inherit" : font.id === "serif" ? "Georgia, serif" : font.id === "mono" ? "\"JetBrains Mono\", monospace" : font.id === "display" ? "\"Space Grotesk\", sans-serif" : "\"Manrope\", sans-serif" },
						children: font.sample
					}), /* @__PURE__ */ jsx("span", {
						className: "text-xs font-semibold",
						children: font.label
					})]
				}, font.id))
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Dimensione del testo" }),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface p-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ jsx("label", {
							htmlFor: "interface-scale",
							className: "text-xs font-semibold",
							children: "Scala testo e interfaccia"
						}), /* @__PURE__ */ jsxs("output", {
							className: "tabular text-xs font-semibold text-primary",
							htmlFor: "interface-scale",
							children: [v.interfaceScale, "%"]
						})]
					}),
					/* @__PURE__ */ jsx("input", {
						id: "interface-scale",
						type: "range",
						min: 80,
						max: 140,
						step: 5,
						value: v.interfaceScale,
						onChange: (event) => v.setInterfaceScale(Number(event.target.value)),
						"aria-label": "Dimensione del testo",
						className: "mt-3 w-full accent-primary"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex justify-between text-[10px] text-muted-foreground",
						children: [/* @__PURE__ */ jsx("span", { children: "80%" }), /* @__PURE__ */ jsx("span", { children: "140%" })]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => {
							v.setCustomTheme({ font: "theme" });
							v.setInterfaceScale(100);
						},
						disabled: v.customTheme.font === "theme" && v.interfaceScale === 100,
						className: "mt-3 text-[11px] font-medium text-primary disabled:text-muted-foreground",
						children: "Ripristina tipografia"
					})
				]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-3 text-[11px] text-muted-foreground",
				children: "Le preferenze vengono salvate su questo dispositivo."
			})
		]
	});
	if (view === "experience") return /* @__PURE__ */ jsxs("div", {
		className: pageClassName,
		children: [
			/* @__PURE__ */ jsx(BackButton, {
				onClick: () => setView("menu"),
				title: "Esperienza"
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Formato delle schede" }),
			/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-2 gap-2",
				children: DENSITY_OPTIONS.map((option) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-pressed": v.density === option.id,
					onClick: () => v.setDensity(option.id),
					className: cn("press card-surface p-3 text-left", v.density === option.id && "border-primary"),
					children: [/* @__PURE__ */ jsx("span", {
						className: "block text-xs font-semibold",
						children: option.label
					}), /* @__PURE__ */ jsx("span", {
						className: "mt-1 block text-[10px] text-muted-foreground",
						children: option.description
					})]
				}, option.id))
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Movimento" }),
			/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-2 gap-2",
				children: MOTION_OPTIONS.map((option) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-pressed": v.reduceMotion === option.id,
					onClick: () => v.setReduceMotion(option.id),
					className: cn("press card-surface p-3 text-left", v.reduceMotion === option.id && "border-primary"),
					children: [/* @__PURE__ */ jsx("span", {
						className: "block text-xs font-semibold",
						children: option.label
					}), /* @__PURE__ */ jsx("span", {
						className: "mt-1 block text-[10px] text-muted-foreground",
						children: option.description
					})]
				}, String(option.id)))
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-3 text-[11px] text-muted-foreground",
				children: "Le preferenze vengono salvate su questo dispositivo."
			})
		]
	});
	if (view === "registry") return /* @__PURE__ */ jsxs("div", {
		className: pageClassName,
		children: [
			/* @__PURE__ */ jsx(BackButton, {
				onClick: () => setView("menu"),
				title: "Stile del registro"
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Identità visiva" }),
			/* @__PURE__ */ jsx("p", {
				className: "mb-3 text-[11px] text-muted-foreground",
				children: "Cambia l’aspetto generale dell’app. Le funzioni e i dati restano quelli di VOTO; il profilo DidUP è ispirato al registro e non è l’app ufficiale."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "grid gap-3",
				children: [{
					id: "voto",
					label: "VOTO",
					description: "Mantieni l’identità visiva attuale e le tue preferenze di tema.",
					swatch: "bg-gradient-to-br from-neutral-950 via-neutral-800 to-rose-500"
				}, {
					id: "didup",
					label: "DidUP",
					description: "Interfaccia più istituzionale, blu e lineare, ispirata al registro DidUP.",
					swatch: "bg-gradient-to-br from-sky-900 via-sky-700 to-sky-400"
				}].map((style) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-pressed": v.registryStyle === style.id,
					onClick: () => v.setRegistryStyle(style.id),
					className: cn("press card-surface flex items-center gap-3 p-4 text-left", v.registryStyle === style.id && "border-primary ring-2 ring-primary/30"),
					children: [
						/* @__PURE__ */ jsx("span", { className: cn("h-12 w-12 shrink-0 rounded-xl", style.swatch) }),
						/* @__PURE__ */ jsxs("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ jsx("span", {
								className: "block text-sm font-semibold",
								children: style.label
							}), /* @__PURE__ */ jsx("span", {
								className: "mt-1 block text-[11px] text-muted-foreground",
								children: style.description
							})]
						}),
						v.registryStyle === style.id && /* @__PURE__ */ jsx("span", {
							className: "shrink-0 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary",
							children: "Attivo"
						})
					]
				}, style.id))
			})
		]
	});
	if (view === "home") return /* @__PURE__ */ jsxs("div", {
		className: pageClassName,
		children: [
			/* @__PURE__ */ jsx(BackButton, {
				onClick: () => setView("menu"),
				title: "Home"
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Moduli Home" }),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface overflow-hidden p-2",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "px-2 pb-2 pt-1 text-[11px] text-muted-foreground",
						children: "Attiva i moduli, riducine la dimensione con i cursori e usa le frecce per riordinarli."
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3 rounded-xl border border-border bg-surface/40 p-3",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ jsx("label", {
									htmlFor: "home-scale",
									className: "text-xs font-semibold",
									children: "Zoom generale Home"
								}), /* @__PURE__ */ jsxs("output", {
									className: "tabular text-xs font-semibold text-primary",
									htmlFor: "home-scale",
									children: [v.homeScale, "%"]
								})]
							}),
							/* @__PURE__ */ jsx("input", {
								id: "home-scale",
								type: "range",
								min: 80,
								max: 100,
								step: 5,
								value: v.homeScale,
								onChange: (event) => v.setHomeScale(Number(event.target.value)),
								"aria-label": "Dimensione generale della Home",
								className: "mt-3 w-full accent-primary"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex justify-between text-[10px] text-muted-foreground",
								children: [/* @__PURE__ */ jsx("span", { children: "80%" }), /* @__PURE__ */ jsx("span", { children: "100%" })]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => v.setHomeScale(100),
								disabled: v.homeScale === 100,
								className: "mt-2 text-[11px] font-medium text-primary disabled:text-muted-foreground",
								children: "Ripristina 100%"
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "space-y-1",
						children: v.homeModules.map((module, index) => {
							const meta = HOME_MODULE_META.find((item) => item.id === module.id);
							return /* @__PURE__ */ jsxs("div", {
								className: cn("rounded-xl p-2", !module.enabled && "opacity-50"),
								children: [/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ jsx("button", {
											type: "button",
											onClick: () => v.toggleHomeModule(module.id),
											"aria-label": module.enabled ? `Nascondi ${meta.label}` : `Mostra ${meta.label}`,
											className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-muted-foreground",
											children: module.enabled ? /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(EyeOff, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ jsx("span", {
											className: "min-w-0 flex-1 text-sm",
											children: meta.label
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											disabled: index === 0,
											onClick: () => v.moveHomeModule(module.id, -1),
											"aria-label": `Sposta ${meta.label} su`,
											className: "press flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-25",
											children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ jsx("button", {
											type: "button",
											disabled: index === v.homeModules.length - 1,
											onClick: () => v.moveHomeModule(module.id, 1),
											"aria-label": `Sposta ${meta.label} giù`,
											className: "press flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-25",
											children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
										})
									]
								}), /* @__PURE__ */ jsxs("div", {
									className: "mt-2 flex items-center gap-2 pl-11",
									children: [
										/* @__PURE__ */ jsx("label", {
											htmlFor: `home-module-scale-${module.id}`,
											className: "w-16 shrink-0 text-[10px] text-muted-foreground",
											children: "Dimensione"
										}),
										/* @__PURE__ */ jsx("input", {
											id: `home-module-scale-${module.id}`,
											type: "range",
											min: 80,
											max: 100,
											step: 5,
											value: module.scale,
											onChange: (event) => v.setHomeModuleScale(module.id, Number(event.target.value)),
											"aria-label": `Dimensione del modulo ${meta.label}`,
											className: "min-w-0 flex-1 accent-primary"
										}),
										/* @__PURE__ */ jsxs("output", {
											className: "tabular w-9 text-right text-[10px] font-semibold text-primary",
											htmlFor: `home-module-scale-${module.id}`,
											children: [module.scale, "%"]
										})
									]
								})]
							}, module.id);
						})
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: v.resetHomeModules,
						className: "press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground",
						children: [/* @__PURE__ */ jsx(RotateCcw, { className: "h-3.5 w-3.5" }), " Ripristina la Home"]
					})
				]
			})
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: pageClassName,
		children: [
			/* @__PURE__ */ jsx(BackButton, {
				onClick: () => setView("menu"),
				title: "Temi"
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Tema completo" }),
			/* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-2 gap-2",
				children: availableThemes.slice(0, 4).map((theme) => /* @__PURE__ */ jsx(ThemeOption, {
					theme,
					selected: v.theme === theme.id,
					onSelect: v.setTheme
				}, theme.id))
			}),
			availableThemes.length > 4 && /* @__PURE__ */ jsx(Accordion, {
				type: "single",
				collapsible: true,
				className: "mt-2 rounded-xl border border-border px-3",
				children: /* @__PURE__ */ jsxs(AccordionItem, {
					value: "other-themes",
					className: "border-0",
					children: [/* @__PURE__ */ jsxs(AccordionTrigger, {
						className: "py-3 text-xs font-semibold hover:no-underline",
						children: [
							"Altri temi (",
							availableThemes.length - 4,
							")",
							hiddenThemeName ? ` · attivo: ${hiddenThemeName}` : ""
						]
					}), /* @__PURE__ */ jsx(AccordionContent, {
						className: "pb-2",
						children: /* @__PURE__ */ jsx("div", {
							className: "grid grid-cols-2 gap-2",
							children: availableThemes.slice(4).map((theme) => /* @__PURE__ */ jsx(ThemeOption, {
								theme,
								selected: v.theme === theme.id,
								onSelect: v.setTheme
							}, theme.id))
						})
					})]
				})
			}),
			v.theme === "windows-7" && /* @__PURE__ */ jsxs("p", {
				className: "mt-3 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground",
				children: ["Aero mantiene le finestre chiare, come Windows 7. La modalità chiara o scura cambia la tinta del desktop e delle cornici; il menu Start raccoglie tutte le sezioni di VOTO.", v.registryStyle === "didup" && " Per visualizzarlo, scegli lo stile del registro VOTO."]
			}),
			v.theme === "emoji" && /* @__PURE__ */ jsxs("section", {
				className: "card-surface mt-3 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3 flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
							className: "text-sm font-semibold",
							children: "Le tue emoji"
						}), /* @__PURE__ */ jsxs("p", {
							className: "mt-1 text-[11px] text-muted-foreground",
							children: [
								"Scegli fino a ",
								8,
								" emoji: decoreranno lo sfondo a motivo ripetuto."
							]
						})] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => v.setEmojiThemeEmojis([...DEFAULT_EMOJI_THEME_EMOJIS]),
							className: "press shrink-0 rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold text-muted-foreground",
							children: "Ripristina"
						})]
					}),
					/* @__PURE__ */ jsx("label", {
						htmlFor: "emoji-theme-selection",
						className: "text-xs font-semibold",
						children: "Emoji del tema"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "emoji-theme-selection",
						type: "text",
						value: v.emojiThemeEmojis.join(" "),
						onChange: (event) => v.setEmojiThemeEmojis(parseEmojiThemeInput(event.target.value)),
						placeholder: "📚 ✏️ 🎒 ✨",
						"aria-describedby": "emoji-theme-help",
						className: "mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-xl tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-ring"
					}),
					/* @__PURE__ */ jsx("p", {
						id: "emoji-theme-help",
						className: "mt-2 text-[11px] text-muted-foreground",
						children: "Apri la tastiera emoji e separa le scelte con uno spazio. Lascia vuoto per togliere il motivo. Le scelte restano salvate su questo dispositivo."
					}),
					/* @__PURE__ */ jsx("div", {
						"aria-label": "Anteprima delle emoji scelte",
						className: "mt-3 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/30 p-2",
						children: v.emojiThemeEmojis.length ? v.emojiThemeEmojis.map((emoji, index) => /* @__PURE__ */ jsx("span", {
							className: "text-2xl",
							"aria-hidden": "true",
							children: emoji
						}, `${emoji}-${index}`)) : /* @__PURE__ */ jsx("span", {
							className: "text-[11px] text-muted-foreground",
							children: "Nessuna emoji selezionata"
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-4",
						children: [
							/* @__PURE__ */ jsx("h3", {
								className: "text-xs font-semibold",
								children: "Colore dello sfondo"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 text-[11px] text-muted-foreground",
								children: "Cambia il colore dietro al motivo. Puoi scegliere un colore diverso per la modalità chiara e quella scura."
							}),
							/* @__PURE__ */ jsx("div", {
								className: "mt-2 grid grid-cols-2 gap-2",
								children: [{
									mode: "scuro",
									label: "Sfondo scuro"
								}, {
									mode: "chiaro",
									label: "Sfondo chiaro"
								}].map(({ mode, label }) => /* @__PURE__ */ jsxs("label", {
									className: "flex min-w-0 items-center gap-2 rounded-xl border border-border p-2",
									children: [/* @__PURE__ */ jsx("input", {
										type: "color",
										value: v.emojiThemeBackgroundColors[mode],
										onChange: (event) => v.setEmojiThemeBackgroundColor(mode, event.currentTarget.value),
										"aria-label": `Colore ${label.toLocaleLowerCase("it-IT")} del tema Emoji`,
										className: "h-9 w-10 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
									}), /* @__PURE__ */ jsxs("span", {
										className: "min-w-0",
										children: [/* @__PURE__ */ jsx("span", {
											className: "block truncate text-[10px] font-medium",
											children: label
										}), /* @__PURE__ */ jsx("code", {
											className: "block text-[10px] text-muted-foreground",
											children: v.emojiThemeBackgroundColors[mode]
										})]
									})]
								}, mode))
							})
						]
					})
				]
			}),
			v.theme !== "original" && /* @__PURE__ */ jsx("p", {
				className: "mt-3 rounded-md border border-border bg-card p-3 text-[11px] text-muted-foreground",
				children: "Questo è un tema completo: colori, superfici, caratteri e arrotondamenti sono gestiti dal tema. I font personalizzati sono disponibili solo con il tema Originale."
			}),
			v.theme === "custom" && /* @__PURE__ */ jsxs("section", {
				className: "card-surface mt-3 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mb-3 flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
							className: "text-sm font-semibold",
							children: "Il tuo tema"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-[11px] text-muted-foreground",
							children: "Le modifiche vengono salvate su questo dispositivo."
						})] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: v.resetCustomTheme,
							className: "press rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold text-muted-foreground",
							children: "Ripristina"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mb-4 rounded-xl border border-border bg-surface/30 p-3",
						children: [
							/* @__PURE__ */ jsx("h3", {
								className: "text-xs font-semibold",
								children: "Immagine di sfondo"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 text-[11px] text-muted-foreground",
								children: "Scegli una foto dal dispositivo per personalizzare lo sfondo dell’app."
							}),
							v.customTheme.backgroundImage ? /* @__PURE__ */ jsx("div", {
								role: "img",
								"aria-label": "Anteprima dello sfondo scelto",
								className: "mt-3 h-24 rounded-lg border border-border bg-cover bg-center",
								style: { backgroundImage: `url("${v.customTheme.backgroundImage}")` }
							}) : /* @__PURE__ */ jsx("div", {
								className: "mt-3 flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground",
								style: { backgroundColor: v.mode === "chiaro" ? v.customTheme.bgLight : v.customTheme.bgDark },
								children: "Nessuna immagine selezionata"
							}),
							/* @__PURE__ */ jsx("input", {
								ref: customBackgroundInput,
								type: "file",
								accept: "image/jpeg,image/png,image/webp",
								className: "hidden",
								"aria-label": "Scegli un’immagine di sfondo",
								onChange: (event) => {
									const file = event.currentTarget.files?.[0];
									event.currentTarget.value = "";
									if (!file) return;
									setBackgroundProcessing(true);
									const fallbackColor = v.mode === "chiaro" ? v.customTheme.bgLight : v.customTheme.bgDark;
									processCustomThemeBackground(file, fallbackColor).then((backgroundImage) => {
										v.setCustomTheme({ backgroundImage });
										toast.success("Sfondo aggiornato");
									}).catch((error) => {
										toast.error("Immagine non caricata", { description: error instanceof Error ? error.message : "Controlla il file e riprova." });
									}).finally(() => setBackgroundProcessing(false));
								}
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-3 flex gap-2",
								children: [/* @__PURE__ */ jsxs("button", {
									type: "button",
									disabled: backgroundProcessing,
									onClick: () => customBackgroundInput.current?.click(),
									className: "press flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60",
									children: [/* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }), backgroundProcessing ? "Ottimizzo…" : v.customTheme.backgroundImage ? "Cambia immagine" : "Scegli immagine"]
								}), v.customTheme.backgroundImage && /* @__PURE__ */ jsx("button", {
									type: "button",
									disabled: backgroundProcessing,
									onClick: () => {
										v.setCustomTheme({ backgroundImage: "" });
										toast.success("Immagine rimossa");
									},
									className: "press min-h-10 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground disabled:opacity-60",
									children: "Rimuovi"
								})]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-2 text-[10px] leading-4 text-muted-foreground",
								children: "JPG, PNG o WebP. L’immagine viene compressa e salvata su questo dispositivo; è inclusa nel backup delle preferenze e non viene caricata su Supabase."
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-2 gap-2",
						children: CUSTOM_COLORS.map((field) => /* @__PURE__ */ jsxs("label", {
							className: "flex items-center gap-2 rounded-xl border border-border p-2 text-[11px] text-muted-foreground",
							children: [/* @__PURE__ */ jsx("input", {
								type: "color",
								value: v.customTheme[field.key],
								onChange: (e) => v.setCustomTheme({ [field.key]: e.target.value }),
								className: "h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0",
								"aria-label": field.label
							}), /* @__PURE__ */ jsxs("span", {
								className: "min-w-0",
								children: [/* @__PURE__ */ jsx("span", {
									className: "block truncate",
									children: field.label
								}), /* @__PURE__ */ jsx("span", {
									className: "font-mono text-[10px] text-foreground",
									children: v.customTheme[field.key]
								})]
							})]
						}, field.key))
					}),
					/* @__PURE__ */ jsx("div", {
						className: "mt-3 grid grid-cols-2 gap-3",
						children: /* @__PURE__ */ jsxs("label", {
							className: "text-[11px] text-muted-foreground",
							children: [
								"Arrotondamento",
								" ",
								/* @__PURE__ */ jsxs("span", {
									className: "font-mono text-foreground",
									children: [v.customTheme.radius.toFixed(2), "rem"]
								}),
								/* @__PURE__ */ jsx("input", {
									type: "range",
									min: "0",
									max: "2",
									step: "0.05",
									value: v.customTheme.radius,
									onChange: (e) => v.setCustomTheme({ radius: Number(e.target.value) }),
									className: "mt-2 w-full accent-[var(--color-primary)]"
								})
							]
						})
					})
				]
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Aspetto" }),
			/* @__PURE__ */ jsx("div", {
				className: "mb-4 grid grid-cols-2 gap-2",
				children: [{
					id: "chiaro",
					label: "Chiaro",
					description: "Sfondo chiaro"
				}, {
					id: "scuro",
					label: "Scuro",
					description: "Sfondo scuro"
				}].map((mode) => {
					const Icon = mode.id === "chiaro" ? Sun : Moon;
					return /* @__PURE__ */ jsxs("button", {
						type: "button",
						"aria-pressed": v.mode === mode.id,
						onClick: () => v.setMode(mode.id),
						className: cn("press card-surface flex items-center gap-3 p-3 text-left", v.mode === mode.id && "border-primary"),
						children: [/* @__PURE__ */ jsx("span", {
							className: "flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary",
							children: /* @__PURE__ */ jsx(Icon, { className: "h-4 w-4" })
						}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("span", {
							className: "block text-xs font-semibold",
							children: mode.label
						}), /* @__PURE__ */ jsx("span", {
							className: "block text-[10px] text-muted-foreground",
							children: mode.description
						})] })]
					}, mode.id);
				})
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mb-2 text-xs text-muted-foreground",
				children: "Effetto Liquid glass"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mb-4 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-pressed": v.glass,
					onClick: () => v.setGlass(true),
					className: cn("press rounded-xl border p-3 text-left text-xs", v.glass ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border text-muted-foreground"),
					children: ["Attivo", /* @__PURE__ */ jsx("span", {
						className: "mt-1 block text-[10px] font-normal",
						children: "Trasparenze e sfocatura"
					})]
				}), /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-pressed": !v.glass,
					onClick: () => v.setGlass(false),
					className: cn("press rounded-xl border p-3 text-left text-xs", !v.glass ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border text-muted-foreground"),
					children: ["Disattivo", /* @__PURE__ */ jsx("span", {
						className: "mt-1 block text-[10px] font-normal",
						children: "Aspetto piatto"
					})]
				})]
			}),
			v.theme === "original" && /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsx("div", {
					className: "grid grid-cols-3 gap-2 sm:grid-cols-5",
					children: ACCENTS.slice(0, 6).map((accent) => /* @__PURE__ */ jsx(AccentOption, {
						accent,
						selected: v.accent === accent.id,
						onSelect: v.setAccent
					}, accent.id))
				}),
				ACCENTS.length > 6 && /* @__PURE__ */ jsx(Accordion, {
					type: "single",
					collapsible: true,
					className: "mt-2 rounded-xl border border-border px-3",
					children: /* @__PURE__ */ jsxs(AccordionItem, {
						value: "other-colors",
						className: "border-0",
						children: [/* @__PURE__ */ jsxs(AccordionTrigger, {
							className: "py-3 text-xs font-semibold hover:no-underline",
							children: [
								"Altri colori (",
								ACCENTS.length - 6,
								")",
								hiddenAccentName ? ` · attivo: ${hiddenAccentName}` : ""
							]
						}), /* @__PURE__ */ jsx(AccordionContent, {
							className: "pb-2",
							children: /* @__PURE__ */ jsx("div", {
								className: "grid grid-cols-3 gap-2 sm:grid-cols-5",
								children: ACCENTS.slice(6).map((accent) => /* @__PURE__ */ jsx(AccentOption, {
									accent,
									selected: v.accent === accent.id,
									onSelect: v.setAccent
								}, accent.id))
							})
						})]
					})
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mb-2 mt-4 text-xs text-muted-foreground",
					children: "Sfondo"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "grid grid-cols-2 gap-2 sm:grid-cols-4",
					children: BGS.slice(0, moreBackgrounds ? BGS.length : 6).map((bg) => /* @__PURE__ */ jsx("button", {
						type: "button",
						"aria-pressed": v.bg === bg.id,
						onClick: () => v.setBg(bg.id),
						className: cn("press flex h-16 items-end rounded-xl border p-2.5 text-[11px]", v.bg === bg.id ? "border-primary" : "border-border"),
						style: { background: bg.sw },
						children: bg.label
					}, bg.id))
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => setMoreBackgrounds((x) => !x),
					className: "press mt-2 flex h-10 w-full items-center justify-center rounded-xl border border-border text-xs font-semibold text-muted-foreground",
					children: moreBackgrounds ? "Mostra meno sfondi" : "Mostra altri sfondi"
				})
			] })
		]
	});
}
function ThemeOption({ theme, selected, onSelect }) {
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		"aria-pressed": selected,
		onClick: () => onSelect(theme.id),
		className: cn("press card-surface overflow-hidden p-0 text-left", selected && "border-primary"),
		children: [/* @__PURE__ */ jsx("span", {
			className: "relative block h-16",
			style: { background: theme.sw },
			children: theme.id === "emoji" && /* @__PURE__ */ jsx("span", {
				className: "absolute inset-0 flex items-center justify-center gap-3 text-3xl drop-shadow",
				"aria-hidden": "true",
				children: "📚 ✏️ 🎒 ✨"
			})
		}), /* @__PURE__ */ jsxs("span", {
			className: "block p-3",
			children: [/* @__PURE__ */ jsx("span", {
				className: "block text-xs font-semibold",
				children: theme.label
			}), /* @__PURE__ */ jsx("span", {
				className: "mt-1 block text-[10px] text-muted-foreground",
				children: theme.description
			})]
		})]
	});
}
function AccentOption({ accent, selected, onSelect }) {
	return /* @__PURE__ */ jsxs("button", {
		type: "button",
		"aria-pressed": selected,
		onClick: () => onSelect(accent.id),
		className: cn("press card-surface flex flex-col items-center gap-2 p-3 text-[11px]", selected && "border-primary"),
		children: [/* @__PURE__ */ jsx("span", {
			className: "h-7 w-7 rounded-full",
			style: { background: accent.sw }
		}), accent.label]
	});
}
function BackButton({ onClick, title }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "flex items-center gap-3",
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			onClick,
			className: "press flex h-9 w-9 items-center justify-center rounded-xl border border-border",
			"aria-label": "Torna indietro",
			children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" })
		}), /* @__PURE__ */ jsx("h1", {
			className: "font-display text-2xl font-semibold",
			children: title
		})]
	});
}
//#endregion
//#region src/routes/personalizza.tsx?tsr-split=component
function Personalizza() {
	return /* @__PURE__ */ jsx(PersonalizationPanel, {});
}
//#endregion
export { Personalizza as component };
