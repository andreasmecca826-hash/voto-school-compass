import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/lib/supabase-auth", () => ({
  supabase: { functions: { invoke } },
}));

import {
  askAboutCircular,
  askAboutCircularImages,
  askGeneralQuestion,
} from "@/lib/voto/circular-assistant";

describe("assistente AI delle circolari", () => {
  beforeEach(() => invoke.mockReset());

  it("manda una domanda generale senza allegare dati scolastici o cronologia", async () => {
    invoke.mockResolvedValue({
      data: { answer: "La fotosintesi trasforma la luce in energia chimica." },
      error: null,
    });

    await expect(askGeneralQuestion("Spiegami la fotosintesi.")).resolves.toBe(
      "La fotosintesi trasforma la luce in energia chimica.",
    );

    expect(invoke).toHaveBeenCalledWith("circular-assistant", {
      body: { question: "Spiegami la fotosintesi." },
    });
  });

  it("invoca la funzione protetta con domanda e testo, senza titolo o cronologia", async () => {
    invoke.mockResolvedValue({
      data: { answer: "La scadenza è il 12 novembre [Pagina 1]." },
      error: null,
    });

    await expect(
      askAboutCircular({
        question: "Quando è la scadenza?",
        documentText: "[Pagina 1]\nConsegna entro il 12 novembre.",
        documentTruncated: false,
      }),
    ).resolves.toBe("La scadenza è il 12 novembre [Pagina 1].");

    expect(invoke).toHaveBeenCalledWith("circular-assistant", {
      body: expect.objectContaining({
        question: "Quando è la scadenza?",
        documentTruncated: false,
      }),
    });
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty("history");
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty("circularTitle");
  });

  it("invia le immagini delle pagine solo nella richiesta API visiva esplicita", async () => {
    const pageImages = [
      { pageNumber: 1, dataUrl: "data:image/jpeg;base64,AA==" },
      { pageNumber: 2, dataUrl: "data:image/jpeg;base64,BB==" },
    ];
    invoke.mockResolvedValue({ data: { answer: "La scadenza è il 12 novembre." }, error: null });

    await expect(askAboutCircularImages({ question: "Quando scade?", pageImages })).resolves.toBe(
      "La scadenza è il 12 novembre.",
    );

    expect(invoke).toHaveBeenCalledWith("circular-assistant", {
      body: { question: "Quando scade?", pageImages },
    });
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty("documentText");
    expect(invoke.mock.calls[0]?.[1]?.body).not.toHaveProperty("history");
  });

  it("mostra il messaggio di errore del backend", async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        name: "FunctionsHttpError",
        context: new Response(JSON.stringify({ error: "Account non autorizzato." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      },
    });

    await expect(
      askAboutCircular({
        question: "Che cosa dice?",
        documentText: "Testo della circolare.",
        documentTruncated: false,
      }),
    ).rejects.toThrow("Account non autorizzato.");
  });
});
