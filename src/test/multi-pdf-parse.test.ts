import { describe, expect, it } from "vitest";
import { parseVotoData } from "@/lib/voto/parse";

describe("parser allegati circolari multipli", () => {
  it("mantiene più PDF e i campi singoli per la compatibilità", () => {
    const parsed = parseVotoData({
      subjects: [],
      notifications: [
        {
          id: "notice-1",
          type: "notice",
          title: "Circolare di prova",
          attachmentPath: `circulars/${"a".repeat(64)}.pdf`,
          attachmentName: "primo.pdf",
          attachments: [
            { path: `circulars/${"a".repeat(64)}.pdf`, name: "primo.pdf" },
            { path: `circulars/${"b".repeat(64)}.pdf`, name: "secondo.pdf" },
          ],
        },
      ],
    });

    expect(parsed.notifications[0]?.attachments).toEqual([
      { path: `circulars/${"a".repeat(64)}.pdf`, name: "primo.pdf" },
      { path: `circulars/${"b".repeat(64)}.pdf`, name: "secondo.pdf" },
    ]);
    expect(parsed.notifications[0]?.attachmentPath).toBe(`circulars/${"a".repeat(64)}.pdf`);
    expect(parsed.notifications[0]?.attachmentName).toBe("primo.pdf");
  });

  it("continua a leggere una circolare nel formato PDF singolo", () => {
    const parsed = parseVotoData({
      subjects: [],
      notifications: [
        {
          id: "notice-legacy",
          type: "notice",
          title: "Circolare legacy",
          attachmentPath: `circulars/${"c".repeat(64)}.pdf`,
          attachmentName: "allegato.pdf",
        },
      ],
    });

    expect(parsed.notifications[0]?.attachments).toBeUndefined();
    expect(parsed.notifications[0]?.attachmentPath).toBe(`circulars/${"c".repeat(64)}.pdf`);
  });
});
