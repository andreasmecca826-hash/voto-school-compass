import { t as cn } from "./utils-C_uf36nf.js";
import { r as supabase } from "./supabase-auth-BEdIbH2_.js";
import { S as canResetDemoData, _ as isValidCustomThemeBackground, a as DEFAULT_HOME_MODULES, f as DEFAULT_EMOJI_THEME_BACKGROUND_COLORS, h as normalizeEmojiThemeEmojis, m as normalizeEmojiThemeBackgroundColors, o as normalizeHomeModules, p as DEFAULT_EMOJI_THEME_EMOJIS, r as useVoto, s as normalizeHomeScale, u as presentInterrogazione, w as parseVotoData, x as useSchoolAuth, y as sanitizeCustomThemeBackground } from "./store-EhdD6Ug3.js";
import { r as fmtTime } from "./dates-CdBXaUB1.js";
import { o as SectionTitle } from "./ui-D03OlNCN.js";
import { c as useAppPinLock, n as isValidPin } from "./app-pin-lock-DONkOBCJ.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-CwLzEEob.js";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Bug, CalendarDays, Download, Gauge, Github, LockKeyhole, LockKeyholeOpen, RotateCcw, Save, ShieldAlert, SlidersHorizontal, Upload } from "lucide-react";
import { toast } from "sonner";
//#region src/components/voto/AppPinLockSettings.tsx
function AppPinLockSettings() {
	const { hasPin, savePin, removePin, lockNow } = useAppPinLock();
	const [pin, setPin] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [saving, setSaving] = useState(false);
	const submit = async (event) => {
		event.preventDefault();
		if (!isValidPin(pin)) {
			toast.error(`Inserisci da 4 a 8 cifre.`);
			return;
		}
		if (pin !== confirmation) {
			toast.error("I due PIN non coincidono.");
			return;
		}
		setSaving(true);
		try {
			await savePin(pin);
			setPin("");
			setConfirmation("");
			toast.success(hasPin ? "PIN aggiornato." : "Blocco PIN attivato.");
		} catch (error) {
			toast.error("Non sono riuscito a salvare il PIN.", { description: error instanceof Error ? error.message : void 0 });
		} finally {
			setSaving(false);
		}
	};
	const disable = () => {
		if (!window.confirm("Disattivare il blocco PIN su questo dispositivo?")) return;
		try {
			removePin();
			setPin("");
			setConfirmation("");
			toast.success("Blocco PIN disattivato.");
		} catch {
			toast.error("Non sono riuscito a disattivare il PIN.");
		}
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SectionTitle, { children: "Blocco app" }), /* @__PURE__ */ jsxs("section", {
		className: "card-surface p-4",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ jsx("span", {
					className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
					children: hasPin ? /* @__PURE__ */ jsx(LockKeyhole, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(LockKeyholeOpen, { className: "h-5 w-5" })
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "text-sm font-semibold",
					children: hasPin ? "PIN attivo" : "PIN disattivato"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-0.5 text-[11px] text-muted-foreground",
					children: hasPin ? "Verrà richiesto all'apertura e al rientro nell'app." : "Imposta un PIN per bloccare l'app."
				})] })]
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "mt-4 space-y-3",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "app-pin-new",
						className: "text-xs text-muted-foreground",
						children: hasPin ? "Nuovo PIN" : "PIN"
					}), /* @__PURE__ */ jsx("input", {
						id: "app-pin-new",
						type: "password",
						inputMode: "numeric",
						pattern: "[0-9]*",
						autoComplete: "new-password",
						minLength: 4,
						maxLength: 8,
						value: pin,
						onChange: (event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8)),
						className: "mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm tracking-[0.2em]",
						placeholder: `4-8 cifre`,
						required: true
					})] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
						htmlFor: "app-pin-confirm",
						className: "text-xs text-muted-foreground",
						children: "Conferma PIN"
					}), /* @__PURE__ */ jsx("input", {
						id: "app-pin-confirm",
						type: "password",
						inputMode: "numeric",
						pattern: "[0-9]*",
						autoComplete: "new-password",
						minLength: 4,
						maxLength: 8,
						value: confirmation,
						onChange: (event) => setConfirmation(event.target.value.replace(/\D/g, "").slice(0, 8)),
						className: "mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm tracking-[0.2em]",
						placeholder: "Ripeti il PIN",
						required: true
					})] }),
					/* @__PURE__ */ jsxs("p", {
						className: "text-[11px] text-muted-foreground",
						children: [
							"Da ",
							4,
							" a ",
							8,
							" cifre; consiglio almeno 6."
						]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "submit",
						disabled: saving || pin.length < 4 || confirmation.length < 4,
						className: "press h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50",
						children: saving ? "Salvataggio…" : hasPin ? "Cambia PIN" : "Attiva blocco PIN"
					})
				]
			}),
			hasPin && /* @__PURE__ */ jsxs("div", {
				className: "mt-3 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: lockNow,
					className: "press h-10 rounded-xl border border-border text-xs font-medium",
					children: "Blocca ora"
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: disable,
					className: "press h-10 rounded-xl border border-danger/30 text-xs font-medium text-danger",
					children: "Disattiva PIN"
				})]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-4 rounded-xl bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground",
				children: "VOTO conserva soltanto un verificatore derivato dal PIN e un sale casuale sul dispositivo; il PIN non viene inviato a Supabase o GitHub. Il blocco protegge la schermata, ma non cifra i dati e può essere rimosso da chi può cancellare i dati locali dell'app."
			})
		]
	})] });
}
//#endregion
//#region src/lib/voto/calendar-export.ts
var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
var TIME_ONLY = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
var encoder = new TextEncoder();
function isValidDate(value) {
	if (!DATE_ONLY.test(value)) return false;
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	const date = new Date(Date.UTC(year, month - 1, day));
	return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function dateInRange(date, from, to) {
	return isValidDate(date) && date >= from && date <= to;
}
function eventDate(value) {
	const date = value?.slice(0, 10) ?? "";
	return isValidDate(date) ? date : null;
}
function eventTime(value) {
	if (!value) return void 0;
	const normalized = value.length === 5 ? `${value}:00` : value;
	return TIME_ONLY.test(normalized) ? normalized : void 0;
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
function nextDate(date) {
	const year = Number(date.slice(0, 4));
	const month = Number(date.slice(5, 7));
	const day = Number(date.slice(8, 10));
	return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
function serializeEvent(event, stamp) {
	const lines = [
		"BEGIN:VEVENT",
		`UID:${event.uid}`,
		`DTSTAMP:${stamp}`
	];
	if (event.time) {
		const start = /* @__PURE__ */ new Date(`${event.date}T${event.time}`);
		if (Number.isFinite(start.getTime())) lines.push(`DTSTART:${formatUtcDateTime(start)}`);
		else {
			lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`);
			lines.push(`DTEND;VALUE=DATE:${nextDate(event.date).replace(/-/g, "")}`);
		}
	} else {
		lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g, "")}`);
		lines.push(`DTEND;VALUE=DATE:${nextDate(event.date).replace(/-/g, "")}`);
	}
	lines.push(`SUMMARY:${escapeText(event.summary)}`, `DESCRIPTION:${escapeText(event.description)}`, `CATEGORIES:${escapeText(event.category)}`, "END:VEVENT");
	return lines.map(foldLine);
}
function createCalendarIcs(data, options) {
	if (!isValidDate(options.from) || !isValidDate(options.to) || options.from > options.to) throw new RangeError("Seleziona un intervallo di date valido.");
	const events = [];
	if (options.include.assignments) for (const assignment of data.assignments) {
		const date = eventDate(assignment.dueDate);
		if (!date || !dateInRange(date, options.from, options.to) || options.isAssignmentDone(assignment.id, assignment.completed)) continue;
		const details = [assignment.subject ? `Materia: ${assignment.subject}` : "", assignment.details?.trim() ?? ""].filter(Boolean);
		events.push({
			uid: `compito-${encodeURIComponent(assignment.id)}@voto.app`,
			date,
			time: eventTime(assignment.dueTime),
			summary: `Compito: ${assignment.title}`,
			description: details.join("\n") || "Scadenza compito scolastico.",
			category: "Compiti"
		});
	}
	if (options.include.interrogazioni) for (const item of data.interrogazioni) {
		const date = eventDate(item.date);
		if (!date || !dateInRange(date, options.from, options.to) || item.completed) continue;
		const presentation = presentInterrogazione(item);
		events.push({
			uid: `interrogazione-${encodeURIComponent(item.id)}@voto.app`,
			date,
			time: eventTime(item.time),
			summary: `${presentation.isVerification ? "Verifica" : "Interrogazione"}: ${presentation.title}`,
			description: [presentation.isVerification ? `Materia: ${presentation.subject}` : "", presentation.notes ?? `Preparazione per ${presentation.subject}.`].filter(Boolean).join("\n"),
			category: "Interrogazioni"
		});
	}
	if (options.include.reminders) for (const notification of data.notifications) {
		if (notification.type !== "reminder") continue;
		const date = eventDate(notification.date);
		if (!date || !dateInRange(date, options.from, options.to)) continue;
		const details = [notification.subject ? `Materia: ${notification.subject}` : "", notification.message?.trim() ?? ""].filter(Boolean);
		events.push({
			uid: `promemoria-${encodeURIComponent(notification.id)}@voto.app`,
			date,
			summary: `Promemoria: ${notification.title}`,
			description: details.join("\n") || "Promemoria scolastico.",
			category: "Promemoria"
		});
	}
	if (events.length === 0) return {
		content: "",
		eventCount: 0
	};
	const stamp = formatUtcDateTime(options.now ?? /* @__PURE__ */ new Date());
	return {
		content: `${[
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"PRODID:-//VOTO//Calendario scolastico 3.0.0//IT",
			"CALSCALE:GREGORIAN",
			"METHOD:PUBLISH",
			"X-WR-CALNAME:VOTO - Calendario scolastico",
			...events.flatMap((event) => serializeEvent(event, stamp)),
			"END:VCALENDAR"
		].map(foldLine).join("\r\n")}\r\n`,
		eventCount: events.length
	};
}
//#endregion
//#region src/lib/voto/preferences-backup.ts
var PREFERENCES_BACKUP_TYPE = "voto-preferences";
var ACCENTS = [
	"rosso",
	"ambra",
	"viola",
	"blu",
	"verde",
	"azzurro",
	"rosa",
	"arancio",
	"turchese",
	"indaco",
	"lime",
	"oro",
	"corallo",
	"menta",
	"mono"
];
var BACKGROUNDS = [
	"nero",
	"carbone",
	"grafite",
	"chiaro",
	"rosso",
	"oceano",
	"notteblu",
	"bosco",
	"prugna",
	"carta"
];
var THEMES = [
	"original",
	"emoji",
	"lavender",
	"cybercore",
	"brutalist",
	"retro-os",
	"windows-98",
	"windows-7",
	"dark-academia",
	"glassmorphism",
	"casino",
	"calcio",
	"terminale",
	"pixel-arcade",
	"y2k",
	"primavera",
	"estate",
	"autunno",
	"inverno",
	"tramonto",
	"oro",
	"diamante",
	"sangue",
	"custom"
];
var FONTS = [
	"theme",
	"sans",
	"display",
	"mono",
	"serif"
];
var CUSTOM_THEME_COLOR_KEYS = [
	"bgDark",
	"cardDark",
	"surfaceDark",
	"fgDark",
	"mutedDark",
	"bgLight",
	"cardLight",
	"surfaceLight",
	"fgLight",
	"mutedLight",
	"primary"
];
function objectValue(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
}
function isOneOf(value, allowed) {
	return typeof value === "string" && allowed.includes(value);
}
function createPreferencesBackup(settings) {
	const file = {
		app: "VOTO",
		type: PREFERENCES_BACKUP_TYPE,
		version: 1,
		exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
		settings: {
			...settings,
			target: Math.min(10, Math.max(6, settings.target)),
			interfaceScale: Math.min(140, Math.max(80, settings.interfaceScale)),
			homeScale: normalizeHomeScale(settings.homeScale),
			homeModules: normalizeHomeModules(settings.homeModules),
			customTheme: { ...settings.customTheme },
			emojiThemeEmojis: normalizeEmojiThemeEmojis(settings.emojiThemeEmojis),
			emojiThemeBackgroundColors: normalizeEmojiThemeBackgroundColors(settings.emojiThemeBackgroundColors)
		}
	};
	return `${JSON.stringify(file, null, 2)}\n`;
}
function parsePreferencesBackup(text) {
	let parsed;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error("Il file non contiene JSON valido.");
	}
	const file = objectValue(parsed);
	if (file?.["app"] !== "VOTO" || file["type"] !== "voto-preferences" || file["version"] !== 1) throw new Error("Il file non è un backup compatibile delle preferenze VOTO.");
	const settings = objectValue(file["settings"]);
	if (!settings) throw new Error("Nel file manca la sezione delle preferenze.");
	if (settings["emojiThemeEmojis"] !== void 0 && !Array.isArray(settings["emojiThemeEmojis"])) throw new Error("L’elenco delle emoji del tema non è valido.");
	if (settings["emojiThemeBackgroundColors"] !== void 0) {
		const colors = objectValue(settings["emojiThemeBackgroundColors"]);
		if (!colors || !["scuro", "chiaro"].every((key) => typeof colors[key] === "string" && /^#[\da-f]{6}$/i.test(colors[key]))) throw new Error("I colori di sfondo del tema Emoji non sono validi.");
	}
	if (typeof settings["target"] !== "number" || !Number.isFinite(settings["target"]) || !isOneOf(settings["accent"], ACCENTS) || !isOneOf(settings["bg"], BACKGROUNDS) || !isOneOf(settings["mode"], ["chiaro", "scuro"]) || typeof settings["glass"] !== "boolean" || !isOneOf(settings["density"], ["standard", "compact"]) || typeof settings["reduceMotion"] !== "boolean" || !isOneOf(settings["theme"], THEMES) || typeof settings["interfaceScale"] !== "number" || !Number.isFinite(settings["interfaceScale"]) || typeof settings["homeScale"] !== "number" || !Number.isFinite(settings["homeScale"]) || !Array.isArray(settings["homeModules"])) throw new Error("Il file contiene una o più preferenze mancanti o non valide.");
	const customTheme = objectValue(settings["customTheme"]);
	if (!customTheme) throw new Error("Il tema personalizzato nel file non è valido.");
	for (const key of CUSTOM_THEME_COLOR_KEYS) if (typeof customTheme[key] !== "string" || !/^#[\da-f]{6}$/i.test(customTheme[key])) throw new Error("Il file contiene un colore del tema personalizzato non valido.");
	if (customTheme["backgroundImage"] !== void 0 && !isValidCustomThemeBackground(customTheme["backgroundImage"])) throw new Error("L’immagine di sfondo del tema personalizzato non è valida.");
	if (typeof customTheme["radius"] !== "number" || !Number.isFinite(customTheme["radius"]) || !isOneOf(customTheme["font"], FONTS)) throw new Error("Il raggio o il font del tema personalizzato non sono validi.");
	try {
		const homeModules = normalizeHomeModules(settings["homeModules"]);
		if (!homeModules.length || homeModules.length !== DEFAULT_HOME_MODULES.length) throw new Error("L’elenco dei moduli Home è incompleto.");
		return {
			target: Math.min(10, Math.max(6, settings["target"])),
			accent: settings["accent"],
			bg: settings["bg"],
			mode: settings["mode"],
			glass: settings["glass"],
			density: settings["density"],
			reduceMotion: settings["reduceMotion"],
			theme: settings["theme"],
			emojiThemeEmojis: normalizeEmojiThemeEmojis(settings["emojiThemeEmojis"] ?? DEFAULT_EMOJI_THEME_EMOJIS),
			emojiThemeBackgroundColors: normalizeEmojiThemeBackgroundColors(settings["emojiThemeBackgroundColors"] ?? DEFAULT_EMOJI_THEME_BACKGROUND_COLORS),
			interfaceScale: Math.round(Math.min(140, Math.max(80, settings["interfaceScale"])) / 5) * 5,
			homeScale: normalizeHomeScale(settings["homeScale"]),
			homeModules,
			customTheme: {
				bgDark: customTheme["bgDark"],
				cardDark: customTheme["cardDark"],
				surfaceDark: customTheme["surfaceDark"],
				fgDark: customTheme["fgDark"],
				mutedDark: customTheme["mutedDark"],
				bgLight: customTheme["bgLight"],
				cardLight: customTheme["cardLight"],
				surfaceLight: customTheme["surfaceLight"],
				fgLight: customTheme["fgLight"],
				mutedLight: customTheme["mutedLight"],
				primary: customTheme["primary"],
				radius: Math.min(1.5, Math.max(.5, customTheme["radius"])),
				font: customTheme["font"],
				backgroundImage: sanitizeCustomThemeBackground(customTheme["backgroundImage"])
			}
		};
	} catch (error) {
		throw new Error(error instanceof Error ? error.message : "Le impostazioni Home non sono valide.");
	}
}
//#endregion
//#region src/routes/impostazioni.tsx?tsr-split=component
var PERFORMANCE_OPTION_META = [
	{
		id: "blur",
		label: "Sfocature",
		description: "Disattiva gli effetti di sfocatura e vetro."
	},
	{
		id: "animations",
		label: "Animazioni e transizioni",
		description: "Riduce animazioni, transizioni e scorrimento morbido."
	},
	{
		id: "shadows",
		label: "Ombre",
		description: "Rimuove le ombre da schede, pulsanti e testo."
	},
	{
		id: "wallpapers",
		label: "Sfondi decorativi",
		description: "Nasconde temporaneamente gli sfondi Emoji e le immagini Custom."
	}
];
function localDateValue(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDaysToDateValue(value, days) {
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));
	return localDateValue(new Date(year, month - 1, day + days));
}
function Settings() {
	const v = useVoto();
	const auth = useSchoolAuth();
	const [githubLinked, setGithubLinked] = useState(false);
	const [linkingGithub, setLinkingGithub] = useState(false);
	const [calendarFrom, setCalendarFrom] = useState("");
	const [calendarTo, setCalendarTo] = useState("");
	const [calendarInclude, setCalendarInclude] = useState({
		assignments: true,
		interrogazioni: true,
		reminders: true
	});
	const preferencesInput = useRef(null);
	const [showMoreThemes, setShowMoreThemes] = useState(false);
	const [showMoreCompleteThemes, setShowMoreCompleteThemes] = useState(false);
	const [showMoreBackgrounds, setShowMoreBackgrounds] = useState(false);
	const [performanceDialogOpen, setPerformanceDialogOpen] = useState(false);
	const [debugOpen, setDebugOpen] = useState(false);
	const [debugJson, setDebugJson] = useState("");
	const debugTaps = useRef({
		count: 0,
		last: 0
	});
	useEffect(() => {
		let mounted = true;
		supabase.auth.getUser().then(({ data }) => {
			if (mounted) setGithubLinked(data.user?.identities?.some((identity) => identity.provider === "github") ?? false);
		});
		return () => {
			mounted = false;
		};
	}, []);
	const linkGithub = async () => {
		setLinkingGithub(true);
		try {
			const { error } = await supabase.auth.linkIdentity({
				provider: "github",
				options: { redirectTo: window.location.href }
			});
			if (error) throw error;
		} catch (error) {
			setLinkingGithub(false);
			toast.error("Collegamento GitHub non riuscito", { description: error instanceof Error ? error.message : "Riprova tra poco." });
		}
	};
	useEffect(() => {
		if (!canResetDemoData(v.source, v.url)) {
			setDebugOpen(false);
			debugTaps.current = {
				count: 0,
				last: 0
			};
		}
	}, [v.source, v.url]);
	useEffect(() => {
		const today = localDateValue(/* @__PURE__ */ new Date());
		setCalendarFrom(today);
		setCalendarTo(addDaysToDateValue(today, 90));
	}, []);
	const handleInfoTap = () => {
		if (!canResetDemoData(v.source, v.url)) return;
		const now = Date.now();
		const nextCount = now - debugTaps.current.last < 900 ? debugTaps.current.count + 1 : 1;
		debugTaps.current = {
			count: nextCount,
			last: now
		};
		if (nextCount >= 3) {
			setDebugJson(JSON.stringify(v.data, null, 2));
			setDebugOpen(true);
			debugTaps.current = {
				count: 0,
				last: 0
			};
			toast.success("Debug demo attivato");
		}
	};
	const applyDebugData = () => {
		try {
			const parsed = parseVotoData(JSON.parse(debugJson));
			v.setDemoData(parsed);
			setDebugJson(JSON.stringify(parsed, null, 2));
		} catch (error) {
			toast.error("Dati demo non validi", { description: error instanceof Error ? error.message : "Controlla i dati demo." });
		}
	};
	const status = !v.url ? "Non connesso · dati demo" : v.error ? `Errore: ${v.error}` : "Connesso";
	const calendarCategories = [
		{
			key: "assignments",
			label: "Compiti non completati"
		},
		{
			key: "interrogazioni",
			label: "Interrogazioni da fare"
		},
		{
			key: "reminders",
			label: "Promemoria DidUP"
		}
	];
	const exportCalendar = () => {
		if (!calendarFrom || !calendarTo || calendarFrom > calendarTo) {
			toast.error("Intervallo di date non valido", { description: "Controlla le date selezionate." });
			return;
		}
		if (!Object.values(calendarInclude).some(Boolean)) {
			toast.error("Seleziona almeno un tipo di evento.");
			return;
		}
		try {
			const { content, eventCount } = createCalendarIcs({
				assignments: v.data.assignments,
				interrogazioni: v.interrogazioni,
				notifications: v.data.notifications
			}, {
				from: calendarFrom,
				to: calendarTo,
				include: calendarInclude,
				isAssignmentDone: v.isDone
			});
			if (eventCount === 0) {
				toast("Nessun evento da esportare", { description: "Nel periodo scelto non ci sono eventi aperti delle categorie selezionate." });
				return;
			}
			const fileUrl = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
			const link = document.createElement("a");
			link.href = fileUrl;
			link.download = `voto-calendario-${calendarFrom}-${calendarTo}.ics`;
			document.body.append(link);
			link.click();
			link.remove();
			window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1e3);
			toast.success(`Calendario esportato: ${eventCount} eventi`);
		} catch (error) {
			toast.error("Esportazione non riuscita", { description: error instanceof Error ? error.message : "Riprova tra poco." });
		}
	};
	const pageClassName = v.registryStyle === "didup" ? "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white" : "pt-3";
	return /* @__PURE__ */ jsxs("div", {
		className: pageClassName,
		children: [
			/* @__PURE__ */ jsx("h1", {
				className: "font-display text-2xl font-semibold",
				children: "Impostazioni"
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Profilo dell’app" }),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface p-4",
				children: [
					/* @__PURE__ */ jsx("label", {
						htmlFor: "display-name",
						className: "text-xs text-muted-foreground",
						children: "Nome visualizzato"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "display-name",
						type: "text",
						value: v.displayName,
						onChange: (event) => v.setDisplayName(event.target.value),
						placeholder: v.data.student.name || "Es. Andrea Maria",
						maxLength: 80,
						className: "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-2 text-[11px] text-muted-foreground",
						children: "Viene usato solo per mostrare il tuo nome nell’app e non modifica i dati Supabase."
					})
				]
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Prestazioni" }),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface p-4",
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					role: "switch",
					"aria-checked": v.performanceMode,
					onClick: () => v.setPerformanceMode(!v.performanceMode),
					className: "flex min-h-14 w-full items-center gap-3 text-left",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
							children: /* @__PURE__ */ jsx(Gauge, {
								className: "h-5 w-5",
								"aria-hidden": "true"
							})
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ jsx("span", {
								className: "block text-sm font-semibold",
								children: "Modalità prestazioni"
							}), /* @__PURE__ */ jsx("span", {
								className: "mt-1 block text-xs text-muted-foreground",
								children: "Riduce sfocature, ombre e animazioni e nasconde temporaneamente gli sfondi decorativi per rendere l’app più fluida sui telefoni meno recenti. Su smartphone alleggerisce le anteprime PDF e aspetta che le pagine si avvicinino allo schermo prima di renderizzarle."
							})]
						}),
						/* @__PURE__ */ jsx("span", {
							"aria-hidden": "true",
							className: cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", v.performanceMode ? "bg-primary" : "bg-muted"),
							children: /* @__PURE__ */ jsx("span", { className: cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", v.performanceMode ? "translate-x-[22px]" : "translate-x-0.5") })
						})
					]
				}), /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setPerformanceDialogOpen(true),
					className: "mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl border border-border px-3 text-left transition-colors hover:bg-surface",
					"aria-haspopup": "dialog",
					children: [
						/* @__PURE__ */ jsx(SlidersHorizontal, {
							className: "h-4 w-4 shrink-0 text-primary",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "min-w-0 flex-1 text-xs font-semibold",
							children: "Personalizza effetti"
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "text-[11px] text-muted-foreground",
							children: [Object.values(v.performanceOptions).filter(Boolean).length, " di 4 selezionati"]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsx(Dialog, {
				open: performanceDialogOpen,
				onOpenChange: setPerformanceDialogOpen,
				children: /* @__PURE__ */ jsxs(DialogContent, {
					className: "w-[calc(100%-2rem)] max-h-[85dvh] overflow-y-auto rounded-2xl p-5 sm:max-w-md",
					children: [
						/* @__PURE__ */ jsxs(DialogHeader, {
							className: "pr-6 text-left",
							children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Personalizza prestazioni" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Scegli quali effetti alleggerire. Le selezioni si applicano quando Modalità prestazioni è attiva." })]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "divide-y divide-border rounded-xl border border-border px-3",
							children: PERFORMANCE_OPTION_META.map((option) => /* @__PURE__ */ jsxs("button", {
								type: "button",
								role: "switch",
								"aria-checked": v.performanceOptions[option.id],
								onClick: () => v.setPerformanceOption(option.id, !v.performanceOptions[option.id]),
								className: "flex min-h-[68px] w-full items-center gap-3 py-2 text-left",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ jsx("span", {
										className: "block text-sm font-medium",
										children: option.label
									}), /* @__PURE__ */ jsx("span", {
										className: "mt-0.5 block text-[11px] leading-snug text-muted-foreground",
										children: option.description
									})]
								}), /* @__PURE__ */ jsx("span", {
									"aria-hidden": "true",
									className: cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", v.performanceOptions[option.id] ? "bg-primary" : "bg-muted"),
									children: /* @__PURE__ */ jsx("span", { className: cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", v.performanceOptions[option.id] ? "translate-x-[22px]" : "translate-x-0.5") })
								})]
							}, option.id))
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-[11px] text-muted-foreground",
							children: "Puoi cambiare queste scelte in qualsiasi momento. I tuoi temi e sfondi non vengono eliminati."
						})
					]
				})
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Accesso ai dati privati" }),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface p-4",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted-foreground",
						children: "Account autorizzato"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 break-all text-sm font-medium",
						children: auth.email || "Account Supabase"
					}),
					/* @__PURE__ */ jsx("p", {
						className: cn("mt-3 text-xs", v.url && !v.error ? "text-success" : v.error ? "text-danger" : "text-muted-foreground"),
						children: status
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "text-[11px] text-muted-foreground",
						children: ["Ultima sincronizzazione: ", fmtTime(v.lastSync)]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-4 rounded-xl border border-border p-3",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ jsx(Github, { className: "mt-0.5 h-4 w-4 shrink-0" }), /* @__PURE__ */ jsxs("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ jsx("p", {
									className: "text-xs font-semibold",
									children: "Accesso GitHub per il widget"
								}), /* @__PURE__ */ jsx("p", {
									className: "mt-1 text-[11px] text-muted-foreground",
									children: githubLinked ? "GitHub è collegato a questo account Supabase. Il widget può usare Accedi con GitHub." : "Collega GitHub a questo account già autorizzato, senza creare un secondo account."
								})]
							})]
						}), !githubLinked && /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => void linkGithub(),
							disabled: linkingGithub,
							className: "press mt-3 h-10 w-full rounded-xl bg-foreground px-3 text-sm font-medium text-background disabled:opacity-60",
							children: linkingGithub ? "Apertura di GitHub…" : "Collega account GitHub"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-4 flex gap-2 rounded-xl bg-surface p-3 text-[11px] text-muted-foreground",
						children: [/* @__PURE__ */ jsx(ShieldAlert, { className: "h-4 w-4 shrink-0 text-warning" }), "I dati sono letti da uno storage privato e l’Edge Function li consegna solo all’account autorizzato. La sessione resta sul dispositivo; non inserire credenziali DidUP nell’app."]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => void auth.signOut(),
						className: "press mt-4 h-11 w-full rounded-xl border border-border text-sm font-medium",
						children: "Esci dall’account"
					})
				]
			}),
			/* @__PURE__ */ jsx(AppPinLockSettings, {}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Dati" }),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface mb-3 space-y-4 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ jsx("span", {
							className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
							children: /* @__PURE__ */ jsx(Save, { className: "h-5 w-5" })
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
							className: "text-sm font-semibold",
							children: "Backup personalizzazione"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Salva o ripristina temi, font, colori, dimensioni, impostazioni Home e obiettivo media. Il file non contiene voti, dati scolastici o l’URL di connessione."
						})] })]
					}),
					/* @__PURE__ */ jsx("input", {
						ref: preferencesInput,
						type: "file",
						accept: ".json,application/json",
						className: "hidden",
						"aria-label": "Seleziona backup delle preferenze VOTO",
						onChange: async (event) => {
							const file = event.currentTarget.files?.[0];
							event.currentTarget.value = "";
							if (!file) return;
							try {
								const backup = parsePreferencesBackup(await file.text());
								v.setTarget(backup.target);
								v.setAccent(backup.accent);
								v.setBg(backup.bg);
								v.setMode(backup.mode);
								v.setGlass(backup.glass);
								v.setDensity(backup.density);
								v.setReduceMotion(backup.reduceMotion);
								v.setTheme(backup.theme);
								v.setCustomTheme(backup.customTheme);
								v.setEmojiThemeEmojis(backup.emojiThemeEmojis);
								v.setEmojiThemeBackgroundColor("scuro", backup.emojiThemeBackgroundColors.scuro);
								v.setEmojiThemeBackgroundColor("chiaro", backup.emojiThemeBackgroundColors.chiaro);
								v.setInterfaceScale(backup.interfaceScale);
								v.setHomeCustomization({
									homeModules: backup.homeModules,
									homeScale: backup.homeScale
								});
								toast.success("Personalizzazione ripristinata");
							} catch (error) {
								toast.error("Importazione non riuscita", { description: error instanceof Error ? error.message : "Controlla il file JSON selezionato." });
							}
						}
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								const contents = createPreferencesBackup({
									target: v.target,
									accent: v.accent,
									bg: v.bg,
									mode: v.mode,
									glass: v.glass,
									density: v.density,
									reduceMotion: v.reduceMotion,
									theme: v.theme,
									customTheme: v.customTheme,
									emojiThemeEmojis: v.emojiThemeEmojis,
									emojiThemeBackgroundColors: v.emojiThemeBackgroundColors,
									interfaceScale: v.interfaceScale,
									homeModules: v.homeModules,
									homeScale: v.homeScale
								});
								const url = URL.createObjectURL(new Blob([contents], { type: "application/json;charset=utf-8" }));
								const anchor = document.createElement("a");
								anchor.href = url;
								anchor.download = "voto-backup-personalizzazione.json";
								anchor.click();
								window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
								toast.success("Backup preferenze esportato");
							},
							className: "press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold",
							children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), " Esporta backup"]
						}), /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => preferencesInput.current?.click(),
							className: "press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground",
							children: [/* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }), " Importa backup"]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-4 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ jsx("span", {
							className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
							children: /* @__PURE__ */ jsx(CalendarDays, { className: "h-5 w-5" })
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
							className: "text-sm font-semibold",
							children: "Esporta calendario"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Scarica un file .ics importabile nel calendario del telefono. L’esportazione non si aggiorna automaticamente."
						})] })]
					}),
					/* @__PURE__ */ jsxs("fieldset", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx("legend", {
							className: "text-xs font-medium text-muted-foreground",
							children: "Eventi da includere"
						}), calendarCategories.map(({ key, label }) => /* @__PURE__ */ jsxs("label", {
							className: "flex min-h-10 items-center gap-3 rounded-xl bg-surface px-3 text-sm",
							children: [/* @__PURE__ */ jsx("input", {
								type: "checkbox",
								checked: calendarInclude[key],
								onChange: (event) => setCalendarInclude((current) => ({
									...current,
									[key]: event.target.checked
								})),
								className: "h-4 w-4 accent-primary"
							}), label]
						}, key))]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ jsxs("label", {
							className: "space-y-1 text-xs text-muted-foreground",
							children: ["Dal", /* @__PURE__ */ jsx("input", {
								type: "date",
								value: calendarFrom,
								onChange: (event) => setCalendarFrom(event.target.value),
								className: "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
							})]
						}), /* @__PURE__ */ jsxs("label", {
							className: "space-y-1 text-xs text-muted-foreground",
							children: ["Al", /* @__PURE__ */ jsx("input", {
								type: "date",
								value: calendarTo,
								min: calendarFrom || void 0,
								onChange: (event) => setCalendarTo(event.target.value),
								className: "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
							})]
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-[11px] text-muted-foreground",
						children: "Intervallo predefinito: da oggi ai prossimi 90 giorni. Gli eventi senza orario vengono esportati come giornate intere."
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: exportCalendar,
						disabled: !calendarFrom || !calendarTo,
						className: "press flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50",
						children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), " Esporta file .ics"]
					})
				]
			}),
			canResetDemoData(v.source, v.url) && /* @__PURE__ */ jsx("div", {
				className: "mt-3",
				children: /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: v.resetDemo,
					className: "press card-surface flex w-full items-center gap-3 p-4 text-left text-sm",
					children: [/* @__PURE__ */ jsx(RotateCcw, { className: "h-4 w-4 text-primary" }), " Ripristina dati demo"]
				})
			}),
			/* @__PURE__ */ jsx(SectionTitle, { children: "Info app" }),
			/* @__PURE__ */ jsx("section", {
				onClick: handleInfoTap,
				className: "card-surface cursor-pointer p-4 text-xs text-muted-foreground",
				children: /* @__PURE__ */ jsxs("p", { children: [/* @__PURE__ */ jsx("span", {
					className: "font-display font-semibold text-foreground",
					children: "VOTO."
				}), " versione 3.0.0 · made by Andrew Smecca"] })
			}),
			debugOpen && canResetDemoData(v.source, v.url) && /* @__PURE__ */ jsxs("section", {
				className: "card-surface mt-3 border-warning/40 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start gap-3",
						children: [/* @__PURE__ */ jsx("span", {
							className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning",
							children: /* @__PURE__ */ jsx(Bug, { className: "h-4 w-4" })
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
							className: "text-sm font-semibold",
							children: "Debug dati demo"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-[11px] text-muted-foreground",
							children: "Modifica, aggiungi o rimuovi direttamente i dati demo di voti, compiti, diario, bacheca, notifiche, materie e presenze. Questi dati restano solo su questo dispositivo e non modificano Supabase o DidUP."
						})] })]
					}),
					/* @__PURE__ */ jsx("textarea", {
						value: debugJson,
						onChange: (event) => setDebugJson(event.target.value),
						spellCheck: false,
						className: "mt-3 min-h-[360px] w-full rounded-xl border border-input bg-background p-3 font-mono text-[10px] leading-relaxed text-foreground outline-none focus:border-primary",
						"aria-label": "Dati demo"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-3 flex gap-2",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: applyDebugData,
							className: "press flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground",
							children: [/* @__PURE__ */ jsx(Save, { className: "h-3.5 w-3.5" }), " Applica dati demo"]
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setDebugOpen(false),
							className: "press h-10 rounded-xl border border-border px-3 text-xs font-semibold",
							children: "Chiudi"
						})]
					})
				]
			})
		]
	});
}
//#endregion
export { Settings as component };
