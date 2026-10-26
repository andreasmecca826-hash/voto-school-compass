import { afterEach, describe, expect, it, vi } from "vitest";
import { mirrorCirculars } from "@/lib/voto/circulars";
import type { VotoData } from "@/lib/voto/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mirrorCirculars", () => {
  it("uses the configured project defaults and replaces the source URL with a signed PDF URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          path: "circulars/abc123.pdf",
          signedUrl: "https://storage.example/signed.pdf",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const data: VotoData = {
      student: {},
      subjects: [],
      assignments: [],
      notifications: [
        {
          id: "notice-1",
          type: "notice",
          title: "Circolare di prova",
          attachmentUrl: "https://example.org/circular.pdf",
          read: false,
        },
      ],
      diary: [],
      attendance: {
        absenceDays: 0,
        absenceHours: 0,
        delays: 0,
        earlyExits: 0,
        annualHours: 990,
        absenceLimitHours: 264,
      },
    };

    const result = await mirrorCirculars(data);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://jmvxuhgjejzpezvawzfw.supabase.co/functions/v1/mirror-circular",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1",
          Authorization: "Bearer sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1",
        }),
        body: JSON.stringify({ sourceUrl: "https://example.org/circular.pdf" }),
      }),
    );
    expect(result.notifications[0]).toMatchObject({
      attachmentPath: "circulars/abc123.pdf",
      attachmentUrl: "https://storage.example/signed.pdf",
    });
  });

  it("opens an internally uploaded PDF through the app endpoint without calling mirror-circular", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const path = `circulars/${"a".repeat(64)}.pdf`;
    const data: VotoData = {
      student: {},
      subjects: [],
      assignments: [],
      notifications: [
        {
          id: "notice-internal",
          type: "notice",
          title: "Circolare interna",
          attachmentPath: path,
          read: false,
        },
      ],
      diary: [],
      attendance: {
        absenceDays: 0,
        absenceHours: 0,
        delays: 0,
        earlyExits: 0,
        annualHours: 990,
        absenceLimitHours: 264,
      },
    };

    const result = await mirrorCirculars(data);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.notifications[0]).toMatchObject({
      attachmentPath: path,
      attachmentUrl: `/api/circulars/mirror?path=${encodeURIComponent(path)}`,
    });
  });
});
