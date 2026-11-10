import { describe, expect, it } from "vitest";
import { matchesNoticeQuery, noticeSearchText } from "@/lib/voto/bacheca-search";
import type { AppNotification } from "@/lib/voto/types";

const notice: AppNotification = {
  id: "circolare-1",
  type: "notice",
  title: "Assemblea di istituto",
  message: "L'assemblea si svolgerà venerdì.",
  subject: "Comunicazioni scolastiche",
  teacher: "Segreteria",
  attachmentName: "assemblea-novembre.pdf",
  extractedText: "Orario ingresso palestra",
  attachments: [{ name: "programma.pdf", path: "circulars/program.pdf" }],
  read: false,
};

describe("ricerca Bacheca", () => {
  it("cerca nel titolo, nel testo e nei metadati della circolare", () => {
    expect(matchesNoticeQuery(notice, "assemblea")).toBe(true);
    expect(matchesNoticeQuery(notice, "segreteria")).toBe(true);
    expect(matchesNoticeQuery(notice, "palestra")).toBe(true);
  });

  it("cerca anche nel nome e nel percorso degli allegati", () => {
    expect(matchesNoticeQuery(notice, "programma.pdf")).toBe(true);
    expect(matchesNoticeQuery(notice, "circulars/program")).toBe(true);
    expect(noticeSearchText(notice)).toContain("assemblea-novembre.pdf");
  });

  it("ignora maiuscole e spazi ai bordi, ma non trova parole assenti", () => {
    expect(matchesNoticeQuery(notice, "  ASSEMBLEA ")).toBe(true);
    expect(matchesNoticeQuery(notice, "circolare inesistente")).toBe(false);
    expect(matchesNoticeQuery(notice, "")).toBe(true);
  });
});
