import { t as cn } from "./utils-C_uf36nf.js";
import { a as extractCircularPdfText, c as renderCircularPdfPageImages, i as extractCircularDocxText } from "./circular-reader-Bi5AGq_T.js";
import { l as DEFAULT_PREPARATION, n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { n as load, r as save, t as KEYS } from "./storage-D7ptFFhi.js";
import { n as fmtDate } from "./dates-CdBXaUB1.js";
import { i as fmt, t as arithmeticMean } from "./calc-DWBiEBUY.js";
import { t as Button } from "./button-PJVP9td7.js";
import { t as PeriodPicker } from "./PeriodPicker-ALqNKIz5.js";
import { t as SimulatorTool } from "./SimulatorTool-OTmfs9vu.js";
import { n as useStudy } from "./study-context-BQIH1Rbo.js";
import { a as loadSchoolClosures, c as schoolDaysUntilSchoolEnd, d as calculateAbsencePlan, i as loadExcludeWeekends, l as loadAbsenceHoursPerDay, n as loadSchoolEndDate, o as saveExcludeWeekends, r as saveSchoolEndDate, s as saveSchoolClosures, t as clearSchoolEndDate, u as saveAbsenceHoursPerDay } from "./school-end-date-cQiQhVfB.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, ArrowRight, Calculator, CalendarClock, CalendarDays, CalendarX2, Camera, Check, ChevronDown, CircleDot, Clipboard, Clock3, Copy, Download, FileText, FlipHorizontal2, History, ImagePlus, Layers, ListChecks, LoaderCircle, Minus, Pencil, Percent, Plus, Printer, QrCode, RotateCcw, Ruler, Scale, Search, Share2, Shuffle, Sparkles, Table2, Trash2, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";
//#region src/lib/voto/universal-calculator.ts
var UNIT_FACTORS = {
	length: {
		m: 1,
		km: 1e3,
		cm: .01,
		mm: .001,
		mi: 1609.344,
		ft: .3048,
		in: .0254
	},
	mass: {
		kg: 1,
		g: .001,
		mg: 1e-6,
		lb: .45359237,
		oz: .028349523125
	},
	volume: {
		l: 1,
		ml: .001,
		m3: 1e3,
		gal: 3.785411784
	},
	area: {
		"m²": 1,
		"km²": 1e6,
		"cm²": 1e-4,
		ha: 1e4,
		acre: 4046.8564224
	},
	speed: {
		"m/s": 1,
		"km/h": 1 / 3.6,
		mph: .44704,
		knot: .514444444444
	}
};
function convertMeasurement(value, category, from, to, currencyRate) {
	if (!Number.isFinite(value)) throw new Error("Inserisci un valore valido.");
	if (category === "currency") {
		if (from === to) return value;
		if (currencyRate === void 0 || !Number.isFinite(currencyRate) || currencyRate <= 0) throw new Error("Inserisci un tasso di cambio positivo e aggiornato.");
		return value * currencyRate;
	}
	if (category === "temperature") {
		const toCelsius = (input, unit) => {
			if (unit === "°C") return input;
			if (unit === "°F") return (input - 32) * 5 / 9;
			if (unit === "K") return input - 273.15;
			throw new Error("Unità di temperatura non supportata.");
		};
		const celsius = toCelsius(value, from);
		if (to === "°C") return celsius;
		if (to === "°F") return celsius * 9 / 5 + 32;
		if (to === "K") return celsius + 273.15;
		throw new Error("Unità di temperatura non supportata.");
	}
	const factors = UNIT_FACTORS[category];
	const fromFactor = factors[from];
	const toFactor = factors[to];
	if (!fromFactor || !toFactor) throw new Error("Conversione non supportata.");
	return value * fromFactor / toFactor;
}
function assertFinite(value) {
	if (!Number.isFinite(value) || Math.abs(value) > 1e100) throw new Error("Il risultato non è un numero finito utilizzabile.");
	return value;
}
function evaluateScientificExpression(expression) {
	const source = expression.toLocaleLowerCase("en-US").trim();
	if (!source || source.length > 160) throw new Error("Scrivi un’espressione (massimo 160 caratteri).");
	const tokens = source.match(/\s*(?:\d+(?:[.,]\d+)?(?:e[+-]?\d+)?|[a-z]+|[()+\-*/^%])/gy) ?? [];
	if (tokens.join("").replace(/\s/g, "") !== source.replace(/\s/g, "")) throw new Error("L’espressione contiene caratteri non supportati.");
	const compact = tokens.map((token) => token.trim()).filter(Boolean);
	let position = 0;
	const peek = () => compact[position];
	const take = () => compact[position++];
	const unaryFunctions = {
		abs: Math.abs,
		sqrt: Math.sqrt,
		ln: Math.log,
		log: Math.log10,
		sin: (value) => Math.sin(value * Math.PI / 180),
		cos: (value) => Math.cos(value * Math.PI / 180),
		tan: (value) => Math.tan(value * Math.PI / 180)
	};
	function parseExpression() {
		let value = parseTerm();
		while (peek() === "+" || peek() === "-") {
			const operator = take();
			const right = parseTerm();
			value = assertFinite(operator === "+" ? value + right : value - right);
		}
		return value;
	}
	function parseTerm() {
		let value = parseUnary();
		while (peek() === "*" || peek() === "/") {
			const operator = take();
			const right = parseUnary();
			if (operator === "/" && right === 0) throw new Error("Non si può dividere per zero.");
			value = assertFinite(operator === "*" ? value * right : value / right);
		}
		return value;
	}
	function parseUnary() {
		if (peek() === "+") {
			take();
			return parseUnary();
		}
		if (peek() === "-") {
			take();
			return assertFinite(-parseUnary());
		}
		return parsePower();
	}
	function parsePower() {
		const value = parsePostfix();
		if (peek() !== "^") return value;
		take();
		return assertFinite(value ** parseUnary());
	}
	function parsePostfix() {
		let value = parsePrimary();
		while (peek() === "%") {
			take();
			value = assertFinite(value / 100);
		}
		return value;
	}
	function parsePrimary() {
		const token = take();
		if (!token) throw new Error("Espressione incompleta.");
		if (token === "(") {
			const value = parseExpression();
			if (take() !== ")") throw new Error("Manca una parentesi di chiusura.");
			return value;
		}
		if (/^\d/.test(token)) {
			const value = Number(token.replace(",", "."));
			if (!Number.isFinite(value)) throw new Error("Numero non valido.");
			return value;
		}
		if (token === "pi") return Math.PI;
		if (token === "e") return Math.E;
		const fn = unaryFunctions[token];
		if (!fn) throw new Error(`Funzione “${token}” non supportata.`);
		if (take() !== "(") throw new Error(`Scrivi l’argomento di ${token} tra parentesi.`);
		const argument = parseExpression();
		if (take() !== ")") throw new Error("Manca una parentesi di chiusura.");
		const result = fn(argument);
		if (!Number.isFinite(result)) throw new Error("L’operazione non è definita per questo valore.");
		return assertFinite(result);
	}
	const result = parseExpression();
	if (position !== compact.length) throw new Error(`Elemento inatteso: ${peek() ?? ""}.`);
	return assertFinite(result);
}
function calculateTimeInterval(start, end, breakMinutes = 0) {
	const parse = (value) => {
		const match = /^(\d{1,2}):(\d{2})$/.exec(value);
		if (!match) return null;
		const hours = Number(match[1]);
		const minutes = Number(match[2]);
		if (hours > 23 || minutes > 59) return null;
		return hours * 60 + minutes;
	};
	const from = parse(start);
	const to = parse(end);
	if (from === null || to === null) throw new Error("Inserisci due orari validi.");
	if (!Number.isFinite(breakMinutes) || breakMinutes < 0) throw new Error("La pausa non può essere negativa.");
	const elapsed = (to >= from ? to - from : to + 1440 - from) - breakMinutes;
	if (elapsed < 0) throw new Error("La pausa è più lunga dell’intervallo.");
	return elapsed;
}
function gcd(left, right) {
	let a = Math.abs(left);
	let b = Math.abs(right);
	while (b !== 0) [a, b] = [b, a % b];
	return a || 1;
}
function calculateFraction(leftNumerator, leftDenominator, rightNumerator, rightDenominator, operator) {
	if (![
		leftNumerator,
		leftDenominator,
		rightNumerator,
		rightDenominator
	].every(Number.isSafeInteger)) throw new Error("Usa numeri interi sicuri per le frazioni.");
	if (leftDenominator === 0 || rightDenominator === 0) throw new Error("Il denominatore non può essere zero.");
	let numerator;
	let denominator;
	if (operator === "+" || operator === "−") {
		const sign = operator === "+" ? 1 : -1;
		numerator = leftNumerator * rightDenominator + sign * rightNumerator * leftDenominator;
		denominator = leftDenominator * rightDenominator;
	} else if (operator === "×") {
		numerator = leftNumerator * rightNumerator;
		denominator = leftDenominator * rightDenominator;
	} else {
		if (rightNumerator === 0) throw new Error("Non si può dividere per una frazione uguale a zero.");
		numerator = leftNumerator * rightDenominator;
		denominator = leftDenominator * rightNumerator;
	}
	if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) throw new Error("Il risultato è troppo grande per essere rappresentato in sicurezza.");
	if (denominator < 0) {
		numerator = -numerator;
		denominator = -denominator;
	}
	const divisor = gcd(numerator, denominator);
	const reducedNumerator = numerator / divisor;
	return {
		numerator: reducedNumerator === 0 ? 0 : reducedNumerator,
		denominator: denominator / divisor
	};
}
function calculateVat(taxableAmount, rate) {
	if (!Number.isFinite(taxableAmount) || taxableAmount < 0) throw new Error("L’imponibile deve essere un numero positivo o zero.");
	if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error("La percentuale IVA deve essere tra 0 e 100.");
	const tax = taxableAmount * rate / 100;
	return {
		tax,
		total: taxableAmount + tax
	};
}
function calculateDiscount(price, percent) {
	if (!Number.isFinite(price) || price < 0) throw new Error("Il prezzo deve essere un numero positivo o zero.");
	if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error("Lo sconto deve essere tra 0 e 100%.");
	const savings = price * percent / 100;
	return {
		savings,
		finalPrice: price - savings
	};
}
function escapeCsv(value) {
	return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, "\"\"")}"` : value;
}
function createCsv(headers, rows) {
	if (headers.length === 0) throw new Error("Aggiungi almeno una colonna.");
	return [headers, ...rows.map((row) => headers.map((_, index) => row[index] ?? ""))].map((row) => row.map(escapeCsv).join(";")).join("\r\n");
}
function formatCalculationNumber(value, maxFractionDigits = 4) {
	if (!Number.isFinite(value)) return "—";
	return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFractionDigits }).format(value);
}
//#endregion
//#region src/components/voto/UniversalCalculationPanel.tsx
var UNIT_OPTIONS = {
	length: [
		{
			value: "m",
			label: "metri (m)"
		},
		{
			value: "km",
			label: "chilometri (km)"
		},
		{
			value: "cm",
			label: "centimetri (cm)"
		},
		{
			value: "mm",
			label: "millimetri (mm)"
		},
		{
			value: "mi",
			label: "miglia (mi)"
		},
		{
			value: "ft",
			label: "piedi (ft)"
		},
		{
			value: "in",
			label: "pollici (in)"
		}
	],
	mass: [
		{
			value: "kg",
			label: "chilogrammi (kg)"
		},
		{
			value: "g",
			label: "grammi (g)"
		},
		{
			value: "mg",
			label: "milligrammi (mg)"
		},
		{
			value: "lb",
			label: "libbre (lb)"
		},
		{
			value: "oz",
			label: "once (oz)"
		}
	],
	volume: [
		{
			value: "l",
			label: "litri (L)"
		},
		{
			value: "ml",
			label: "millilitri (mL)"
		},
		{
			value: "m3",
			label: "metri cubi (m³)"
		},
		{
			value: "gal",
			label: "galloni USA (gal)"
		}
	],
	area: [
		{
			value: "m²",
			label: "metri quadrati (m²)"
		},
		{
			value: "km²",
			label: "chilometri quadrati (km²)"
		},
		{
			value: "cm²",
			label: "centimetri quadrati (cm²)"
		},
		{
			value: "ha",
			label: "ettari (ha)"
		},
		{
			value: "acre",
			label: "acri"
		}
	],
	speed: [
		{
			value: "m/s",
			label: "metri al secondo (m/s)"
		},
		{
			value: "km/h",
			label: "chilometri orari (km/h)"
		},
		{
			value: "mph",
			label: "miglia orarie (mph)"
		},
		{
			value: "knot",
			label: "nodi"
		}
	],
	temperature: [
		{
			value: "°C",
			label: "Celsius (°C)"
		},
		{
			value: "°F",
			label: "Fahrenheit (°F)"
		},
		{
			value: "K",
			label: "Kelvin (K)"
		}
	],
	currency: [
		{
			value: "EUR",
			label: "Euro (EUR)"
		},
		{
			value: "USD",
			label: "Dollaro USA (USD)"
		},
		{
			value: "GBP",
			label: "Sterlina (GBP)"
		},
		{
			value: "CHF",
			label: "Franco svizzero (CHF)"
		},
		{
			value: "JPY",
			label: "Yen (JPY)"
		},
		{
			value: "CAD",
			label: "Dollaro canadese (CAD)"
		}
	]
};
var CATEGORIES$1 = [
	{
		value: "length",
		label: "Lunghezza"
	},
	{
		value: "mass",
		label: "Peso / massa"
	},
	{
		value: "volume",
		label: "Volume"
	},
	{
		value: "area",
		label: "Superficie"
	},
	{
		value: "speed",
		label: "Velocità"
	},
	{
		value: "temperature",
		label: "Temperatura"
	},
	{
		value: "currency",
		label: "Valute"
	}
];
var TOOL_INFO$1 = {
	scientific: {
		title: "Calcolatrice scientifica",
		description: "Scrivi un’espressione con parentesi, potenze e funzioni. Sin, cos e tan usano gradi.",
		icon: Calculator
	},
	converter: {
		title: "Convertitore universale",
		description: "Conversioni di unità e temperature. Per le valute inserisci tu un tasso aggiornato.",
		icon: Ruler
	},
	interval: {
		title: "Calcolo intervalli",
		description: "Calcola una durata tra due orari; se l’orario finale è precedente, si considera il giorno successivo.",
		icon: Clock3
	},
	fractions: {
		title: "Calcolatore frazioni",
		description: "Somma, sottrai, moltiplica o dividi frazioni e riduci il risultato ai minimi termini.",
		icon: Scale
	},
	vat: {
		title: "Calcolatore IVA",
		description: "Inserisci l’imponibile e l’aliquota per ricavare l’imposta e il totale.",
		icon: Percent
	},
	discount: {
		title: "Calcolatore sconti",
		description: "Calcola il risparmio e il prezzo finale dopo lo sconto percentuale.",
		icon: Percent
	}
};
function parseInput(value, label) {
	const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
	const parsed = Number(normalized);
	if (!normalized || !Number.isFinite(parsed)) throw new Error(`Inserisci ${label} come numero valido.`);
	return parsed;
}
function Field({ label, value, onChange, type = "text", inputMode = "decimal", placeholder, min, max, step }) {
	return /* @__PURE__ */ jsxs("label", {
		className: "block space-y-1 text-xs font-semibold",
		children: [label, /* @__PURE__ */ jsx("input", {
			"aria-label": label,
			type,
			inputMode,
			value,
			min,
			max,
			step,
			placeholder,
			onChange: (event) => onChange(event.target.value),
			className: "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		})]
	});
}
function SelectField({ label, value, onChange, options }) {
	return /* @__PURE__ */ jsxs("label", {
		className: "block space-y-1 text-xs font-semibold",
		children: [label, /* @__PURE__ */ jsx("select", {
			"aria-label": label,
			value,
			onChange: (event) => onChange(event.target.value),
			className: "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
			children: options.map((option) => /* @__PURE__ */ jsx("option", {
				value: option.value,
				children: option.label
			}, option.value))
		})]
	});
}
function UniversalCalculationPanel({ tool, onCalculation }) {
	const [values, setValues] = useState({
		expression: "",
		category: "length",
		amount: "1",
		from: "m",
		to: "km",
		rate: "",
		start: "09:00",
		end: "10:00",
		pause: "0",
		numeratorA: "1",
		denominatorA: "2",
		numeratorB: "1",
		denominatorB: "3",
		operator: "+",
		taxable: "",
		percent: "22",
		price: "",
		discount: ""
	});
	const [result, setResult] = useState(null);
	const [error, setError] = useState("");
	const metadata = TOOL_INFO$1[tool];
	const Icon = metadata.icon;
	function update(field, value) {
		setValues((current) => ({
			...current,
			[field]: value
		}));
		setError("");
	}
	function calculate() {
		try {
			let calculation = "";
			let display = "";
			switch (tool) {
				case "scientific": {
					const expression = values.expression ?? "";
					const number = evaluateScientificExpression(expression);
					calculation = expression;
					display = formatCalculationNumber(number, 8);
					break;
				}
				case "converter": {
					const category = values.category ?? "length";
					const from = values.from ?? "m";
					const to = values.to ?? "km";
					const amount = parseInput(values.amount ?? "", "un valore");
					const converted = convertMeasurement(amount, category, from, to, category === "currency" ? parseInput(values.rate ?? "", "il tasso di cambio") : void 0);
					const fromLabel = UNIT_OPTIONS[category].find((unit) => unit.value === from)?.label ?? from;
					const toLabel = UNIT_OPTIONS[category].find((unit) => unit.value === to)?.label ?? to;
					calculation = `${formatCalculationNumber(amount, 8)} ${fromLabel} → ${toLabel}${category === "currency" ? ` (tasso inserito: ${values.rate})` : ""}`;
					display = `${formatCalculationNumber(converted, 8)} ${to}`;
					break;
				}
				case "interval": {
					const pause = parseInput(values.pause || "0", "la pausa");
					const minutes = calculateTimeInterval(values.start ?? "", values.end ?? "", pause);
					const hoursPart = Math.floor(minutes / 60);
					const minutesPart = minutes % 60;
					calculation = `${values.start}–${values.end}${pause ? `, pausa ${pause} min` : ""}`;
					display = `${hoursPart} h ${String(minutesPart).padStart(2, "0")} min`;
					break;
				}
				case "fractions": {
					const left = parseInput(values.numeratorA ?? "", "il numeratore della prima frazione");
					const leftDenominator = parseInput(values.denominatorA ?? "", "il denominatore della prima frazione");
					const right = parseInput(values.numeratorB ?? "", "il numeratore della seconda frazione");
					const rightDenominator = parseInput(values.denominatorB ?? "", "il denominatore della seconda frazione");
					const operator = values.operator ?? "+";
					const fraction = calculateFraction(left, leftDenominator, right, rightDenominator, operator);
					calculation = `${left}/${leftDenominator} ${operator} ${right}/${rightDenominator}`;
					display = fraction.denominator === 1 ? `${fraction.numerator}` : `${fraction.numerator}/${fraction.denominator}`;
					break;
				}
				case "vat": {
					const taxable = parseInput(values.taxable ?? "", "l’imponibile");
					const rate = parseInput(values.percent ?? "", "l’aliquota");
					const output = calculateVat(taxable, rate);
					calculation = `Imponibile ${formatCalculationNumber(taxable, 2)} € + IVA ${formatCalculationNumber(rate, 2)}%`;
					display = `IVA ${formatCalculationNumber(output.tax, 2)} € · Totale ${formatCalculationNumber(output.total, 2)} €`;
					break;
				}
				case "discount": {
					const price = parseInput(values.price ?? "", "il prezzo");
					const discount = parseInput(values.discount ?? "", "la percentuale di sconto");
					const output = calculateDiscount(price, discount);
					calculation = `Prezzo ${formatCalculationNumber(price, 2)} € − sconto ${formatCalculationNumber(discount, 2)}%`;
					display = `Risparmi ${formatCalculationNumber(output.savings, 2)} € · Paghi ${formatCalculationNumber(output.finalPrice, 2)} €`;
					break;
				}
			}
			setError("");
			setResult(display);
			onCalculation(tool, calculation, display);
		} catch (caught) {
			setResult(null);
			setError(caught instanceof Error ? caught.message : "Controlla i valori inseriti e riprova.");
		}
	}
	const conversionCategory = values.category ?? "length";
	const units = UNIT_OPTIONS[conversionCategory];
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ jsxs("section", {
			className: "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/60 via-card to-card p-4",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground",
					children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5" })
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-3 font-display text-xl font-semibold",
					children: metadata.title
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs leading-5 text-muted-foreground",
					children: metadata.description
				})
			]
		}), /* @__PURE__ */ jsxs("section", {
			className: "card-surface space-y-3 p-4",
			"aria-label": metadata.title,
			children: [
				tool === "scientific" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("label", {
					className: "block space-y-1 text-xs font-semibold",
					children: ["Espressione", /* @__PURE__ */ jsx("input", {
						"aria-label": "Espressione",
						value: values.expression,
						onChange: (event) => update("expression", event.target.value),
						placeholder: "Es. sqrt(81) + 2^3",
						onKeyDown: (event) => {
							if (event.key === "Enter") calculate();
						},
						className: "h-12 w-full rounded-lg border border-input bg-card px-3 font-mono text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					})]
				}), /* @__PURE__ */ jsx("p", {
					className: "text-[11px] leading-4 text-muted-foreground",
					children: "Operatori: + − × / ^ % · Funzioni: sqrt, sin, cos, tan, log, ln, abs · Costanti: pi, e."
				})] }),
				tool === "converter" && /* @__PURE__ */ jsxs(Fragment, { children: [
					/* @__PURE__ */ jsx(SelectField, {
						label: "Categoria",
						value: conversionCategory,
						onChange: (value) => {
							const next = value;
							update("category", next);
							setValues((current) => ({
								...current,
								category: next,
								from: UNIT_OPTIONS[next][0].value,
								to: UNIT_OPTIONS[next][1]?.value ?? UNIT_OPTIONS[next][0].value
							}));
						},
						options: CATEGORIES$1
					}),
					/* @__PURE__ */ jsx(Field, {
						label: "Valore",
						value: values.amount ?? "",
						onChange: (value) => update("amount", value)
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ jsx(SelectField, {
							label: "Da",
							value: values.from ?? units[0].value,
							onChange: (value) => update("from", value),
							options: units
						}), /* @__PURE__ */ jsx(SelectField, {
							label: "A",
							value: values.to ?? units[1]?.value ?? units[0].value,
							onChange: (value) => update("to", value),
							options: units
						})]
					}),
					conversionCategory === "currency" && /* @__PURE__ */ jsxs("div", {
						className: "space-y-1 rounded-lg bg-surface p-3",
						children: [/* @__PURE__ */ jsx(Field, {
							label: `Tasso: 1 ${values.from} = ? ${values.to}`,
							value: values.rate ?? "",
							onChange: (value) => update("rate", value),
							placeholder: "Inserisci il tasso di oggi"
						}), /* @__PURE__ */ jsx("p", {
							className: "text-[10px] leading-4 text-muted-foreground",
							children: "Nessun cambio automatico: il tasso dipende dalla fonte e dalla data. Inseriscine uno aggiornato."
						})]
					})
				] }),
				tool === "interval" && /* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-3",
					children: [
						/* @__PURE__ */ jsx(Field, {
							label: "Dalle",
							type: "time",
							inputMode: "text",
							value: values.start ?? "09:00",
							onChange: (value) => update("start", value)
						}),
						/* @__PURE__ */ jsx(Field, {
							label: "Alle",
							type: "time",
							inputMode: "text",
							value: values.end ?? "10:00",
							onChange: (value) => update("end", value)
						}),
						/* @__PURE__ */ jsx("div", {
							className: "col-span-2",
							children: /* @__PURE__ */ jsx(Field, {
								label: "Pausa da sottrarre (minuti)",
								value: values.pause ?? "0",
								onChange: (value) => update("pause", value)
							})
						})
					]
				}),
				tool === "fractions" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-[1fr_auto_1fr] items-end gap-2",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ jsx(Field, {
								label: "Numeratore A",
								value: values.numeratorA ?? "1",
								onChange: (value) => update("numeratorA", value),
								inputMode: "numeric"
							}), /* @__PURE__ */ jsx(Field, {
								label: "Denominatore A",
								value: values.denominatorA ?? "2",
								onChange: (value) => update("denominatorA", value),
								inputMode: "numeric"
							})]
						}),
						/* @__PURE__ */ jsx(SelectField, {
							label: "Operazione",
							value: values.operator ?? "+",
							onChange: (value) => update("operator", value),
							options: [
								{
									value: "+",
									label: "+"
								},
								{
									value: "−",
									label: "−"
								},
								{
									value: "×",
									label: "×"
								},
								{
									value: "÷",
									label: "÷"
								}
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ jsx(Field, {
								label: "Numeratore B",
								value: values.numeratorB ?? "1",
								onChange: (value) => update("numeratorB", value),
								inputMode: "numeric"
							}), /* @__PURE__ */ jsx(Field, {
								label: "Denominatore B",
								value: values.denominatorB ?? "3",
								onChange: (value) => update("denominatorB", value),
								inputMode: "numeric"
							})]
						})
					]
				}), /* @__PURE__ */ jsx("p", {
					className: "text-[11px] text-muted-foreground",
					children: "Il risultato viene semplificato automaticamente."
				})] }),
				tool === "vat" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Field, {
					label: "Imponibile (€)",
					value: values.taxable ?? "",
					onChange: (value) => update("taxable", value)
				}), /* @__PURE__ */ jsx(Field, {
					label: "Aliquota IVA (%)",
					value: values.percent ?? "22",
					onChange: (value) => update("percent", value)
				})] }),
				tool === "discount" && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Field, {
					label: "Prezzo iniziale (€)",
					value: values.price ?? "",
					onChange: (value) => update("price", value)
				}), /* @__PURE__ */ jsx(Field, {
					label: "Sconto (%)",
					value: values.discount ?? "",
					onChange: (value) => update("discount", value)
				})] }),
				error && /* @__PURE__ */ jsx("p", {
					role: "alert",
					className: "rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger",
					children: error
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: calculate,
					className: "press min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground",
					children: "Calcola"
				}),
				result !== null && /* @__PURE__ */ jsxs("div", {
					"aria-live": "polite",
					className: "rounded-xl border border-primary/20 bg-primary-soft/50 p-4",
					children: [/* @__PURE__ */ jsx("p", {
						className: "text-[10px] font-semibold uppercase tracking-wide text-primary",
						children: "Risultato"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 break-words text-lg font-semibold tabular",
						children: result
					})]
				})
			]
		})]
	});
}
//#endregion
//#region src/components/voto/AbsenceCalculator.tsx
function numericInput(value) {
	const parsed = Number(value.trim().replace(",", "."));
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
var numberLabel = (value) => fmt(Math.round(value * 100) / 100, 2);
function AbsenceCalculator() {
	const { attendance } = useVoto().data;
	const [currentDaysInput, setCurrentDaysInput] = useState(String(attendance.absenceDays));
	const [currentHoursInput, setCurrentHoursInput] = useState(String(attendance.absenceHours));
	const [absenceLimitInput, setAbsenceLimitInput] = useState(String(attendance.absenceLimitHours));
	const [annualHoursInput, setAnnualHoursInput] = useState(String(attendance.annualHours));
	const [simulatedDaysInput, setSimulatedDaysInput] = useState("");
	const [simulatedHoursInput, setSimulatedHoursInput] = useState("");
	const [hoursPerDayInput, setHoursPerDayInput] = useState("6");
	const [editCurrentData, setEditCurrentData] = useState(false);
	const [editDayLength, setEditDayLength] = useState(false);
	useEffect(() => {
		setHoursPerDayInput(String(loadAbsenceHoursPerDay()));
	}, []);
	useEffect(() => {
		setCurrentDaysInput(String(attendance.absenceDays));
		setCurrentHoursInput(String(attendance.absenceHours));
		setAbsenceLimitInput(String(attendance.absenceLimitHours));
		setAnnualHoursInput(String(attendance.annualHours));
	}, [
		attendance.absenceDays,
		attendance.absenceHours,
		attendance.absenceLimitHours,
		attendance.annualHours
	]);
	const updateHoursPerDay = (value) => {
		setHoursPerDayInput(value);
		const parsed = numericInput(value);
		if (parsed > 0) saveAbsenceHoursPerDay(parsed);
	};
	const currentDays = numericInput(currentDaysInput);
	const simulatedDays = numericInput(simulatedDaysInput);
	const simulatedManualHours = numericInput(simulatedHoursInput);
	const hoursPerDay = numericInput(hoursPerDayInput);
	const simulatedHours = simulatedDays * hoursPerDay + simulatedManualHours;
	const calculation = calculateAbsencePlan({
		absenceHours: numericInput(currentHoursInput),
		absenceLimitHours: numericInput(absenceLimitInput),
		annualHours: numericInput(annualHoursInput),
		simulatedHours,
		hoursPerDay
	});
	const simulationStarted = simulatedDays > 0 || simulatedManualHours > 0;
	const usagePercent = calculation.hasConfiguredLimit ? calculation.absenceHours / calculation.absenceLimitHours * 100 : 0;
	const progressWidth = Math.min(100, Math.max(0, usagePercent));
	const annualPercent = calculation.currentAnnualPercentage;
	const totalDaysAfterSimulation = currentDays + simulatedDays;
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-xs leading-relaxed text-muted-foreground",
				children: "Il limite è espresso in ore. I dati iniziali arrivano dal registro; puoi modificarli solo per questa prova."
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-4 p-4",
				"aria-labelledby": "absence-current-title",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
							id: "absence-current-title",
							className: "text-sm font-semibold",
							children: "Situazione attuale"
						}), /* @__PURE__ */ jsxs("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: [
								numberLabel(calculation.absenceHours),
								" ore conteggiate · ",
								numberLabel(currentDays),
								" ",
								"giorni nel registro"
							]
						})] }), /* @__PURE__ */ jsxs("div", {
							className: "text-right",
							children: [/* @__PURE__ */ jsx("p", {
								className: "text-[10px] text-muted-foreground",
								children: "Limite"
							}), /* @__PURE__ */ jsx("p", {
								className: "tabular text-sm font-semibold",
								children: calculation.hasConfiguredLimit ? `${numberLabel(calculation.absenceLimitHours)} h` : "Non impostato"
							})]
						})]
					}),
					calculation.hasConfiguredLimit ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx("div", {
							role: "progressbar",
							"aria-label": "Limite di assenze già utilizzato",
							"aria-valuemin": 0,
							"aria-valuemax": 100,
							"aria-valuenow": Math.min(100, Math.round(usagePercent)),
							className: "h-2 overflow-hidden rounded-full bg-surface",
							children: /* @__PURE__ */ jsx("div", {
								className: cn("h-full rounded-full transition-[width]", usagePercent >= 90 ? "bg-danger" : "bg-primary"),
								style: { width: `${progressWidth}%` }
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-end justify-between gap-3",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
								className: "text-xs text-muted-foreground",
								children: calculation.exceededHours > 0 ? "Limite superato di" : "Ti restano"
							}), /* @__PURE__ */ jsxs("p", {
								className: cn("tabular font-display text-3xl font-bold", calculation.exceededHours > 0 ? "text-danger" : "text-foreground"),
								children: [numberLabel(calculation.exceededHours > 0 ? calculation.exceededHours : calculation.remainingHours), /* @__PURE__ */ jsx("span", {
									className: "ml-1 text-base font-semibold",
									children: "h"
								})]
							})] }), /* @__PURE__ */ jsxs("p", {
								className: "max-w-[45%] text-right text-xs text-muted-foreground",
								children: [
									"≈ ",
									calculation.fullDaysRemaining ?? "—",
									" giornate intere",
									hoursPerDay > 0 && ` da ${numberLabel(hoursPerDay)} h`
								]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between gap-3 text-[11px] text-muted-foreground",
							children: [/* @__PURE__ */ jsxs("span", { children: [numberLabel(usagePercent), "% del limite usato"] }), annualPercent !== null && /* @__PURE__ */ jsxs("span", { children: [numberLabel(annualPercent), "% del monte ore annuale"] })]
						})
					] }) : /* @__PURE__ */ jsx("p", {
						role: "status",
						className: "rounded-lg bg-warning/10 p-3 text-xs text-warning",
						children: "Il registro non ha fornito un limite valido. Puoi inserirlo in “Modifica dati”."
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						"aria-expanded": editCurrentData,
						"aria-controls": "absence-current-fields",
						onClick: () => setEditCurrentData((open) => !open),
						className: "press inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-primary",
						children: [
							/* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }),
							editCurrentData ? "Nascondi dati" : "Modifica dati",
							/* @__PURE__ */ jsx(ChevronDown, { className: cn("h-4 w-4 transition-transform", editCurrentData && "rotate-180") })
						]
					}),
					editCurrentData && /* @__PURE__ */ jsxs("div", {
						id: "absence-current-fields",
						className: "space-y-3 border-t border-border pt-3",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-[11px] text-muted-foreground",
							children: "Questi valori servono solo a personalizzare il calcolo: non cambiano il registro."
						}), /* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-2 gap-3",
							children: [
								/* @__PURE__ */ jsx(NumberField, {
									id: "absence-current-days",
									label: "Giorni già assenti",
									value: currentDaysInput,
									onChange: setCurrentDaysInput,
									step: "0.5"
								}),
								/* @__PURE__ */ jsx(NumberField, {
									id: "absence-current-hours",
									label: "Ore conteggiate",
									value: currentHoursInput,
									onChange: setCurrentHoursInput,
									step: "0.5"
								}),
								/* @__PURE__ */ jsx(NumberField, {
									id: "absence-limit-hours",
									label: "Limite massimo (ore)",
									value: absenceLimitInput,
									onChange: setAbsenceLimitInput,
									step: "0.5"
								}),
								/* @__PURE__ */ jsx(NumberField, {
									id: "absence-annual-hours",
									label: "Monte ore annuale",
									value: annualHoursInput,
									onChange: setAnnualHoursInput,
									step: "0.5"
								})
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				"aria-labelledby": "absence-simulation-title",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
						id: "absence-simulation-title",
						className: "text-sm font-semibold",
						children: "Fai una prova"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Quante altre assenze vuoi aggiungere? Inserisci giorni, ore o entrambi."
					})] }),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ jsx(NumberField, {
							id: "absence-extra-days",
							label: "Giorni in più",
							value: simulatedDaysInput,
							onChange: setSimulatedDaysInput,
							step: "1"
						}), /* @__PURE__ */ jsx(NumberField, {
							id: "absence-extra-hours",
							label: "Ore in più",
							value: simulatedHoursInput,
							onChange: setSimulatedHoursInput,
							step: "0.5"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-lg bg-surface px-3 py-2.5",
						children: [/* @__PURE__ */ jsxs("button", {
							type: "button",
							"aria-expanded": editDayLength,
							"aria-controls": "absence-day-length",
							onClick: () => setEditDayLength((open) => !open),
							className: "press flex min-h-7 w-full items-center justify-between gap-2 text-left text-[11px] text-muted-foreground",
							children: [/* @__PURE__ */ jsxs("span", { children: [
								"1 giornata = ",
								numberLabel(hoursPerDay),
								" ore",
								!editDayLength && " · cambia"
							] }), /* @__PURE__ */ jsx(ChevronDown, { className: cn("h-4 w-4 shrink-0 transition-transform", editDayLength && "rotate-180") })]
						}), editDayLength && /* @__PURE__ */ jsx("div", {
							id: "absence-day-length",
							className: "mt-2",
							children: /* @__PURE__ */ jsx(NumberField, {
								id: "absence-hours-per-day",
								label: "Ore di lezione per giornata",
								value: hoursPerDayInput,
								onChange: updateHoursPerDay,
								step: "0.5",
								help: "Salvato solo su questo dispositivo."
							})
						})]
					}),
					!simulationStarted ? /* @__PURE__ */ jsx("p", {
						className: "rounded-lg bg-surface p-3 text-xs text-muted-foreground",
						children: "Inserisci un numero per vedere come cambierebbe il totale."
					}) : !calculation.hasConfiguredLimit ? /* @__PURE__ */ jsx("p", {
						className: "rounded-lg bg-warning/10 p-3 text-xs text-warning",
						children: "Prima inserisci il limite massimo in “Modifica dati”."
					}) : /* @__PURE__ */ jsxs("div", {
						"aria-live": "polite",
						className: cn("space-y-2 rounded-xl border p-3", calculation.simulatedExceededHours > 0 ? "border-danger/25 bg-danger-soft/50" : calculation.simulatedRemainingHours === 0 ? "border-warning/25 bg-warning/10" : "border-success/25 bg-success-soft/40"),
						children: [
							/* @__PURE__ */ jsx("p", {
								className: "text-xs font-semibold text-muted-foreground",
								children: "Dopo la prova"
							}),
							/* @__PURE__ */ jsx("p", {
								className: cn("text-sm font-semibold", calculation.simulatedExceededHours > 0 ? "text-danger" : calculation.simulatedRemainingHours === 0 ? "text-warning" : "text-success"),
								children: calculation.simulatedExceededHours > 0 ? `Supereresti il limite di ${numberLabel(calculation.simulatedExceededHours)} h` : calculation.simulatedRemainingHours === 0 ? "Raggiungeresti il limite" : `Ti resterebbero ${numberLabel(calculation.simulatedRemainingHours)} h`
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "text-xs text-muted-foreground",
								children: [
									"Totale: ",
									numberLabel(calculation.simulatedTotalHours),
									" h su",
									" ",
									numberLabel(calculation.absenceLimitHours),
									" h · circa",
									" ",
									numberLabel(totalDaysAfterSimulation),
									" giorni complessivi."
								]
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "text-[11px] text-muted-foreground",
								children: [
									"Le nuove assenze aggiungono ",
									numberLabel(simulatedHours),
									" h al conteggio.",
									calculation.fullDaysAfterSimulation !== null && ` Resterebbero circa ${calculation.fullDaysAfterSimulation} giornate intere.`
								]
							})
						]
					})
				]
			})
		]
	});
}
function NumberField({ id, label, value, onChange, step, help }) {
	return /* @__PURE__ */ jsxs("div", { children: [
		/* @__PURE__ */ jsx("label", {
			htmlFor: id,
			className: "mb-1 block text-xs font-medium",
			children: label
		}),
		/* @__PURE__ */ jsx("input", {
			id,
			type: "number",
			min: "0",
			step,
			inputMode: "decimal",
			value,
			onChange: (event) => onChange(event.target.value),
			className: "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		}),
		help && /* @__PURE__ */ jsx("p", {
			className: "mt-1 text-[10px] text-muted-foreground",
			children: help
		})
	] });
}
//#endregion
//#region src/components/voto/GenericAverageCalculator.tsx
function GenericAverageCalculator() {
	const [entries, setEntries] = useState([{
		id: 0,
		value: ""
	}, {
		id: 1,
		value: ""
	}]);
	const [nextId, setNextId] = useState(2);
	const values = entries.map((entry) => entry.value.trim()).filter((value) => value !== "").map(Number).filter(Number.isFinite);
	const result = arithmeticMean(values);
	const addEntry = () => {
		setEntries((current) => [...current, {
			id: nextId,
			value: ""
		}]);
		setNextId((current) => current + 1);
	};
	const updateEntry = (id, value) => {
		setEntries((current) => current.map((entry) => entry.id === id ? {
			...entry,
			value
		} : entry));
	};
	const removeEntry = (id) => {
		setEntries((current) => current.length > 1 ? current.filter((entry) => entry.id !== id) : current);
	};
	const clearEntries = () => {
		setEntries([{
			id: nextId,
			value: ""
		}]);
		setNextId((current) => current + 1);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-xs text-muted-foreground",
				children: "Inserisci i numeri che vuoi: la media semplice si aggiorna subito e non modifica i voti del registro."
			}),
			entries.map((entry, index) => /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "sr-only",
						htmlFor: `generic-average-${entry.id}`,
						children: ["Numero ", index + 1]
					}),
					/* @__PURE__ */ jsx("input", {
						id: `generic-average-${entry.id}`,
						type: "number",
						inputMode: "decimal",
						step: "any",
						value: entry.value,
						onChange: (event) => updateEntry(entry.id, event.target.value),
						placeholder: `Numero ${index + 1}`,
						className: "h-11 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-sm tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: entries.length === 1,
						onClick: () => removeEntry(entry.id),
						"aria-label": `Rimuovi numero ${index + 1}`,
						className: "press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-40",
						children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
					})
				]
			}, entry.id)),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: addEntry,
					className: "press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary",
					children: [/* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }), " Aggiungi numero"]
				}), /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: clearEntries,
					className: "press inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-medium text-muted-foreground",
					children: [/* @__PURE__ */ jsx(RotateCcw, { className: "h-4 w-4" }), " Azzera"]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				"aria-live": "polite",
				className: "card-surface flex items-center justify-between gap-3 p-4",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
					className: "text-xs font-medium text-muted-foreground",
					children: "Media semplice"
				}), /* @__PURE__ */ jsxs("p", {
					className: "mt-1 text-[11px] text-muted-foreground",
					children: [
						values.length,
						" ",
						values.length === 1 ? "numero inserito" : "numeri inseriti"
					]
				})] }), /* @__PURE__ */ jsx("span", {
					className: "tabular font-display text-3xl font-semibold text-primary",
					children: result === null ? "—" : fmt(result, 2)
				})]
			})
		]
	});
}
//#endregion
//#region src/components/voto/UniversalCreationPanel.tsx
var TOOL_INFO = {
	qr: {
		title: "Generatore QR",
		description: "Crea un codice QR da un testo o un link. La generazione avviene nel browser.",
		icon: QrCode
	},
	documents: {
		title: "Lettore documenti",
		description: "Estrai testo da PDF, Word, file di testo e immagini.",
		icon: FileText
	},
	tables: {
		title: "Generatore tabelle",
		description: "Componi una tabella personalizzata e scaricala come file CSV.",
		icon: Table2
	},
	share: {
		title: "Condivisione sicura compiti",
		description: "Prepara un messaggio con il solo compito che vuoi condividere.",
		icon: Share2
	},
	average: {
		title: "Calcolo media",
		description: "Calcola la media semplice senza modificare i voti del registro.",
		icon: Calculator
	},
	absence: {
		title: "Calcolo assenze",
		description: "Controlla il limite delle assenze e simula una situazione futura.",
		icon: CalendarX2
	}
};
function SecureShareTool() {
	const [subject, setSubject] = useState("");
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [notice, setNotice] = useState("");
	const message = [
		subject.trim() && `Materia: ${subject.trim()}`,
		title.trim() && `Compito: ${title.trim()}`,
		content.trim()
	].filter(Boolean).join("\n");
	async function share() {
		if (!message) {
			setNotice("Inserisci almeno il testo del compito.");
			return;
		}
		try {
			if (navigator.share) {
				await navigator.share({
					title: title.trim() || "Compito",
					text: message
				});
				setNotice("Condivisione completata.");
			} else {
				await navigator.clipboard.writeText(message);
				setNotice("Testo copiato: ora puoi incollarlo nell’app che preferisci.");
			}
		} catch {
			setNotice("Condivisione annullata o non disponibile.");
		}
	}
	return /* @__PURE__ */ jsxs("section", {
		className: "card-surface space-y-3 p-4",
		"aria-label": "Condivisione sicura compiti",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ jsxs("label", {
					className: "block space-y-1 text-xs font-semibold",
					children: ["Materia", /* @__PURE__ */ jsx("input", {
						className: "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal",
						value: subject,
						onChange: (event) => setSubject(event.target.value),
						placeholder: "Es. Matematica",
						maxLength: 80
					})]
				}), /* @__PURE__ */ jsxs("label", {
					className: "block space-y-1 text-xs font-semibold",
					children: ["Titolo", /* @__PURE__ */ jsx("input", {
						className: "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal",
						value: title,
						onChange: (event) => setTitle(event.target.value),
						placeholder: "Es. Esercizi pag. 42",
						maxLength: 120
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("label", {
				className: "block space-y-1 text-xs font-semibold",
				children: ["Testo del compito", /* @__PURE__ */ jsx("textarea", {
					className: "min-h-32 w-full rounded-lg border border-input bg-card p-3 text-sm font-normal",
					value: content,
					onChange: (event) => setContent(event.target.value.slice(0, 4e3)),
					placeholder: "Scrivi solo ciò che vuoi condividere…",
					maxLength: 4e3
				})]
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: share,
				disabled: !message,
				className: "press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50",
				children: [/* @__PURE__ */ jsx(Share2, { className: "h-4 w-4" }), " Condividi compito"]
			}),
			notice && /* @__PURE__ */ jsx("p", {
				role: "status",
				className: "rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary",
				children: notice
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-[10px] leading-4 text-muted-foreground",
				children: "Il testo viene inviato solo quando premi il pulsante e non include automaticamente voti, assenze o dati dell’app. Non viene creato un link pubblico né salvato un archivio online."
			})
		]
	});
}
function useLocalOcr() {
	const [progress, setProgress] = useState(0);
	async function recognize(images) {
		setProgress(0);
		const { createWorker } = await import("tesseract.js");
		const worker = await createWorker("ita", 1, { logger: (message) => {
			if (message.status === "recognizing text") setProgress(Math.min(100, Math.max(0, Math.round(message.progress * 100))));
		} });
		try {
			const output = [];
			for (const image of images) {
				const result = await worker.recognize(image);
				output.push(result.data.text.trim());
			}
			return output;
		} finally {
			await worker.terminate();
		}
	}
	return {
		recognize,
		progress
	};
}
function QrTool() {
	const [content, setContent] = useState("");
	const [dataUrl, setDataUrl] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	async function generate() {
		if (!content.trim()) {
			setError("Scrivi un testo o un link da inserire nel codice QR.");
			setDataUrl("");
			return;
		}
		setBusy(true);
		setError("");
		try {
			const image = await (await import("qrcode")).default.toDataURL(content.trim(), {
				width: 480,
				margin: 2,
				errorCorrectionLevel: "M",
				color: {
					dark: "#171717",
					light: "#ffffff"
				}
			});
			setDataUrl(image);
		} catch {
			setError("Non è stato possibile creare il codice QR. Controlla il testo e riprova.");
			setDataUrl("");
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsxs("section", {
		className: "card-surface space-y-3 p-4",
		"aria-label": "Generatore QR",
		children: [
			/* @__PURE__ */ jsxs("label", {
				className: "block space-y-1 text-xs font-semibold",
				children: ["Testo o link", /* @__PURE__ */ jsx("textarea", {
					"aria-label": "Testo o link per il QR",
					value: content,
					onChange: (event) => setContent(event.target.value.slice(0, 2e3)),
					placeholder: "https://… oppure scrivi un messaggio",
					rows: 4,
					maxLength: 2e3,
					className: "w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				})]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: generate,
				disabled: busy,
				className: "press min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60",
				children: busy ? "Creo il codice…" : "Genera codice QR"
			}),
			error && /* @__PURE__ */ jsx("p", {
				role: "alert",
				className: "rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger",
				children: error
			}),
			dataUrl && /* @__PURE__ */ jsxs("div", {
				className: "flex flex-col items-center gap-3 rounded-xl border border-border bg-white p-4",
				children: [/* @__PURE__ */ jsx("img", {
					src: dataUrl,
					alt: "Codice QR generato",
					className: "h-56 w-56 max-w-full object-contain"
				}), /* @__PURE__ */ jsxs("a", {
					href: dataUrl,
					download: "codice-qr.png",
					className: "press inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground",
					children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), " Scarica PNG"]
				})]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-[10px] leading-4 text-muted-foreground",
				children: "Prima di condividere un QR, verifica sempre che il contenuto non includa dati privati."
			})
		]
	});
}
function DocumentReaderTool() {
	const [file, setFile] = useState(null);
	const [text, setText] = useState("");
	const [notice, setNotice] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const ocr = useLocalOcr();
	async function extract() {
		if (!file) {
			setError("Scegli prima un documento o un’immagine.");
			return;
		}
		if (file.size > 26214400) {
			setError("Il file supera il limite di 25 MB.");
			return;
		}
		const extension = file.name.toLocaleLowerCase("it-IT").split(".").pop() ?? "";
		setBusy(true);
		setError("");
		setNotice("");
		setText("");
		try {
			if (extension === "pdf") {
				const objectUrl = URL.createObjectURL(file);
				try {
					const document = await extractCircularPdfText(objectUrl);
					const selectableText = document.text.replace(/^\[Pagina \d+\]\s*/gm, "").trim();
					if (selectableText) {
						setText(selectableText);
						setNotice(document.truncated ? `Testo estratto da ${document.pagesAnalyzed} pagine (risultato abbreviato).` : `Testo estratto da ${document.pagesAnalyzed} pagine.`);
					} else {
						setNotice("Il PDF sembra una scansione: avvio l’OCR locale sulle prime pagine.");
						const visual = await renderCircularPdfPageImages(objectUrl);
						if (!visual.pages.length) throw new Error("Non è stato possibile leggere le pagine del PDF.");
						const extracted = (await ocr.recognize(visual.pages.map((page) => page.dataUrl))).filter(Boolean).map((pageText, index) => `[Pagina ${visual.pages[index]?.pageNumber ?? index + 1}]\n${pageText}`).join("\n\n");
						setText(extracted || "Nessun testo riconosciuto.");
						setNotice(visual.truncated ? `OCR sulle prime ${visual.pages.length} pagine; il PDF ne contiene ${visual.totalPages}.` : `OCR completato su ${visual.pages.length} pagine.`);
					}
				} finally {
					URL.revokeObjectURL(objectUrl);
				}
			} else if (extension === "docx") {
				const objectUrl = URL.createObjectURL(file);
				try {
					const document = await extractCircularDocxText(objectUrl);
					setText(document.text || "Nessun testo trovato nel documento.");
					setNotice(document.truncated ? "Testo estratto (risultato abbreviato)." : "Testo estratto dal documento Word.");
				} finally {
					URL.revokeObjectURL(objectUrl);
				}
			} else if ([
				"txt",
				"md",
				"csv",
				"log"
			].includes(extension)) {
				const value = await file.text();
				setText(value || "Il file è vuoto.");
				setNotice("File di testo letto sul dispositivo.");
			} else if ([
				"png",
				"jpg",
				"jpeg",
				"webp",
				"bmp",
				"gif"
			].includes(extension) || file.type.startsWith("image/")) {
				const [recognized] = await ocr.recognize([file]);
				setText(recognized || "Nessun testo riconosciuto.");
				setNotice("OCR eseguito nel browser. Controlla sempre il risultato, soprattutto per numeri e date.");
			} else throw new Error("Formato non supportato. Scegli PDF, DOCX, TXT, MD, CSV o un’immagine.");
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "Non è stato possibile leggere il file.");
		} finally {
			setBusy(false);
		}
	}
	async function copyText() {
		try {
			await navigator.clipboard.writeText(text);
			setNotice("Testo copiato negli appunti.");
		} catch {
			setError("Il browser non consente di copiare automaticamente. Seleziona il testo e copialo manualmente.");
		}
	}
	return /* @__PURE__ */ jsxs("section", {
		className: "card-surface space-y-3 p-4",
		"aria-label": "Lettore documenti",
		children: [
			/* @__PURE__ */ jsxs("label", {
				className: "block space-y-1 text-xs font-semibold",
				children: ["Documento o immagine", /* @__PURE__ */ jsx("input", {
					"aria-label": "Scegli documento o immagine",
					type: "file",
					accept: ".pdf,.docx,.txt,.md,.csv,.log,image/*",
					onChange: (event) => {
						setFile(event.target.files?.[0] ?? null);
						setText("");
						setError("");
						setNotice("");
					},
					className: "block min-h-12 w-full rounded-lg border border-input bg-card px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary"
				})]
			}),
			file && /* @__PURE__ */ jsxs("p", {
				className: "break-all text-[11px] text-muted-foreground",
				children: [
					file.name,
					" ·",
					" ",
					(file.size / 1048576).toLocaleString("it-IT", { maximumFractionDigits: 1 }),
					" MB"
				]
			}),
			/* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: extract,
				disabled: busy || !file,
				className: "press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60",
				children: busy ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Lettura in corso…"] }) : "Estrai testo"
			}),
			busy && /* @__PURE__ */ jsx("p", {
				"aria-live": "polite",
				className: "text-[11px] text-muted-foreground",
				children: ocr.progress > 0 ? `OCR in corso: ${ocr.progress}%` : "Preparazione dell’estrazione…"
			}),
			notice && /* @__PURE__ */ jsx("p", {
				role: "status",
				className: "rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary",
				children: notice
			}),
			error && /* @__PURE__ */ jsx("p", {
				role: "alert",
				className: "rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger",
				children: error
			}),
			text && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("label", {
				className: "block space-y-1 text-xs font-semibold",
				children: ["Testo estratto", /* @__PURE__ */ jsx("textarea", {
					readOnly: true,
					value: text,
					rows: 12,
					className: "w-full resize-y rounded-lg border border-input bg-card px-3 py-2.5 text-xs font-normal leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				})]
			}), /* @__PURE__ */ jsx("button", {
				type: "button",
				onClick: copyText,
				className: "press min-h-10 w-full rounded-lg border border-border bg-card px-4 text-xs font-semibold",
				children: "Copia testo"
			})] }),
			/* @__PURE__ */ jsxs("p", {
				className: "flex gap-2 rounded-lg bg-surface p-3 text-[10px] leading-4 text-muted-foreground",
				children: [/* @__PURE__ */ jsx(ImagePlus, { className: "mt-0.5 h-3.5 w-3.5 shrink-0" }), " I file vengono elaborati nel browser e non caricati nell’app. Al primo OCR potrebbe essere necessario scaricare il motore e il modello italiano; le scansioni PDF sono limitate alle prime 4 pagine."]
			})
		]
	});
}
function TableGeneratorTool() {
	const [headers, setHeaders] = useState([
		"Colonna 1",
		"Colonna 2",
		"Colonna 3"
	]);
	const [rows, setRows] = useState([
		[
			"",
			"",
			""
		],
		[
			"",
			"",
			""
		],
		[
			"",
			"",
			""
		]
	]);
	const [notice, setNotice] = useState("");
	function updateHeader(index, value) {
		setHeaders((current) => current.map((header, column) => column === index ? value : header));
	}
	function updateCell(rowIndex, columnIndex, value) {
		setRows((current) => current.map((row, index) => index === rowIndex ? row.map((cell, column) => column === columnIndex ? value : cell) : row));
	}
	function addColumn() {
		if (headers.length >= 8) return;
		const next = headers.length + 1;
		setHeaders((current) => [...current, `Colonna ${next}`]);
		setRows((current) => current.map((row) => [...row, ""]));
	}
	function removeColumn() {
		if (headers.length <= 1) return;
		setHeaders((current) => current.slice(0, -1));
		setRows((current) => current.map((row) => row.slice(0, -1)));
	}
	function addRow() {
		if (rows.length >= 25) return;
		setRows((current) => [...current, Array.from({ length: headers.length }, () => "")]);
	}
	function download() {
		try {
			const csv = createCsv(headers, rows);
			const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "tabella.csv";
			link.click();
			URL.revokeObjectURL(url);
			setNotice("File CSV scaricato.");
		} catch (caught) {
			setNotice(caught instanceof Error ? caught.message : "Non è stato possibile esportare la tabella.");
		}
	}
	return /* @__PURE__ */ jsxs("section", {
		className: "card-surface space-y-3 p-4",
		"aria-label": "Generatore tabelle",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: addColumn,
						disabled: headers.length >= 8,
						className: "press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50",
						children: [/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }), " Colonna"]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: removeColumn,
						disabled: headers.length <= 1,
						className: "press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50",
						children: [/* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }), " Ultima colonna"]
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: addRow,
						disabled: rows.length >= 25,
						className: "press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-50",
						children: [/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }), " Riga"]
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "overflow-x-auto rounded-lg border border-border",
				children: /* @__PURE__ */ jsxs("table", {
					className: "w-full min-w-[420px] border-collapse text-left text-xs",
					children: [/* @__PURE__ */ jsx("thead", {
						className: "bg-surface",
						children: /* @__PURE__ */ jsx("tr", { children: headers.map((header, columnIndex) => /* @__PURE__ */ jsx("th", {
							className: "border-b border-r border-border p-1.5",
							children: /* @__PURE__ */ jsx("input", {
								"aria-label": `Intestazione colonna ${columnIndex + 1}`,
								value: header,
								onChange: (event) => updateHeader(columnIndex, event.target.value),
								className: "h-9 w-full min-w-24 rounded-md border border-input bg-card px-2 font-semibold"
							})
						}, columnIndex)) })
					}), /* @__PURE__ */ jsx("tbody", { children: rows.map((row, rowIndex) => /* @__PURE__ */ jsx("tr", { children: row.map((cell, columnIndex) => /* @__PURE__ */ jsx("td", {
						className: "border-b border-r border-border p-1.5",
						children: /* @__PURE__ */ jsx("input", {
							"aria-label": `Riga ${rowIndex + 1}, colonna ${columnIndex + 1}`,
							value: cell,
							onChange: (event) => updateCell(rowIndex, columnIndex, event.target.value),
							className: "h-9 w-full min-w-24 rounded-md border border-input bg-card px-2"
						})
					}, columnIndex)) }, rowIndex)) })]
				})
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: download,
				className: "press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground",
				children: [/* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }), " Esporta CSV"]
			}),
			notice && /* @__PURE__ */ jsx("p", {
				role: "status",
				className: "text-xs text-primary",
				children: notice
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-[10px] leading-4 text-muted-foreground",
				children: "Massimo 8 colonne e 25 righe. Il CSV usa il separatore punto e virgola per aprirsi correttamente con le impostazioni italiane dei fogli di calcolo."
			})
		]
	});
}
function UniversalCreationPanel({ tool }) {
	const metadata = TOOL_INFO[tool];
	const Icon = metadata.icon;
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/60 via-card to-card p-4",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground",
						children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ jsx("h2", {
						className: "mt-3 font-display text-xl font-semibold",
						children: metadata.title
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs leading-5 text-muted-foreground",
						children: metadata.description
					})
				]
			}),
			tool === "qr" && /* @__PURE__ */ jsx(QrTool, {}),
			tool === "documents" && /* @__PURE__ */ jsx(DocumentReaderTool, {}),
			tool === "tables" && /* @__PURE__ */ jsx(TableGeneratorTool, {}),
			tool === "share" && /* @__PURE__ */ jsx(SecureShareTool, {}),
			tool === "average" && /* @__PURE__ */ jsx(GenericAverageCalculator, {}),
			tool === "absence" && /* @__PURE__ */ jsx(AbsenceCalculator, {})
		]
	});
}
//#endregion
//#region src/components/voto/ClassroomSeatingTool.tsx
var STORAGE_KEY = "voto.studio.classroom-seating.v1";
var MIN_SIZE = 1;
var MAX_SIZE = 8;
var MIN_SPACING = 6;
var MAX_SPACING = 32;
var DEFAULT_PLAN = {
	className: "La mia classe",
	rows: 5,
	desksPerRow: 4,
	seatsPerDesk: 1,
	spacing: 12,
	centralAisle: false,
	removedDesks: [],
	assignments: {}
};
function clampSize(value, fallback) {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	return Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(value)));
}
function clampSpacing(value) {
	if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_PLAN.spacing;
	return Math.round(Math.max(MIN_SPACING, Math.min(MAX_SPACING, Math.round(value))) / 2) * 2;
}
function loadPlan() {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_PLAN;
		const value = JSON.parse(raw);
		const savedAssignments = value["assignments"];
		const savedRemovedDesks = value["removedDesks"];
		const assignments = {};
		if (savedAssignments && typeof savedAssignments === "object") for (const [key, name] of Object.entries(savedAssignments)) {
			const migratedKey = /^\d+-\d+$/.test(key) ? `${key}-0` : key;
			if (/^\d+-\d+-\d+$/.test(migratedKey) && typeof name === "string" && name.trim()) assignments[migratedKey] = name.slice(0, 48);
		}
		const removedDesks = Array.isArray(savedRemovedDesks) ? savedRemovedDesks.filter((key) => typeof key === "string" && /^\d+-\d+$/.test(key)) : [];
		return {
			className: typeof value["className"] === "string" ? value["className"].slice(0, 32) : DEFAULT_PLAN.className,
			rows: clampSize(value["rows"], DEFAULT_PLAN.rows),
			desksPerRow: clampSize(value["desksPerRow"], DEFAULT_PLAN.desksPerRow),
			seatsPerDesk: clampSize(value["seatsPerDesk"], DEFAULT_PLAN.seatsPerDesk) === 2 ? 2 : 1,
			spacing: clampSpacing(value["spacing"]),
			centralAisle: value["centralAisle"] === true,
			removedDesks: [...new Set(removedDesks)],
			assignments
		};
	} catch {
		return DEFAULT_PLAN;
	}
}
function seatKey(row, column, seat) {
	return `${row}-${column}-${seat}`;
}
function deskKey(row, column) {
	return `${row}-${column}`;
}
function ClassroomSeatingTool() {
	const [plan, setPlan] = useState(DEFAULT_PLAN);
	const [storageReady, setStorageReady] = useState(false);
	const [roster, setRoster] = useState("");
	const [notice, setNotice] = useState("");
	useEffect(() => {
		setPlan(loadPlan());
		setStorageReady(true);
	}, []);
	useEffect(() => {
		if (!storageReady) return;
		try {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
		} catch {}
	}, [plan, storageReady]);
	const visibleSeatKeys = useMemo(() => Array.from({ length: plan.rows }, (_, row) => Array.from({ length: plan.desksPerRow }, (_, column) => Array.from({ length: plan.seatsPerDesk }, (_, seat) => seatKey(row, column, seat))).flat()).flat().filter((key) => !plan.removedDesks.includes(key.split("-").slice(0, 2).join("-"))), [
		plan.rows,
		plan.desksPerRow,
		plan.seatsPerDesk,
		plan.removedDesks
	]);
	const assignedCount = visibleSeatKeys.filter((key) => plan.assignments[key]?.trim()).length;
	const hasSavedNames = Object.values(plan.assignments).some((name) => name.trim());
	const freeCount = visibleSeatKeys.length - assignedCount;
	const hasAisle = plan.centralAisle && plan.desksPerRow > 1;
	const aisleAfter = Math.ceil(plan.desksPerRow / 2);
	const aisleWidth = 34;
	const deskMinWidth = plan.seatsPerDesk === 2 ? 120 : 72;
	const gridColumns = ["48px", ...Array.from({ length: plan.desksPerRow + (hasAisle ? 1 : 0) }, (_, index) => hasAisle && index === aisleAfter ? `${aisleWidth}px` : `minmax(${deskMinWidth}px, 1fr)`)].join(" ");
	const trackCount = 1 + plan.desksPerRow + (hasAisle ? 1 : 0);
	const gridMinWidth = `${48 + plan.desksPerRow * deskMinWidth + (hasAisle ? aisleWidth : 0) + (trackCount - 1) * plan.spacing}px`;
	function updateSeat(key, value) {
		setPlan((current) => {
			const assignments = { ...current.assignments };
			if (value.trim()) assignments[key] = value.slice(0, 48);
			else delete assignments[key];
			return {
				...current,
				assignments
			};
		});
	}
	function updateSize(field, amount) {
		setPlan((current) => ({
			...current,
			[field]: Math.max(MIN_SIZE, Math.min(MAX_SIZE, current[field] + amount))
		}));
	}
	function setDeskRemoved(row, column, removed) {
		const key = deskKey(row, column);
		setPlan((current) => ({
			...current,
			removedDesks: removed ? [.../* @__PURE__ */ new Set([...current.removedDesks, key])] : current.removedDesks.filter((item) => item !== key)
		}));
		setNotice(removed ? "Banco rimosso dalla piantina. Gli eventuali nomi restano salvati: riappariranno se ripristini il banco." : "Banco ripristinato nella piantina.");
	}
	function assignRoster() {
		const names = roster.split(/[\n,;]+/).map((name) => name.trim()).filter(Boolean);
		const freeKeys = visibleSeatKeys.filter((key) => !plan.assignments[key]?.trim());
		if (!names.length) {
			setNotice("Scrivi almeno un nome per assegnare i posti.");
			return;
		}
		if (!freeKeys.length) {
			setNotice("Non ci sono posti liberi: aumenta file o banchi per fila, oppure scegli il banco a 2 posti.");
			return;
		}
		const count = Math.min(names.length, freeKeys.length);
		setPlan((current) => {
			const assignments = { ...current.assignments };
			for (let index = 0; index < count; index += 1) {
				const seatKey = freeKeys[index];
				const name = names[index];
				if (seatKey && name) assignments[seatKey] = name.slice(0, 48);
			}
			return {
				...current,
				assignments
			};
		});
		setRoster(names.slice(count).join("\n"));
		setNotice(count === names.length ? `${count} ${count === 1 ? "nome assegnato" : "nomi assegnati"} ai posti liberi.` : `${count} nomi assegnati; ${names.length - count} restano nell’elenco. Aggiungi posti e riprova.`);
	}
	function clearNames() {
		if (!hasSavedNames) return;
		if (!window.confirm("Vuoi rimuovere tutti i nomi dalla piantina?")) return;
		setPlan((current) => ({
			...current,
			assignments: {}
		}));
		setNotice("Nomi rimossi dalla piantina.");
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsx("section", {
				className: "overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-5 shadow-sm",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx("p", {
							className: "text-[10px] font-bold uppercase tracking-[0.16em] text-primary",
							children: "Strumento aula"
						}),
						/* @__PURE__ */ jsx("h3", {
							className: "mt-1 font-display text-2xl font-semibold",
							children: "Piantina della classe"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 max-w-xl text-xs leading-5 text-muted-foreground",
							children: "Organizza file e banchi, poi scrivi i nomi direttamente nei posti o assegnali da un elenco."
						})
					] }), /* @__PURE__ */ jsx("span", {
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
						children: /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" })
					})]
				})
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-4 p-4",
				"aria-label": "Impostazioni della piantina",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "block text-xs font-semibold",
						children: ["Nome della classe", /* @__PURE__ */ jsx("input", {
							value: plan.className,
							onChange: (event) => setPlan((current) => ({
								...current,
								className: event.target.value.slice(0, 32)
							})),
							placeholder: "Es. 2ª A",
							maxLength: 32,
							className: "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal",
							"aria-label": "Nome della classe"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ jsx(NumberControl, {
							label: "File",
							value: plan.rows,
							decrement: () => updateSize("rows", -1),
							increment: () => updateSize("rows", 1)
						}), /* @__PURE__ */ jsx(NumberControl, {
							label: "Banchi per fila",
							value: plan.desksPerRow,
							decrement: () => updateSize("desksPerRow", -1),
							increment: () => updateSize("desksPerRow", 1)
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-xs font-semibold",
							children: "Posti per banco"
						}), /* @__PURE__ */ jsx("div", {
							role: "group",
							"aria-label": "Posti per banco",
							className: "grid grid-cols-2 gap-2",
							children: [1, 2].map((seats) => /* @__PURE__ */ jsx("button", {
								type: "button",
								"aria-pressed": plan.seatsPerDesk === seats,
								onClick: () => setPlan((current) => ({
									...current,
									seatsPerDesk: seats
								})),
								className: `min-h-11 rounded-lg border px-3 text-sm font-semibold transition-colors ${plan.seatsPerDesk === seats ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground"}`,
								children: seats === 1 ? "Banco singolo" : "Banco a 2 posti"
							}, seats))
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "block text-xs font-semibold",
						children: [
							/* @__PURE__ */ jsxs("span", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ jsx("span", { children: "Spazio tra i banchi" }), /* @__PURE__ */ jsxs("span", {
									className: "rounded-md bg-primary-soft px-2 py-1 text-primary",
									children: [plan.spacing, " px"]
								})]
							}),
							/* @__PURE__ */ jsx("input", {
								type: "range",
								min: MIN_SPACING,
								max: MAX_SPACING,
								step: 2,
								value: plan.spacing,
								onChange: (event) => setPlan((current) => ({
									...current,
									spacing: Number(event.target.value)
								})),
								"aria-label": "Spazio tra i banchi",
								className: "mt-3 w-full accent-primary"
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "mt-1 flex justify-between text-[10px] font-normal text-muted-foreground",
								children: [/* @__PURE__ */ jsx("span", { children: "Più vicini" }), /* @__PURE__ */ jsx("span", { children: "Più distanti" })]
							})
						]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 text-sm",
						children: [/* @__PURE__ */ jsx("input", {
							type: "checkbox",
							checked: plan.centralAisle,
							onChange: (event) => setPlan((current) => ({
								...current,
								centralAisle: event.target.checked
							})),
							className: "h-4 w-4 accent-primary"
						}), /* @__PURE__ */ jsx("span", { children: "Corridoio centrale" })]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-[11px] leading-5 text-muted-foreground",
						children: "Se riduci la disposizione, i nomi dei banchi fuori vista restano salvati e riappaiono se aggiungi di nuovo file o posti."
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				"aria-labelledby": "class-roster-title",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h4", {
						id: "class-roster-title",
						className: "font-display text-base font-semibold",
						children: "Assegna i nomi in ordine"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Incolla un elenco: un nome per riga, oppure separato da virgole. I nomi vanno nei posti liberi da sinistra a destra."
					})] }),
					/* @__PURE__ */ jsx("textarea", {
						value: roster,
						onChange: (event) => setRoster(event.target.value),
						placeholder: "Es.\nGiulia Rossi\nLuca Bianchi\nSara Verdi",
						rows: 4,
						className: "w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
						"aria-label": "Elenco dei nomi da assegnare ai posti"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [/* @__PURE__ */ jsxs(Button, {
							type: "button",
							size: "sm",
							onClick: assignRoster,
							disabled: !roster.trim() || freeCount === 0,
							children: [/* @__PURE__ */ jsx(Users, { className: "mr-2 h-4 w-4" }), " Assegna ai posti liberi"]
						}), /* @__PURE__ */ jsxs("span", {
							className: "text-xs text-muted-foreground",
							children: [
								freeCount,
								" ",
								freeCount === 1 ? "posto libero" : "posti liberi"
							]
						})]
					}),
					notice && /* @__PURE__ */ jsx("p", {
						role: "status",
						"aria-live": "polite",
						className: "text-xs font-medium text-primary",
						children: notice
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-4 p-4",
				"aria-labelledby": "class-layout-title",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-start justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h4", {
							id: "class-layout-title",
							className: "font-display text-base font-semibold",
							children: plan.className.trim() || "La mia classe"
						}), /* @__PURE__ */ jsxs("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: [
								plan.rows,
								" ",
								plan.rows === 1 ? "fila" : "file",
								" · ",
								assignedCount,
								" su",
								" ",
								visibleSeatKeys.length,
								" posti assegnati"
							]
						})] }), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 print:hidden",
							children: [/* @__PURE__ */ jsxs(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								onClick: () => window.print(),
								children: [/* @__PURE__ */ jsx(Printer, { className: "mr-2 h-4 w-4" }), " Stampa"]
							}), /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								size: "sm",
								onClick: clearNames,
								disabled: !hasSavedNames,
								"aria-label": "Rimuovi tutti i nomi dalla piantina",
								children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "rounded-xl border border-dashed border-primary/30 bg-muted/30 p-3 sm:p-4",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-primary",
								children: "Cattedra / lavagna"
							}),
							hasAisle && /* @__PURE__ */ jsx("p", {
								className: "mb-3 text-center text-[10px] font-semibold text-muted-foreground",
								children: "Corsia libera tra i due gruppi di banchi"
							}),
							/* @__PURE__ */ jsx("div", {
								className: "overflow-x-auto pb-1",
								children: /* @__PURE__ */ jsxs("div", {
									className: "grid items-stretch",
									style: {
										gridTemplateColumns: gridColumns,
										gridTemplateRows: `repeat(${plan.rows}, minmax(84px, auto))`,
										minWidth: gridMinWidth,
										gap: `${plan.spacing}px`
									},
									children: [
										Array.from({ length: plan.rows }, (_, row) => /* @__PURE__ */ jsxs("div", {
											className: "flex items-center text-[10px] font-semibold text-muted-foreground",
											style: {
												gridColumn: 1,
												gridRow: row + 1
											},
											children: ["Fila ", row + 1]
										}, `row-${row}`)),
										Array.from({ length: plan.rows }, (_, row) => Array.from({ length: plan.desksPerRow }, (_, column) => {
											const deskNumber = row * plan.desksPerRow + column + 1;
											const isRemoved = plan.removedDesks.includes(deskKey(row, column));
											const gridColumn = 2 + column + (hasAisle && column >= aisleAfter ? 1 : 0);
											return /* @__PURE__ */ jsx("div", {
												style: {
													gridColumn,
													gridRow: row + 1
												},
												className: isRemoved ? "flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-2 text-center" : "grid min-h-[84px] content-center gap-1 rounded-lg border border-border bg-card p-2 text-center shadow-sm",
												children: isRemoved ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("span", {
													className: "text-[9px] font-semibold text-muted-foreground",
													children: [
														"Banco ",
														deskNumber,
														" rimosso"
													]
												}), /* @__PURE__ */ jsxs("button", {
													type: "button",
													"aria-label": `Ripristina banco ${deskNumber}`,
													onClick: () => setDeskRemoved(row, column, false),
													className: "press print:hidden inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-card px-2 text-[10px] font-semibold text-primary",
													children: [/* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" }), " Ripristina"]
												})] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
													className: "flex items-center justify-center gap-1",
													children: [/* @__PURE__ */ jsxs("span", {
														className: "text-[9px] font-bold uppercase tracking-wide text-muted-foreground",
														children: ["Banco ", deskNumber]
													}), /* @__PURE__ */ jsx("button", {
														type: "button",
														"aria-label": `Rimuovi banco ${deskNumber}`,
														title: "Rimuovi questo banco",
														onClick: () => setDeskRemoved(row, column, true),
														className: "press print:hidden inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
														children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3" })
													})]
												}), /* @__PURE__ */ jsx("div", {
													className: plan.seatsPerDesk === 2 ? "grid grid-cols-2 gap-1" : "grid grid-cols-1",
													children: Array.from({ length: plan.seatsPerDesk }, (_, seat) => {
														const key = seatKey(row, column, seat);
														const seatNumber = (row * plan.desksPerRow + column) * plan.seatsPerDesk + seat + 1;
														const seatLabel = plan.seatsPerDesk === 2 ? seat === 0 ? "A" : "B" : String(seatNumber);
														return /* @__PURE__ */ jsxs("label", {
															className: "min-w-0",
															children: [plan.seatsPerDesk === 2 && /* @__PURE__ */ jsxs("span", {
																className: "mb-0.5 block text-[8px] font-semibold text-muted-foreground",
																children: ["Posto ", seatLabel]
															}), /* @__PURE__ */ jsx("input", {
																value: plan.assignments[key] ?? "",
																onChange: (event) => updateSeat(key, event.target.value),
																maxLength: 48,
																placeholder: plan.seatsPerDesk === 2 ? `Nome ${seatLabel}` : "Nome",
																autoComplete: "off",
																"aria-label": `Nome alunno, fila ${row + 1}, banco ${deskNumber}, posto ${seatLabel}`,
																className: "min-w-0 w-full rounded bg-transparent px-0 text-center text-[11px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary"
															})]
														}, key);
													})
												})] })
											}, `desk-${row}-${column}`);
										})),
										hasAisle && /* @__PURE__ */ jsx("div", {
											role: "img",
											"aria-label": `Corridoio centrale continuo per tutte le ${plan.rows} file`,
											className: "z-10 flex items-center justify-center rounded-md border-x-2 border-dashed border-primary/45 bg-primary/10",
											style: {
												gridColumn: aisleAfter + 2,
												gridRow: `1 / span ${plan.rows}`
											},
											children: /* @__PURE__ */ jsx("span", {
												className: "text-[8px] font-bold text-primary [writing-mode:vertical-rl]",
												children: "PASSAGGIO"
											})
										})
									]
								})
							})
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-[11px] leading-5 text-muted-foreground",
						children: "La piantina e i nomi sono salvati solo su questo dispositivo, non vengono caricati online. Usa “Stampa” per salvarla o stamparla."
					})
				]
			})
		]
	});
}
function NumberControl({ label, value, decrement, increment }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "rounded-lg border border-border bg-card p-3",
		children: [/* @__PURE__ */ jsx("p", {
			className: "mb-2 text-xs font-semibold",
			children: label
		}), /* @__PURE__ */ jsxs("div", {
			className: "flex items-center justify-between gap-2",
			children: [
				/* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					size: "sm",
					className: "h-9 w-9 p-0",
					onClick: decrement,
					disabled: value <= MIN_SIZE,
					"aria-label": `Riduci ${label.toLocaleLowerCase("it-IT")}`,
					children: /* @__PURE__ */ jsx(Minus, { className: "h-4 w-4" })
				}),
				/* @__PURE__ */ jsx("span", {
					className: "min-w-8 text-center text-base font-semibold",
					"aria-live": "polite",
					children: value
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					size: "sm",
					className: "h-9 w-9 p-0",
					onClick: increment,
					disabled: value >= MAX_SIZE,
					"aria-label": `Aumenta ${label.toLocaleLowerCase("it-IT")}`,
					children: /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" })
				})
			]
		})]
	});
}
//#endregion
//#region src/components/voto/UniversalCalculator.tsx
var HISTORY_KEY = "voto.studio.universal-calculator.history.v1";
var HISTORY_LIMIT = 12;
var TOOLS$1 = [
	{
		id: "scientific",
		title: "Calcolatrice scientifica",
		description: "Parentesi, potenze, radici, logaritmi e trigonometria",
		category: "Calcoli",
		keywords: "somma sottrazione moltiplicazione divisione sin cos tan pi percentuale",
		icon: Calculator,
		tone: "text-primary"
	},
	{
		id: "fractions",
		title: "Calcolatore frazioni",
		description: "Esegui operazioni e semplifica il risultato",
		category: "Calcoli",
		keywords: "numeratore denominatore semplificazione",
		icon: Scale,
		tone: "text-success"
	},
	{
		id: "vat",
		title: "Calcolatore IVA",
		description: "Ricava imposta e totale dall’imponibile",
		category: "Calcoli",
		keywords: "aliquota imposta imponibile totale",
		icon: Percent,
		tone: "text-warning"
	},
	{
		id: "discount",
		title: "Calcolatore sconti",
		description: "Calcola risparmio e prezzo finale",
		category: "Calcoli",
		keywords: "saldi percentuale prezzo",
		icon: Percent,
		tone: "text-danger"
	},
	{
		id: "average",
		title: "Calcolo media",
		description: "Calcola rapidamente la media semplice di più numeri",
		category: "Calcoli",
		keywords: "media voti numeri average scuola",
		icon: Calculator,
		tone: "text-success"
	},
	{
		id: "absence",
		title: "Calcolo assenze",
		description: "Controlla ore residue e simula nuove assenze",
		category: "Calcoli",
		keywords: "assenze ore limite giornate scuola",
		icon: CalendarX2,
		tone: "text-warning"
	},
	{
		id: "simulator",
		title: "Simulatore voti",
		description: "Pianifica i voti futuri nelle tue materie",
		category: "Calcoli",
		keywords: "simulatore voto media materie voti futuri obiettivo",
		icon: Calculator,
		tone: "text-success"
	},
	{
		id: "interval",
		title: "Calcolo intervalli",
		description: "Differenza tra orari, anche oltre mezzanotte",
		category: "Calcoli",
		keywords: "ore minuti durata pausa lavoro",
		icon: CalendarClock,
		tone: "text-primary"
	},
	{
		id: "converter",
		title: "Convertitore universale",
		description: "Lunghezze, pesi, volumi, temperature, velocità e valute",
		category: "Conversioni",
		keywords: "unità di misura metri chilometri grammi litri gradi celsius fahrenheit euro dollari cambio",
		icon: Ruler,
		tone: "text-success"
	},
	{
		id: "qr",
		title: "Generatore QR",
		description: "Crea e scarica un codice QR da testo o link",
		category: "Documenti e creazione",
		keywords: "qrcode codice scansione link url immagine",
		icon: QrCode,
		tone: "text-primary"
	},
	{
		id: "documents",
		title: "Lettore documenti",
		description: "Estrai testo da PDF, Word, testo e immagini",
		category: "Documenti e creazione",
		keywords: "pdf docx txt png jpg jpeg webp ocr scansione",
		icon: FileText,
		tone: "text-warning"
	},
	{
		id: "tables",
		title: "Generatore tabelle",
		description: "Crea una tabella e scaricala in CSV",
		category: "Documenti e creazione",
		keywords: "righe colonne csv foglio dati esporta excel",
		icon: Table2,
		tone: "text-success"
	},
	{
		id: "share",
		title: "Condivisione sicura compiti",
		description: "Condividi solo il compito scelto, senza voti o dati dell’app",
		category: "Documenti e creazione",
		keywords: "condividi compito messaggio privacy share",
		icon: Share2,
		tone: "text-primary"
	},
	{
		id: "classroom",
		title: "Piantina della classe",
		description: "Disponi i banchi e assegna un posto a ogni nome",
		category: "Documenti e creazione",
		keywords: "classe banchi posti studenti piantina aula",
		icon: Table2,
		tone: "text-primary"
	}
];
var CATEGORIES = [
	"Tutti",
	"Calcoli",
	"Conversioni",
	"Documenti e creazione"
];
var VALID_TOOL_IDS = new Set(TOOLS$1.map(({ id }) => id));
function loadHistory() {
	try {
		const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((item) => !!item && typeof item === "object" && VALID_TOOL_IDS.has(item.toolId) && typeof item.calculation === "string" && typeof item.result === "string" && typeof item.createdAt === "string").slice(0, HISTORY_LIMIT);
	} catch {
		return [];
	}
}
function UniversalCalculator() {
	const [tool, setTool] = useState(null);
	const [category, setCategory] = useState("Tutti");
	const [search, setSearch] = useState("");
	const [history, setHistory] = useState([]);
	const [storageReady, setStorageReady] = useState(false);
	useEffect(() => {
		setHistory(loadHistory());
		setStorageReady(true);
	}, []);
	useEffect(() => {
		if (!storageReady) return;
		try {
			localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
		} catch {}
	}, [history, storageReady]);
	const filteredTools = useMemo(() => {
		const query = search.trim().toLocaleLowerCase("it-IT");
		return TOOLS$1.filter((item) => {
			const matchesCategory = category === "Tutti" || item.category === category;
			const searchableText = `${item.title} ${item.description} ${item.keywords}`.toLocaleLowerCase("it-IT");
			return matchesCategory && (!query || searchableText.includes(query));
		});
	}, [category, search]);
	function recordCalculation(toolId, calculation, result) {
		const toolTitle = TOOLS$1.find((item) => item.id === toolId)?.title ?? "Calcolo";
		setHistory((current) => [{
			id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			toolId,
			toolTitle,
			calculation,
			result,
			createdAt: (/* @__PURE__ */ new Date()).toISOString()
		}, ...current].slice(0, HISTORY_LIMIT));
	}
	return /* @__PURE__ */ jsx("div", {
		className: "space-y-4",
		children: tool ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Button, {
			variant: "ghost",
			size: "sm",
			onClick: () => setTool(null),
			className: "pl-0",
			children: [/* @__PURE__ */ jsx(ArrowLeft, {}), " Tutti gli strumenti"]
		}), tool === "classroom" ? /* @__PURE__ */ jsx(ClassroomSeatingTool, {}) : tool === "simulator" ? /* @__PURE__ */ jsxs("div", {
			className: "space-y-4",
			children: [
				/* @__PURE__ */ jsx("h4", {
					className: "font-display text-xl font-semibold",
					children: "Simulatore voti"
				}),
				/* @__PURE__ */ jsx(PeriodPicker, {}),
				/* @__PURE__ */ jsx(SimulatorTool, {})
			]
		}) : tool === "scientific" || tool === "converter" || tool === "interval" || tool === "fractions" || tool === "vat" || tool === "discount" ? /* @__PURE__ */ jsx(UniversalCalculationPanel, {
			tool,
			onCalculation: recordCalculation
		}) : /* @__PURE__ */ jsx(UniversalCreationPanel, { tool })] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsxs("section", {
				className: "overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-4 shadow-sm",
				children: [
					/* @__PURE__ */ jsxs("p", {
						className: "flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary",
						children: [/* @__PURE__ */ jsx(Sparkles, { className: "h-3.5 w-3.5" }), " Strumenti tuttofare"]
					}),
					/* @__PURE__ */ jsx("h3", {
						className: "mt-1 font-display text-2xl font-semibold",
						children: "Calcolatore universale"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-2 text-xs leading-5 text-muted-foreground",
						children: "Calcoli, conversioni e piccoli strumenti, in un unico posto. La cronologia resta su questo dispositivo."
					})
				]
			}),
			/* @__PURE__ */ jsxs("label", {
				className: "relative block",
				children: [/* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ jsx("input", {
					"aria-label": "Cerca strumenti",
					value: search,
					onChange: (event) => setSearch(event.target.value),
					placeholder: "Cerca: IVA, chilometri, QR…",
					className: "h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				role: "group",
				"aria-label": "Categorie strumenti",
				className: "flex gap-2 overflow-x-auto pb-1",
				children: CATEGORIES.map((item) => /* @__PURE__ */ jsx("button", {
					type: "button",
					"aria-pressed": category === item,
					onClick: () => setCategory(item),
					className: `min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${category === item ? "border-primary bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground"}`,
					children: item
				}, item))
			}),
			/* @__PURE__ */ jsx("section", {
				"aria-label": "Strumenti disponibili",
				className: "space-y-2",
				children: filteredTools.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground",
					children: "Nessuno strumento corrisponde alla ricerca."
				}) : filteredTools.map(({ id, title, description, category: toolCategory, icon: Icon, tone }) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setTool(id),
					className: "press flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-sm",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface ${tone}`,
							children: /* @__PURE__ */ jsx(Icon, { className: "h-5 w-5" })
						}),
						/* @__PURE__ */ jsxs("span", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "block text-sm font-semibold",
									children: title
								}),
								/* @__PURE__ */ jsx("span", {
									className: "mt-0.5 block text-xs leading-4 text-muted-foreground",
									children: description
								}),
								/* @__PURE__ */ jsx("span", {
									className: "mt-1 block text-[10px] font-medium text-primary/80",
									children: toolCategory
								})
							]
						}),
						/* @__PURE__ */ jsx("span", {
							"aria-hidden": "true",
							className: "text-lg text-muted-foreground",
							children: "›"
						})
					]
				}, id))
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				"aria-label": "Cronologia dei calcoli",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ jsxs("h4", {
						className: "flex items-center gap-2 text-sm font-semibold",
						children: [/* @__PURE__ */ jsx(History, { className: "h-4 w-4 text-primary" }), " Cronologia"]
					}), history.length > 0 && /* @__PURE__ */ jsxs(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => setHistory([]),
						children: [/* @__PURE__ */ jsx(Trash2, { className: "h-3.5 w-3.5" }), " Cancella"]
					})]
				}), history.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted-foreground",
					children: "I calcoli che esegui compariranno qui, salvati solo su questo dispositivo."
				}) : /* @__PURE__ */ jsx("ol", {
					className: "space-y-2",
					children: history.map((entry) => /* @__PURE__ */ jsxs("li", {
						className: "rounded-lg bg-surface px-3 py-2.5",
						children: [
							/* @__PURE__ */ jsx("p", {
								className: "text-[10px] text-muted-foreground",
								children: entry.toolTitle
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-0.5 break-words text-xs",
								children: entry.calculation
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 break-words text-sm font-semibold text-primary",
								children: entry.result
							}),
							/* @__PURE__ */ jsx("time", {
								className: "mt-1 block text-[10px] text-muted-foreground",
								children: new Date(entry.createdAt).toLocaleString("it-IT", {
									day: "2-digit",
									month: "2-digit",
									hour: "2-digit",
									minute: "2-digit"
								})
							})
						]
					}, entry.id))
				})]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "flex items-center gap-2 text-[10px] leading-4 text-muted-foreground",
				children: [/* @__PURE__ */ jsx(Clock3, { className: "h-3.5 w-3.5 shrink-0" }), " I tassi di cambio non sono automatici: inserisci un tasso aggiornato nel convertitore valute."]
			})
		] })
	});
}
//#endregion
//#region src/components/voto/SchoolEndDateTool.tsx
function SchoolEndDateTool() {
	const [date, setDate] = useState("");
	const [closures, setClosures] = useState([]);
	const [excludeWeekends, setExcludeWeekends] = useState(true);
	const [closureStart, setClosureStart] = useState("");
	const [closureEnd, setClosureEnd] = useState("");
	const now = useClock();
	useEffect(() => {
		setDate(loadSchoolEndDate() ?? "");
		setClosures(loadSchoolClosures());
		setExcludeWeekends(loadExcludeWeekends());
	}, []);
	const updateExcludeWeekends = (checked) => {
		setExcludeWeekends(checked);
		saveExcludeWeekends(checked);
	};
	const updateDate = (value) => {
		setDate(value);
		if (value) saveSchoolEndDate(value);
		else clearSchoolEndDate();
	};
	const addClosure = () => {
		if (!closureStart || !closureEnd || closureStart > closureEnd) return;
		const next = [...closures, {
			start: closureStart,
			end: closureEnd
		}].sort((a, b) => a.start.localeCompare(b.start));
		if (saveSchoolClosures(next)) {
			setClosures(next);
			setClosureStart("");
			setClosureEnd("");
		}
	};
	const removeClosure = (index) => {
		const next = closures.filter((_, itemIndex) => itemIndex !== index);
		if (saveSchoolClosures(next)) setClosures(next);
	};
	const daysRemaining = date ? schoolDaysUntilSchoolEnd(date, now, closures, excludeWeekends) : null;
	const formattedDate = date ? fmtDate(date, {
		day: "2-digit",
		month: "long",
		year: "numeric"
	}) : "";
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-xs text-muted-foreground",
				children: "La data ufficiale di fine lezioni non è inclusa nei dati sincronizzati. Impostala qui e vedrai subito il conteggio aggiornato."
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				children: [
					/* @__PURE__ */ jsx("label", {
						htmlFor: "school-end-date",
						className: "block text-sm font-semibold",
						children: "Ultimo giorno di lezione"
					}),
					/* @__PURE__ */ jsx("input", {
						id: "school-end-date",
						type: "date",
						value: date,
						onChange: (event) => updateDate(event.target.value),
						className: "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					}),
					date ? /* @__PURE__ */ jsxs("p", {
						className: "text-xs text-success",
						children: [
							"Fine lezioni impostata per il ",
							formattedDate,
							"."
						]
					}) : /* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted-foreground",
						children: "Seleziona la data comunicata dalla scuola: il conteggio apparirà qui sotto."
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface flex items-start gap-3 p-4",
				children: [/* @__PURE__ */ jsx("input", {
					id: "school-exclude-weekends",
					type: "checkbox",
					checked: excludeWeekends,
					onChange: (event) => updateExcludeWeekends(event.target.checked),
					className: "mt-0.5 size-4 shrink-0 accent-primary",
					role: "switch",
					"aria-label": "Escludi sabato e domenica dal conteggio"
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
					htmlFor: "school-exclude-weekends",
					className: "block text-sm font-semibold",
					children: "Escludi sabato e domenica"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-[11px] text-muted-foreground",
					children: excludeWeekends ? "Attivo: il conteggio considera solo i giorni feriali." : "Disattivo: sabato e domenica vengono conteggiati come giorni rimanenti."
				})] })]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				"aria-labelledby": "school-closures-title",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
						id: "school-closures-title",
						className: "text-sm font-semibold",
						children: "Festività e chiusure extra"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-[11px] text-muted-foreground",
						children: "Puoi aggiungerne più di una. Per una festività singola scegli la stessa data in “Dal” e “Al”; per le vacanze inserisci l’intervallo."
					})] }),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ jsxs("label", {
							className: "text-[11px] text-muted-foreground",
							children: ["Dal", /* @__PURE__ */ jsx("input", {
								"aria-label": "Inizio chiusura scolastica",
								type: "date",
								value: closureStart,
								onChange: (event) => setClosureStart(event.target.value),
								className: "mt-1 h-10 w-full rounded-xl border border-input bg-card px-2 text-xs text-foreground"
							})]
						}), /* @__PURE__ */ jsxs("label", {
							className: "text-[11px] text-muted-foreground",
							children: ["Al", /* @__PURE__ */ jsx("input", {
								"aria-label": "Fine chiusura scolastica",
								type: "date",
								value: closureEnd,
								min: closureStart || void 0,
								onChange: (event) => setClosureEnd(event.target.value),
								className: "mt-1 h-10 w-full rounded-xl border border-input bg-card px-2 text-xs text-foreground"
							})]
						})]
					}),
					/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: addClosure,
						disabled: !closureStart || !closureEnd || closureStart > closureEnd,
						className: "h-10 rounded-xl bg-primary-soft px-3 text-xs font-semibold text-primary disabled:opacity-50",
						children: "Aggiungi festività o chiusura"
					}),
					closures.length > 0 && /* @__PURE__ */ jsx("ul", {
						className: "space-y-2",
						"aria-label": "Festività e chiusure aggiunte",
						children: closures.map((period, index) => /* @__PURE__ */ jsxs("li", {
							className: "flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-xs",
							children: [/* @__PURE__ */ jsxs("span", { children: [fmtDate(period.start, {
								day: "2-digit",
								month: "short",
								year: "numeric"
							}), period.start !== period.end && ` – ${fmtDate(period.end, {
								day: "2-digit",
								month: "short",
								year: "numeric"
							})}`] }), /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => removeClosure(index),
								"aria-label": `Rimuovi festività o chiusura dal ${period.start} al ${period.end}`,
								className: "px-2 py-1 font-medium text-danger",
								children: "Rimuovi"
							})]
						}, `${period.start}-${period.end}-${index}`))
					})
				]
			}),
			daysRemaining !== null && /* @__PURE__ */ jsxs("section", {
				role: "status",
				"aria-live": "polite",
				className: "rounded-2xl bg-primary-soft p-4 text-primary",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "text-xs font-medium uppercase tracking-wide",
						children: "Fine scuola"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-lg font-semibold",
						children: daysRemaining > 0 ? `Mancano ${daysRemaining} ${daysRemaining === 1 ? "giorno" : "giorni"} di lezione` : daysRemaining === 0 ? "Oggi è l’ultimo giorno di scuola" : `La data è passata da ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "giorno" : "giorni"} di lezione`
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-1 text-[11px] text-muted-foreground",
						children: [excludeWeekends ? "Esclusi sabati e domeniche, " : "Inclusi sabati e domeniche, ", "festività nazionali italiane e chiusure scolastiche extra inserite qui sopra sono escluse dal conteggio."]
					})
				]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-[11px] text-muted-foreground",
				children: "La data è salvata solo su questo dispositivo. Puoi comunque chiederla anche all’assistente locale quando vuoi."
			})
		]
	});
}
//#endregion
//#region src/lib/voto/study.ts
function wheelIndex(length, random) {
	return length > 0 ? Math.min(length - 1, Math.floor(Math.max(0, random) * length)) : null;
}
var DEFAULT_WHEEL_COLORS = ["#FDBA74", "#6EE7B7"];
function isWheelColor(value) {
	return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
function normalizeWheelSettings(value, fallbackSubjects = []) {
	const settings = value && typeof value === "object" ? value : {};
	const rawSubjects = Array.isArray(settings["subjects"]) ? settings["subjects"] : fallbackSubjects;
	const subjects = [];
	const seen = /* @__PURE__ */ new Set();
	for (const value of rawSubjects) {
		if (typeof value !== "string") continue;
		const subject = value.trim().replace(/\s+/g, " ").slice(0, 40).trim();
		const key = subject.toLocaleLowerCase();
		if (!subject || seen.has(key)) continue;
		seen.add(key);
		subjects.push(subject);
		if (subjects.length === 50) break;
	}
	const rawColors = Array.isArray(settings["colors"]) ? settings["colors"] : [];
	const rawSubjectColors = settings["subjectColors"];
	const subjectColors = {};
	if (rawSubjectColors && typeof rawSubjectColors === "object" && !Array.isArray(rawSubjectColors)) {
		for (const [subject, color] of Object.entries(rawSubjectColors)) if (subjects.includes(subject) && isWheelColor(color)) subjectColors[subject] = color;
	}
	return {
		subjects,
		colors: [isWheelColor(rawColors[0]) ? rawColors[0] : DEFAULT_WHEEL_COLORS[0], isWheelColor(rawColors[1]) ? rawColors[1] : DEFAULT_WHEEL_COLORS[1]],
		subjectColors
	};
}
function wheelTextColor(hex) {
	const value = hex.replace("#", "");
	const [red, green, blue] = [
		0,
		2,
		4
	].map((index) => Number.parseInt(value.slice(index, index + 2), 16) / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
	const luminance = .2126 * (red ?? 0) + .7152 * (green ?? 0) + .0722 * (blue ?? 0);
	return (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? "#171717" : "#FFFFFF";
}
function parseFlashcards(text) {
	const data = JSON.parse(text);
	if (!Array.isArray(data) || data.length > 1e3) throw new Error("File flashcard non valido (massimo 1000 carte).");
	return data.map((item, index) => {
		if (!item || typeof item !== "object") throw new Error("Carta non valida.");
		const card = item;
		if (typeof card["question"] !== "string" || !card["question"].trim() || typeof card["answer"] !== "string" || !card["answer"].trim()) throw new Error("Ogni carta deve contenere domanda e risposta.");
		return {
			id: String(index),
			question: card["question"].slice(0, 2e3),
			answer: card["answer"].slice(0, 4e3),
			subject: typeof card["subject"] === "string" ? card["subject"].slice(0, 100) : ""
		};
	});
}
//#endregion
//#region src/components/voto/StudyTools.tsx
var FIELD$1 = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm";
var WHEEL_PALETTES = [
	{
		name: "Alba",
		colors: ["#FDBA74", "#6EE7B7"]
	},
	{
		name: "Lavanda",
		colors: ["#C4B5FD", "#93C5FD"]
	},
	{
		name: "Mare",
		colors: ["#67E8F9", "#FDE68A"]
	},
	{
		name: "Fragola",
		colors: ["#FDA4AF", "#F9A8D4"]
	}
];
function WheelTool() {
	const { data } = useVoto();
	const [settings, setSettings] = useState(() => normalizeWheelSettings(load(KEYS.studyWheel, null), data.subjects.map((subject) => subject.name)));
	const [newSubject, setNewSubject] = useState("");
	const [result, setResult] = useState(null);
	const [spinning, setSpinning] = useState(false);
	const [rotation, setRotation] = useState(0);
	const timeout = useRef(null);
	const options = settings.subjects;
	const cleanNewSubject = newSubject.trim().replace(/\s+/g, " ").slice(0, 40);
	const subjectExists = options.some((subject) => subject.toLocaleLowerCase() === cleanNewSubject.toLocaleLowerCase());
	const canAddSubject = Boolean(cleanNewSubject) && !subjectExists && options.length < 50;
	const colorForSubject = (subject, index) => settings.subjectColors[subject] ?? settings.colors[index % 2] ?? DEFAULT_WHEEL_COLORS[0];
	useEffect(() => {
		save(KEYS.studyWheel, settings);
	}, [settings]);
	useEffect(() => () => {
		if (timeout.current) clearTimeout(timeout.current);
	}, []);
	const addSubject = (event) => {
		event.preventDefault();
		if (!canAddSubject || spinning) return;
		setSettings((current) => ({
			...current,
			subjects: [...current.subjects, cleanNewSubject]
		}));
		setNewSubject("");
		setResult(null);
	};
	const removeSubject = (subjectToRemove) => {
		setSettings((current) => {
			const subjectColors = { ...current.subjectColors };
			delete subjectColors[subjectToRemove];
			return {
				...current,
				subjects: current.subjects.filter((subject) => subject !== subjectToRemove),
				subjectColors
			};
		});
		setResult(null);
	};
	const setWheelColor = (index, color) => {
		if (!isWheelColor(color)) return;
		setSettings((current) => {
			const colors = [...current.colors];
			colors[index] = color;
			return {
				...current,
				colors
			};
		});
	};
	const setSubjectColor = (subject, color) => {
		if (!isWheelColor(color)) return;
		setSettings((current) => ({
			...current,
			subjectColors: {
				...current.subjectColors,
				[subject]: color
			}
		}));
	};
	const resetSubjectColor = (subject) => {
		setSettings((current) => {
			const subjectColors = { ...current.subjectColors };
			delete subjectColors[subject];
			return {
				...current,
				subjectColors
			};
		});
	};
	const spin = () => {
		const random = crypto.getRandomValues(/* @__PURE__ */ new Uint32Array(1))[0] ?? 0;
		const index = wheelIndex(options.length, random / 4294967296);
		if (index === null || spinning) return;
		const selected = options[index];
		if (!selected) return;
		setSpinning(true);
		setResult(null);
		const next = rotation + 1440 + (360 - (index + .5) * 360 / options.length - rotation % 360 + 360) % 360;
		setRotation(next);
		if (timeout.current) clearTimeout(timeout.current);
		timeout.current = setTimeout(() => {
			setResult(selected);
			setSpinning(false);
		}, 1800);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface overflow-hidden p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mb-4 flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
							className: "font-display text-base font-semibold",
							children: "È ora di ripassare"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Lascia scegliere alla ruota la prossima materia."
						})] }), /* @__PURE__ */ jsxs("span", {
							className: "shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground",
							children: [options.length, " / 50"]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "relative mx-auto mb-3 w-64 max-w-[82%] pt-3",
						children: [/* @__PURE__ */ jsx("span", {
							className: "absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl leading-none text-primary drop-shadow-sm",
							"aria-hidden": "true",
							children: "▼"
						}), /* @__PURE__ */ jsxs("svg", {
							viewBox: "0 0 240 240",
							className: "w-full drop-shadow-lg transition-transform duration-[1800ms] ease-out motion-reduce:transition-none",
							style: { transform: `rotate(${rotation}deg)` },
							role: "img",
							"aria-label": options.length ? `Ruota con ${options.length} materie` : "Ruota vuota",
							children: [
								options.length === 1 && /* @__PURE__ */ jsx("circle", {
									cx: "120",
									cy: "120",
									r: "118",
									fill: colorForSubject(options[0] ?? "", 0)
								}),
								options.length > 1 && options.map((option, index) => {
									const start = index * 2 * Math.PI / options.length - Math.PI / 2;
									const end = (index + 1) * 2 * Math.PI / options.length - Math.PI / 2;
									const mid = (start + end) / 2;
									const color = colorForSubject(option, index);
									const label = options.length <= 12 ? option.slice(0, 11) : String(index + 1);
									const labelX = 120 + 76 * Math.cos(mid);
									const labelY = 120 + 76 * Math.sin(mid);
									return /* @__PURE__ */ jsxs("g", { children: [/* @__PURE__ */ jsx("path", {
										d: `M120 120 L${120 + 118 * Math.cos(start)} ${120 + 118 * Math.sin(start)} A118 118 0 0 1 ${120 + 118 * Math.cos(end)} ${120 + 118 * Math.sin(end)} Z`,
										fill: color,
										stroke: "var(--background)",
										strokeWidth: "2"
									}), /* @__PURE__ */ jsx("text", {
										x: labelX,
										y: labelY,
										transform: `rotate(${-rotation} ${labelX} ${labelY})`,
										textAnchor: "middle",
										dominantBaseline: "middle",
										fill: wheelTextColor(color),
										className: "text-[9px] font-semibold",
										children: label
									})] }, option);
								}),
								options.length === 1 && /* @__PURE__ */ jsx("text", {
									x: "120",
									y: "55",
									transform: `rotate(${-rotation} 120 55)`,
									textAnchor: "middle",
									dominantBaseline: "middle",
									fill: wheelTextColor(colorForSubject(options[0] ?? "", 0)),
									className: "text-[10px] font-semibold",
									children: options[0]?.slice(0, 13)
								}),
								/* @__PURE__ */ jsx("circle", {
									cx: "120",
									cy: "120",
									r: "24",
									fill: "var(--card)",
									stroke: "var(--background)",
									strokeWidth: "4"
								}),
								/* @__PURE__ */ jsx("text", {
									x: "120",
									y: "120",
									transform: `rotate(${-rotation} 120 120)`,
									textAnchor: "middle",
									dominantBaseline: "middle",
									fill: "var(--foreground)",
									className: "text-[8px] font-bold",
									children: "VAI"
								})
							]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						"aria-live": "polite",
						className: "mb-3 flex min-h-[4.25rem] flex-col items-center justify-center rounded-xl bg-surface px-3 py-2 text-center",
						children: spinning ? /* @__PURE__ */ jsx("span", {
							className: "text-sm font-medium text-muted-foreground",
							children: "La ruota sta scegliendo…"
						}) : result ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
							className: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
							children: "Oggi si ripassa"
						}), /* @__PURE__ */ jsx("span", {
							className: "font-display text-xl font-bold text-primary",
							children: result
						})] }) : /* @__PURE__ */ jsx("span", {
							className: "text-sm text-muted-foreground",
							children: options.length ? "Pronto per la prossima materia?" : "Aggiungi una materia per iniziare."
						})
					}),
					/* @__PURE__ */ jsxs(Button, {
						className: "w-full",
						onClick: spin,
						disabled: spinning || options.length === 0,
						children: [/* @__PURE__ */ jsx(Shuffle, {}), spinning ? "Estrazione in corso…" : "Gira la ruota"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				"aria-labelledby": "wheel-subjects-title",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
							id: "wheel-subjects-title",
							className: "text-sm font-semibold",
							children: "Le tue materie"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Aggiungile qui; usa il campione per scegliere un colore e × per rimuoverle."
						})] }), /* @__PURE__ */ jsx(Sparkles, {
							className: "h-5 w-5 shrink-0 text-primary",
							"aria-hidden": "true"
						})]
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit: addSubject,
						className: "flex items-end gap-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "wheel-new-subject",
								className: "mb-1 block text-xs font-medium",
								children: "Nuova materia o argomento"
							}), /* @__PURE__ */ jsx("input", {
								id: "wheel-new-subject",
								value: newSubject,
								onChange: (event) => setNewSubject(event.target.value),
								disabled: spinning || options.length >= 50,
								maxLength: 40,
								placeholder: "Es. Matematica",
								className: FIELD$1
							})]
						}), /* @__PURE__ */ jsxs(Button, {
							type: "submit",
							disabled: spinning || !canAddSubject,
							className: "min-h-11 shrink-0 px-3",
							children: [/* @__PURE__ */ jsx(Plus, {}), "Aggiungi"]
						})]
					}),
					subjectExists && cleanNewSubject && /* @__PURE__ */ jsx("p", {
						className: "text-xs text-warning",
						role: "status",
						children: "Questa materia è già nella ruota."
					}),
					options.length ? /* @__PURE__ */ jsx("ul", {
						className: "space-y-2",
						"aria-label": "Materie nella ruota",
						children: options.map((subject, index) => /* @__PURE__ */ jsxs("li", {
							className: "flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface px-2",
							children: [
								/* @__PURE__ */ jsxs("label", {
									className: "flex min-w-0 flex-1 cursor-pointer items-center gap-2",
									children: [
										/* @__PURE__ */ jsxs("span", {
											className: "sr-only",
											children: ["Colore per ", subject]
										}),
										/* @__PURE__ */ jsx("input", {
											type: "color",
											"aria-label": `Colore per ${subject}`,
											value: colorForSubject(subject, index),
											disabled: spinning,
											onChange: (event) => setSubjectColor(subject, event.target.value),
											className: "h-8 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
										}),
										/* @__PURE__ */ jsx("span", {
											className: "min-w-0 truncate text-xs font-medium",
											children: subject
										})
									]
								}),
								settings.subjectColors[subject] && /* @__PURE__ */ jsx("button", {
									type: "button",
									"aria-label": `Ripristina colore predefinito per ${subject}`,
									title: "Usa il colore della palette",
									disabled: spinning,
									onClick: () => resetSubjectColor(subject),
									className: "press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40",
									children: /* @__PURE__ */ jsx(RotateCcw, { className: "h-3.5 w-3.5" })
								}),
								/* @__PURE__ */ jsx("button", {
									type: "button",
									"aria-label": `Rimuovi ${subject}`,
									title: `Rimuovi ${subject}`,
									disabled: spinning,
									onClick: () => removeSubject(subject),
									className: "press inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40",
									children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" })
								})
							]
						}, subject))
					}) : /* @__PURE__ */ jsxs("div", {
						className: "rounded-xl border border-dashed border-border bg-surface/60 px-3 py-4 text-center",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-sm font-medium",
							children: "La ruota è ancora vuota"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Scrivi una materia qui sopra e premi «Aggiungi»."
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				"aria-labelledby": "wheel-colors-title",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
						id: "wheel-colors-title",
						className: "text-sm font-semibold",
						children: "Colori predefiniti"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Scegli la palette di base; i colori impostati sulle singole materie restano indipendenti."
					})] }),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-2 gap-2",
						children: WHEEL_PALETTES.map((palette) => {
							const selected = palette.colors.every((color, index) => color.toLowerCase() === settings.colors[index]?.toLowerCase());
							return /* @__PURE__ */ jsxs("button", {
								type: "button",
								"aria-label": `Palette ${palette.name}`,
								"aria-pressed": selected,
								disabled: spinning,
								onClick: () => setSettings((current) => ({
									...current,
									colors: [...palette.colors]
								})),
								className: `press flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors ${selected ? "border-primary bg-primary-soft text-foreground" : "border-border bg-surface text-muted-foreground"}`,
								children: [/* @__PURE__ */ jsx("span", {
									className: "flex -space-x-1",
									"aria-hidden": "true",
									children: palette.colors.map((color) => /* @__PURE__ */ jsx("span", {
										className: "h-4 w-4 rounded-full border-2 border-card",
										style: { backgroundColor: color }
									}, color))
								}), palette.name]
							}, palette.name);
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-2 gap-3 border-t border-border pt-3",
						children: settings.colors.map((color, index) => /* @__PURE__ */ jsxs("label", {
							className: "block text-xs font-medium",
							children: [
								"Colore ",
								index === 0 ? "A" : "B",
								/* @__PURE__ */ jsxs("span", {
									className: "mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-2",
									children: [/* @__PURE__ */ jsx("input", {
										type: "color",
										"aria-label": `Colore ${index === 0 ? "A" : "B"} della ruota`,
										value: color,
										disabled: spinning,
										onChange: (event) => setWheelColor(index, event.target.value),
										className: "h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
									}), /* @__PURE__ */ jsx("span", {
										className: "font-mono text-[11px] text-muted-foreground",
										children: color.toUpperCase()
									})]
								})
							]
						}, index))
					}),
					/* @__PURE__ */ jsxs(Button, {
						type: "button",
						size: "sm",
						variant: "ghost",
						disabled: spinning || settings.colors.every((color, index) => color === DEFAULT_WHEEL_COLORS[index]),
						onClick: () => setSettings((current) => ({
							...current,
							colors: [...DEFAULT_WHEEL_COLORS]
						})),
						className: "px-0 text-xs text-muted-foreground",
						children: [/* @__PURE__ */ jsx(RotateCcw, {}), "Ripristina i colori"]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-[11px] text-muted-foreground",
						children: "Materie e colori vengono salvati solo su questo dispositivo."
					})
				]
			})
		]
	});
}
function FlashcardsTool() {
	const { cards, setCards } = useStudy();
	const [question, setQuestion] = useState("");
	const [answer, setAnswer] = useState("");
	const [subject, setSubject] = useState("");
	const [filter, setFilter] = useState("all");
	const [index, setIndex] = useState(0);
	const [flipped, setFlipped] = useState(false);
	const [known, setKnown] = useState([]);
	const [editing, setEditing] = useState(null);
	const file = useRef(null);
	const filtered = cards.filter((c) => (filter === "all" || c.subject === filter) && !known.includes(c.id));
	const card = filtered[index % Math.max(1, filtered.length)];
	const saveCard = () => {
		if (!question.trim() || !answer.trim()) return;
		const next = {
			id: editing ?? crypto.randomUUID(),
			question: question.trim(),
			answer: answer.trim(),
			subject: subject.trim()
		};
		setCards((all) => editing ? all.map((c) => c.id === editing ? next : c) : [...all, next]);
		setQuestion("");
		setAnswer("");
		setSubject("");
		setEditing(null);
	};
	const exportCards = () => {
		const url = URL.createObjectURL(new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" }));
		const a = document.createElement("a");
		a.href = url;
		a.download = "voto-flashcard.json";
		a.click();
		URL.revokeObjectURL(url);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ jsxs(Button, {
						variant: "outline",
						size: "sm",
						disabled: !cards.length,
						onClick: exportCards,
						children: [/* @__PURE__ */ jsx(Download, {}), "Esporta"]
					}),
					/* @__PURE__ */ jsxs(Button, {
						variant: "outline",
						size: "sm",
						onClick: () => file.current?.click(),
						children: [/* @__PURE__ */ jsx(Upload, {}), "Importa"]
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "ml-auto self-center text-xs text-muted-foreground",
						children: [cards.length, " carte"]
					})
				]
			}),
			/* @__PURE__ */ jsx("input", {
				ref: file,
				type: "file",
				accept: "application/json,.json",
				className: "hidden",
				"aria-label": "Importa flashcard",
				onChange: async (e) => {
					const selected = e.target.files?.[0];
					if (!selected) return;
					try {
						if (selected.size > 5242880) throw new Error("File troppo grande.");
						const imported = parseFlashcards(await selected.text());
						setCards(imported);
						setKnown([]);
						setIndex(0);
						setFlipped(false);
						toast.success("Flashcard importate");
					} catch (error) {
						toast.error(error instanceof Error ? error.message : "Importazione non riuscita");
					}
					e.target.value = "";
				}
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-xs text-muted-foreground",
				children: "Carte della sessione: esportale per conservarle e reimportarle in seguito."
			}),
			/* @__PURE__ */ jsxs("select", {
				"aria-label": "Materia flashcard",
				value: filter,
				onChange: (e) => {
					setFilter(e.target.value);
					setIndex(0);
					setFlipped(false);
				},
				className: FIELD$1,
				children: [/* @__PURE__ */ jsx("option", {
					value: "all",
					children: "Tutte le materie"
				}), [...new Set(cards.map((c) => c.subject))].map((s) => /* @__PURE__ */ jsx("option", {
					value: s,
					children: s || "Senza materia"
				}, s))]
			}),
			card ? /* @__PURE__ */ jsxs(Fragment, { children: [
				/* @__PURE__ */ jsxs(Button, {
					variant: "outline",
					onClick: () => setFlipped(!flipped),
					className: "flex min-h-48 w-full flex-col gap-3 whitespace-normal break-words px-5 py-6 text-center",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "text-[10px] uppercase text-muted-foreground",
							children: [
								flipped ? "Risposta" : "Domanda",
								" · ",
								card.subject || "Generale"
							]
						}),
						/* @__PURE__ */ jsx("span", {
							className: "text-lg",
							children: flipped ? card.answer : card.question
						}),
						/* @__PURE__ */ jsx(FlipHorizontal2, { className: "text-primary" })
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ jsx(Button, {
						variant: "secondary",
						onClick: () => {
							setIndex(index + 1);
							setFlipped(false);
						},
						children: "Da ripassare"
					}), /* @__PURE__ */ jsx(Button, {
						onClick: () => {
							setKnown([...known, card.id]);
							setFlipped(false);
						},
						children: "La so"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted-foreground",
						children: [
							known.length,
							" imparate · ",
							filtered.length,
							" da ripassare"
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex gap-1",
						children: [/* @__PURE__ */ jsx(Button, {
							size: "sm",
							variant: "ghost",
							onClick: () => {
								setQuestion(card.question);
								setAnswer(card.answer);
								setSubject(card.subject);
								setEditing(card.id);
							},
							children: "Modifica"
						}), /* @__PURE__ */ jsx(Button, {
							size: "icon",
							variant: "ghost",
							"aria-label": "Elimina flashcard",
							title: "Elimina flashcard",
							onClick: () => {
								setCards(cards.filter((c) => c.id !== card.id));
								setFlipped(false);
							},
							children: /* @__PURE__ */ jsx(Trash2, {})
						})]
					})]
				})
			] }) : /* @__PURE__ */ jsx("p", {
				className: "py-6 text-center text-sm text-muted-foreground",
				children: cards.length ? "Ripasso completato!" : "Il tuo mazzo è ancora vuoto."
			}),
			known.length > 0 && /* @__PURE__ */ jsxs(Button, {
				variant: "outline",
				onClick: () => {
					setKnown([]);
					setIndex(0);
				},
				children: [/* @__PURE__ */ jsx(RotateCcw, {}), "Ricomincia ripasso"]
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: (e) => {
					e.preventDefault();
					saveCard();
				},
				className: "space-y-2 border-t border-border pt-4",
				children: [
					/* @__PURE__ */ jsx("h3", {
						className: "text-sm font-semibold",
						children: editing ? "Modifica carta" : "Nuova flashcard"
					}),
					/* @__PURE__ */ jsx("input", {
						"aria-label": "Materia della nuova flashcard",
						placeholder: "Materia",
						value: subject,
						onChange: (e) => setSubject(e.target.value),
						className: FIELD$1,
						maxLength: 100
					}),
					/* @__PURE__ */ jsx("textarea", {
						"aria-label": "Domanda",
						placeholder: "Domanda",
						required: true,
						maxLength: 2e3,
						value: question,
						onChange: (e) => setQuestion(e.target.value),
						className: "w-full rounded-lg border border-input bg-card p-3 text-sm"
					}),
					/* @__PURE__ */ jsx("textarea", {
						"aria-label": "Risposta",
						placeholder: "Risposta",
						required: true,
						maxLength: 4e3,
						value: answer,
						onChange: (e) => setAnswer(e.target.value),
						className: "w-full rounded-lg border border-input bg-card p-3 text-sm"
					}),
					/* @__PURE__ */ jsxs(Button, {
						type: "submit",
						disabled: !question.trim() || !answer.trim(),
						className: "w-full",
						children: [/* @__PURE__ */ jsx(Plus, {}), editing ? "Salva modifiche" : "Aggiungi carta"]
					}),
					editing && /* @__PURE__ */ jsx(Button, {
						variant: "ghost",
						onClick: () => {
							setEditing(null);
							setQuestion("");
							setAnswer("");
							setSubject("");
						},
						children: "Annulla"
					})
				]
			})
		]
	});
}
//#endregion
//#region src/components/voto/StudyPlannerTool.tsx
var MANUAL_TASKS_KEY = "voto.study-planner.manual-tasks.v1";
var DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
var METHODS = [
	{
		value: "ripasso",
		label: "Ripasso"
	},
	{
		value: "esercizi",
		label: "Esercizi"
	},
	{
		value: "lettura",
		label: "Lettura"
	},
	{
		value: "preparazione",
		label: "Preparazione verifica/interrogazione"
	},
	{
		value: "altro",
		label: "Altro"
	}
];
function dateFromKey(value) {
	const match = DATE_PATTERN.exec(value);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day, 12);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
	return date;
}
function dateKey(date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(value, amount) {
	const date = dateFromKey(value);
	if (!date) return value;
	date.setDate(date.getDate() + amount);
	return dateKey(date);
}
function mondayOf(value) {
	const date = dateFromKey(value);
	if (!date) return value;
	date.setDate(date.getDate() - (date.getDay() + 6) % 7);
	return dateKey(date);
}
function daysBetween(start, end) {
	const from = dateFromKey(start);
	const to = dateFromKey(end);
	if (!from || !to) return 0;
	return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 864e5);
}
function dayLabel(value) {
	const date = dateFromKey(value);
	if (!date) return value;
	return date.toLocaleDateString("it-IT", {
		weekday: "long",
		day: "numeric",
		month: "short"
	}).replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase("it-IT"));
}
function weekLabel(start) {
	const first = dateFromKey(start);
	const last = dateFromKey(addDays(start, 6));
	if (!first || !last) return "Settimana";
	return `Settimana ${first.toLocaleDateString("it-IT", {
		day: "numeric",
		month: "long"
	})} – ${last.toLocaleDateString("it-IT", {
		day: "numeric",
		month: "long",
		year: "numeric"
	})}`;
}
function loadManualTasks() {
	try {
		const value = JSON.parse(localStorage.getItem(MANUAL_TASKS_KEY) ?? "[]");
		if (!Array.isArray(value)) return [];
		return value.flatMap((item) => {
			if (!item || typeof item !== "object") return [];
			const stored = item;
			const id = stored["id"];
			const title = stored["title"];
			const date = stored["date"];
			const minutes = stored["minutes"];
			const storedMethod = stored["method"] ?? stored["kind"];
			const subject = stored["subject"];
			const startTime = stored["startTime"];
			const completed = stored["completed"];
			if (typeof id !== "string" || typeof title !== "string" || typeof date !== "string" || !dateFromKey(date) || typeof minutes !== "number") return [];
			const method = METHODS.some((option) => option.value === storedMethod) ? storedMethod : storedMethod === "verifica" || storedMethod === "interrogazione" ? "preparazione" : "esercizi";
			return [{
				id,
				title,
				subject: typeof subject === "string" ? subject : "",
				method,
				date,
				startTime: typeof startTime === "string" && /^\d{2}:\d{2}$/.test(startTime) ? startTime : "16:00",
				minutes: Math.max(15, Math.min(360, minutes)),
				completed: completed === true
			}];
		});
	} catch {
		return [];
	}
}
function saveManualTasks(tasks) {
	try {
		localStorage.setItem(MANUAL_TASKS_KEY, JSON.stringify(tasks));
	} catch {}
}
function methodLabel(method) {
	return METHODS.find((option) => option.value === method)?.label ?? "Studio";
}
function StudyPlannerTool() {
	const { data, interrogazioni } = useVoto();
	const today = dateKey(useClock());
	const currentWeekStart = mondayOf(today);
	const [manualTasks, setManualTasks] = useState(() => loadManualTasks());
	const [manualTitle, setManualTitle] = useState("");
	const [manualSubject, setManualSubject] = useState("");
	const [manualMethod, setManualMethod] = useState("ripasso");
	const [manualMinutes, setManualMinutes] = useState("45");
	const [manualDate, setManualDate] = useState(today);
	const [manualStartTime, setManualStartTime] = useState("16:00");
	const [weekOffset, setWeekOffset] = useState(0);
	const weekStart = addDays(currentWeekStart, weekOffset * 7);
	const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
	const weekTasks = manualTasks.filter((task) => weekDays.includes(task.date));
	const openTasks = weekTasks.filter((task) => !task.completed).length;
	const plannedMinutes = weekTasks.reduce((total, task) => total + task.minutes, 0);
	const subjectOptions = [...new Set([
		...data.subjects.map((subject) => subject.name),
		...data.assignments.map((item) => item.subject ?? ""),
		...interrogazioni.map((item) => item.subject)
	].filter(Boolean))];
	const selectDate = (value) => {
		if (!dateFromKey(value)) return;
		setManualDate(value);
		const targetWeekStart = mondayOf(value);
		setWeekOffset(Math.round(daysBetween(currentWeekStart, targetWeekStart) / 7));
	};
	const changeWeek = (amount) => {
		const nextStart = addDays(weekStart, amount * 7);
		setWeekOffset((current) => current + amount);
		setManualDate(nextStart);
	};
	const addManualTask = (event) => {
		event.preventDefault();
		const title = manualTitle.trim();
		const minutes = Math.max(15, Math.min(360, Number(manualMinutes) || 45));
		if (!title || !dateFromKey(manualDate)) return;
		const task = {
			id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			title,
			subject: manualSubject.trim(),
			method: manualMethod,
			date: manualDate,
			startTime: manualStartTime || "16:00",
			minutes,
			completed: false
		};
		const next = [...manualTasks, task];
		setManualTasks(next);
		saveManualTasks(next);
		setManualTitle("");
	};
	const toggleTask = (taskId) => {
		const next = manualTasks.map((task) => task.id === taskId ? {
			...task,
			completed: !task.completed
		} : task);
		setManualTasks(next);
		saveManualTasks(next);
	};
	const removeTask = (taskId) => {
		const next = manualTasks.filter((task) => task.id !== taskId);
		setManualTasks(next);
		saveManualTasks(next);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsx("section", {
				className: "overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-5 shadow-sm",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx("p", {
							className: "text-[10px] font-bold uppercase tracking-[0.16em] text-primary",
							children: "Piano personale"
						}),
						/* @__PURE__ */ jsx("h3", {
							className: "mt-1 font-display text-2xl font-semibold",
							children: "Planner di studio"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 max-w-xl text-xs leading-5 text-muted-foreground",
							children: "Decidi tu materia, argomento, metodo, giorno e durata. Le sessioni restano salvate su questo dispositivo: nessuna attività viene pianificata automaticamente."
						})
					] }), /* @__PURE__ */ jsx("span", {
						className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
						children: /* @__PURE__ */ jsx(CalendarClock, { className: "h-5 w-5" })
					})]
				})
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				"aria-labelledby": "planner-add-title",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
					id: "planner-add-title",
					className: "font-display text-base font-semibold",
					children: "Aggiungi una sessione"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Scrivi un obiettivo concreto, per esempio “Ripassare le equazioni del secondo grado”."
				})] }), /* @__PURE__ */ jsxs("form", {
					onSubmit: addManualTask,
					className: "space-y-3",
					children: [
						/* @__PURE__ */ jsxs("label", {
							className: "block text-xs font-semibold",
							children: ["Argomento o obiettivo", /* @__PURE__ */ jsx("input", {
								value: manualTitle,
								onChange: (event) => setManualTitle(event.target.value),
								placeholder: "Es. Ripassare le equazioni del secondo grado",
								maxLength: 120,
								className: "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal",
								"aria-label": "Argomento o obiettivo",
								required: true
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ jsxs("label", {
								className: "block text-xs font-semibold",
								children: [
									"Materia",
									/* @__PURE__ */ jsx("input", {
										value: manualSubject,
										onChange: (event) => setManualSubject(event.target.value),
										list: "planner-subject-options",
										maxLength: 80,
										placeholder: "Es. Matematica",
										className: "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal",
										"aria-label": "Materia"
									}),
									/* @__PURE__ */ jsx("datalist", {
										id: "planner-subject-options",
										children: subjectOptions.map((subject) => /* @__PURE__ */ jsx("option", { value: subject }, subject))
									})
								]
							}), /* @__PURE__ */ jsxs("label", {
								className: "block text-xs font-semibold",
								children: ["Metodo", /* @__PURE__ */ jsx("select", {
									value: manualMethod,
									onChange: (event) => setManualMethod(event.target.value),
									className: "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal",
									"aria-label": "Metodo di studio",
									children: METHODS.map((option) => /* @__PURE__ */ jsx("option", {
										value: option.value,
										children: option.label
									}, option.value))
								})]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
							children: [
								/* @__PURE__ */ jsxs("label", {
									className: "block text-xs font-semibold",
									children: ["Giorno", /* @__PURE__ */ jsx("input", {
										type: "date",
										value: manualDate,
										onChange: (event) => selectDate(event.target.value),
										className: "mt-1 h-11 w-full rounded-lg border border-input bg-card px-2 text-sm font-normal",
										"aria-label": "Giorno della sessione",
										required: true
									})]
								}),
								/* @__PURE__ */ jsxs("label", {
									className: "block text-xs font-semibold",
									children: ["Inizio", /* @__PURE__ */ jsx("input", {
										type: "time",
										value: manualStartTime,
										onChange: (event) => setManualStartTime(event.target.value),
										className: "mt-1 h-11 w-full rounded-lg border border-input bg-card px-2 text-sm font-normal",
										"aria-label": "Orario di inizio",
										required: true
									})]
								}),
								/* @__PURE__ */ jsxs("label", {
									className: "block text-xs font-semibold",
									children: ["Durata", /* @__PURE__ */ jsxs("span", {
										className: "mt-1 flex h-11 items-center rounded-lg border border-input bg-card pr-3",
										children: [/* @__PURE__ */ jsx("input", {
											type: "number",
											min: 15,
											max: 360,
											step: 15,
											inputMode: "numeric",
											value: manualMinutes,
											onChange: (event) => setManualMinutes(event.target.value.replace(/\D/g, "").slice(0, 3)),
											className: "h-full min-w-0 flex-1 rounded-lg bg-transparent px-3 text-sm font-normal outline-none",
											"aria-label": "Durata in minuti",
											required: true
										}), /* @__PURE__ */ jsx("span", {
											className: "text-[11px] font-normal text-muted-foreground",
											children: "min"
										})]
									})]
								}),
								/* @__PURE__ */ jsxs(Button, {
									type: "submit",
									className: "self-end",
									children: [/* @__PURE__ */ jsx(Plus, {}), " Aggiungi"]
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-xl border border-primary/20 bg-primary-soft/30 p-3 text-xs",
				children: [
					/* @__PURE__ */ jsx("strong", { children: openTasks }),
					" sessioni ancora da fare questa settimana ·",
					" ",
					/* @__PURE__ */ jsx("strong", { children: plannedMinutes }),
					" minuti pianificati."
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				"aria-labelledby": "planner-week-title",
				className: "space-y-3",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
						className: "text-[10px] font-bold uppercase tracking-[0.14em] text-primary",
						children: "Il tuo piano"
					}), /* @__PURE__ */ jsx("h3", {
						id: "planner-week-title",
						className: "font-display text-base font-semibold",
						children: weekLabel(weekStart)
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1",
						children: [
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								size: "icon",
								"aria-label": "Settimana precedente",
								title: "Settimana precedente",
								onClick: () => changeWeek(-1),
								children: /* @__PURE__ */ jsx(ArrowLeft, {})
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								size: "sm",
								disabled: weekOffset === 0,
								onClick: () => {
									setWeekOffset(0);
									setManualDate(today);
								},
								children: "Oggi"
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								size: "icon",
								"aria-label": "Settimana successiva",
								title: "Settimana successiva",
								onClick: () => changeWeek(1),
								children: /* @__PURE__ */ jsx(ArrowRight, {})
							})
						]
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "grid gap-3 md:grid-cols-2",
					children: weekDays.map((day) => {
						const tasks = manualTasks.filter((task) => task.date === day).sort((left, right) => left.startTime.localeCompare(right.startTime));
						return /* @__PURE__ */ jsxs("section", {
							className: `overflow-hidden rounded-xl border ${tasks.length ? "border-border bg-card shadow-sm" : "border-dashed border-border/70 bg-surface/40"}`,
							children: [/* @__PURE__ */ jsxs("div", {
								className: "flex items-center justify-between border-b border-border px-4 py-3",
								children: [/* @__PURE__ */ jsx("h4", {
									className: "font-semibold",
									children: dayLabel(day)
								}), /* @__PURE__ */ jsxs("span", {
									className: "flex items-center gap-1 text-[11px] text-muted-foreground",
									children: [
										/* @__PURE__ */ jsx(Clock3, { className: "h-3.5 w-3.5" }),
										tasks.reduce((total, task) => total + task.minutes, 0),
										" min"
									]
								})]
							}), tasks.length ? /* @__PURE__ */ jsx("div", {
								className: "divide-y divide-border",
								children: tasks.map((task) => /* @__PURE__ */ jsxs("div", {
									className: `flex items-start gap-3 px-4 py-3 ${task.completed ? "bg-surface/60 opacity-70" : ""}`,
									children: [
										/* @__PURE__ */ jsx("span", {
											className: `mt-0.5 shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${task.completed ? "bg-success/15 text-success" : "bg-primary-soft text-primary"}`,
											children: task.completed ? "Fatto" : `${task.startTime} · ${task.minutes} min`
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ jsx("p", {
												className: `break-words text-sm font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`,
												children: task.title
											}), /* @__PURE__ */ jsxs("p", {
												className: "mt-0.5 text-[11px] text-muted-foreground",
												children: [methodLabel(task.method), task.subject ? ` · ${task.subject}` : ""]
											})]
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "flex shrink-0 gap-1",
											children: [/* @__PURE__ */ jsx(Button, {
												type: "button",
												variant: "ghost",
												size: "icon",
												"aria-label": `${task.completed ? "Segna da fare" : "Segna completata"}: ${task.title}`,
												title: task.completed ? "Segna da fare" : "Segna completata",
												onClick: () => toggleTask(task.id),
												children: /* @__PURE__ */ jsx(Check, {})
											}), /* @__PURE__ */ jsx(Button, {
												type: "button",
												variant: "ghost",
												size: "icon",
												"aria-label": `Elimina: ${task.title}`,
												title: "Elimina sessione",
												onClick: () => removeTask(task.id),
												children: /* @__PURE__ */ jsx(Trash2, {})
											})]
										})
									]
								}, task.id))
							}) : /* @__PURE__ */ jsx("p", {
								className: "px-4 py-4 text-xs text-muted-foreground",
								children: "Nessuna sessione pianificata."
							})]
						}, day);
					})
				})]
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-center text-[11px] text-muted-foreground",
				children: "Il planner è personale e funziona anche offline; i dati restano su questo dispositivo."
			})
		]
	});
}
//#endregion
//#region src/components/voto/StudyLabFeatures.tsx
var FIELD = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm";
function formatCountdown(date) {
	const target = (/* @__PURE__ */ new Date(`${date.slice(0, 10)}T08:00:00`)).getTime();
	const distance = target - Date.now();
	if (!Number.isFinite(target) || distance <= 0) return "È oggi o è già passata";
	const days = Math.floor(distance / 864e5);
	const hours = Math.floor(distance % 864e5 / 36e5);
	return `${days} ${days === 1 ? "giorno" : "giorni"} e ${hours} ore`;
}
function InterrogationPrepTool() {
	const v = useVoto();
	const [selectedId, setSelectedId] = useState("");
	const [subject, setSubject] = useState("");
	const [date, setDate] = useState("");
	const [topics, setTopics] = useState("");
	const [questions, setQuestions] = useState([]);
	const [question, setQuestion] = useState("");
	const active = v.interrogazioni.find((item) => item.id === selectedId) ?? (subject && date ? {
		id: "draft",
		subject,
		date,
		completed: false,
		checklist: DEFAULT_PREPARATION.map((item) => ({ ...item }))
	} : null);
	const pending = active?.checklist.filter((item) => !item.done).length ?? 0;
	const randomQuestion = questions.length ? questions[Math.floor(Math.random() * questions.length)] : null;
	function selectInterrogation(id) {
		const item = v.interrogazioni.find((entry) => entry.id === id);
		setSelectedId(id);
		if (item) {
			setSubject(item.subject);
			setDate(item.date.slice(0, 10));
			setTopics(item.notes ?? "");
		}
	}
	function addQuestion() {
		const value = question.trim().slice(0, 240);
		if (!value || questions.length >= 30) return;
		setQuestions((current) => [...current, value]);
		setQuestion("");
	}
	function toggleChecklist(id) {
		if (active?.id === "draft") return;
		v.toggleInterrogazionePrep(active?.id ?? "", id);
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
						className: "font-display text-base font-semibold",
						children: "Prima dell’interrogazione"
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-xs leading-5 text-muted-foreground",
						children: "Una schermata rapida con argomenti, checklist, obiettivo e domande da ripassare."
					})] }),
					v.interrogazioni.length > 0 && /* @__PURE__ */ jsxs("label", {
						className: "block space-y-1 text-xs font-medium",
						children: ["Usa un’interrogazione già registrata", /* @__PURE__ */ jsxs("select", {
							className: FIELD,
							value: selectedId,
							onChange: (event) => selectInterrogation(event.target.value),
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Nuova preparazione"
							}), v.interrogazioni.map((item) => /* @__PURE__ */ jsxs("option", {
								value: item.id,
								children: [
									item.subject,
									" · ",
									item.date.slice(0, 10)
								]
							}, item.id))]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid grid-cols-2 gap-2",
						children: [/* @__PURE__ */ jsxs("label", {
							className: "block space-y-1 text-xs font-medium",
							children: ["Materia", /* @__PURE__ */ jsx("input", {
								className: FIELD,
								value: subject,
								onChange: (event) => setSubject(event.target.value),
								placeholder: "Es. Storia"
							})]
						}), /* @__PURE__ */ jsxs("label", {
							className: "block space-y-1 text-xs font-medium",
							children: ["Data", /* @__PURE__ */ jsx("input", {
								className: FIELD,
								type: "date",
								value: date,
								onChange: (event) => setDate(event.target.value)
							})]
						})]
					}),
					active && /* @__PURE__ */ jsxs("div", {
						className: "rounded-xl bg-primary-soft p-3",
						children: [
							/* @__PURE__ */ jsx("p", {
								className: "text-[10px] font-semibold uppercase tracking-wider text-primary",
								children: "Tempo rimanente"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 font-display text-xl font-bold",
								children: formatCountdown(active.date)
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: [
									active.subject,
									" ·",
									" ",
									pending ? `${pending} attività da completare` : "Checklist completata"
								]
							})
						]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "block space-y-1 text-xs font-medium",
						children: ["Argomenti e appunti", /* @__PURE__ */ jsx("textarea", {
							className: "min-h-24 w-full rounded-lg border border-input bg-card p-3 text-sm",
							value: topics,
							onChange: (event) => setTopics(event.target.value.slice(0, 4e3)),
							placeholder: "Capitoli, formule, parole chiave…"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-xs font-semibold",
							children: "Checklist"
						}), (active?.checklist ?? DEFAULT_PREPARATION).map((item) => /* @__PURE__ */ jsxs("label", {
							className: "flex min-h-10 items-center gap-2 rounded-lg bg-surface px-3 text-xs",
							children: [/* @__PURE__ */ jsx("input", {
								type: "checkbox",
								checked: item.done,
								disabled: !active || active.id === "draft",
								onChange: () => toggleChecklist(item.id)
							}), /* @__PURE__ */ jsx("span", {
								className: item.done ? "text-muted-foreground line-through" : "",
								children: item.label
							})]
						}, item.id))]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "card-surface space-y-3 p-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-start justify-between gap-2",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
							className: "text-sm font-semibold",
							children: "Domande di ripasso"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Inserisci le domande che vuoi saper spiegare a voce."
						})] }), /* @__PURE__ */ jsx(Shuffle, { className: "h-4 w-4 text-primary" })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ jsx("input", {
							className: FIELD,
							value: question,
							onChange: (event) => setQuestion(event.target.value),
							onKeyDown: (event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									addQuestion();
								}
							},
							placeholder: "Es. Quali sono le cause…",
							maxLength: 240
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							size: "icon",
							onClick: addQuestion,
							disabled: !question.trim(),
							"aria-label": "Aggiungi domanda",
							children: /* @__PURE__ */ jsx(Plus, {})
						})]
					}),
					randomQuestion && /* @__PURE__ */ jsxs("div", {
						className: "rounded-xl border border-primary/20 bg-primary-soft p-3",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-[10px] font-semibold uppercase text-primary",
							children: "Domanda del momento"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm font-medium",
							children: randomQuestion
						})]
					}),
					questions.length > 0 && /* @__PURE__ */ jsx("ul", {
						className: "space-y-1 text-xs text-muted-foreground",
						children: questions.map((item, index) => /* @__PURE__ */ jsx("li", {
							className: "rounded-lg bg-surface px-3 py-2",
							children: item
						}, `${item}-${index}`))
					}),
					/* @__PURE__ */ jsxs(Button, {
						type: "button",
						variant: "outline",
						className: "w-full",
						disabled: !questions.length,
						onClick: () => {
							const value = questions[Math.floor(Math.random() * questions.length)];
							if (value && navigator.clipboard) navigator.clipboard.writeText(value).then(() => toast.success("Domanda copiata"));
						},
						children: [/* @__PURE__ */ jsx(Copy, {}), " Copia una domanda"]
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "flex gap-2 rounded-lg bg-surface p-3 text-[10px] leading-4 text-muted-foreground",
				children: [/* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5 shrink-0 text-success" }), " La preparazione e le domande restano sul dispositivo."]
			})
		]
	});
}
function PhotoImportTool() {
	const [file, setFile] = useState(null);
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState("");
	async function extract() {
		if (!file) return;
		setBusy(true);
		setError("");
		setText("");
		setProgress(0);
		try {
			const { createWorker } = await import("tesseract.js");
			const worker = await createWorker("ita", 1, { logger: (message) => {
				if (message.status === "recognizing text") setProgress(Math.round(message.progress * 100));
			} });
			try {
				const result = await worker.recognize(file);
				setText(result.data.text.trim() || "Nessun testo riconosciuto.");
			} finally {
				await worker.terminate();
			}
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : "OCR non riuscito.");
		} finally {
			setBusy(false);
		}
	}
	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			toast.success("Testo copiato");
		} catch {
			toast.error("Copia non disponibile: seleziona il testo manualmente.");
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ jsxs("section", {
			className: "card-surface space-y-3 p-4",
			children: [
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
					className: "font-display text-base font-semibold",
					children: "Importa da foto"
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1 text-xs leading-5 text-muted-foreground",
					children: "Scegli una foto dalla galleria oppure scattala al momento, se il dispositivo lo consente. L’OCR estrae il testo direttamente nel browser."
				})] }),
				/* @__PURE__ */ jsxs("label", {
					className: "block space-y-1 text-xs font-medium",
					children: ["Foto o screenshot", /* @__PURE__ */ jsx("input", {
						className: "block min-h-12 w-full rounded-lg border border-input bg-card px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-primary",
						type: "file",
						accept: "image/*",
						onChange: (event) => {
							setFile(event.target.files?.[0] ?? null);
							setText("");
							setError("");
						}
					})]
				}),
				file && /* @__PURE__ */ jsxs("p", {
					className: "break-all text-[11px] text-muted-foreground",
					children: [
						file.name,
						" · ",
						(file.size / 1048576).toFixed(1),
						" MB"
					]
				}),
				/* @__PURE__ */ jsx(Button, {
					className: "w-full",
					disabled: !file || busy,
					onClick: extract,
					children: busy ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsx(LoaderCircle, { className: "animate-spin" }),
						" OCR in corso ",
						progress,
						"%"
					] }) : /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Camera, {}), " Leggi la foto"] })
				}),
				error && /* @__PURE__ */ jsx("p", {
					role: "alert",
					className: "rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger",
					children: error
				}),
				text && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("label", {
					className: "block space-y-1 text-xs font-medium",
					children: ["Testo riconosciuto", /* @__PURE__ */ jsx("textarea", {
						className: "min-h-52 w-full rounded-lg border border-input bg-card p-3 text-xs leading-5",
						value: text,
						onChange: (event) => setText(event.target.value)
					})]
				}), /* @__PURE__ */ jsxs(Button, {
					variant: "outline",
					className: "w-full",
					onClick: copy,
					children: [/* @__PURE__ */ jsx(Clipboard, {}), " Copia testo"]
				})] })
			]
		}), /* @__PURE__ */ jsx("p", {
			className: "text-[10px] leading-4 text-muted-foreground",
			children: "L’immagine non viene caricata su server: il riconoscimento avviene localmente. Verifica sempre numeri, date e formule."
		})]
	});
}
//#endregion
//#region src/routes/studio.tsx?tsr-split=component
var TOOLS = [
	{
		id: "universal-calculator",
		title: "Calcolatore universale",
		subtitle: "Calcoli, media, assenze, simulatore voti, piantina e altro",
		icon: Calculator,
		tone: "text-primary bg-surface"
	},
	{
		id: "school-end",
		title: "Fine scuola",
		subtitle: "Imposta la data ufficiale e chiedi all’assistente quanto manca",
		icon: CalendarDays,
		tone: "text-primary bg-surface"
	},
	{
		id: "wheel",
		title: "Ruota del ripasso",
		subtitle: "Lascia decidere al caso",
		icon: CircleDot,
		tone: "text-warning bg-surface"
	},
	{
		id: "flashcards",
		title: "Flashcard",
		subtitle: "Domanda. Risposta. Ripeti.",
		icon: Layers,
		tone: "text-success bg-surface"
	},
	{
		id: "planner",
		title: "Planner di studio",
		subtitle: "Decidi tu cosa studiare, quando e per quanto tempo",
		icon: ListChecks,
		tone: "text-primary bg-surface"
	},
	{
		id: "interrogation-prep",
		title: "Prima dell’interrogazione",
		subtitle: "Checklist, argomenti, conto alla rovescia e domande di ripasso",
		icon: ListChecks,
		tone: "text-warning bg-surface"
	},
	{
		id: "photo-import",
		title: "Importa da foto",
		subtitle: "Leggi appunti, lavagna o diario con OCR locale",
		icon: Camera,
		tone: "text-success bg-surface"
	}
];
function Studio() {
	const [tool, setTool] = useState(null);
	const selected = TOOLS.find((item) => item.id === tool);
	return /* @__PURE__ */ jsxs("div", {
		className: "pt-5",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mb-6 flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
				className: "mb-1 text-[10px] font-semibold uppercase text-primary",
				children: "Il tuo spazio studio"
			}), /* @__PURE__ */ jsxs("h1", {
				className: "font-display text-3xl font-semibold",
				children: ["Studio Lab", /* @__PURE__ */ jsx("span", {
					className: "text-primary",
					children: "."
				})]
			})] }), /* @__PURE__ */ jsx(Sparkles, { className: "mt-2 h-6 w-6 text-primary" })]
		}), selected ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs(Button, {
			variant: "ghost",
			size: "sm",
			onClick: () => setTool(null),
			className: "mb-4 pl-0",
			children: [/* @__PURE__ */ jsx(ArrowLeft, {}), " Tutti gli strumenti"]
		}), tool === "universal-calculator" ? /* @__PURE__ */ jsx(UniversalCalculator, {}) : /* @__PURE__ */ jsxs(Fragment, { children: [
			/* @__PURE__ */ jsx("h2", {
				className: "mb-5 font-display text-xl font-semibold",
				children: selected.title
			}),
			tool === "wheel" && /* @__PURE__ */ jsx(WheelTool, {}),
			tool === "flashcards" && /* @__PURE__ */ jsx(FlashcardsTool, {}),
			tool === "planner" && /* @__PURE__ */ jsx(StudyPlannerTool, {}),
			tool === "school-end" && /* @__PURE__ */ jsx(SchoolEndDateTool, {}),
			tool === "interrogation-prep" && /* @__PURE__ */ jsx(InterrogationPrepTool, {}),
			tool === "photo-import" && /* @__PURE__ */ jsx(PhotoImportTool, {})
		] })] }) : /* @__PURE__ */ jsx("div", {
			className: "space-y-3",
			children: TOOLS.map(({ id, title, subtitle, icon: Icon, tone }) => /* @__PURE__ */ jsxs(Button, {
				variant: "outline",
				onClick: () => setTool(id),
				className: "h-auto min-h-24 w-full justify-start gap-4 whitespace-normal rounded-lg bg-card px-4 py-4 text-left",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: `flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`,
						children: /* @__PURE__ */ jsx(Icon, { className: "size-6" })
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ jsx("span", {
							className: "block text-base font-semibold",
							children: title
						}), /* @__PURE__ */ jsx("span", {
							className: "mt-1 block text-xs text-muted-foreground",
							children: subtitle
						})]
					}),
					/* @__PURE__ */ jsx(ArrowRight, { className: "text-muted-foreground" })
				]
			}, id))
		})]
	});
}
//#endregion
export { Studio as component };
