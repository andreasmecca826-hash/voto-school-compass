//#region src/lib/voto/dates.ts
var toIso = (d) => {
	const p = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
var parseIso = (s) => {
	const [y, m, d] = s.slice(0, 10).split("-").map(Number);
	return new Date(y || 1970, (m || 1) - 1, d || 1);
};
function parseEventDateTime(value) {
	const raw = value?.trim();
	if (!raw) return null;
	let parsed;
	const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
	if (dateOnly) {
		const year = Number(dateOnly[1]);
		const month = Number(dateOnly[2]);
		const day = Number(dateOnly[3]);
		parsed = new Date(year, month - 1, day);
		if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
	} else parsed = new Date(raw);
	const timestamp = parsed.getTime();
	return Number.isFinite(timestamp) ? timestamp : null;
}
var daysBetween = (from, iso) => Math.round((parseIso(iso).getTime() - parseIso(toIso(from)).getTime()) / 864e5);
var fmtDate = (iso, opts = {
	day: "numeric",
	month: "short"
}) => iso ? parseIso(iso).toLocaleDateString("it-IT", opts) : "";
function relDay(now, iso) {
	if (!iso) return "Senza scadenza";
	const d = daysBetween(now, iso);
	if (d === 0) return "Oggi";
	if (d === 1) return "Domani";
	if (d === -1) return "Ieri";
	if (d < 0) return `${-d} giorni fa`;
	if (d < 7) return parseIso(iso).toLocaleDateString("it-IT", { weekday: "long" });
	return fmtDate(iso);
}
var fmtTime = (iso) => iso ? new Date(iso).toLocaleString("it-IT", {
	day: "numeric",
	month: "short",
	hour: "2-digit",
	minute: "2-digit"
}) : "mai";
//#endregion
export { parseIso as a, parseEventDateTime as i, fmtDate as n, relDay as o, fmtTime as r, toIso as s, daysBetween as t };
