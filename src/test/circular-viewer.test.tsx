import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircularViewer } from "@/components/voto/CircularViewer";
import { supabase } from "@/lib/supabase-auth";

const { renderPageImages, askCircularText, askCircularImages } = vi.hoisted(() => ({
  renderPageImages: vi.fn(),
  askCircularText: vi.fn(),
  askCircularImages: vi.fn(),
}));

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;

  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

vi.mock("@/lib/voto/circular-assistant", () => ({
  askAboutCircular: askCircularText,
  askAboutCircularImages: askCircularImages,
}));

vi.mock("@/lib/voto/circular-reader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/voto/circular-reader")>()),
  renderCircularPdfPageImages: renderPageImages,
}));

vi.mock("@/components/voto/PdfCanvasPreview", () => ({
  PdfCanvasPreview: ({ src, title }: { src: string; title: string }) => (
    <div role="document" aria-label={title} data-preview-src={src} />
  ),
}));

const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalCreateObjectUrl)
    Object.defineProperty(URL, "createObjectURL", originalCreateObjectUrl);
  else Reflect.deleteProperty(URL, "createObjectURL");
  if (originalRevokeObjectUrl)
    Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectUrl);
  else Reflect.deleteProperty(URL, "revokeObjectURL");
});
beforeEach(() => {
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  renderPageImages.mockReset().mockResolvedValue({
    pages: [{ pageNumber: 1, dataUrl: "data:image/jpeg;base64,AA==" }],
    totalPages: 1,
    truncated: false,
  });
  askCircularText.mockReset().mockResolvedValue("Risposta API testuale.");
  askCircularImages.mockReset().mockResolvedValue("La scadenza è il 30 novembre.");
  vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
    data: { session: { access_token: "test-user-token" } as never },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/functions/v1/mirror-circular")) {
        const body = JSON.parse(String(init?.body)) as { path: string };
        return new Response(
          JSON.stringify({
            path: body.path,
            signedUrl: `https://jmvxuhgjejzpezvawzfw.supabase.co/storage/v1/object/sign/${body.path}?token=test`,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }),
  );
  window.localStorage.removeItem("voto.circular-assistant-mode.v1");
  window.localStorage.removeItem("voto.circular-ai-models.v1");
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
});

describe("visualizzatore PDF delle circolari interne", () => {
  it("non apre un URL Argo/S3 grezzo su Android se manca il path archiviato", () => {
    const sourceUrl = "https://bucket.s3.amazonaws.com/circolare.pdf";
    vi.stubGlobal("Capacitor", {
      isNativePlatform: () => true,
      getPlatform: () => "android",
    });
    const openWindow = vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare senza copia interna"
        fileName="circolare.pdf"
        path={undefined}
        url={sourceUrl}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("non è ancora archiviato in VOTO");
    expect(screen.queryByRole("button", { name: "Apri PDF" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scarica PDF" })).not.toBeInTheDocument();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("non ricade sull’URL esterno se la firma del path interno fallisce", async () => {
    const path = `circulars/${"b".repeat(64)}.pdf`;
    const sourceUrl = "https://bucket.s3.amazonaws.com/circolare.pdf";
    vi.stubGlobal("Capacitor", {
      isNativePlatform: () => true,
      getPlatform: () => "android",
    });
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { access_token: "test-user-token" } as never },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
    const openWindow = vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare interna"
        fileName="circolare.pdf"
        path={path}
        url={sourceUrl}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("collegamento sicuro");
    expect(screen.queryByRole("document", { name: "circolare.pdf" })).not.toBeInTheDocument();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it.each([
    { extension: "pdf", openButton: "Apri PDF", downloadButton: "Scarica PDF" },
    { extension: "docx", openButton: "Apri DOCX", downloadButton: "Scarica DOCX" },
  ])(
    "usa mirror-circular autenticata per preview e download Android .$extension",
    async ({ extension, openButton, downloadButton }) => {
      const path = `circulars/${"a".repeat(64)}.${extension}`;
      const signedUrl = `https://jmvxuhgjejzpezvawzfw.supabase.co/storage/v1/object/sign/${path}?token=test`;
      vi.stubGlobal("Capacitor", {
        isNativePlatform: () => true,
        getPlatform: () => "android",
      });
      vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
        data: { session: { access_token: "test-user-token" } as never },
        error: null,
      } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        if (String(input).includes("/functions/v1/mirror-circular")) {
          return Promise.resolve(
            new Response(JSON.stringify({ path, signedUrl }), {
              status: 200,
              headers: { "content-type": "application/json" },
            }),
          );
        }
        return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
      });
      vi.stubGlobal("fetch", fetchMock);
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: vi.fn(() => "blob:download-test"),
      });
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
      const anchorClick = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => undefined);
      const openWindow = vi.spyOn(window, "open").mockReturnValue(null);

      render(
        <CircularViewer
          open
          onOpenChange={() => {}}
          title="Circolare Android"
          fileName={`allegato.${extension}`}
          path={path}
          url={undefined}
        />,
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "https://jmvxuhgjejzpezvawzfw.supabase.co/functions/v1/mirror-circular",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ path }),
            headers: expect.objectContaining({ Authorization: "Bearer test-user-token" }),
          }),
        );
        expect(screen.getByRole("button", { name: openButton })).toBeInTheDocument();
      });
      if (extension === "pdf") {
        expect(screen.getByRole("document", { name: `allegato.${extension}` })).toHaveAttribute(
          "data-preview-src",
          signedUrl,
        );
      } else {
        await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(signedUrl, expect.any(Object)));
      }

      fireEvent.click(screen.getByRole("button", { name: openButton }));
      expect(openWindow).toHaveBeenCalledWith(signedUrl, "_blank", "noopener,noreferrer");
      fireEvent.click(screen.getByRole("button", { name: downloadButton }));

      await waitFor(() => {
        expect(
          fetchMock.mock.calls.filter(([input]) =>
            String(input).includes("/functions/v1/mirror-circular"),
          ),
        ).toHaveLength(2);
        expect(fetchMock).toHaveBeenCalledWith(
          signedUrl,
          expect.objectContaining({ credentials: "omit" }),
        );
        expect(anchorClick).toHaveBeenCalled();
      });
    },
  );

  it("mantiene anteprima locale e download anche senza URL firmata anticipata", async () => {
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

    expect(await screen.findByRole("document", { name: "allegato.pdf" })).toBeInTheDocument();
    const openPdfButton = screen.getByRole("button", { name: "Apri PDF" });
    const downloadPdfButton = screen.getByRole("button", { name: "Scarica PDF" });
    expect(openPdfButton.parentElement).toHaveClass("grid-cols-2");
    expect(openPdfButton).toHaveClass("h-8");
    expect(downloadPdfButton).toHaveClass("h-8");
    expect(
      screen.queryByText("Se l’anteprima non si carica, puoi scaricare il PDF."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Riassumi sul dispositivo" })).toBeInTheDocument();
    const zoomToggle = screen.getByRole("button", { name: "Mostra controlli zoom allegato" });
    expect(zoomToggle.querySelector("svg")).toHaveClass("lucide-zoom-in");
    fireEvent.click(zoomToggle);
    expect(screen.queryByRole("button", { name: "Riduci zoom allegato" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aumenta zoom allegato" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aumenta zoom allegato" }));
    expect(screen.getByRole("button", { name: "Riduci zoom allegato" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Riduci zoom allegato" }));
    expect(screen.queryByRole("button", { name: "Riduci zoom allegato" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aumenta zoom allegato" }));
    expect(screen.getByRole("button", { name: "Reimposta zoom allegato" })).toHaveTextContent(
      "110%",
    );
    expect(screen.queryByRole("region", { name: "Analisi locale della circolare" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Fai una domanda alla circolare" }),
    ).not.toBeInTheDocument();
    const showChatButton = await screen.findByRole("button", { name: "Fai una domanda" });
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

  it("permette di scegliere l’API e ricorda la preferenza sul dispositivo", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "Fai una domanda" }));
    fireEvent.click(screen.getByRole("button", { name: "API Groq (Qwen)" }));

    expect(screen.getByRole("button", { name: "API Groq (Qwen)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/vengono inviati a Groq il testo selezionabile/i)).toBeInTheDocument();
    expect(window.localStorage.getItem("voto.circular-assistant-mode.v1")).toBe("api");
  });

  it("nasconde l’API e ripristina Locale quando il browser va offline", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "Fai una domanda" }));
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

  it("parte in Locale se si apre offline anche con API salvata", async () => {
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
    fireEvent.click(await screen.findByRole("button", { name: "Fai una domanda" }));

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

    fireEvent.click(await screen.findByRole("button", { name: "Fai una domanda" }));
    fireEvent.click(await screen.findByRole("button", { name: "API visiva (Qwen)" }));
    expect(
      screen.getByText(/Groq riceve la domanda e le immagini JPEG delle prime 3 pagine PDF/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Verifica sempre la risposta sul documento originale/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/quota API|crediti|limiti|costi|account/i)).not.toBeInTheDocument();
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

    const docxPreview = await screen.findByRole("document", { name: "modulo.docx" });
    Object.defineProperty(docxPreview, "clientWidth", { configurable: true, value: 300 });
    Object.defineProperty(docxPreview, "clientHeight", { configurable: true, value: 300 });
    Object.defineProperty(docxPreview, "scrollWidth", {
      configurable: true,
      get: () => (Number(docxPreview.style.getPropertyValue("--docx-zoom")) > 1 ? 600 : 300),
    });
    Object.defineProperty(docxPreview, "scrollHeight", {
      configurable: true,
      get: () => (Number(docxPreview.style.getPropertyValue("--docx-zoom")) > 1 ? 900 : 300),
    });
    expect(docxPreview).toHaveTextContent(extractedText);
    expect(docxPreview).toHaveClass("overflow-x-hidden", "overflow-y-auto", "touch-pan-y");
    expect(docxPreview).not.toHaveClass("touch-pan-x");
    fireEvent.click(screen.getByRole("button", { name: "Mostra controlli zoom allegato" }));
    expect(screen.queryByRole("button", { name: "Riduci zoom allegato" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aumenta zoom allegato" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Adatta allegato allo schermo" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Adatta allegato allo schermo" }));
    expect(screen.getByRole("button", { name: "Reimposta zoom allegato" })).toHaveTextContent(
      "100%",
    );
    fireEvent.click(screen.getByRole("button", { name: "Aumenta zoom allegato" }));
    fireEvent.click(screen.getByRole("button", { name: "Aumenta zoom allegato" }));
    expect(screen.getByRole("button", { name: "Riduci zoom allegato" })).toBeInTheDocument();
    expect(docxPreview).toHaveClass(
      "overflow-x-auto",
      "overflow-y-auto",
      "touch-pan-x",
      "touch-pan-y",
    );
    await waitFor(() => expect(docxPreview.scrollLeft).toBe(150));
    fireEvent.pointerDown(docxPreview, { pointerId: 1, clientX: 150, clientY: 200 });
    fireEvent.pointerMove(docxPreview, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(docxPreview.scrollLeft).toBe(200);
    expect(docxPreview.scrollTop).toBe(100);
    fireEvent.pointerUp(docxPreview, { pointerId: 1 });
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

  it("preferisce il path PDF interno al duplicato esterno", async () => {
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

    expect(await screen.findByRole("document", { name: "circolare.pdf" })).toBeInTheDocument();
  });

  it("permette di passare da un allegato all’altro nella stessa circolare", async () => {
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
    const secondPreview = await screen.findByRole("document", { name: "secondo.pdf" });
    expect(secondPreview).toBeInTheDocument();
    expect(secondPreview.getAttribute("data-preview-src")).toContain(
      `circulars/${"e".repeat(64)}.pdf`,
    );
  });

  it("reimposta la selezione quando cambia circolare anche se il titolo non cambia", async () => {
    const firstCircularAttachments = [
      { name: "precedente-1.pdf", path: `circulars/${"a".repeat(64)}.pdf` },
      { name: "precedente-2.pdf", path: `circulars/${"b".repeat(64)}.pdf` },
    ];
    const { rerender } = render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare della scuola"
        fileName={undefined}
        path={undefined}
        url={undefined}
        attachments={firstCircularAttachments}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "precedente-2.pdf" }));
    expect(screen.getByRole("tab", { name: "precedente-2.pdf" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const nextCircularAttachments = [
      { name: "nuovo-1.pdf", path: `circulars/${"c".repeat(64)}.pdf` },
      { name: "nuovo-2.pdf", path: `circulars/${"d".repeat(64)}.pdf` },
    ];
    rerender(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare della scuola"
        fileName={undefined}
        path={undefined}
        url={undefined}
        attachments={nextCircularAttachments}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "nuovo-1.pdf" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    const newPreview = await screen.findByRole("document", { name: "nuovo-1.pdf" });
    expect(newPreview.getAttribute("data-preview-src")).toContain(
      `circulars/${"c".repeat(64)}.pdf`,
    );
  });

  it("mostra il numero di tabelle dell'allegato attivo", () => {
    render(
      <CircularViewer
        open
        onOpenChange={() => {}}
        title="Circolare con tabella"
        fileName={undefined}
        url={undefined}
        attachments={[{ name: "orario.pdf", tableCount: 2 }]}
      />,
    );

    expect(screen.getByText("Contiene 2 tabelle")).toBeInTheDocument();
  });
});
