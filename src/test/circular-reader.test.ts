import { describe, expect, it } from "vitest";
import {
  analyzeCircularText,
  extractCircularTableRows,
  normalizeOcrText,
  reconstructPositionedText,
} from "@/lib/voto/circular-reader";

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
    expect(result.actions.some((action) => action.includes("consegnate"))).toBe(true);
    expect(result.deadlines.map(({ value }) => value)).toContain("05/11/2026");
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

  it("riconosce l’orario della scuola come tabella e non inventa un riepilogo delle celle", () => {
    const text = [
      "PLESSO MORSELLI",
      "VIA PITAGORA",
      "ORARIO SOSTEGNO PROVVISORIO dal 09/11/2026",
      "LUNEDÌ                 MARTEDÌ                 MERCOLEDÌ                 GIOVEDÌ                 VENERDÌ",
      "DOCENTI  1° 2° 3° 4° 5° 6°  1° 2° 3° 4° 5° 6°",
      "ADAMO                         2F    2F           2F",
    ].join("\n");

    const result = analyzeCircularText(text);

    expect(result.layout).toBe("timetable");
    expect(result.summary).toContain("ORARIO SOSTEGNO PROVVISORIO");
    expect(result.dates[0]?.value).toBe("09/11/2026");
  });

  it("conserva l’ordine orizzontale e la distanza fra celle estratte da PDF.js", () => {
    const text = reconstructPositionedText([
      { str: "DOCENTE", x: 10, y: 100, width: 40, fontSize: 10 },
      { str: "2F", x: 100, y: 100, width: 12, fontSize: 10 },
      { str: "LUNEDÌ", x: 10, y: 120, width: 35, fontSize: 10 },
      { str: "MARTEDÌ", x: 100, y: 120, width: 45, fontSize: 10 },
    ]);

    expect(text.split("\n")).toHaveLength(2);
    expect(text.split("\n")[0]).toMatch(/LUNEDÌ\s+MARTEDÌ/);
    expect(text.split("\n")[1]).toMatch(/DOCENTE\s+2F/);
  });

  it("omette il riepilogo per una tabella generica invece di unire celle come testo continuo", () => {
    const result = analyzeCircularText(
      "ORARIO 1 2 3\nALUNNO     LUNEDÌ     MARTEDÌ\nROSSI      2A         3B\nBIANCHI    1C         4D",
    );
    expect(result.layout).toBe("table");
    expect(result.summary).toBeNull();
  });

  it("estrae celle e pagina dalle righe di una tabella", () => {
    const rows = extractCircularTableRows(
      "[Pagina 3]\nClasse | Giorno | Ora\n2I | lunedì | 08:00\n2L | martedì | 10:00",
    );
    expect(rows).toEqual([
      { page: "3", cells: ["Classe", "Giorno", "Ora"] },
      { page: "3", cells: ["2I", "lunedì", "08:00"] },
      { page: "3", cells: ["2L", "martedì", "10:00"] },
    ]);
  });

  it("corregge solo errori OCR comuni negli orari e nei giorni", () => {
    expect(normalizeOcrText("Lunedi alle O8:00 per la 2 l A")).toBe("lunedì alle 08:00 per la 2IA");
  });
});
