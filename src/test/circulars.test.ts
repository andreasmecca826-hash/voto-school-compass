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
  it("does not call the deprecated function for an Argo source URL", async () => {
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

  it("opens an internally uploaded PDF through the app endpoint without calling mirror-circular", async () => {
    const fetchMock = vi.fn();
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

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.notifications[0]).toMatchObject({
      attachmentPath: path,
      attachmentUrl: `/api/circulars/mirror?path=${encodeURIComponent(path)}`,
    });
  });
});
