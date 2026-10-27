export const APP_PIN_LOCK_KEY = "voto.appPinLock";
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;
const PIN_HASH_ITERATIONS = 310_000;
const PIN_SALT_BYTES = 16;
const PIN_HASH_BYTES = 32;

export interface PinLockRecord {
  version: 1;
  salt: string;
  digest: string;
  iterations: number;
}

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);
}

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Il PIN richiede un contesto sicuro HTTPS o un'app installata.");
  }
  return globalThis.crypto;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function deriveDigest(
  pin: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const cryptoApi = getCrypto();
  const key = await cryptoApi.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const bits = await cryptoApi.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations, hash: "SHA-256" },
    key,
    PIN_HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function createPinLockRecord(pin: string): Promise<PinLockRecord> {
  if (!isValidPin(pin)) {
    throw new Error(`Il PIN deve contenere da ${PIN_MIN_LENGTH} a ${PIN_MAX_LENGTH} cifre.`);
  }
  const salt = getCrypto().getRandomValues(new Uint8Array(PIN_SALT_BYTES));
  const digest = await deriveDigest(pin, salt, PIN_HASH_ITERATIONS);
  return {
    version: 1,
    salt: encodeBase64Url(salt),
    digest: encodeBase64Url(digest),
    iterations: PIN_HASH_ITERATIONS,
  };
}

export async function verifyPinAgainstRecord(pin: string, record: PinLockRecord): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const salt = decodeBase64Url(record.salt);
  const expected = decodeBase64Url(record.digest);
  if (salt.length !== PIN_SALT_BYTES || expected.length !== PIN_HASH_BYTES) return false;
  const actual = await deriveDigest(pin, salt, record.iterations);
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected[index]! ^ actual[index]!;
  }
  return difference === 0;
}

function parseRecord(value: unknown): PinLockRecord {
  if (!value || typeof value !== "object") throw new Error("Configurazione PIN non valida.");
  const record = value as Partial<PinLockRecord>;
  if (
    record.version !== 1 ||
    typeof record.salt !== "string" ||
    typeof record.digest !== "string" ||
    typeof record.iterations !== "number" ||
    !Number.isInteger(record.iterations) ||
    record.iterations < 100_000 ||
    record.iterations > 1_000_000
  ) {
    throw new Error("Configurazione PIN non valida.");
  }
  const parsed = record as PinLockRecord;
  if (
    decodeBase64Url(parsed.salt).length !== PIN_SALT_BYTES ||
    decodeBase64Url(parsed.digest).length !== PIN_HASH_BYTES
  ) {
    throw new Error("Configurazione PIN non valida.");
  }
  return parsed;
}

export function readPinLockRecord(): PinLockRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(APP_PIN_LOCK_KEY);
  if (raw === null) return null;
  try {
    return parseRecord(JSON.parse(raw) as unknown);
  } catch {
    throw new Error(
      "Impostazione PIN danneggiata. Per recuperare l'accesso occorre cancellare i dati locali dell'app.",
    );
  }
}

export function writePinLockRecord(record: PinLockRecord): void {
  if (typeof window === "undefined")
    throw new Error("Impossibile salvare il PIN fuori dal browser.");
  window.localStorage.setItem(APP_PIN_LOCK_KEY, JSON.stringify(record));
}

export function removePinLockRecord(): void {
  if (typeof window === "undefined")
    throw new Error("Impossibile rimuovere il PIN fuori dal browser.");
  window.localStorage.removeItem(APP_PIN_LOCK_KEY);
}
