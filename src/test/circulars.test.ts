import { afterEach, describe, expect, it, vi } from "vitest";
import { mirrorCirculars } from "@/lib/voto/circulars";
import type { VotoData } from "@/lib/voto/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

const emptyData = (notifications: VotoData["notifications"]): VotoData => ({
  student: {},
  subjects: [],
  assignments: [],
  notifications,
  diary: [],
  attendance: {
    absenceDays: 0,
    absenceHours: 0,
    delays: 0,
    earlyExits: 0,
    annualHours: 990,
    absenceLimitHours: 264,
  },
});

describe("mirrorCirculars", () => {
  it("does not call Supabase for an Argo source URL without an internal path", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const sourceUrl = "https://example.org/circular.pdf";
    const data = emptyData([
      {
        id: "notice-1",
        type: "notice",
        title: "Circolare di prova",
        attachmentUrl: sourceUrl,
        read: false,
      },
    ]);

    const result = await mirrorCirculars(data);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.notifications[0]).toMatchObject({ attachmentUrl: sourceUrl });
    expect(result.notifications[0]?.attachmentPath).toBeUndefined();
  });

  it("requests a short-lived URL only for an internally stored PDF", async () => {
    const signedUrl =
      "https://jmvxuhgjejzpezvawzfw.supabase.co/storage/v1/object/sign/circulars/circulars/file.pdf?token=test";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ path: `circulars/${"a".repeat(64)}.pdf`, signedUrl }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const path = `circulars/${"a".repeat(64)}.pdf`;
    const data = emptyData([
      {
        id: "notice-internal",
        type: "notice",
        title: "Circolare interna",
        attachmentPath: path,
        read: false,
      },
    ]);

    const result = await mirrorCirculars(data);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://jmvxuhgjejzpezvawzfw.supabase.co/functions/v1/mirror-circular",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1",
        }),
        body: JSON.stringify({ path }),
      }),
    );
    expect(result.notifications[0]).toMatchObject({
      attachmentPath: path,
      attachmentUrl: signedUrl,
    });
  });
});
