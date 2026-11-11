import { useState } from "react";
import { Calculator, Clock3, Percent, Ruler, Scale } from "lucide-react";
import type { ConversionCategory, UniversalToolId } from "@/lib/voto/universal-calculator";
import {
  calculateDiscount,
  calculateFraction,
  calculateTimeInterval,
  calculateVat,
  convertMeasurement,
  evaluateScientificExpression,
  formatCalculationNumber,
} from "@/lib/voto/universal-calculator";

type CalculationToolId = "scientific" | "converter" | "interval" | "fractions" | "vat" | "discount";

const UNIT_OPTIONS: Record<ConversionCategory, { value: string; label: string }[]> = {
  length: [
    { value: "m", label: "metri (m)" },
    { value: "km", label: "chilometri (km)" },
    { value: "cm", label: "centimetri (cm)" },
    { value: "mm", label: "millimetri (mm)" },
    { value: "mi", label: "miglia (mi)" },
    { value: "ft", label: "piedi (ft)" },
    { value: "in", label: "pollici (in)" },
  ],
  mass: [
    { value: "kg", label: "chilogrammi (kg)" },
    { value: "g", label: "grammi (g)" },
    { value: "mg", label: "milligrammi (mg)" },
    { value: "lb", label: "libbre (lb)" },
    { value: "oz", label: "once (oz)" },
  ],
  volume: [
    { value: "l", label: "litri (L)" },
    { value: "ml", label: "millilitri (mL)" },
    { value: "m3", label: "metri cubi (m³)" },
    { value: "gal", label: "galloni USA (gal)" },
  ],
  area: [
    { value: "m²", label: "metri quadrati (m²)" },
    { value: "km²", label: "chilometri quadrati (km²)" },
    { value: "cm²", label: "centimetri quadrati (cm²)" },
    { value: "ha", label: "ettari (ha)" },
    { value: "acre", label: "acri" },
  ],
  speed: [
    { value: "m/s", label: "metri al secondo (m/s)" },
    { value: "km/h", label: "chilometri orari (km/h)" },
    { value: "mph", label: "miglia orarie (mph)" },
    { value: "knot", label: "nodi" },
  ],
  temperature: [
    { value: "°C", label: "Celsius (°C)" },
    { value: "°F", label: "Fahrenheit (°F)" },
    { value: "K", label: "Kelvin (K)" },
  ],
  currency: [
    { value: "EUR", label: "Euro (EUR)" },
    { value: "USD", label: "Dollaro USA (USD)" },
    { value: "GBP", label: "Sterlina (GBP)" },
    { value: "CHF", label: "Franco svizzero (CHF)" },
    { value: "JPY", label: "Yen (JPY)" },
    { value: "CAD", label: "Dollaro canadese (CAD)" },
  ],
};

const CATEGORIES: { value: ConversionCategory; label: string }[] = [
  { value: "length", label: "Lunghezza" },
  { value: "mass", label: "Peso / massa" },
  { value: "volume", label: "Volume" },
  { value: "area", label: "Superficie" },
  { value: "speed", label: "Velocità" },
  { value: "temperature", label: "Temperatura" },
  { value: "currency", label: "Valute" },
];

const TOOL_INFO: Record<
  CalculationToolId,
  { title: string; description: string; icon: typeof Calculator }
> = {
  scientific: {
    title: "Calcolatrice scientifica",
    description:
      "Scrivi un’espressione con parentesi, potenze e funzioni. Sin, cos e tan usano gradi.",
    icon: Calculator,
  },
  converter: {
    title: "Convertitore universale",
    description:
      "Conversioni di unità e temperature. Per le valute inserisci tu un tasso aggiornato.",
    icon: Ruler,
  },
  interval: {
    title: "Calcolo intervalli",
    description:
      "Calcola una durata tra due orari; se l’orario finale è precedente, si considera il giorno successivo.",
    icon: Clock3,
  },
  fractions: {
    title: "Calcolatore frazioni",
    description:
      "Somma, sottrai, moltiplica o dividi frazioni e riduci il risultato ai minimi termini.",
    icon: Scale,
  },
  vat: {
    title: "Calcolatore IVA",
    description: "Inserisci l’imponibile e l’aliquota per ricavare l’imposta e il totale.",
    icon: Percent,
  },
  discount: {
    title: "Calcolatore sconti",
    description: "Calcola il risparmio e il prezzo finale dopo lo sconto percentuale.",
    icon: Percent,
  },
};

function parseInput(value: string, label: string): number {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!normalized || !Number.isFinite(parsed))
    throw new Error(`Inserisci ${label} come numero valido.`);
  return parsed;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode = "decimal",
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "decimal" | "numeric" | "text";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
}) {
  return (
    <label className="block space-y-1 text-xs font-semibold">
      {label}
      <input
        aria-label={label}
        type={type}
        inputMode={inputMode}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1 text-xs font-semibold">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

interface CalculationFormValues {
  expression: string;
  category: string;
  amount: string;
  from: string;
  to: string;
  rate: string;
  start: string;
  end: string;
  pause: string;
  numeratorA: string;
  denominatorA: string;
  numeratorB: string;
  denominatorB: string;
  operator: string;
  taxable: string;
  percent: string;
  price: string;
  discount: string;
}

export function UniversalCalculationPanel({
  tool,
  onCalculation,
}: {
  tool: CalculationToolId;
  onCalculation: (tool: UniversalToolId, calculation: string, result: string) => void;
}) {
  const [values, setValues] = useState<CalculationFormValues>({
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
    discount: "",
  });
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");
  const metadata = TOOL_INFO[tool];
  const Icon = metadata.icon;

  function update(field: keyof CalculationFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
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
          const category = (values.category ?? "length") as ConversionCategory;
          const from = values.from ?? "m";
          const to = values.to ?? "km";
          const amount = parseInput(values.amount ?? "", "un valore");
          const currencyRate =
            category === "currency"
              ? parseInput(values.rate ?? "", "il tasso di cambio")
              : undefined;
          const converted = convertMeasurement(amount, category, from, to, currencyRate);
          const fromLabel =
            UNIT_OPTIONS[category].find((unit) => unit.value === from)?.label ?? from;
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
          const leftDenominator = parseInput(
            values.denominatorA ?? "",
            "il denominatore della prima frazione",
          );
          const right = parseInput(values.numeratorB ?? "", "il numeratore della seconda frazione");
          const rightDenominator = parseInput(
            values.denominatorB ?? "",
            "il denominatore della seconda frazione",
          );
          const operator = (values.operator ?? "+") as "+" | "−" | "×" | "÷";
          const fraction = calculateFraction(
            left,
            leftDenominator,
            right,
            rightDenominator,
            operator,
          );
          calculation = `${left}/${leftDenominator} ${operator} ${right}/${rightDenominator}`;
          display =
            fraction.denominator === 1
              ? `${fraction.numerator}`
              : `${fraction.numerator}/${fraction.denominator}`;
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

  const conversionCategory = (values.category ?? "length") as ConversionCategory;
  const units = UNIT_OPTIONS[conversionCategory];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/60 via-card to-card p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="mt-3 font-display text-xl font-semibold">{metadata.title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{metadata.description}</p>
      </section>

      <section className="card-surface space-y-3 p-4" aria-label={metadata.title}>
        {tool === "scientific" && (
          <>
            <label className="block space-y-1 text-xs font-semibold">
              Espressione
              <input
                aria-label="Espressione"
                value={values.expression}
                onChange={(event) => update("expression", event.target.value)}
                placeholder="Es. sqrt(81) + 2^3"
                onKeyDown={(event) => {
                  if (event.key === "Enter") calculate();
                }}
                className="h-12 w-full rounded-lg border border-input bg-card px-3 font-mono text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <p className="text-[11px] leading-4 text-muted-foreground">
              Operatori: + − × / ^ % · Funzioni: sqrt, sin, cos, tan, log, ln, abs · Costanti: pi,
              e.
            </p>
          </>
        )}

        {tool === "converter" && (
          <>
            <SelectField
              label="Categoria"
              value={conversionCategory}
              onChange={(value) => {
                const next = value as ConversionCategory;
                update("category", next);
                setValues((current) => ({
                  ...current,
                  category: next,
                  from: UNIT_OPTIONS[next][0]!.value,
                  to: UNIT_OPTIONS[next][1]?.value ?? UNIT_OPTIONS[next][0]!.value,
                }));
              }}
              options={CATEGORIES}
            />
            <Field
              label="Valore"
              value={values.amount ?? ""}
              onChange={(value) => update("amount", value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="Da"
                value={values.from ?? units[0]!.value}
                onChange={(value) => update("from", value)}
                options={units}
              />
              <SelectField
                label="A"
                value={values.to ?? units[1]?.value ?? units[0]!.value}
                onChange={(value) => update("to", value)}
                options={units}
              />
            </div>
            {conversionCategory === "currency" && (
              <div className="space-y-1 rounded-lg bg-surface p-3">
                <Field
                  label={`Tasso: 1 ${values.from} = ? ${values.to}`}
                  value={values.rate ?? ""}
                  onChange={(value) => update("rate", value)}
                  placeholder="Inserisci il tasso di oggi"
                />
                <p className="text-[10px] leading-4 text-muted-foreground">
                  Nessun cambio automatico: il tasso dipende dalla fonte e dalla data. Inseriscine
                  uno aggiornato.
                </p>
              </div>
            )}
          </>
        )}

        {tool === "interval" && (
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Dalle"
              type="time"
              inputMode="text"
              value={values.start ?? "09:00"}
              onChange={(value) => update("start", value)}
            />
            <Field
              label="Alle"
              type="time"
              inputMode="text"
              value={values.end ?? "10:00"}
              onChange={(value) => update("end", value)}
            />
            <div className="col-span-2">
              <Field
                label="Pausa da sottrarre (minuti)"
                value={values.pause ?? "0"}
                onChange={(value) => update("pause", value)}
              />
            </div>
          </div>
        )}

        {tool === "fractions" && (
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div className="space-y-2">
                <Field
                  label="Numeratore A"
                  value={values.numeratorA ?? "1"}
                  onChange={(value) => update("numeratorA", value)}
                  inputMode="numeric"
                />
                <Field
                  label="Denominatore A"
                  value={values.denominatorA ?? "2"}
                  onChange={(value) => update("denominatorA", value)}
                  inputMode="numeric"
                />
              </div>
              <SelectField
                label="Operazione"
                value={values.operator ?? "+"}
                onChange={(value) => update("operator", value)}
                options={[
                  { value: "+", label: "+" },
                  { value: "−", label: "−" },
                  { value: "×", label: "×" },
                  { value: "÷", label: "÷" },
                ]}
              />
              <div className="space-y-2">
                <Field
                  label="Numeratore B"
                  value={values.numeratorB ?? "1"}
                  onChange={(value) => update("numeratorB", value)}
                  inputMode="numeric"
                />
                <Field
                  label="Denominatore B"
                  value={values.denominatorB ?? "3"}
                  onChange={(value) => update("denominatorB", value)}
                  inputMode="numeric"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Il risultato viene semplificato automaticamente.
            </p>
          </>
        )}

        {tool === "vat" && (
          <>
            <Field
              label="Imponibile (€)"
              value={values.taxable ?? ""}
              onChange={(value) => update("taxable", value)}
            />
            <Field
              label="Aliquota IVA (%)"
              value={values.percent ?? "22"}
              onChange={(value) => update("percent", value)}
            />
          </>
        )}

        {tool === "discount" && (
          <>
            <Field
              label="Prezzo iniziale (€)"
              value={values.price ?? ""}
              onChange={(value) => update("price", value)}
            />
            <Field
              label="Sconto (%)"
              value={values.discount ?? ""}
              onChange={(value) => update("discount", value)}
            />
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={calculate}
          className="press min-h-11 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          Calcola
        </button>
        {result !== null && (
          <div
            aria-live="polite"
            className="rounded-xl border border-primary/20 bg-primary-soft/50 p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Risultato
            </p>
            <p className="mt-1 break-words text-lg font-semibold tabular">{result}</p>
          </div>
        )}
      </section>
    </div>
  );
}
