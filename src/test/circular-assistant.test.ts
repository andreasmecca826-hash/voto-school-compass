import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/lib/supabase-auth", () => ({
  supabase: { functions: { invoke } },
}));

import { askAboutCircular, askGeneralQuestion } from "@/lib/voto/circular-assistant";

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
