import type { Assignment } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ASSIGNMENT_DAYS = 3;

type DashboardCopyContext = {
  average: number | null;
  delta: number | null;
  unreadGrades: number;
  unreadOther: number;
  recentAssignments: number;
};

function pick<T>(items: T[], seed: number): T {
  const safeSeed = Number.isFinite(seed) ? Math.min(Math.max(seed, 0), 0.999999) : 0;
  return items[Math.floor(safeSeed * items.length)]!;
}

export function countRecentOpenAssignments(
  assignments: Assignment[],
  now: Date,
  isDone: (id: string, completed: boolean) => boolean,
): number {
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return assignments.filter((assignment) => {
    const date = assignment.assignedDate?.slice(0, 10);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || isDone(assignment.id, assignment.completed)) {
      return false;
    }
    const assignedAt = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(assignedAt) || new Date(assignedAt).toISOString().slice(0, 10) !== date) {
      return false;
    }
    const ageInDays = Math.floor((today - assignedAt) / DAY_MS);
    return ageInDays >= 0 && ageInDays < RECENT_ASSIGNMENT_DAYS;
  }).length;
}

const gradePhrases = [
  ({ unreadGrades }: DashboardCopyContext) =>
    unreadGrades === 1
      ? "C’è un nuovo voto da scoprire: apri Voti e togli la curiosità."
      : `Ci sono ${unreadGrades} nuovi voti da scoprire: uno alla volta, senza panico.`,
  ({ unreadGrades }: DashboardCopyContext) =>
    unreadGrades === 1
      ? "Il registro ha lasciato un voto in sospeso: sorpresa o conferma?"
      : `Il registro ha lasciato ${unreadGrades} voti in sospeso: suspense scolastica!`,
  ({ unreadGrades }: DashboardCopyContext) =>
    unreadGrades === 1
      ? "È arrivato un voto nuovo. Respira: è solo un numero, ma merita un’occhiata."
      : `Sono arrivati ${unreadGrades} voti nuovi: il tabellone ti aspetta.`,
];

const assignmentPhrases = [
  ({ recentAssignments }: DashboardCopyContext) =>
    recentAssignments === 1
      ? "È arrivato un compito nuovo: affrontalo prima che si moltiplichi."
      : `Sono arrivati ${recentAssignments} compiti nuovi: modalità eroe, ma uno alla volta.`,
  ({ recentAssignments }: DashboardCopyContext) =>
    recentAssignments === 1
      ? "Un nuovo compito è in agenda: matita pronta, missione attivata."
      : `${recentAssignments} compiti freschi di registro: il diario oggi non scherza.`,
  ({ recentAssignments }: DashboardCopyContext) =>
    recentAssignments === 1
      ? "Nuovo compito in vista. Piccolo passo oggi, grande pace domani."
      : `Nuovi compiti in vista (${recentAssignments}): meglio iniziare prima della maratona.`,
];

const combinedNewsPhrases = [
  ({ unreadGrades, recentAssignments }: DashboardCopyContext) =>
    `Novità doppia: ${unreadGrades} ${unreadGrades === 1 ? "voto" : "voti"} e ${recentAssignments} ${recentAssignments === 1 ? "compito" : "compiti"}.`,
  ({ unreadGrades, recentAssignments }: DashboardCopyContext) =>
    `Il registro si è svegliato: ${unreadGrades} ${unreadGrades === 1 ? "voto" : "voti"} e ${recentAssignments} ${recentAssignments === 1 ? "compito" : "compiti"} da controllare.`,
  ({ unreadGrades, recentAssignments }: DashboardCopyContext) =>
    `Voti e compiti fanno squadra: ${unreadGrades} ${unreadGrades === 1 ? "voto" : "voti"}, ${recentAssignments} ${recentAssignments === 1 ? "compito" : "compiti"}.`,
];

const otherUpdatePhrases = [
  ({ unreadOther }: DashboardCopyContext) =>
    unreadOther === 1
      ? "C’è una novità da controllare nel registro: aprila prima che scappi."
      : `Ci sono ${unreadOther} novità da controllare: il registro ha qualcosa da raccontare.`,
  ({ unreadOther }: DashboardCopyContext) =>
    unreadOther === 1
      ? "È arrivato un aggiornamento: la curiosità è autorizzata."
      : `Sono arrivati ${unreadOther} aggiornamenti: detective del registro, tocca a te.`,
  ({ unreadOther }: DashboardCopyContext) =>
    unreadOther === 1
      ? "Il registro ha lasciato un messaggio in sospeso."
      : `Il registro ha lasciato ${unreadOther} messaggi in sospeso: niente panico, solo un’occhiata.`,
];

const quietPhrases = [
  "Dai dati caricati non risultano novità recenti: il registro oggi fa il timido.",
  "Nessun nuovo voto o compito rilevato: persino il diario si è preso una pausa caffè.",
  "Per ora tutto tranquillo nei dati del registro. L’intervallo è salvo.",
  "Nessuna novità recente da inseguire: puoi respirare prima della prossima campanella.",
  "Silenzio dal registro. Non è un bug: oggi la suspense è in pausa.",
];

function averagePhrases(average: number | null, delta: number | null): string[] {
  if (average === null) {
    return [
      "Nessun voto ancora: il primo ha la strada libera.",
      "Il tabellone è ancora vuoto: ogni percorso comincia dal primo voto.",
    ];
  }
  if (delta !== null && delta > 0.05) {
    return [
      "Stai migliorando: continua così.",
      "La media è in salita: il tuo impegno sta facendo effetto.",
      "Trend positivo: la costanza sta pagando.",
    ];
  }
  if (delta !== null && delta < -0.05) {
    return [
      "Leggero calo: punta sulle materie più deboli.",
      "Un piccolo calo non decide il finale: si riparte dal prossimo voto.",
      "Serve una rimonta? Il simulatore è pronto a fare i conti con te.",
    ];
  }
  if (average >= 8) {
    return [
      "Andamento solido e costante.",
      "Media forte: continua a tenere questo ritmo.",
      "La media viaggia bene: merito della costanza.",
    ];
  }
  if (average >= 6) {
    return [
      "Sei in linea, c’è margine per crescere.",
      "Sei sulla strada giusta: un passo alla volta si sale.",
      "Base solida; il prossimo voto può dare una spinta in più.",
    ];
  }
  return [
    "Serve un recupero mirato: usa il simulatore.",
    "È il momento di una piccola strategia di recupero: si può fare.",
    "Ogni rimonta comincia da un piano: scegli una materia e parti.",
  ];
}

export function dashboardMicrocopy(context: DashboardCopyContext, seed: number): string {
  if (context.unreadGrades > 0 && context.recentAssignments > 0) {
    return pick(combinedNewsPhrases, seed)(context);
  }
  if (context.unreadGrades > 0) return pick(gradePhrases, seed)(context);
  if (context.recentAssignments > 0) return pick(assignmentPhrases, seed)(context);
  if (context.unreadOther > 0) return pick(otherUpdatePhrases, seed)(context);

  return pick([...quietPhrases, ...averagePhrases(context.average, context.delta)], seed);
}
