import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Binary,
  CircuitBoard,
  Cpu,
  Gauge,
  GitBranch,
  Globe,
  Lightbulb,
  Network,
  Search,
  Sigma,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const TRACK_KEY = "voto.study-tools-shop.track.v1";
type Track = "informatica" | "elettronica";
type ToolId =
  | "base-converter"
  | "binary-calculator"
  | "ascii-table"
  | "subnet-calculator"
  | "logic-gates"
  | "ohms-law"
  | "rc-time"
  | "led-resistor"
  | "voltage-divider"
  | "resistor-code";

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
    id: "ascii-table",
    title: "ASCII e Unicode",
    description: "Esplora caratteri, codici decimali, esadecimali e binari per la programmazione.",
    track: "informatica",
    icon: Sigma,
    label: "Codifica dei caratteri",
  },
  {
    id: "subnet-calculator",
    title: "Calcolatore subnet",
    description:
      "Ricava rete, broadcast, intervallo host e numero di indirizzi da IPv4 e prefisso.",
    track: "informatica",
    icon: Network,
    label: "Reti",
  },
  {
    id: "logic-gates",
    title: "Laboratorio porte logiche",
    description:
      "Prova AND, OR, XOR e NOT e osserva l'uscita della porta con una mini tabella di verità.",
    track: "informatica",
    icon: GitBranch,
    label: "Sistemi digitali",
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
  {
    id: "led-resistor",
    title: "Resistenza per LED",
    description:
      "Scegli la resistenza di protezione per un LED partendo da alimentazione e corrente.",
    track: "elettronica",
    icon: Lightbulb,
    label: "Laboratorio LED",
  },
  {
    id: "voltage-divider",
    title: "Partitore di tensione",
    description: "Calcola la tensione d'uscita e verifica il rapporto tra due resistenze.",
    track: "elettronica",
    icon: Gauge,
    label: "Misure elettriche",
  },
  {
    id: "resistor-code",
    title: "Codice colori resistori",
    description: "Leggi le bande del resistore e ricava valore nominale e tolleranza.",
    track: "elettronica",
    icon: CircuitBoard,
    label: "Componenti",
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

function AsciiTable() {
  const [value, setValue] = useState("");
  const code = value.length ? value.codePointAt(0) : undefined;
  const display = code === undefined ? null : code;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Carattere o testo
        <input
          aria-label="Carattere da convertire"
          value={value}
          maxLength={1}
          onChange={(event) => setValue(event.target.value)}
          placeholder="A"
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        />
      </label>
      {display !== null ? (
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Decimale", display.toString(10)],
            ["Esadecimale", `0x${display.toString(16).toUpperCase()}`],
            ["Binario", display.toString(2)],
            ["Unicode", `U+${display.toString(16).toUpperCase().padStart(4, "0")}`],
          ].map(([label, result]) => (
            <div key={label} className="rounded-xl bg-surface p-3">
              <dt className="text-[10px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold">{result}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-xs text-muted-foreground">
          Inserisci un carattere per esplorarne la codifica.
        </p>
      )}
    </div>
  );
}

function ipToNumber(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return null;
  const values = parts.map(Number);
  if (values.some((part) => part < 0 || part > 255)) return null;
  return values.reduce((result, part) => result * 256 + part, 0) >>> 0;
}

function numberToIp(value: number) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function SubnetCalculator() {
  const [ip, setIp] = useState("192.168.1.10");
  const [prefix, setPrefix] = useState("24");
  const address = ipToNumber(ip);
  const prefixNumber = Number(prefix);
  const valid =
    address !== null && Number.isInteger(prefixNumber) && prefixNumber >= 0 && prefixNumber <= 32;
  const mask = valid ? (prefixNumber === 0 ? 0 : (0xffffffff << (32 - prefixNumber)) >>> 0) : null;
  const network = valid && mask !== null ? (address! & mask) >>> 0 : null;
  const broadcast = valid && mask !== null ? (network! | (~mask >>> 0)) >>> 0 : null;
  const total = valid ? 2 ** (32 - prefixNumber) : null;
  const usable = total === null ? null : prefixNumber >= 31 ? total : Math.max(0, total - 2);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor="subnet-ip" className="block text-xs font-medium text-muted-foreground">
          Indirizzo IPv4
          <input
            id="subnet-ip"
            inputMode="decimal"
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
          />
        </label>
        <NumberField
          id="subnet-prefix"
          label="Prefisso"
          unit="/"
          value={prefix}
          onChange={setPrefix}
          step="1"
        />
      </div>
      {valid ? (
        <dl className="grid grid-cols-2 gap-2">
          {[
            ["Maschera", numberToIp(mask!)],
            ["Indirizzo di rete", numberToIp(network!)],
            ["Broadcast", numberToIp(broadcast!)],
            ["Host utilizzabili", String(usable)],
          ].map(([label, result]) => (
            <div key={label} className="rounded-xl bg-surface p-3">
              <dt className="text-[10px] text-muted-foreground">{label}</dt>
              <dd className="mt-1 break-all font-mono text-sm font-semibold">{result}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci un IPv4 valido e un prefisso tra 0 e 32.
        </p>
      )}
    </div>
  );
}

function LogicGates() {
  const [gate, setGate] = useState("AND");
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const output = gate === "AND" ? a && b : gate === "OR" ? a || b : gate === "XOR" ? a !== b : !a;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-muted-foreground">
        Porta logica
        <select
          aria-label="Porta logica"
          value={gate}
          onChange={(event) => setGate(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option>AND</option>
          <option>OR</option>
          <option>XOR</option>
          <option>NOT</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={a ? "default" : "outline"} onClick={() => setA((current) => !current)}>
          Ingresso A: {a ? 1 : 0}
        </Button>
        {gate !== "NOT" && (
          <Button variant={b ? "default" : "outline"} onClick={() => setB((current) => !current)}>
            Ingresso B: {b ? 1 : 0}
          </Button>
        )}
      </div>
      <p
        role="status"
        aria-label={`Uscita: ${output ? 1 : 0}`}
        className="rounded-xl bg-primary-soft p-3 text-sm"
      >
        Uscita <strong className="font-mono">{output ? 1 : 0}</strong> · {output ? "HIGH" : "LOW"}
      </p>
      <p className="text-xs text-muted-foreground">
        Clicca gli ingressi per esercitarti e confronta l'uscita con la tabella di verità.
      </p>
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

function LedResistor() {
  const [supply, setSupply] = useState("5");
  const [forward, setForward] = useState("2");
  const [current, setCurrent] = useState("10");
  const v = Number(supply);
  const vf = Number(forward);
  const ma = Number(current);
  const valid = [v, vf, ma].every(Number.isFinite) && v > vf && ma > 0;
  const resistor = valid ? (v - vf) / (ma / 1000) : null;
  const power = valid ? (v - vf) * (ma / 1000) * 1000 : null;

  return (
    <div className="space-y-3">
      <NumberField
        id="led-supply"
        label="Alimentazione"
        unit="V"
        value={supply}
        onChange={setSupply}
      />
      <NumberField
        id="led-forward"
        label="Caduta diretta LED"
        unit="V"
        value={forward}
        onChange={setForward}
      />
      <NumberField
        id="led-current"
        label="Corrente desiderata"
        unit="mA"
        value={current}
        onChange={setCurrent}
      />
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Resistenza minima: <strong>{Number(resistor!.toPrecision(6))} Ω</strong>
          <br />
          <span className="text-xs text-muted-foreground">
            Potenza dissipata: {Number(power!.toPrecision(5))} mW · scegli un valore commerciale
            uguale o superiore.
          </span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          L'alimentazione deve superare la caduta del LED e la corrente deve essere positiva.
        </p>
      )}
    </div>
  );
}

function VoltageDivider() {
  const [input, setInput] = useState("12");
  const [r1, setR1] = useState("10000");
  const [r2, setR2] = useState("10000");
  const [vin, resistance1, resistance2] = [Number(input), Number(r1), Number(r2)] as const;
  const valid =
    [vin, resistance1, resistance2].every(Number.isFinite) &&
    vin >= 0 &&
    resistance1 > 0 &&
    resistance2 > 0;
  const output = valid ? (vin * resistance2) / (resistance1 + resistance2) : null;

  return (
    <div className="space-y-3">
      <NumberField
        id="divider-input"
        label="Tensione in ingresso"
        unit="V"
        value={input}
        onChange={setInput}
      />
      <div className="grid grid-cols-2 gap-2">
        <NumberField id="divider-r1" label="R1" unit="Ω" value={r1} onChange={setR1} />
        <NumberField id="divider-r2" label="R2" unit="Ω" value={r2} onChange={setR2} />
      </div>
      {valid ? (
        <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
          Tensione d'uscita: <strong>{Number(output!.toPrecision(6))} V</strong>
          <br />
          <span className="text-xs text-muted-foreground">Vout = Vin × R2 ÷ (R1 + R2)</span>
        </p>
      ) : (
        <p role="alert" className="text-xs text-danger">
          Inserisci una tensione non negativa e due resistenze positive.
        </p>
      )}
    </div>
  );
}

const RESISTOR_BANDS = [
  ["nero", 0, "0 Ω"],
  ["marrone", 1, "1 kΩ"],
  ["rosso", 2, "2 kΩ"],
  ["arancione", 3, "3 kΩ"],
  ["giallo", 4, "4 kΩ"],
  ["verde", 5, "5 kΩ"],
  ["blu", 6, "6 kΩ"],
  ["viola", 7, "7 kΩ"],
  ["grigio", 8, "8 kΩ"],
  ["bianco", 9, "9 kΩ"],
] as const;

function ResistorCode() {
  const [first, setFirst] = useState("marrone");
  const [second, setSecond] = useState("nero");
  const [multiplier, setMultiplier] = useState("rosso");
  const [tolerance, setTolerance] = useState("5");
  const digit = (name: string) => RESISTOR_BANDS.find(([color]) => color === name)?.[1] ?? 0;
  const ohms = (digit(first) * 10 + digit(second)) * 10 ** digit(multiplier);
  const pretty =
    ohms >= 1_000_000 ? `${ohms / 1_000_000} MΩ` : ohms >= 1000 ? `${ohms / 1000} kΩ` : `${ohms} Ω`;
  return (
    <div className="space-y-3">
      {[
        ["Prima banda", first, setFirst],
        ["Seconda banda", second, setSecond],
        ["Moltiplicatore", multiplier, setMultiplier],
      ].map(([label, value, setter]) => (
        <label key={label as string} className="block text-xs font-medium text-muted-foreground">
          {label as string}
          <select
            aria-label={label as string}
            value={value as string}
            onChange={(event) => (setter as (value: string) => void)(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
          >
            {RESISTOR_BANDS.map(([color]) => (
              <option key={color}>{color}</option>
            ))}
          </select>
        </label>
      ))}
      <label className="block text-xs font-medium text-muted-foreground">
        Tolleranza
        <select
          aria-label="Tolleranza"
          value={tolerance}
          onChange={(event) => setTolerance(event.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="1">±1%</option>
          <option value="2">±2%</option>
          <option value="5">±5%</option>
          <option value="10">±10%</option>
        </select>
      </label>
      <p role="status" className="rounded-xl bg-primary-soft p-3 text-sm">
        Valore nominale: <strong>{pretty}</strong>{" "}
        <span className="text-xs text-muted-foreground">(±{tolerance}%)</span>
      </p>
    </div>
  );
}

function ToolContent({ id }: { id: ToolId }) {
  if (id === "base-converter") return <BaseConverter />;
  if (id === "binary-calculator") return <BinaryCalculator />;
  if (id === "ascii-table") return <AsciiTable />;
  if (id === "subnet-calculator") return <SubnetCalculator />;
  if (id === "logic-gates") return <LogicGates />;
  if (id === "ohms-law") return <OhmsLaw />;
  if (id === "rc-time") return <RcTimeConstant />;
  if (id === "led-resistor") return <LedResistor />;
  if (id === "voltage-divider") return <VoltageDivider />;
  return <ResistorCode />;
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
