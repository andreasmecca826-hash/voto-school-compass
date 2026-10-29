export interface PreparationItem {
  id: string;
  label: string;
  done: boolean;
}

export const DEFAULT_PREPARATION: PreparationItem[] = [
  { id: "appunti", label: "Ripassare gli appunti", done: false },
  { id: "argomenti", label: "Studiare gli argomenti", done: false },
  { id: "domande", label: "Preparare le domande", done: false },
  { id: "ripetere", label: "Ripetere a voce", done: false },
];

export interface Interrogazione {
  id: string;
  /** ID del promemoria DidUP da cui è stata creata, se applicabile. */
  reminderId?: string;
  subject: string;
  date: string;
  hour?: number;
  /** Compatibilità con eventuali promemoria creati con la versione precedente. */
  time?: string;
  notes?: string | undefined;
  completed: boolean;
  checklist: PreparationItem[];
}

export function reminderDateToIso(value?: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
  const italian = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:$|\s)/);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : italian
      ? [Number(italian[3]), Number(italian[2]), Number(italian[1])]
      : null;
  if (!parts) return null;

  const [year, month, day] = parts;
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
