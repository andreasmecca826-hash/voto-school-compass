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
          extractedText: "La classe 2I esce alle 12:30.",
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
    expect(parsed.notifications[0]?.extractedText).toBe("La classe 2I esce alle 12:30.");
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

  it("mantiene i link esterni degli allegati non PDF", () => {
    const parsed = parseVotoData({
      subjects: [],
      notifications: [
        {
          id: "notice-docx",
          type: "notice",
          title: "Circolare con Word",
          attachments: [
            { path: `circulars/${"d".repeat(64)}.pdf`, name: "circolare.pdf" },
            { url: "https://didup.example/report.docx", name: "report.docx" },
          ],
        },
      ],
    });

    expect(parsed.notifications[0]?.attachments).toEqual([
      { path: `circulars/${"d".repeat(64)}.pdf`, name: "circolare.pdf" },
      { url: "https://didup.example/report.docx", name: "report.docx" },
    ]);
  });

  it("propaga il rilevamento delle tabelle dagli allegati alla notifica", () => {
    const parsed = parseVotoData({
      subjects: [],
      notifications: [
        {
          id: "notice-table",
          type: "notice",
          title: "Orario assemblea",
          hasTables: true,
          tableCount: 2,
          attachments: [
            {
              path: `circulars/${"e".repeat(64)}.pdf`,
              name: "orario.pdf",
              hasTables: true,
              tableCount: 2,
            },
          ],
        },
      ],
    });

    expect(parsed.notifications[0]).toMatchObject({ hasTables: true, tableCount: 2 });
    expect(parsed.notifications[0]?.attachments?.[0]).toMatchObject({
      hasTables: true,
      tableCount: 2,
    });
  });
});
