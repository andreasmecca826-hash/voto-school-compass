import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppNotification } from "@/lib/voto/types";
import {
  answerCircularChatQuestion,
  isCircularChatQuestion,
} from "@/lib/voto/circular-assistant-chat";
import { askAboutCircular } from "@/lib/voto/circular-assistant";
import { extractCircularPdfText } from "@/lib/voto/circular-reader";
import { answerQuestionOnDevice } from "@/lib/voto/on-device-circular-ai";

vi.mock("@/lib/voto/circular-assistant", () => ({
  askAboutCircular: vi.fn(),
}));

vi.mock("@/lib/voto/circular-reader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/voto/circular-reader")>();
  return {
    ...actual,
    extractCircularPdfText: vi.fn(),
    extractCircularDocxText: vi.fn(),
  };
});

vi.mock("@/lib/voto/on-device-circular-ai", () => ({
  answerQuestionOnDevice: vi.fn(),
}));

const notifications: AppNotification[] = [
  {
    id: "older",
    type: "notice",
    title: "Uscita didattica",
    date: "2026-10-20",
    attachmentPath: `circulars/${"a".repeat(64)}.pdf`,
    read: false,
  },
  {
    id: "latest",
    type: "notice",
    title: "Colloqui scuola-famiglia",
    date: "2026-11-07",
    attachmentPath: `circulars/${"b".repeat(64)}.pdf`,
    read: false,
  },
];

const askAboutCircularMock = vi.mocked(askAboutCircular);
const extractPdfMock = vi.mocked(extractCircularPdfText);
const answerOnDeviceMock = vi.mocked(answerQuestionOnDevice);

describe("chat locale/API sulle circolari", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extractPdfMock.mockResolvedValue({
      text: "[Pagina 1]\nI colloqui scuola-famiglia si terranno il 12 novembre 2026. Prenotare tramite registro elettronico.",
      pagesAnalyzed: 1,
      truncated: false,
    });
    askAboutCircularMock.mockResolvedValue("I colloqui si terranno il 12 novembre 2026.");
    answerOnDeviceMock.mockResolvedValue("La risposta è generata sul telefono.");
  });

  it("riconosce domande naturali sulla circolare più recente ma lascia intatte le ricerche manuali", () => {
    expect(isCircularChatQuestion("Cosa dice l’ultima circolare? ")).toBe(true);
    expect(isCircularChatQuestion("cerca circolare uscita didattica")).toBe(false);
    expect(isCircularChatQuestion("Qual è la media in inglese?")).toBe(false);
  });

  it("risponde localmente sulle circolari recenti senza chiamare Groq", async () => {
    const answer = await answerCircularChatQuestion(
      "Quali sono le ultime circolari?",
      notifications,
      "local",
    );

    expect(answer).toContain("07/11/2026 — Colloqui scuola-famiglia");
    expect(answer).toContain("20/10/2026 — Uscita didattica");
    expect(askAboutCircularMock).not.toHaveBeenCalled();
  });

  it("legge la circolare più recente sul dispositivo in modalità locale", async () => {
    const answer = await answerCircularChatQuestion(
      "Cosa dice l’ultima circolare?",
      notifications,
      "local",
    );

    expect(answer).toContain("Circolare: Colloqui scuola-famiglia");
    expect(answer).toContain("Modalità locale");
    expect(extractPdfMock).toHaveBeenCalledOnce();
    expect(askAboutCircularMock).not.toHaveBeenCalled();
  });

  it("in modalità API invia solo il testo della circolare più recente e la domanda corrente", async () => {
    const answer = await answerCircularChatQuestion(
      "Quando si terranno i colloqui dell’ultima circolare?",
      notifications,
      "api",
    );

    expect(answer).toContain("I colloqui si terranno il 12 novembre 2026.");
    expect(askAboutCircularMock).toHaveBeenCalledWith({
      question: "Quando si terranno i colloqui dell’ultima circolare?",
      documentText:
        "[Pagina 1]\nI colloqui scuola-famiglia si terranno il 12 novembre 2026. Prenotare tramite registro elettronico.",
      documentTruncated: false,
    });
    expect(askAboutCircularMock.mock.calls[0]?.[0]).not.toHaveProperty("title");
    expect(askAboutCircularMock.mock.calls[0]?.[0]).not.toHaveProperty("messages");
  });

  it("in modalità AI sul telefono inoltra al worker il testo letto localmente e non chiama Groq", async () => {
    const onProgress = vi.fn();
    const question = "Quando si terranno i colloqui dell’ultima circolare?";

    const answer = await answerCircularChatQuestion(question, notifications, "device", onProgress);

    expect(answer).toContain("La risposta è generata sul telefono.");
    expect(answerOnDeviceMock).toHaveBeenCalledWith(
      question,
      "[Pagina 1]\nI colloqui scuola-famiglia si terranno il 12 novembre 2026. Prenotare tramite registro elettronico.",
      onProgress,
    );
    expect(askAboutCircularMock).not.toHaveBeenCalled();
  });

  it("usa il testo già estratto dal monitor senza scaricare di nuovo il PDF", async () => {
    const storedTextNotifications: AppNotification[] = [
      {
        ...notifications[1]!,
        extractedText: "La classe 2I esce alle ore 12:30 per l’assemblea.",
      },
    ];

    await answerCircularChatQuestion(
      "A che ora dice la circolare per la 2I?",
      storedTextNotifications,
      "api",
    );

    expect(extractPdfMock).not.toHaveBeenCalled();
    expect(askAboutCircularMock).toHaveBeenCalledWith({
      question: "A che ora dice la circolare per la 2I?",
      documentText: "La classe 2I esce alle ore 12:30 per l’assemblea.",
      documentTruncated: false,
    });
  });
});
