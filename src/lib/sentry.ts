import * as Sentry from "@sentry/react";

// A Sentry DSN is an ingestion key intended for client-side use. It is not an
// authentication token; deployments may override it through VITE_SENTRY_DSN.
const dsn =
  import.meta.env["VITE_SENTRY_DSN"] ||
  "https://c034116ce8cb726769bb1096abf142ef@o4512356425990144.ingest.de.sentry.io/4512385034879056";
const enabled = import.meta.env.PROD && typeof window !== "undefined";

if (enabled) {
  Sentry.init({
    dsn,
    enabled,
    tracesSampleRate: 0,
    beforeSend(event) {
      // VOTO handles school records locally. Keep only exception types and
      // stack frames; discard request/user data, messages and breadcrumbs.
      delete event.request;
      delete event.user;
      delete event.breadcrumbs;
      delete event.extra;
      delete event.contexts;
      delete event.tags;
      delete event.message;
      for (const value of event.exception?.values ?? []) {
        value.value = value.type || "Error";
        for (const frame of value.stacktrace?.frames ?? []) {
          delete frame.vars;
        }
      }
      return event;
    },
  });
}

export function captureVotoError(error: unknown) {
  if (enabled) Sentry.captureException(error);
}
