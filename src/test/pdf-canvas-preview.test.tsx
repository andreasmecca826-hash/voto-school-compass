import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfCanvasPreview } from "@/components/voto/PdfCanvasPreview";

const { getDocumentMock } = vi.hoisted(() => ({ getDocumentMock: vi.fn() }));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: getDocumentMock,
}));

class TestIntersectionObserver {
  static current: TestIntersectionObserver | undefined;
  static options: IntersectionObserverInit | undefined;
  readonly targets: Element[] = [];

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    TestIntersectionObserver.current = this;
    TestIntersectionObserver.options = options;
  }

  observe(target: Element) {
    this.targets.push(target);
  }

  unobserve(target: Element) {
    const index = this.targets.indexOf(target);
    if (index >= 0) this.targets.splice(index, 1);
  }

  disconnect() {
    this.targets.length = 0;
  }

  trigger(target: Element) {
    this.triggerMany([target]);
  }

  triggerMany(targets: Element[]) {
    this.callback(
      targets.map((target) => ({ isIntersecting: true, target }) as IntersectionObserverEntry),
      this as unknown as IntersectionObserver,
    );
  }
}

let pages: ReturnType<typeof makePage>[] = [];
let requestedPages: number[] = [];

function makePage() {
  return {
    getViewport: vi.fn(() => ({ width: 600, height: 840 })),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
  };
}

function setupPdf() {
  pages = [makePage(), makePage(), makePage()];
  requestedPages = [];
  const destroy = vi.fn().mockResolvedValue(undefined);
  getDocumentMock.mockClear();
  getDocumentMock.mockReturnValue({
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: vi.fn(async (pageNumber: number) => {
        requestedPages.push(pageNumber);
        return pages[pageNumber - 1]!;
      }),
    }),
    destroy,
  });
}

beforeEach(() => {
  setupPdf();
  TestIntersectionObserver.current = undefined;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => ({ setTransform: vi.fn() }) as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-performance");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("anteprima PDF progressiva", () => {
  it("renderizza la prima pagina e attende lo scorrimento per le successive", async () => {
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    const { container } = render(<PdfCanvasPreview src="/example.pdf" title="Circolare" />);

    await waitFor(() =>
      expect(getDocumentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/example.pdf",
          disableStream: true,
          disableAutoFetch: true,
        }),
      ),
    );
    await waitFor(() => expect(pages[0]!.render).toHaveBeenCalledOnce());
    const document = screen.getByRole("document", { name: "Circolare" });
    await waitFor(() => expect(document).toHaveAttribute("aria-busy", "false"));
    expect(document).toHaveClass("overflow-x-hidden", "overflow-y-auto", "touch-pan-y");
    expect(document).not.toHaveClass("touch-pan-x");
    await waitFor(() => expect(TestIntersectionObserver.current).toBeDefined());
    expect(container.querySelectorAll("[data-pdf-page]")).toHaveLength(3);
    expect(pages[1]!.render).not.toHaveBeenCalled();
    expect(pages[2]!.render).not.toHaveBeenCalled();

    const observer = TestIntersectionObserver.current!;
    expect(observer.targets).toHaveLength(2);
    act(() => observer.trigger(observer.targets[0]!));

    await waitFor(() => expect(pages[1]!.render).toHaveBeenCalledOnce());
    expect(pages[2]!.render).not.toHaveBeenCalled();
  });

  it("applica lo zoom a tutte le pagine man mano che diventano visibili", async () => {
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    render(<PdfCanvasPreview src="/zoom.pdf" title="PDF ingrandito" zoom={1.3} />);

    expect(screen.getByRole("document", { name: "PDF ingrandito" })).toHaveClass(
      "overflow-x-auto",
      "overflow-y-auto",
      "touch-pan-x",
      "touch-pan-y",
    );
    await waitFor(() => expect(pages[0]!.render).toHaveBeenCalledOnce());
    expect(pages[0]!.getViewport).toHaveBeenCalledWith({ scale: 1.625 });
    await waitFor(() => expect(TestIntersectionObserver.current).toBeDefined());

    const observer = TestIntersectionObserver.current!;
    act(() => observer.trigger(observer.targets[0]!));

    await waitFor(() => expect(pages[1]!.render).toHaveBeenCalledOnce());
    expect(pages[1]!.getViewport).toHaveBeenCalledWith({ scale: 1.625 });
  });

  it("riduce canvas e precaricamento su smartphone quando la modalità prestazioni è attiva", async () => {
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    vi.stubGlobal("devicePixelRatio", 3);
    document.documentElement.dataset["performance"] = "on";
    render(<PdfCanvasPreview src="/mobile.pdf" title="Anteprima alleggerita" />);

    await waitFor(() => expect(pages[0]!.getViewport).toHaveBeenCalledWith({ scale: 1 }));
    await waitFor(() => expect(pages[0]!.render).toHaveBeenCalledOnce());
    await waitFor(() => expect(TestIntersectionObserver.current).toBeDefined());

    expect(TestIntersectionObserver.options?.rootMargin).toBe("300px 0px");
    expect(document.querySelector("canvas")?.width).toBe(750);
  });

  it("renderizza tutte le pagine se IntersectionObserver non è disponibile", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<PdfCanvasPreview src="/example.pdf" title="Circolare senza observer" />);

    await waitFor(() => {
      expect(pages[0]!.render).toHaveBeenCalledOnce();
      expect(pages[1]!.render).toHaveBeenCalledOnce();
      expect(pages[2]!.render).toHaveBeenCalledOnce();
    });
  });

  it("dà priorità alla pagina vicina anche se quella lontana entra prima in coda", async () => {
    vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
    render(<PdfCanvasPreview src="/priorita.pdf" title="Priorità circolari" />);

    await waitFor(() => expect(pages[0]!.render).toHaveBeenCalledOnce());
    await waitFor(() => expect(TestIntersectionObserver.current).toBeDefined());

    const scrollport = screen.getByRole("document", { name: "Priorità circolari" });
    vi.spyOn(scrollport, "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 500,
    } as DOMRect);

    const observer = TestIntersectionObserver.current!;
    const fartherPage = observer.targets[0]!;
    const closerPage = observer.targets[1]!;
    vi.spyOn(fartherPage, "getBoundingClientRect").mockReturnValue({
      top: 900,
      bottom: 1000,
    } as DOMRect);
    vi.spyOn(closerPage, "getBoundingClientRect").mockReturnValue({
      top: 550,
      bottom: 650,
    } as DOMRect);

    act(() => observer.triggerMany([fartherPage, closerPage]));

    expect(requestedPages).toEqual([1, 3]);
    await waitFor(() => expect(pages[1]!.render).toHaveBeenCalledOnce());
    expect(requestedPages).toEqual([1, 3, 2]);
  });
});
