export type ConnectionIssueKind =
  | "offline"
  | "invalid-url"
  | "unreachable"
  | "timeout"
  | "service"
  | "auth"
  | "invalid-data"
  | "unknown";

export interface ConnectionIssue {
  kind: ConnectionIssueKind;
  title: string;
  description: string;
  tone: "warning" | "danger";
}

export function getConnectionIssue({
  url,
  isOnline,
  error,
}: {
  url: string;
  isOnline: boolean;
  error: string | null;
}): ConnectionIssue | null {
  if (!url) return null;

  if (!isOnline) {
    return {
      kind: "offline",
      title: "Connessione Internet assente",
      description: "VOTO non può aggiornare i dati scolastici finché il dispositivo è offline.",
      tone: "warning",
    };
  }

  if (!error) return null;

  if (/url non valido|deve iniziare con https/i.test(error)) {
    return {
      kind: "invalid-url",
      title: "Indirizzo dei dati non valido",
      description: error,
      tone: "danger",
    };
  }

  if (/tempo scaduto|timeout|abort/i.test(error)) {
    return {
      kind: "timeout",
      title: "Il servizio dati non risponde",
      description: "La richiesta è scaduta. Riprova tra poco.",
      tone: "danger",
    };
  }

  if (
    /impossibile raggiungere l.url|failed to fetch|networkerror|network request failed|load failed|cors|err_name_not_resolved|err_connection/i.test(
      error,
    )
  ) {
    return {
      kind: "unreachable",
      title: "URL dei dati non raggiungibile",
      description:
        "La rete è attiva, ma il browser non riesce a contattare il servizio. Verifica l’indirizzo e che il server sia online e consenta la connessione.",
      tone: "danger",
    };
  }

  if (/PRIVATE_DATA_UNAUTHENTICATED|sessione.*scaduta|accedi di nuovo/i.test(error)) {
    return {
      kind: "auth",
      title: "Accesso da rinnovare",
      description: error.replace(/^PRIVATE_DATA_UNAUTHENTICATED:\s*/i, ""),
      tone: "warning",
    };
  }

  if (/PRIVATE_DATA_FORBIDDEN|non è autorizzato/i.test(error)) {
    return {
      kind: "auth",
      title: "Account non autorizzato",
      description: error.replace(/^PRIVATE_DATA_FORBIDDEN:\s*/i, ""),
      tone: "danger",
    };
  }

  if (
    /server \((?:4|5)\d\d\)|\b404\b|\b503\b|servizio privato non è ancora disponibile/i.test(error)
  ) {
    return {
      kind: "service",
      title: "Servizio dati non disponibile",
      description: error,
      tone: "danger",
    };
  }

  if (
    /formato non valido|risposta.*incompleta|non contiene dati validi|non contiene materie|manca la sezione/i.test(
      error,
    )
  ) {
    return {
      kind: "invalid-data",
      title: "Risposta dei dati non valida",
      description: error,
      tone: "danger",
    };
  }

  return {
    kind: "unknown",
    title: "Aggiornamento dei dati non riuscito",
    description: error,
    tone: "danger",
  };
}
