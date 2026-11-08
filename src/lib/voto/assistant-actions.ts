import type { Assignment } from "./types";

export type AssignmentConfirmation = {
  id: string;
  title: string;
  subject?: string | undefined;
  dueDate?: string | undefined;
  currentCompleted: boolean;
  completed: boolean;
};

export type AssignmentActionIntent =
  | { kind: "confirm"; action: AssignmentConfirmation }
  | { kind: "already"; message: string }
  | { kind: "clarify"; message: string };

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("it-IT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

function editDistance(left: string, right: string): number {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const above = row[j]!;
      row[j] =
        left[i - 1] === right[j - 1]
          ? diagonal
          : Math.min(diagonal + 1, above + 1, row[j - 1]! + 1);
      diagonal = above;
    }
  }
  return row[right.length]!;
}

function titleMatchesQuery(query: string, title: string): boolean {
  if (query.includes(title)) return true;
  const titleTokens = title.split(/\s+/).filter((token) => token.length >= 4);
  if (titleTokens.length === 0) return false;
  const queryTokens = query.split(/\s+/);
  const matches = titleTokens.filter((titleToken) =>
    queryTokens.some(
      (queryToken) =>
        queryToken.includes(titleToken) ||
        (queryToken.length >= 5 &&
          titleToken.length >= 5 &&
          editDistance(queryToken, titleToken) <= (titleToken.length >= 6 ? 2 : 1)),
    ),
  );
  return matches.length >= Math.ceil(titleTokens.length * 0.6);
}

function isExplicitlyNegatedTaskAction(query: string): boolean {
  return /\bnon\s+(?:(?:voglio|devo|posso)\s+)?(?:segnare|segna|marcare|marca|mettere|metti|completare|completa|riaprire|riapri)\b/.test(
    query,
  );
}

function reportsUnfinishedTask(query: string): boolean {
  return /\bnon\s+(?:(?:ho|hai|ha|abbiamo|avete|hanno|sono|sei|e)\s+(?:ancora\s+)?|(?:voglio|devo|posso)\s+)?(?:fatt\w*|finit\w*|svolt\w*|conclus\w*|complet\w*)\b/.test(
    query,
  );
}

function requestedCompletionState(query: string): boolean | null {
  const requestsReopen = includesAny(query, [
    "riapri",
    "riaprire",
    "annulla completamento",
    "non completat",
    "incomplet",
    "non fatto",
    "come da fare",
    "da fare",
  ]);
  const requestsCompletion = includesAny(query, [
    "complet",
    "fatto",
    "finito",
    "svolto",
    "conclus",
  ]);
  if (
    requestsReopen &&
    includesAny(query, [
      "riapri",
      "annulla completamento",
      "non completat",
      "incomplet",
      "non fatto",
      "come da fare",
      "da fare",
    ])
  )
    return false;
  if (requestsReopen === requestsCompletion) return null;
  return requestsCompletion;
}

export function getAssignmentActionIntent(
  query: string,
  assignments: Assignment[],
): AssignmentActionIntent | null {
  const normalized = normalize(query.trim());
  if (isExplicitlyNegatedTaskAction(normalized)) return null;
  const targetState = requestedCompletionState(normalized);
  const hasTaskReference = includesAny(normalized, ["compit", "consegn", "attivita"]);
  const hasActionVerb = /\b(segna|marca|metti|imposta|completa|riapri|annulla)\b/.test(normalized);
  const reportsCompletion = /\bho\s+(fatto|finito|complet\w*|svolt\w*)/.test(normalized);
  const matchedCandidates = assignments.filter((assignment) => {
    const title = normalize(assignment.title.trim());
    return title.length >= 3 && titleMatchesQuery(normalized, title);
  });
  const candidates = matchedCandidates.filter((candidate) => {
    const title = normalize(candidate.title.trim());
    return !matchedCandidates.some((other) => {
      if (other.id === candidate.id) return false;
      const otherTitle = normalize(other.title.trim());
      return otherTitle.length > title.length && otherTitle.includes(title);
    });
  });
  if (reportsUnfinishedTask(normalized) && candidates.length) {
    if (candidates.length > 1)
      return {
        kind: "clarify",
        message:
          "Capito: non segno questi compiti come completati. Non ho modificato nulla; indicami il titolo preciso se vuoi aggiornare uno stato.",
      };
    const assignment = candidates[0]!;
    return assignment.completed
      ? {
          kind: "clarify",
          message: `Dici di non aver finito “${assignment.title}”, ma nei dati risulta completato. Vuoi riaprirlo? Non ho modificato nulla.`,
        }
      : {
          kind: "already",
          message: `Capito: “${assignment.title}” risulta già da fare. Non ho modificato nulla.`,
        };
  }
  const referencesTask = hasTaskReference || candidates.length > 0;
  const expressesAction = hasActionVerb || (reportsCompletion && candidates.length > 0);

  if (!expressesAction) return null;
  if (targetState === null) {
    if (!referencesTask || !expressesAction) return null;
    return {
      kind: "clarify",
      message: "Vuoi segnare il compito come completato o riaprirlo? Non ho modificato nulla.",
    };
  }

  const completed = targetState;
  let matchingAssignments = candidates;

  if (!matchingAssignments.length) {
    const subjectMatches = assignments.filter((assignment) => {
      const subject = assignment.subject?.trim();
      return subject && normalize(subject).length >= 2 && normalized.includes(normalize(subject));
    });
    matchingAssignments = subjectMatches;
  }

  if (matchingAssignments.length > 1) {
    const options = matchingAssignments
      .slice(0, 5)
      .map(
        (assignment) =>
          `“${assignment.title}”${assignment.subject ? ` (${assignment.subject})` : ""}`,
      );
    return {
      kind: "clarify",
      message: `Trovo più compiti compatibili: ${options.join(", ")}. Scrivimi il titolo preciso. Non ho modificato nulla.`,
    };
  }

  const assignment = matchingAssignments[0];
  if (!assignment) {
    return {
      kind: "clarify",
      message:
        "Non trovo un compito corrispondente. Scrivimi il titolo esatto e specifica se vuoi completarlo o riaprirlo; non ho modificato nulla.",
    };
  }

  if (assignment.completed === completed) {
    return {
      kind: "already",
      message: completed
        ? `“${assignment.title}” risulta già completato. Non ho apportato modifiche.`
        : `“${assignment.title}” risulta già da fare. Non ho apportato modifiche.`,
    };
  }

  return {
    kind: "confirm",
    action: {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      dueDate: assignment.dueDate,
      currentCompleted: assignment.completed,
      completed,
    },
  };
}
