import { createContext, useContext } from "react";
//#region src/lib/voto/app-pin-lock-context.ts
var AppPinLockContext = createContext(null);
function useAppPinLock() {
	const context = useContext(AppPinLockContext);
	if (!context) throw new Error("useAppPinLock fuori da AppPinLockProvider");
	return context;
}
//#endregion
//#region src/lib/voto/app-pin-lock.ts
var APP_PIN_LOCK_KEY = "voto.appPinLock";
var PIN_HASH_ITERATIONS = 31e4;
var PIN_SALT_BYTES = 16;
var PIN_HASH_BYTES = 32;
function isValidPin(pin) {
	return new RegExp(`^\\d{4,8}$`).test(pin);
}
function getCrypto() {
	if (!globalThis.crypto?.subtle) throw new Error("Il PIN richiede un contesto sicuro HTTPS o un'app installata.");
	return globalThis.crypto;
}
function encodeBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeBase64Url(value) {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
	return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
async function deriveDigest(pin, salt, iterations) {
	const cryptoApi = getCrypto();
	const key = await cryptoApi.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
	const saltBuffer = new ArrayBuffer(salt.byteLength);
	new Uint8Array(saltBuffer).set(salt);
	const bits = await cryptoApi.subtle.deriveBits({
		name: "PBKDF2",
		salt: saltBuffer,
		iterations,
		hash: "SHA-256"
	}, key, 256);
	return new Uint8Array(bits);
}
async function createPinLockRecord(pin) {
	if (!isValidPin(pin)) throw new Error(`Il PIN deve contenere da 4 a 8 cifre.`);
	const salt = getCrypto().getRandomValues(new Uint8Array(PIN_SALT_BYTES));
	const digest = await deriveDigest(pin, salt, PIN_HASH_ITERATIONS);
	return {
		version: 1,
		salt: encodeBase64Url(salt),
		digest: encodeBase64Url(digest),
		iterations: PIN_HASH_ITERATIONS
	};
}
async function verifyPinAgainstRecord(pin, record) {
	if (!isValidPin(pin)) return false;
	const salt = decodeBase64Url(record.salt);
	const expected = decodeBase64Url(record.digest);
	if (salt.length !== PIN_SALT_BYTES || expected.length !== PIN_HASH_BYTES) return false;
	const actual = await deriveDigest(pin, salt, record.iterations);
	let difference = 0;
	for (let index = 0; index < expected.length; index += 1) difference |= expected[index] ^ actual[index];
	return difference === 0;
}
function parseRecord(value) {
	if (!value || typeof value !== "object") throw new Error("Configurazione PIN non valida.");
	const record = value;
	if (record.version !== 1 || typeof record.salt !== "string" || typeof record.digest !== "string" || typeof record.iterations !== "number" || !Number.isInteger(record.iterations) || record.iterations < 1e5 || record.iterations > 1e6) throw new Error("Configurazione PIN non valida.");
	const parsed = record;
	if (decodeBase64Url(parsed.salt).length !== PIN_SALT_BYTES || decodeBase64Url(parsed.digest).length !== PIN_HASH_BYTES) throw new Error("Configurazione PIN non valida.");
	return parsed;
}
function readPinLockRecord() {
	if (typeof window === "undefined") return null;
	const raw = window.localStorage.getItem(APP_PIN_LOCK_KEY);
	if (raw === null) return null;
	try {
		return parseRecord(JSON.parse(raw));
	} catch {
		throw new Error("Impostazione PIN danneggiata. Per recuperare l'accesso occorre cancellare i dati locali dell'app.");
	}
}
function writePinLockRecord(record) {
	if (typeof window === "undefined") throw new Error("Impossibile salvare il PIN fuori dal browser.");
	window.localStorage.setItem(APP_PIN_LOCK_KEY, JSON.stringify(record));
}
function removePinLockRecord() {
	if (typeof window === "undefined") throw new Error("Impossibile rimuovere il PIN fuori dal browser.");
	window.localStorage.removeItem(APP_PIN_LOCK_KEY);
}
//#endregion
export { verifyPinAgainstRecord as a, useAppPinLock as c, removePinLockRecord as i, isValidPin as n, writePinLockRecord as o, readPinLockRecord as r, AppPinLockContext as s, createPinLockRecord as t };
