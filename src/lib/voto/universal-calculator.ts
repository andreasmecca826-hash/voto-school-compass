export type UniversalToolId =
  | "scientific"
  | "converter"
  | "interval"
  | "fractions"
  | "vat"
  | "discount"
  | "qr"
  | "documents"
  | "tables"
  | "share";

export type ConversionCategory =
  "length" | "mass" | "volume" | "area" | "speed" | "temperature" | "currency";

const UNIT_FACTORS: Record<
  Exclude<ConversionCategory, "temperature" | "currency">,
  Record<string, number>
> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 },
  mass: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125 },
  volume: { l: 1, ml: 0.001, m3: 1000, gal: 3.785411784 },
  area: { "m²": 1, "km²": 1_000_000, "cm²": 0.0001, ha: 10_000, acre: 4046.8564224 },
  speed: { "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704, knot: 0.514444444444 },
};

export function convertMeasurement(
  value: number,
  category: ConversionCategory,
  from: string,
  to: string,
  currencyRate?: number,
): number {
  if (!Number.isFinite(value)) throw new Error("Inserisci un valore valido.");
  if (category === "currency") {
    if (from === to) return value;
    if (currencyRate === undefined || !Number.isFinite(currencyRate) || currencyRate <= 0) {
      throw new Error("Inserisci un tasso di cambio positivo e aggiornato.");
    }
    return value * currencyRate;
  }
  if (category === "temperature") {
    const toCelsius = (input: number, unit: string) => {
      if (unit === "°C") return input;
      if (unit === "°F") return ((input - 32) * 5) / 9;
      if (unit === "K") return input - 273.15;
      throw new Error("Unità di temperatura non supportata.");
    };
    const celsius = toCelsius(value, from);
    if (to === "°C") return celsius;
    if (to === "°F") return (celsius * 9) / 5 + 32;
    if (to === "K") return celsius + 273.15;
    throw new Error("Unità di temperatura non supportata.");
  }
  const factors = UNIT_FACTORS[category];
  const fromFactor = factors[from];
  const toFactor = factors[to];
  if (!fromFactor || !toFactor) throw new Error("Conversione non supportata.");
  return (value * fromFactor) / toFactor;
}

function assertFinite(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > 1e100) {
    throw new Error("Il risultato non è un numero finito utilizzabile.");
  }
  return value;
}

export function evaluateScientificExpression(expression: string): number {
  const source = expression.toLocaleLowerCase("en-US").trim();
  if (!source || source.length > 160)
    throw new Error("Scrivi un’espressione (massimo 160 caratteri).");
  const tokens = source.match(/\s*(?:\d+(?:[.,]\d+)?(?:e[+-]?\d+)?|[a-z]+|[()+\-*/^%])/gy) ?? [];
  if (tokens.join("").replace(/\s/g, "") !== source.replace(/\s/g, "")) {
    throw new Error("L’espressione contiene caratteri non supportati.");
  }
  const compact = tokens.map((token) => token.trim()).filter(Boolean);
  let position = 0;
  const peek = () => compact[position];
  const take = () => compact[position++];
  const unaryFunctions: Record<string, (value: number) => number> = {
    abs: Math.abs,
    sqrt: Math.sqrt,
    ln: Math.log,
    log: Math.log10,
    sin: (value) => Math.sin((value * Math.PI) / 180),
    cos: (value) => Math.cos((value * Math.PI) / 180),
    tan: (value) => Math.tan((value * Math.PI) / 180),
  };

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const operator = take();
      const right = parseTerm();
      value = assertFinite(operator === "+" ? value + right : value - right);
    }
    return value;
  }

  function parseTerm(): number {
    let value = parseUnary();
    while (peek() === "*" || peek() === "/") {
      const operator = take();
      const right = parseUnary();
      if (operator === "/" && right === 0) throw new Error("Non si può dividere per zero.");
      value = assertFinite(operator === "*" ? value * right : value / right);
    }
    return value;
  }

  function parseUnary(): number {
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

  function parsePower(): number {
    const value = parsePostfix();
    if (peek() !== "^") return value;
    take();
    return assertFinite(value ** parseUnary());
  }

  function parsePostfix(): number {
    let value = parsePrimary();
    while (peek() === "%") {
      take();
      value = assertFinite(value / 100);
    }
    return value;
  }

  function parsePrimary(): number {
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

export function calculateTimeInterval(start: string, end: string, breakMinutes = 0): number {
  const parse = (value: string) => {
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
  if (!Number.isFinite(breakMinutes) || breakMinutes < 0)
    throw new Error("La pausa non può essere negativa.");
  const elapsed = (to >= from ? to - from : to + 1440 - from) - breakMinutes;
  if (elapsed < 0) throw new Error("La pausa è più lunga dell’intervallo.");
  return elapsed;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a || 1;
}

export function calculateFraction(
  leftNumerator: number,
  leftDenominator: number,
  rightNumerator: number,
  rightDenominator: number,
  operator: "+" | "−" | "×" | "÷",
): { numerator: number; denominator: number } {
  const values = [leftNumerator, leftDenominator, rightNumerator, rightDenominator];
  if (!values.every(Number.isSafeInteger))
    throw new Error("Usa numeri interi sicuri per le frazioni.");
  if (leftDenominator === 0 || rightDenominator === 0)
    throw new Error("Il denominatore non può essere zero.");
  let numerator: number;
  let denominator: number;
  if (operator === "+" || operator === "−") {
    const sign = operator === "+" ? 1 : -1;
    numerator = leftNumerator * rightDenominator + sign * rightNumerator * leftDenominator;
    denominator = leftDenominator * rightDenominator;
  } else if (operator === "×") {
    numerator = leftNumerator * rightNumerator;
    denominator = leftDenominator * rightDenominator;
  } else {
    if (rightNumerator === 0)
      throw new Error("Non si può dividere per una frazione uguale a zero.");
    numerator = leftNumerator * rightDenominator;
    denominator = leftDenominator * rightNumerator;
  }
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new Error("Il risultato è troppo grande per essere rappresentato in sicurezza.");
  }
  if (denominator < 0) {
    numerator = -numerator;
    denominator = -denominator;
  }
  const divisor = gcd(numerator, denominator);
  const reducedNumerator = numerator / divisor;
  return {
    numerator: reducedNumerator === 0 ? 0 : reducedNumerator,
    denominator: denominator / divisor,
  };
}

export function calculateVat(taxableAmount: number, rate: number): { tax: number; total: number } {
  if (!Number.isFinite(taxableAmount) || taxableAmount < 0)
    throw new Error("L’imponibile deve essere un numero positivo o zero.");
  if (!Number.isFinite(rate) || rate < 0 || rate > 100)
    throw new Error("La percentuale IVA deve essere tra 0 e 100.");
  const tax = (taxableAmount * rate) / 100;
  return { tax, total: taxableAmount + tax };
}

export function calculateDiscount(
  price: number,
  percent: number,
): { savings: number; finalPrice: number } {
  if (!Number.isFinite(price) || price < 0)
    throw new Error("Il prezzo deve essere un numero positivo o zero.");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100)
    throw new Error("Lo sconto deve essere tra 0 e 100%.");
  const savings = (price * percent) / 100;
  return { savings, finalPrice: price - savings };
}

function escapeCsv(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function createCsv(headers: string[], rows: string[][]): string {
  if (headers.length === 0) throw new Error("Aggiungi almeno una colonna.");
  const normalizedRows = rows.map((row) => headers.map((_, index) => row[index] ?? ""));
  return [headers, ...normalizedRows].map((row) => row.map(escapeCsv).join(";")).join("\r\n");
}

export function formatCalculationNumber(value: number, maxFractionDigits = 4): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("it-IT", { maximumFractionDigits: maxFractionDigits }).format(value);
}
