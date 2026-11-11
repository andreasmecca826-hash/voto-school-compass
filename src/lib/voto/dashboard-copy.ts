import type { AppNotification, Assignment } from "./types";
import { parseEventDateTime } from "./dates";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_ASSIGNMENT_DAYS = 3;

type DashboardCopyContext = {
  average: number | null;
  delta: number | null;
  latestEvent: DashboardEvent | null;
};

export type DashboardEventKind = "grade" | "assignment" | "other";

export type DashboardEvent = {
  kind: DashboardEventKind;
  occurredAt: number;
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

const recentEventPhrases: Record<DashboardEventKind, string[]> = {
  grade: [
    "È arrivato un voto nuovo: dagli un’occhiata quando vuoi.",
    "Il registro ha appena aggiunto un voto: sorpresa o conferma?",
    "C’è un voto recente da scoprire: respira e controlla con calma.",
  ],
  assignment: [
    "È arrivato un compito nuovo: affrontalo prima che si moltiplichi.",
    "Un compito recente è in agenda: piccolo passo oggi, grande pace domani.",
    "Nuovo compito in vista: matita pronta, missione attivata.",
  ],
  other: [
    "È arrivato un aggiornamento nel registro: dagli un’occhiata.",
    "La scuola ha lasciato una novità recente: la trovi qui appena vuoi.",
    "C’è una comunicazione recente da controllare: niente panico, solo un’occhiata.",
  ],
};

export function selectLatestDashboardEvent(
  notifications: AppNotification[],
  assignments: Assignment[],
  now: Date,
): DashboardEvent | null {
  const lowerBound = now.getTime() - DAY_MS;
  const upperBound = now.getTime();
  const candidates: DashboardEvent[] = [];

  notifications.forEach((notification) => {
    const occurredAt = parseEventDateTime(notification.date);
    if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
    candidates.push({
      kind: notification.type === "grade" ? "grade" : "other",
      occurredAt,
    });
  });

  assignments.forEach((assignment) => {
    const occurredAt = parseEventDateTime(assignment.assignedDate);
    if (occurredAt === null || occurredAt < lowerBound || occurredAt > upperBound) return;
    candidates.push({ kind: "assignment", occurredAt });
  });

  return candidates.reduce<DashboardEvent | null>(
    (latest, candidate) =>
      latest === null || candidate.occurredAt >= latest.occurredAt ? candidate : latest,
    null,
  );
}

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
  if (context.latestEvent) {
    return pick(recentEventPhrases[context.latestEvent.kind], seed);
  }

  return pick(averagePhrases(context.average, context.delta), seed);
}
