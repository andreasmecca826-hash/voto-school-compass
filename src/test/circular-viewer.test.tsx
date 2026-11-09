import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircularViewer } from "@/components/voto/CircularViewer";

const {
  checkDeviceSupport,
  checkModelDownloaded,
  answerOnDevice,
  releaseDevice,
  checkVisionSupport,
  checkVisionModelDownloaded,
  answerVisuallyOnDevice,
  releaseVision,
  renderPageImages,
} = vi.hoisted(() => ({
  checkDeviceSupport: vi.fn(),
  checkModelDownloaded: vi.fn(),
  answerOnDevice: vi.fn(),
  releaseDevice: vi.fn(),
  checkVisionSupport: vi.fn(),
  checkVisionModelDownloaded: vi.fn(),
  answerVisuallyOnDevice: vi.fn(),
  releaseVision: vi.fn(),
  renderPageImages: vi.fn(),
}));

vi.mock("@/lib/voto/on-device-circular-ai", () => ({
  isOnDeviceCircularAiSupported: checkDeviceSupport,
  isOnDeviceModelDownloaded: checkModelDownloaded,
  answerCircularQuestionOnDevice: answerOnDevice,
  releaseOnDeviceCircularAi: releaseDevice,
}));

vi.mock("@/lib/voto/on-device-circular-vision", () => ({
  isOnDeviceVisionAiSupported: checkVisionSupport,
  isOnDeviceVisionModelDownloaded: checkVisionModelDownloaded,
  answerCircularQuestionVisuallyOnDevice: answerVisuallyOnDevice,
  releaseOnDeviceCircularVision: releaseVision,
}));

vi.mock("@/lib/voto/circular-reader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voto/circular-reader")>()),
  renderCircularPdfPageImages: renderPageImages,
}));

afterEach(cleanup);
beforeEach(() => {
  checkDeviceSupport.mockReset().mockResolvedValue(false);
  checkModelDownloaded.mockReset().mockReturnValue(false);
  answerOnDevice.mockReset().mockResolvedValue("Risposta generata sul telefono.");
  releaseDevice.mockReset().mockResolvedValue(undefined);
  checkVisionSupport.mockReset().mockResolvedValue(false);
  checkVisionModelDownloaded.mockReset().mockReturnValue(false);
  answerVisuallyOnDevice.mockReset().mockResolvedValue("La circolare indica il 30 novembre.");
  releaseVision.mockReset();
  renderPageImages.mockReset().mockResolvedValue({
    pages: [{ pageNumber: 1, dataUrl: "data:image/jpeg;base64,AA==" }],
    totalPages: 1,
    truncated: false,
  });
  window.localStorage.removeItem("voto.circular-assistant-mode.v1");
  window.localStorage.removeItem("voto.circular-ai-models.v1");
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
});

describe("visualizzatore PDF delle circolari interne", () => {
  it("mantiene anteprima locale e download anche senza URL firmata anticipata", () => {
    const path = `circulars/${"a".repeat(64)}.pdf`;
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="allegato.pdf"
        path={path}
        url={undefined}
      />,
    );

    expect(screen.getByRole("document", { name: "allegato.pdf" })).toBeInTheDocument();
    const openPdfButton = screen.getByRole("button", { name: "Apri PDF" });
    const downloadPdfButton = screen.getByRole("button", { name: "Scarica PDF" });
    expect(openPdfButton.parentElement).toHaveClass("grid-cols-2");
    expect(openPdfButton).toHaveClass("h-8");
    expect(downloadPdfButton).toHaveClass("h-8");
    expect(
      screen.queryByText("Se l’anteprima non si carica, puoi scaricare il PDF."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riassumi sul dispositivo" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Analisi locale della circolare" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Fai una domanda alla circolare" }),
    ).not.toBeInTheDocument();
    const showChatButton = screen.getByRole("button", { name: "Fai una domanda" });
    expect(showChatButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(showChatButton);
    expect(
      screen.getByRole("heading", { name: "Fai una domanda alla circolare" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Locale (sul dispositivo)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/non inviato a Groq/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chiedi" })).toBeDisabled();
  });

  it("permette di scegliere l’API e ricorda la preferenza sul dispositivo", () => {
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="allegato.pdf"
        path={`circulars/${"f".repeat(64)}.pdf`}
        url={undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));
    fireEvent.click(screen.getByRole("button", { name: "API Groq (Qwen)" }));

    expect(screen.getByRole("button", { name: "API Groq (Qwen)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/vengono inviati a Groq il testo selezionabile/i)).toBeInTheDocument();
    expect(window.localStorage.getItem("voto.circular-assistant-mode.v1")).toBe("api");
  });

  it("nasconde l’API e ripristina Locale quando il browser va offline", () => {
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="allegato.pdf"
        path={`circulars/${"f".repeat(64)}.pdf`}
        url={undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));
    fireEvent.click(screen.getByRole("button", { name: "API Groq (Qwen)" }));
    act(() => {
      Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.queryByRole("button", { name: "API Groq (Qwen)" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Locale (sul dispositivo)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.localStorage.getItem("voto.circular-assistant-mode.v1")).toBe("local");
    expect(screen.getByText(/Offline: disponibile solo Locale/i)).toBeInTheDocument();
  });

  it("parte in Locale se si apre offline anche con API salvata", () => {
    window.localStorage.setItem("voto.circular-assistant-mode.v1", "api");
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });

    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="allegato.pdf"
        path={`circulars/${"f".repeat(64)}.pdf`}
        url={undefined}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));

    expect(screen.queryByRole("button", { name: "API Groq (Qwen)" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Locale (sul dispositivo)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(window.localStorage.getItem("voto.circular-assistant-mode.v1")).toBe("local");
  });

  it("attiva Qwen solo dopo la scelta e l’invio della domanda", async () => {
    checkDeviceSupport.mockResolvedValue(true);
    checkModelDownloaded.mockReturnValue(true);
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="allegato.pdf"
        path={`circulars/${"f".repeat(64)}.pdf`}
        url={undefined}
        extractedText="[Pagina 1]\nLa scadenza per consegnare il modulo è il 30 novembre 2026."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));
    const deviceMode = await screen.findByRole("button", { name: "AI sul telefono (Qwen)" });
    expect(answerOnDevice).not.toHaveBeenCalled();
    fireEvent.click(deviceMode);
    expect(window.localStorage.getItem("voto.circular-assistant-mode.v1")).toBe("device");
    expect(
      screen.getByText(/domanda e testo non vengono inviati a un servizio AI/i),
    ).toBeInTheDocument();
    expect(answerOnDevice).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: "Domanda sulla circolare" }), {
      target: { value: "Entro quando va consegnato il modulo?" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Chiedi" }).closest("form")!);

    await waitFor(() => expect(answerOnDevice).toHaveBeenCalledTimes(1));
    expect(answerOnDevice).toHaveBeenCalledWith(
      "Entro quando va consegnato il modulo?",
      expect.stringContaining("30 novembre 2026"),
      expect.any(Function),
    );
    expect(await screen.findByText("Risposta generata sul telefono.")).toBeInTheDocument();
  });

  it("invia le immagini del PDF a Qwen2-VL senza usare Qwen testuale", async () => {
    checkVisionSupport.mockResolvedValue(true);
    checkVisionModelDownloaded.mockReturnValue(true);
    window.localStorage.setItem(
      "voto.circular-ai-models.v1",
      JSON.stringify({ text: true, vision: true }),
    );
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare scansionata"
        fileName="circolare.pdf"
        path={`circulars/${"a".repeat(64)}.pdf`}
        url={undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));
    fireEvent.click(await screen.findByRole("button", { name: "AI visiva (Qwen2-VL)" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Domanda sulla circolare" }), {
      target: { value: "Entro quando va consegnato?" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Chiedi" }).closest("form")!);

    await waitFor(() => expect(answerVisuallyOnDevice).toHaveBeenCalledTimes(1));
    expect(renderPageImages).toHaveBeenCalledTimes(1);
    expect(answerVisuallyOnDevice).toHaveBeenCalledWith(
      "Entro quando va consegnato?",
      [{ pageNumber: 1, dataUrl: "data:image/jpeg;base64,AA==" }],
      expect.any(Function),
    );
    expect(answerOnDevice).not.toHaveBeenCalled();
    expect(await screen.findByText("La circolare indica il 30 novembre.")).toBeInTheDocument();
  });

  it("usa la modalità Locale se Qwen non riesce ad avviarsi", async () => {
    checkDeviceSupport.mockResolvedValue(true);
    checkModelDownloaded.mockReturnValue(true);
    answerOnDevice.mockRejectedValue(new Error("WebGPU out of memory"));
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="allegato.pdf"
        path={`circulars/${"f".repeat(64)}.pdf`}
        url={undefined}
        extractedText="[Pagina 1]\nLa riunione si svolgerà il 10 dicembre 2026."
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));
    fireEvent.click(await screen.findByRole("button", { name: "AI sul telefono (Qwen)" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Domanda sulla circolare" }), {
      target: { value: "Quando si svolgerà la riunione?" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Chiedi" }).closest("form")!);

    expect(
      await screen.findByText(/Qwen non è riuscito ad avviarsi.*WebGPU out of memory/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/La riunione si svolgerà il 10 dicembre 2026/i),
    ).toBeInTheDocument();
    expect(window.localStorage.getItem("voto.circular-assistant-mode.v1")).toBe("local");
  });

  it("offre apertura e download separati per un DOCX", () => {
    const path = `circulars/${"b".repeat(64)}.docx`;
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare DOCX"
        fileName="modulo.docx"
        path={path}
        url={undefined}
      />,
    );

    expect(screen.getByRole("button", { name: "Apri DOCX" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scarica DOCX" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riassumi sul dispositivo" })).toBeInTheDocument();
  });

  it("mostra e rende interrogabile una comunicazione testuale senza allegato", () => {
    const message = "La scuola comunica che l'assemblea si terrà il 12 novembre 2026.";
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Assemblea scolastica"
        fileName={undefined}
        path={undefined}
        url={undefined}
        extractedText={message}
      />,
    );

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fai una domanda" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Riassumi sul dispositivo" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));
    expect(screen.getByRole("textbox", { name: "Domanda sulla circolare" })).toBeInTheDocument();
  });

  it("preferisce il path PDF interno al duplicato esterno", () => {
    const path = `circulars/${"c".repeat(64)}.pdf`;
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare con allegati misti"
        fileName="circolare.pdf"
        path={path}
        url={undefined}
        attachments={[{ name: "circolare.pdf", url: "https://example.invalid/file.pdf" }]}
      />,
    );

    expect(screen.getByRole("document", { name: "circolare.pdf" })).toBeInTheDocument();
  });

  it("permette di passare da un allegato all’altro nella stessa circolare", () => {
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare con due allegati"
        fileName={undefined}
        path={undefined}
        url={undefined}
        attachments={[
          { name: "primo.pdf", path: `circulars/${"d".repeat(64)}.pdf` },
          { name: "secondo.pdf", path: `circulars/${"e".repeat(64)}.pdf` },
        ]}
      />,
    );

    const secondAttachmentTab = screen.getByRole("tab", { name: "secondo.pdf" });
    fireEvent.click(secondAttachmentTab);

    expect(secondAttachmentTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("document", { name: "secondo.pdf" })).toBeInTheDocument();
  });
});
