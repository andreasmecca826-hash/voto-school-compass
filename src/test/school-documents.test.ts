import { beforeEach, describe, expect, it, vi } from "vitest";

const { askWithDocument } = vi.hoisted(() => ({ askWithDocument: vi.fn() }));

vi.mock("@/lib/voto/circular-assistant", () => ({ askWithDocument }));

import { answerSchoolPolicyQuestion, isSchoolPolicyQuestion } from "@/lib/voto/school-documents";

describe("fonti scolastiche ufficiali e ricerca utente", () => {
  beforeEach(() => askWithDocument.mockReset());

  it("riconosce una domanda sulle regole del fumo", () => {
    expect(isSchoolPolicyQuestion("Cosa accade se mi beccano a fumare?")).toBe(true);
    expect(isSchoolPolicyQuestion("Spiegami la fotosintesi.")).toBe(false);
  });

  it("riconosce domande sull’offerta formativa del Morselli-Sturzo", () => {
    expect(isSchoolPolicyQuestion("Quali indirizzi di studio offre lo Sturzo?")).toBe(true);
  });

  it("in modalità locale mostra l'estratto e collega la pagina del regolamento ufficiale", async () => {
    const result = await answerSchoolPolicyQuestion("Cosa accade se mi beccano a fumare?", "local");

    expect(result.text).toMatch(/costituisce grave infrazione\s+disciplinare/);
    expect(result.text).toContain("sanzioni pecuniarie");
    expect(result.sources).toEqual([
      expect.objectContaining({
        title: "Regolamento di Istituto Morselli-Sturzo A.S. 2025-2026",
        page: 23,
      }),
    ]);
    expect(askWithDocument).not.toHaveBeenCalled();
  });

  it("in modalità API invia solo la pagina pertinente e la domanda corrente", async () => {
    askWithDocument.mockResolvedValue("Il regolamento lo considera una grave infrazione [23].");

    const result = await answerSchoolPolicyQuestion("Cosa accade se mi beccano a fumare?", "api");

    expect(askWithDocument).toHaveBeenCalledTimes(1);
    expect(askWithDocument).toHaveBeenCalledWith({
      question: "Cosa accade se mi beccano a fumare?",
      documentText: expect.stringContaining(
        "[Fonte ufficiale: Regolamento di Istituto Morselli-Sturzo A.S. 2025-2026; pagina 23]",
      ),
      documentTruncated: false,
    });
    const sentText = askWithDocument.mock.calls[0]?.[0]?.documentText as string;
    expect(sentText).toContain("ART. 33");
    expect(sentText).toContain("È vietato fumare");
    expect(sentText).not.toContain("ART. 31");
    expect(sentText).not.toContain("ART. 34");
    expect(result.text).toBe("Il regolamento lo considera una grave infrazione [23].");
    expect(result.sources[0]?.page).toBe(23);
  });

  it("in modalità locale consulta la ricerca PDF sullo Sturzo e segnala che non è ufficiale", async () => {
    const result = await answerSchoolPolicyQuestion(
      "Quali indirizzi di studio offre lo Sturzo?",
      "local",
    );

    expect(result.text).toMatch(/non è un documento ufficiale verificato/i);
    expect(result.text).toContain("Professionale");
    expect(result.text).toContain("Tecnico");
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKind: "user-provided",
          title: expect.stringContaining("Morselli - L. Sturzo"),
        }),
      ]),
    );
    expect(askWithDocument).not.toHaveBeenCalled();
  });

  it("in modalità API invia solo gli estratti della ricerca PDF pertinente e ne conserva l’etichetta", async () => {
    askWithDocument.mockResolvedValue("La ricerca elenca percorsi tecnici e professionali [2].");

    const result = await answerSchoolPolicyQuestion(
      "Quali indirizzi di studio offre lo Sturzo?",
      "api",
    );

    expect(askWithDocument).toHaveBeenCalledTimes(1);
    expect(askWithDocument).toHaveBeenCalledWith({
      question: "Quali indirizzi di studio offre lo Sturzo?",
      documentText: expect.stringContaining("Ricerca fornita dall’utente; non verificata"),
      documentTruncated: false,
    });
    expect(result.sources).toEqual(
      expect.arrayContaining([expect.objectContaining({ sourceKind: "user-provided" })]),
    );
  });
});
