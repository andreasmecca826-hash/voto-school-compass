import type { GoogleScheduleEventDraft } from "./schedule-calendar";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned";
// OAuth client IDs are public by design. Never put a client secret in this frontend bundle.
const DEFAULT_GOOGLE_CALENDAR_CLIENT_ID =
  "988977768943-5eo3fu4r4gdcvejhl4gpco6gulivet4d.apps.googleusercontent.com";
const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type GoogleCalendarSyncResult = {
  created: number;
  updated: number;
  deleted: number;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  scope?: string;
};

type GooglePopupError = {
  type?: "popup_failed_to_open" | "popup_closed" | "unknown";
  message?: string;
};

type GoogleTokenClient = {
  requestAccessToken: () => void;
};

type GoogleIdentityServices = {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        login_hint?: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback: (error: GooglePopupError) => void;
      }) => GoogleTokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let googleIdentityPromise: Promise<GoogleIdentityServices> | undefined;

export function getGoogleCalendarClientId(): string {
  return (
    import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID?.trim() || DEFAULT_GOOGLE_CALENDAR_CLIENT_ID
  );
}

export function loadGoogleIdentityServices(): Promise<GoogleIdentityServices> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Google Calendar è disponibile solo nel browser."));
  }
  if (window.google?.accounts.oauth2) return Promise.resolve(window.google);
  if (googleIdentityPromise) return googleIdentityPromise;

  googleIdentityPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
    );
    const script = existing ?? document.createElement("script");

    const onLoad = () => {
      if (window.google?.accounts.oauth2) resolve(window.google);
      else reject(new Error("Google Identity Services non è stato caricato correttamente."));
    };
    const onError = () => reject(new Error("Impossibile caricare il servizio di accesso Google."));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }).catch((error: unknown) => {
    googleIdentityPromise = undefined;
    throw error;
  });

  return googleIdentityPromise;
}

export function requestGoogleCalendarAccessToken(loginHint?: string): Promise<string> {
  const clientId = getGoogleCalendarClientId();
  if (!clientId) {
    return Promise.reject(
      new Error("Google Calendar non è ancora configurato: manca il client OAuth dell’app."),
    );
  }
  const google = typeof window !== "undefined" ? window.google : undefined;
  if (!google?.accounts.oauth2) {
    return Promise.reject(
      new Error("Il servizio Google non è pronto. Chiudi e riapri questa finestra, poi riprova."),
    );
  }

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      ...(loginHint?.trim() ? { login_hint: loginHint.trim() } : {}),
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                "Google non ha concesso l’accesso al calendario. Puoi riprovare quando vuoi.",
            ),
          );
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        if (error.type === "popup_closed") {
          reject(new Error("Finestra Google chiusa prima di completare l’autorizzazione."));
        } else if (error.type === "popup_failed_to_open") {
          reject(
            new Error("Il browser ha bloccato la finestra Google. Consenti i popup e riprova."),
          );
        } else {
          reject(new Error(error.message || "Impossibile avviare l’autorizzazione Google."));
        }
      },
    });

    try {
      // Chiamata sincrona dal click dell’utente: Google può aprire il proprio dialogo di consenso.
      tokenClient.requestAccessToken();
    } catch {
      reject(new Error("Impossibile avviare l’autorizzazione Google."));
    }
  });
}

async function getGoogleApiError(response: Response): Promise<string> {
  let message = "";
  try {
    const body = (await response.json()) as { error?: { message?: unknown } };
    if (typeof body.error?.message === "string") message = body.error.message;
  } catch {
    // La risposta può non contenere JSON leggibile.
  }

  if (response.status === 401) {
    return "La sessione Google è scaduta. Premi di nuovo il pulsante per autorizzare il calendario.";
  }
  if (response.status === 403) {
    return message
      ? `Google Calendar ha rifiutato la richiesta: ${message}`
      : "Google Calendar ha rifiutato la richiesta. Controlla che l’API sia abilitata e che il consenso sia stato concesso.";
  }
  return message || `Google Calendar ha restituito l’errore ${response.status}.`;
}

function requestHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

type ManagedGoogleEvent = {
  id?: unknown;
  extendedProperties?: { private?: Record<string, unknown> };
};

async function listVotoScheduleEventIds(
  accessToken: string,
  fetcher: typeof fetch,
): Promise<Set<string>> {
  const eventIds = new Set<string>();
  let pageToken: string | undefined;

  do {
    const url = new URL(GOOGLE_CALENDAR_EVENTS_URL);
    url.searchParams.set("privateExtendedProperty", "votoSource=orario");
    url.searchParams.set("singleEvents", "false");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("maxResults", "2500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetcher(url.toString(), {
      method: "GET",
      headers: requestHeaders(accessToken),
    });
    if (!response.ok) throw new Error(await getGoogleApiError(response));

    const body = (await response.json()) as {
      items?: ManagedGoogleEvent[];
      nextPageToken?: unknown;
    };
    if (Array.isArray(body.items)) {
      for (const event of body.items) {
        if (
          typeof event.id === "string" &&
          event.extendedProperties?.private?.votoSource === "orario"
        ) {
          eventIds.add(event.id);
        }
      }
    }
    pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : undefined;
  } while (pageToken);

  return eventIds;
}

export async function syncScheduleToGoogleCalendar(
  accessToken: string,
  events: GoogleScheduleEventDraft[],
  fetcher: typeof fetch = fetch,
): Promise<GoogleCalendarSyncResult> {
  if (!accessToken.trim()) throw new Error("Autorizzazione Google mancante.");

  let created = 0;
  let updated = 0;

  for (const event of events) {
    const body = JSON.stringify(event);
    const response = await fetcher(GOOGLE_CALENDAR_EVENTS_URL, {
      method: "POST",
      headers: requestHeaders(accessToken),
      body,
    });

    if (response.status === 409) {
      const updateResponse = await fetcher(
        `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(event.id)}`,
        {
          method: "PATCH",
          headers: requestHeaders(accessToken),
          body,
        },
      );
      if (!updateResponse.ok) throw new Error(await getGoogleApiError(updateResponse));
      updated += 1;
      continue;
    }

    if (!response.ok) throw new Error(await getGoogleApiError(response));
    created += 1;
  }

  const currentEventIds = new Set(events.map((event) => event.id));
  const managedEventIds = await listVotoScheduleEventIds(accessToken, fetcher);
  let deleted = 0;

  for (const eventId of managedEventIds) {
    if (currentEventIds.has(eventId)) continue;

    const response = await fetcher(`${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: requestHeaders(accessToken),
    });
    if (response.status === 404 || response.status === 410) continue;
    if (!response.ok) throw new Error(await getGoogleApiError(response));
    deleted += 1;
  }

  return { created, updated, deleted };
}
