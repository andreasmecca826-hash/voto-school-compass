import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowLeft, Binary, CircuitBoard, Cpu, Search, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRACK_KEY = "voto.study-tools-shop.track.v1";
type Track = "informatica" | "elettronica";
type ToolId = "base-converter" | "binary-calculator" | "ohms-law" | "rc-time";

type ShopTool = {
  id: ToolId;
  title: string;
  description: string;
  track: Track;
  icon: LucideIcon;
  label: string;
};

const TOOLS: ShopTool[] = [
  {
    id: "base-converter",
    title: "Convertitore di basi",
    description: "Converti numeri tra sistema binario, ottale, decimale ed esadecimale.",
    track: "informatica",
    icon: Binary,
    label: "Numerazione",
  },
  {
    id: "binary-calculator",
    title: "Calcolatrice binaria",
    description: "Esegui somme, sottrazioni e moltiplicazioni in binario.",
    track: "informatica",
    icon: Cpu,
    label: "Aritmetica digitale",
  },
  {
    id: "ohms-law",
    title: "Legge di Ohm",
    description: "Ricava tensione, corrente o resistenza dai due valori noti.",
    track: "elettronica",
    icon: Zap,
    label: "Circuiti elettrici",
  },
  {
    id: "rc-time",
    title: "Costante di tempo RC",
    description: "Calcola la costante di tempo di un circuito resistore-condensatore.",
    track: "elettronica",
    icon: Activity,
    label: "Circuiti RC",
  },
];

const TRACK_LABELS: Record<Track, string> = {
  informatica: "Informatica",
  elettronica: "Elettronica",
};
const BASES = [
  { value: "2", label: "Binario (base 2)" },
  { value: "8", label: "Ottale (base 8)" },
  { value: "10", label: "Decimale (base 10)" },
  { value: "16", label: "Esadecimale (base 16)" },
] as const;

function parseBaseValue(value: string, base: number): number | null {
  const cleaned = value.trim().replaceAll("_", "");
  if (!cleaned) return null;
  const digitPatterns: Record<number, RegExp> = {
    2: /^-?[01]+$/,
    8: /^-?[0-7]+$/,
    10: /^-?\d+$/,
    16: /^-?[\da-f]+$/i,
  };
  if (!digitPatterns[base]?.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, base);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function NumberField({
  id,
  label,
  value,
  onChange,
  unit,
  step = "any",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  step?: string;
}) {
  return (
    <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
      {label}
      {unit ? ` (${unit})` : ""}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function BaseConverter() {
  const [sourceBase, setSourceBase] = useState("10");
  const [value, setValue] = useState("");
  const converted = parseBaseValue(value, Number(sourceBase));

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        La base del numero inserito
        <select
          aria-label="Base di partenza"
          value={sourceBase}
          onChange={(event) => setSourceBase(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          {BASES.map((base) => (
            <option key={base.value} value={base.value}>
              {base.label}
            </option>
          ))}
        </select>
      </label>
      <label
        htmlFor="base-converter-value"
        className="block text-xs font-medium text-muted-foreground"
      >
        Numero da convertire
        <input
          id="base-converter-value"
          aria-label="Numero da convertire"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Per esempio: 101101"
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {value.trim() && converted === null ? (
        <p role="alert" className="text-xs text-danger">
          Il numero non è valido per la base selezionata.
        </p>
      ) : converted !== null ? (
        <dl className="grid grid-cols-2 gap-2">
          {BASES.map(({ value: base, label }) => (
            <div key={base} className="rounded-xl bg-surface p-3">
              <dt className="text-[10px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold">
                {converted.toString(Number(base)).toUpperCase()}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci un numero intero per vedere le conversioni.
        </p>
      )}
    </div>
  );
}

function BinaryCalculator() {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [operation, setOperation] = useState("+");
  const left = parseBaseValue(first, 2);
  const right = parseBaseValue(second, 2);
  const result =
    left === null || right === null
      ? null
      : operation === "+"
        ? left + right
        : operation === "−"
          ? left - right
          : left * right;
  const validResult = result !== null && Number.isSafeInteger(result);

  return (
    <div className="space-y-3">
      <NumberField id="binary-left" label="Primo numero" value={first} onChange={setFirst} />
      <label className="block text-xs font-medium text-muted-foreground">
        Operazione
        <select
          aria-label="Operazione binaria"
          value={operation}
          onChange={(event) => setOperation(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="+">Somma (+)</option>
          <option value="−">Sottrazione (−)</option>
          <option value="×">Moltiplicazione (×)</option>
        </select>
      </label>
      <NumberField id="binary-right" label="Secondo numero" value={second} onChange={setSecond} />
      {first && second ? (
        validResult ? (
          <p className="rounded-xl bg-primary-soft p-3 text-sm">
            Risultato: <strong className="font-mono">{result!.toString(2)}</strong>
            <span className="ml-2 text-xs text-muted-foreground">(decimale: {result})</span>
          </p>
        ) : (
          <p role="alert" className="text-xs text-danger">
            Inserisci due numeri binari interi validi.
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci due numeri binari, ad esempio 1010 e 11.
        </p>
      )}
    </div>
  );
}

function OhmsLaw() {
  const [unknown, setUnknown] = useState("voltage");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const a = Number(first);
  const b = Number(second);
  const canCalculate = first !== "" && second !== "" && Number.isFinite(a) && Number.isFinite(b);
  let result: number | null = null;
  let resultLabel = "";
  let resultUnit = "";
  if (canCalculate) {
    if (unknown === "voltage") {
      result = a * b;
      resultLabel = "Tensione";
      resultUnit = "V";
    } else if (unknown === "current" && b !== 0) {
      result = a / b;
      resultLabel = "Corrente";
      resultUnit = "A";
    } else if (unknown === "resistance" && b !== 0) {
      result = a / b;
      resultLabel = "Resistenza";
      resultUnit = "Ω";
    }
  }
  const fields: [{ label: string; unit: string }, { label: string; unit: string }] =
    unknown === "voltage"
      ? [
          { label: "Corrente", unit: "A" },
          { label: "Resistenza", unit: "Ω" },
        ]
      : unknown === "current"
        ? [
            { label: "Tensione", unit: "V" },
            { label: "Resistenza", unit: "Ω" },
          ]
        : [
            { label: "Tensione", unit: "V" },
            { label: "Corrente", unit: "A" },
          ];

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Quale valore vuoi calcolare?
        <select
          aria-label="Valore da calcolare"
          value={unknown}
          onChange={(event) => {
            setUnknown(event.target.value);
            setFirst("");
            setSecond("");
          }}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="voltage">Tensione (V = I × R)</option>
          <option value="current">Corrente (I = V ÷ R)</option>
          <option value="resistance">Resistenza (R = V ÷ I)</option>
        </select>
      </label>
      <NumberField
        id="ohms-first"
        label={fields[0].label}
        unit={fields[0].unit}
        value={first}
        onChange={setFirst}
      />
      <NumberField
        id="ohms-second"
        label={fields[1].label}
        unit={fields[1].unit}
        value={second}
        onChange={setSecond}
      />
      {canCalculate && result !== null && Number.isFinite(result) ? (
        <p
          role="status"
          aria-label={`Risultato: ${resultLabel} ${Number(result.toPrecision(8))} ${resultUnit}`}
          className="rounded-xl bg-primary-soft p-3 text-sm"
        >
          {resultLabel}:{" "}
          <strong>
            {Number(result.toPrecision(8))} {resultUnit}
          </strong>
        </p>
      ) : canCalculate ? (
        <p role="alert" className="text-xs text-danger">
          I valori inseriti non permettono questo calcolo.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci i due valori noti per applicare la legge di Ohm.
        </p>
      )}
    </div>
  );
}

function RcTimeConstant() {
  const [resistance, setResistance] = useState("");
  const [capacitance, setCapacitance] = useState("");
  const r = Number(resistance);
  const c = Number(capacitance);
  const valid =
    resistance !== "" &&
    capacitance !== "" &&
    Number.isFinite(r) &&
    Number.isFinite(c) &&
    r >= 0 &&
    c >= 0;
  const seconds = valid ? r * c * 1e-6 : null;

  return (
    <div className="space-y-3">
      <NumberField
        id="rc-resistance"
        label="Resistenza"
        unit="Ω"
        value={resistance}
        onChange={setResistance}
      />
      <NumberField
        id="rc-capacitance"
        label="Capacità"
        unit="µF"
        value={capacitance}
        onChange={setCapacitance}
      />
      {valid ? (
        <div className="rounded-xl bg-primary-soft p-3 text-sm">
          <p>τ = R × C</p>
          <p className="mt-1 font-semibold">
            {Number((seconds! * 1000).toPrecision(8))} ms
            <span className="ml-2 font-normal text-muted-foreground">
              ({Number(seconds!.toPrecision(8))} s)
            </span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci resistenza e capacità per calcolare τ.
        </p>
      )}
    </div>
  );
}

function ToolContent({ id }: { id: ToolId }) {
  if (id === "base-converter") return <BaseConverter />;
  if (id === "binary-calculator") return <BinaryCalculator />;
  if (id === "ohms-law") return <OhmsLaw />;
  return <RcTimeConstant />;
}

export function StudyToolsShop() {
  const [track, setTrack] = useState<Track>("informatica");
  const [openTool, setOpenTool] = useState<ToolId | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TRACK_KEY);
      if (saved === "informatica" || saved === "elettronica") setTrack(saved);
    } catch {
      // Il catalogo resta disponibile anche se lo storage non è accessibile.
    }
  }, []);

  function changeTrack(nextTrack: Track) {
    setTrack(nextTrack);
    setOpenTool(null);
    try {
      localStorage.setItem(TRACK_KEY, nextTrack);
    } catch {
      // La selezione vale comunque per la sessione corrente.
    }
  }

  const filteredTools = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("it-IT");
    return TOOLS.filter((tool) => {
      const matchesTrack = tool.track === track;
      const matchesSearch =
        !query ||
        `${tool.title} ${tool.description} ${tool.label}`
          .toLocaleLowerCase("it-IT")
          .includes(query);
      return matchesTrack && matchesSearch;
    });
  }, [search, track]);
  const selectedTool = TOOLS.find(({ id }) => id === openTool);

  return (
    <div className="space-y-4">
      {openTool && selectedTool ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setOpenTool(null)} className="pl-0">
            <ArrowLeft /> Torna al catalogo
          </Button>
          <section className="card-surface space-y-4 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {TRACK_LABELS[selectedTool.track]}
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{selectedTool.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {selectedTool.description}
              </p>
            </div>
            <ToolContent id={openTool} />
          </section>
        </>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-4 shadow-sm">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <CircuitBoard className="h-3.5 w-3.5" /> Strumenti per il tuo indirizzo
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Negozio strumenti</h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Un catalogo di strumenti digitali pronti da usare, scelti per le materie del tuo
              indirizzo.
            </p>
          </section>

          <div className="space-y-2">
            <p className="text-xs font-semibold">Seleziona il tuo indirizzo</p>
            <div role="group" aria-label="Indirizzo scolastico" className="grid grid-cols-2 gap-2">
              {(Object.keys(TRACK_LABELS) as Track[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={track === item}
                  onClick={() => changeTrack(item)}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                    track === item
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {TRACK_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Cerca nel catalogo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca uno strumento…"
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <section aria-label={`Strumenti di ${TRACK_LABELS[track]}`} className="space-y-2">
            {filteredTools.length ? (
              filteredTools.map(({ id, title, description, icon: Icon, label }) => (
                <article key={id} className="card-surface flex items-center gap-3 p-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
                    <p className="mt-1 text-[10px] font-medium text-primary/80">
                      {label} · Incluso
                    </p>
                  </div>
                  <Button size="sm" aria-label={`Apri ${title}`} onClick={() => setOpenTool(id)}>
                    Apri
                  </Button>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nessuno strumento corrisponde alla ricerca.
              </p>
            )}
          </section>
          <p className="text-[11px] leading-4 text-muted-foreground">
            Per ora il catalogo parte da Informatica ed Elettronica. La selezione dell’indirizzo
            viene salvata solo su questo dispositivo.
          </p>
        </>
      )}
    </div>
  );
}
