import { describe, expect, it, vi } from "vitest";
import {
  getGoogleCalendarClientId,
  syncScheduleToGoogleCalendar,
} from "@/lib/voto/google-calendar";
import type { GoogleScheduleEventDraft } from "@/lib/voto/schedule-calendar";

const event: GoogleScheduleEventDraft = {
  id: "votoorariolunedi1",
  summary: "Matematica · 1ª ora",
  description: "Lezione ricorrente dell’orario scolastico VOTO.",
  start: { dateTime: "2026-11-16T08:00:00", timeZone: "Europe/Rome" },
  end: { dateTime: "2026-11-16T08:50:00", timeZone: "Europe/Rome" },
  recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=34"],
  extendedProperties: { private: { votoSource: "orario" } },
};

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchMock(responses: Response[]) {
  return vi.fn(
    async () => responses.shift() ?? response(200, { items: [] }),
  ) as unknown as typeof fetch;
}

function callsOf(fetcher: typeof fetch) {
  return (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls as [string, RequestInit][];
}

describe("Google Calendar OAuth configuration", () => {
  it("uses the configured public production client ID when no override is set", () => {
    vi.stubEnv("VITE_GOOGLE_CALENDAR_CLIENT_ID", "");
    try {
      expect(getGoogleCalendarClientId()).toBe(
        "988977768943-5eo3fu4r4gdcvejhl4gpco6gulivet4d.apps.googleusercontent.com",
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("syncScheduleToGoogleCalendar", () => {
  it("crea un evento ricorrente e poi legge solo gli eventi gestiti da VOTO", async () => {
    const fetcher = fetchMock([
      response(201, { id: event.id }),
      response(200, {
        items: [{ id: event.id, extendedProperties: { private: { votoSource: "orario" } } }],
      }),
    ]);

    const result = await syncScheduleToGoogleCalendar("test-access-token", [event], fetcher);

    expect(result).toEqual({ created: 1, updated: 0, deleted: 0 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const calls = callsOf(fetcher);
    expect(calls[0][0]).toBe("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    expect(calls[0][1].method).toBe("POST");
    expect((calls[0][1].headers as Record<string, string>).Authorization).toBe(
      "Bearer test-access-token",
    );
    expect(JSON.parse(calls[0][1].body as string)).toEqual(event);
    const listUrl = new URL(calls[1][0]);
    expect(calls[1][1].method).toBe("GET");
    expect(listUrl.searchParams.get("privateExtendedProperty")).toBe("votoSource=orario");
    expect(listUrl.searchParams.get("singleEvents")).toBe("false");
    expect((calls[1][1].headers as Record<string, string>).Authorization).toBe(
      "Bearer test-access-token",
    );
  });

  it("aggiorna lo stesso evento se esiste e rimuove solo le serie VOTO obsolete", async () => {
    const staleId = "votoorariomartedi2";
    const fetcher = fetchMock([
      response(409),
      response(200),
      response(200, {
        items: [
          { id: event.id, extendedProperties: { private: { votoSource: "orario" } } },
          { id: staleId, extendedProperties: { private: { votoSource: "orario" } } },
          { id: "manual-event", extendedProperties: { private: { votoSource: "manuale" } } },
        ],
      }),
      new Response(null, { status: 204 }),
    ]);

    const result = await syncScheduleToGoogleCalendar("token", [event], fetcher);

    expect(result).toEqual({ created: 0, updated: 1, deleted: 1 });
    const calls = callsOf(fetcher);
    expect(calls).toHaveLength(4);
    expect(calls[0][1].method).toBe("POST");
    expect(calls[1][0]).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/votoorariolunedi1",
    );
    expect(calls[1][1].method).toBe("PATCH");
    expect(calls[2][1].method).toBe("GET");
    expect(calls[3][0]).toBe(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events/votoorariomartedi2",
    );
    expect(calls[3][1].method).toBe("DELETE");
  });

  it("rimuove le serie VOTO gestite quando l’orario corrente è vuoto", async () => {
    const fetcher = fetchMock([
      response(200, {
        items: [
          { id: "votoorariolunedi1", extendedProperties: { private: { votoSource: "orario" } } },
        ],
      }),
      new Response(null, { status: 204 }),
    ]);

    const result = await syncScheduleToGoogleCalendar("token", [], fetcher);

    expect(result).toEqual({ created: 0, updated: 0, deleted: 1 });
    expect(callsOf(fetcher)[1][1].method).toBe("DELETE");
  });

  it("mostra l’errore restituito da Google se il consenso o l’API mancano", async () => {
    const fetcher = fetchMock([
      response(403, { error: { message: "Calendar API has not been used" } }),
    ]);

    await expect(syncScheduleToGoogleCalendar("token", [event], fetcher)).rejects.toThrow(
      "Google Calendar ha rifiutato la richiesta: Calendar API has not been used",
    );
  });

  it("non chiama Google senza token valido", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;

    await expect(syncScheduleToGoogleCalendar("", [event], fetcher)).rejects.toThrow(
      "Autorizzazione Google mancante.",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
});
