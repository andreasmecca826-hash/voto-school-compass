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
  readonly targets: Element[] = [];

  constructor(private readonly callback: IntersectionObserverCallback) {
    TestIntersectionObserver.current = this;
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
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

let pages: ReturnType<typeof makePage>[] = [];

function makePage() {
  return {
    getViewport: vi.fn(() => ({ width: 600, height: 840 })),
    render: vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() })),
  };
}

function setupPdf() {
  pages = [makePage(), makePage(), makePage()];
  const destroy = vi.fn().mockResolvedValue(undefined);
  getDocumentMock.mockClear();
  getDocumentMock.mockReturnValue({
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: vi.fn(async (pageNumber: number) => pages[pageNumber - 1]!),
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

  it("renderizza tutte le pagine se IntersectionObserver non è disponibile", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<PdfCanvasPreview src="/example.pdf" title="Circolare senza observer" />);

    await waitFor(() => {
      expect(pages[0]!.render).toHaveBeenCalledOnce();
      expect(pages[1]!.render).toHaveBeenCalledOnce();
      expect(pages[2]!.render).toHaveBeenCalledOnce();
    });
  });
});
