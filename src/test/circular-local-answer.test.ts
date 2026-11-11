import { describe, expect, it } from "vitest";
import { answerCircularQuestionLocally } from "@/lib/voto/circular-local-answer";

describe("risposte locali sulle circolari", () => {
  it("trova e cita il passaggio pertinente senza generare una risposta", () => {
    const document = [
      "[Pagina 1]",
      "La consegna del modulo autorizzato deve avvenire entro il 12 novembre 2026.",
      "La riunione dei docenti si svolgerà nell'aula magna.",
    ].join("\n");

    const answer = answerCircularQuestionLocally("Quando va consegnato il modulo?", document);

    expect(answer).toContain("[Pagina 1]");
    expect(answer).toContain("12 novembre 2026");
    expect(answer).toContain("non è una risposta generata");
    expect(answer).toContain("Fonte: Pagina 1");
    expect(answer).toContain("Affidabilità:");
  });

  it("non inventa una risposta se non trova passaggi pertinenti", () => {
    const answer = answerCircularQuestionLocally(
      "Quali autorizzazioni servono?",
      "[Pagina 1]\nLa palestra resterà chiusa per lavori fino a venerdì.",
    );

    expect(answer).toContain("Non trovo un passaggio chiaramente collegato");
  });

  it("estrae una sintesi locale se l’utente chiede genericamente cosa dice la circolare", () => {
    const answer = answerCircularQuestionLocally(
      "Cosa dice l’ultima circolare?",
      "La consegna del modulo autorizzato deve avvenire entro il 12 novembre 2026.",
    );

    expect(answer).toContain("Sintesi estratta");
    expect(answer).toContain("12 novembre 2026");
    expect(answer).toContain("non una risposta generata");
    expect(answer).toContain("Fonte: pagina non indicata");
  });

  it("risponde usando la riga pertinente di una tabella e riconosce i sinonimi", () => {
    const answer = answerCircularQuestionLocally(
      "A che ora c'è la gita per la 2I?",
      [
        "[Pagina 2]",
        "Classe   Attività   Ora",
        "2I       viaggio di istruzione   08:00",
        "2L       laboratorio   10:00",
      ].join("\n"),
    );
    expect(answer).toContain("2I");
    expect(answer).toContain("08:00");
    expect(answer).toContain("Fonte: Pagina 2");
  });
});
