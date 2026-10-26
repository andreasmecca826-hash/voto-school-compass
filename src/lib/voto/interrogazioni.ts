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
  subject: string;
  date: string;
  hour?: number;
  /** Compatibilità con eventuali promemoria creati con la versione precedente. */
  time?: string;
  notes?: string | undefined;
  completed: boolean;
  checklist: PreparationItem[];
}
