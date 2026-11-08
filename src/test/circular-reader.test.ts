import { describe, expect, it } from "vitest";
import { analyzeCircularText } from "@/lib/voto/circular-reader";

describe("lettore locale delle circolari", () => {
  it("estrae date, destinatari, riepilogo e allegati senza modificare il testo originale", () => {
    const text = [
      "Destinatari: Ai genitori delle classi terze",
      "",
      "Si comunica che la visita didattica al museo si svolgerà il 12 novembre 2026. La partenza è prevista alle ore 8:00.",
      "Le autorizzazioni dovranno essere consegnate entro il 05/11/2026.",
      "Allegati: modulo autorizzazione, programma della visita",
    ].join("\n");

    const result = analyzeCircularText(text, ["autorizzazione.pdf", "programma.pdf"], 2);

    expect(result.recipients).toContain("Ai genitori delle classi terze");
    expect(result.dates.map(({ value }) => value)).toEqual(["12 novembre 2026", "05/11/2026"]);
    expect(result.summary).toContain("visita didattica al museo");
    expect(result.attachments).toEqual([
      "autorizzazione.pdf",
      "programma.pdf",
      "modulo autorizzazione",
      "programma della visita",
    ]);
    expect(result.pagesAnalyzed).toBe(2);
    expect(result.truncated).toBe(false);
  });

  it("deduplica le date e lascia esplicitamente vuoti i dati non trovati", () => {
    const result = analyzeCircularText(
      "Avviso generale. Il 5 maggio 2026 si terrà l'incontro. Il 5 maggio 2026 è confermato.",
    );

    expect(result.dates).toHaveLength(1);
    expect(result.recipients).toEqual([]);
    expect(result.attachments).toEqual([]);
  });

  it("segnala un documento limitato o senza testo selezionabile", () => {
    const result = analyzeCircularText("", [], 80, true);

    expect(result.summary).toBeNull();
    expect(result.dates).toEqual([]);
    expect(result.truncated).toBe(true);
  });
});
