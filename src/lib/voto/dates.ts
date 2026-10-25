export const toIso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const parseIso = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const daysBetween = (from: Date, iso: string) =>
  Math.round((parseIso(iso).getTime() - parseIso(toIso(from)).getTime()) / 86400000);

export const fmtDate = (iso?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  iso ? parseIso(iso).toLocaleDateString("it-IT", opts) : "";

export function relDay(now: Date, iso?: string) {
  if (!iso) return "Senza scadenza";
  const d = daysBetween(now, iso);
  if (d === 0) return "Oggi";
  if (d === 1) return "Domani";
  if (d === -1) return "Ieri";
  if (d < 0) return `${-d} giorni fa`;
  if (d < 7) return parseIso(iso).toLocaleDateString("it-IT", { weekday: "long" });
  return fmtDate(iso);
}

export const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "mai";
