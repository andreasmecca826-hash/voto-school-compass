import { afterEach, describe, expect, it, vi } from "vitest";
import { getCircularCheckStatus, requestCircularCheck } from "@/lib/voto/circulars";
import { fetchVotoData } from "@/lib/voto/parse";
import { supabase } from "@/lib/supabase-auth";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("refresh dei dati con allegati interni", () => {
  it("non attende la firma anticipata e conserva il path usato dal viewer", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-user-token" } as never },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    const path = `circulars/${"a".repeat(64)}.pdf`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          subjects: [],
          notifications: [
            {
              id: "notice-internal",
              type: "notice",
              title: "Circolare interna",
              attachmentPath: path,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchVotoData("https://school.example/voto.json");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.notifications[0]).toMatchObject({ attachmentPath: path });
    expect(result.notifications[0]?.attachmentUrl).toBeUndefined();
  });
});

describe("circular check trigger", () => {
  it("starts a protected server-side check and returns its request time", async () => {
    const requestedAt = "2026-10-26T22:00:00.000Z";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "started", requestedAt }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestCircularCheck()).resolves.toBe(requestedAt);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://jmvxuhgjejzpezvawzfw.supabase.co/functions/v1/request-circular-check",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
  });

  it("explains the shared cooldown instead of dispatching another run", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: "recent", retryAfterSeconds: 70 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(requestCircularCheck()).rejects.toThrow("Riprova tra circa 2 min");
  });

  it("surfaces a GitHub permission refusal as a readable message, not a crash", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: "GitHub ha negato l’accesso del controllo (HTTP 403).",
            diagnosticCode: "dispatch_403",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      ),
    );

    await expect(requestCircularCheck()).rejects.toThrow(
      "GitHub ha negato l’accesso del controllo (HTTP 403).",
    );
  });

  it("joins an already running update when the server returns its start time", async () => {
    const requestedAt = "2026-10-26T22:00:00.000Z";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "started", requestedAt, joinedExisting: true }), {
          status: 202,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(requestCircularCheck()).resolves.toBe(requestedAt);
  });

  it("reads the status for the run started by the button", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "completed", conclusion: "success" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCircularCheckStatus("2026-10-26T22:00:00.000Z")).resolves.toEqual({
      status: "completed",
      conclusion: "success",
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("after=2026-10-26T22%3A00%3A00.000Z");
  });
});
