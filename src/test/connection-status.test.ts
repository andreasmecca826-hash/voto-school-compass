import { describe, expect, it } from "vitest";
import { getConnectionIssue } from "@/lib/voto/connection-status";

describe("getConnectionIssue", () => {
  const url = "https://school.example/voto.json";

  it("non mostra un avviso quando non è configurato un URL", () => {
    expect(getConnectionIssue({ url: "", isOnline: false, error: null })).toBeNull();
  });

  it("segnala l’assenza di rete anche prima del fallimento della richiesta", () => {
    expect(getConnectionIssue({ url, isOnline: false, error: null })).toMatchObject({
      kind: "offline",
      title: "Connessione Internet assente",
      tone: "warning",
    });
  });

  it("distingue un URL o server irraggiungibile mentre la rete è attiva", () => {
    expect(
      getConnectionIssue({
        url,
        isOnline: true,
        error: "Impossibile raggiungere l'URL (rete o CORS).",
      }),
    ).toMatchObject({
      kind: "unreachable",
      title: "URL dei dati non raggiungibile",
    });
  });

  it("riconosce un timeout del server", () => {
    expect(
      getConnectionIssue({ url, isOnline: true, error: "Tempo scaduto: il server non risponde." }),
    ).toMatchObject({ kind: "timeout", title: "Il servizio dati non risponde" });
  });

  it("segnala gli errori HTTP senza classificarli come assenza di rete", () => {
    expect(
      getConnectionIssue({ url, isOnline: true, error: "Errore del server (503)." }),
    ).toMatchObject({ kind: "service", title: "Servizio dati non disponibile" });
  });

  it("non mostra un avviso se l’ultimo aggiornamento è riuscito", () => {
    expect(getConnectionIssue({ url, isOnline: true, error: null })).toBeNull();
  });
});
