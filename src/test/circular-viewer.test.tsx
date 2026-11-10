import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircularViewer } from "@/components/voto/CircularViewer";

const { renderPageImages, askCircularText, askCircularImages } = vi.hoisted(() => ({
  renderPageImages: vi.fn(),
  askCircularText: vi.fn(),
  askCircularImages: vi.fn(),
}));

vi.mock("@/lib/voto/circular-assistant", () => ({
  askAboutCircular: askCircularText,
  askAboutCircularImages: askCircularImages,
}));

vi.mock("@/lib/voto/circular-reader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voto/circular-reader")>()),
  renderCircularPdfPageImages: renderPageImages,
}));

afterEach(cleanup);
beforeEach(() => {
  renderPageImages.mockReset().mockResolvedValue({
    pages: [{ pageNumber: 1, dataUrl: "data:image/jpeg;base64,AA==" }],
    totalPages: 1,
    truncated: false,
  });
  askCircularText.mockReset().mockResolvedValue("Risposta API testuale.");
  askCircularImages.mockReset().mockResolvedValue("La scadenza è il 30 novembre.");
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
    fireEvent.click(screen.getByRole("button", { name: "Mostra controlli zoom allegato" }));
    expect(screen.getByRole("button", { name: "Riduci zoom allegato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aumenta zoom allegato" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aumenta zoom allegato" }));
    expect(screen.getByRole("button", { name: "Reimposta zoom allegato" })).toHaveTextContent(
      "110%",
    );
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
    expect(screen.getByText(/Offline: disponibili solo le funzioni Locale/i)).toBeInTheDocument();
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

  it("invia a Groq solo le prime tre immagini nella modalità API visiva", async () => {
    const pages = Array.from({ length: 4 }, (_, index) => ({
      pageNumber: index + 1,
      dataUrl: `data:image/jpeg;base64,${String(index).repeat(8)}`,
    }));
    renderPageImages.mockResolvedValue({ pages, totalPages: 7, truncated: true });
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare scansionata"
        fileName="circolare.pdf"
        path={`circulars/${"b".repeat(64)}.pdf`}
        url={undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fai una domanda" }));
    fireEvent.click(await screen.findByRole("button", { name: "API visiva (Qwen)" }));
    expect(
      screen.getByText(/inviate a Groq la domanda e le immagini JPEG delle prime 3 pagine PDF/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Domanda sulla circolare" }), {
      target: { value: "Quando scade?" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Chiedi" }).closest("form")!);

    await waitFor(() => expect(askCircularImages).toHaveBeenCalledTimes(1));
    expect(askCircularImages).toHaveBeenCalledWith({
      question: "Quando scade?",
      pageImages: pages.slice(0, 3),
    });
    expect(await screen.findByText("La scadenza è il 30 novembre.")).toBeInTheDocument();
    expect(screen.getByText(/inviate solo le prime 3 pagine/i)).toBeInTheDocument();
  });

  it("offre apertura, download e pan centrato per un DOCX ingrandito", async () => {
    const path = `circulars/${"b".repeat(64)}.docx`;
    const extractedText = "La classe 2I esce alle ore 12:30 per l’assemblea.";
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare DOCX"
        fileName="modulo.docx"
        path={path}
        url={undefined}
        extractedText={extractedText}
      />,
    );

    const docxPreview = screen.getByRole("document", { name: "modulo.docx" });
    Object.defineProperty(docxPreview, "clientWidth", { configurable: true, value: 300 });
    Object.defineProperty(docxPreview, "scrollWidth", {
      configurable: true,
      get: () => (Number(docxPreview.style.getPropertyValue("--docx-zoom")) > 1 ? 600 : 300),
    });
    expect(docxPreview).toHaveTextContent(extractedText);
    expect(docxPreview).toHaveClass("overflow-x-hidden", "overflow-y-auto", "touch-pan-y");
    expect(docxPreview).not.toHaveClass("touch-pan-x");
    fireEvent.click(screen.getByRole("button", { name: "Mostra controlli zoom allegato" }));
    expect(screen.getByRole("button", { name: "Riduci zoom allegato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aumenta zoom allegato" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Adatta allegato allo schermo" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Riduci zoom allegato" }));
    expect(docxPreview.style.getPropertyValue("--docx-zoom")).toBe("0.9");
    expect(screen.getByRole("button", { name: "Reimposta zoom allegato" })).toHaveTextContent(
      "90%",
    );
    fireEvent.click(screen.getByRole("button", { name: "Aumenta zoom allegato" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumenta zoom allegato" }));
    expect(docxPreview).toHaveClass("overflow-x-auto", "touch-pan-x", "touch-pan-y");
    await waitFor(() => expect(docxPreview.scrollLeft).toBe(150));
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
    expect(
      screen.getByRole("heading", { name: "Fai una domanda alla comunicazione" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Domanda sulla comunicazione" }),
    ).toBeInTheDocument();
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
