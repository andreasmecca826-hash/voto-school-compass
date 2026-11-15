import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCircularAttachmentSignedUrl,
  getCircularCheckStatus,
  requestCircularCheck,
} from "@/lib/voto/circulars";
import { fetchVotoData } from "@/lib/voto/parse";
import { supabase } from "@/lib/supabase-auth";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("URL firmati degli allegati circolari", () => {
  const path = `circulars/${"a".repeat(64)}.pdf`;
  const signedUrl = `https://jmvxuhgjejzpezvawzfw.supabase.co/storage/v1/object/sign/${path}?token=test`;

  it("invoca mirror-circular con path normalizzato e accetta l’URL firmato del progetto", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-user-token" } as never },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ path, signedUrl }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getCircularAttachmentSignedUrl(`/${path}`)).resolves.toBe(signedUrl);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://jmvxuhgjejzpezvawzfw.supabase.co/functions/v1/mirror-circular",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ path }),
        headers: expect.objectContaining({ Authorization: "Bearer test-user-token" }),
      }),
    );
  });

  it("rifiuta path non interni senza chiamare la funzione", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getCircularAttachmentSignedUrl("https://example.invalid/circular.pdf"),
    ).rejects.toThrow("Percorso allegato non valido.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rifiuta URL firmati provenienti da un altro host", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-user-token" } as never },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            path,
            signedUrl: "https://example.invalid/storage/object?token=test",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    await expect(getCircularAttachmentSignedUrl(path)).rejects.toThrow(
      "L’URL firmato dell’allegato non è valido.",
    );
  });
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
