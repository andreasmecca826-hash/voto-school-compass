import { useEffect, useRef, useState } from "react";
import { getPdfRenderProfile } from "@/lib/voto/pdf-render-profile";

type PdfCanvasPreviewProps = {
  src: string;
  title: string;
  zoom?: number;
  onError?: () => void;
};

function makePageSlot(title: string, pageNumber: number, aspectRatio: string) {
  const slot = document.createElement("div");
  slot.dataset["pdfPage"] = String(pageNumber);
  slot.setAttribute("role", "group");
  slot.setAttribute("aria-label", `${title}, pagina ${pageNumber}`);
  slot.className =
    "flex w-full items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm";
  slot.style.aspectRatio = aspectRatio;

  const label = document.createElement("span");
  label.className = "text-xs text-neutral-500";
  label.textContent = `Pagina ${pageNumber}`;
  slot.appendChild(label);
  return slot;
}

export function PdfCanvasPreview({ src, title, zoom = 1, onError }: PdfCanvasPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let firstPageRendered = false;
    let disposeLoadingTask: (() => Promise<void>) | undefined;
    let cancelCurrentRender: (() => void) | undefined;
    let observer: IntersectionObserver | undefined;
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    setStatus("loading");
    setPageCount(0);

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const loadingTask = pdfjs.getDocument({
          url: src,
          withCredentials: true,
          disableStream: true,
          disableAutoFetch: true,
        });
        disposeLoadingTask = () => loadingTask.destroy();
        const pdf = await loadingTask.promise;
        if (cancelled) {
          await loadingTask.destroy();
          return;
        }
        if (pdf.numPages < 1) throw new Error("pdf_has_no_pages");

        setPageCount(pdf.numPages);
        const performanceMode = document.documentElement.dataset["performance"] === "on";
        const smallScreen =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(max-width: 767px)").matches;
        const renderProfile = getPdfRenderProfile({
          performanceMode,
          smallScreen,
          devicePixelRatio: window.devicePixelRatio || 1,
        });
        const firstPage = await pdf.getPage(1);
        if (cancelled) return;
        const pageScale = renderProfile.pageScale * zoom;
        const firstViewport = firstPage.getViewport({ scale: pageScale });
        const aspectRatio = `${firstViewport.width} / ${firstViewport.height}`;
        const slots = Array.from({ length: pdf.numPages }, (_, index) =>
          makePageSlot(title, index + 1, aspectRatio),
        );
        slots.forEach((slot) => container.appendChild(slot));

        const renderPage = async (pageNumber: number, knownPage?: typeof firstPage) => {
          const page = knownPage ?? (await pdf.getPage(pageNumber));
          if (cancelled) return;
          const viewport = page.getViewport({ scale: pageScale });
          const slot = slots[pageNumber - 1];
          if (!slot) throw new Error("pdf_page_slot_missing");
          slot.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

          const canvas = document.createElement("canvas");
          canvas.setAttribute("aria-label", `${title}, pagina ${pageNumber}`);
          canvas.className = "block h-auto w-full rounded-lg bg-white shadow-sm";
          canvas.width = Math.ceil(viewport.width * renderProfile.renderRatio);
          canvas.height = Math.ceil(viewport.height * renderProfile.renderRatio);
          canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("canvas_context_unavailable");
          context.setTransform(renderProfile.renderRatio, 0, 0, renderProfile.renderRatio, 0, 0);

          const task = page.render({ canvas: null, canvasContext: context, viewport });
          const cancelTask = () => task.cancel();
          cancelCurrentRender = cancelTask;
          try {
            await task.promise;
          } finally {
            if (cancelCurrentRender === cancelTask) cancelCurrentRender = undefined;
          }
          if (!cancelled) slot.replaceChildren(canvas);
        };

        const showPageError = (pageNumber: number) => {
          if (cancelled) return;
          const slot = slots[pageNumber - 1];
          if (!slot) return;
          const message = document.createElement("span");
          message.className = "px-3 text-center text-xs text-neutral-600";
          message.textContent = `Anteprima della pagina ${pageNumber} non disponibile`;
          slot.replaceChildren(message);
        };

        await renderPage(1, firstPage);
        if (cancelled) return;
        firstPageRendered = true;
        setStatus("ready");
        await new Promise<void>((resolve) => {
          if (typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(() => resolve());
          } else {
            window.setTimeout(resolve, 0);
          }
        });
        if (cancelled || pdf.numPages === 1) return;

        if (typeof IntersectionObserver === "function") {
          const pageQueue: number[] = [];
          const queuedPages = new Set<number>([1]);
          let processingQueue = false;
          const distanceFromViewport = (pageNumber: number) => {
            const slot = slots[pageNumber - 1];
            const scrollport = container.parentElement;
            if (!slot || !scrollport) return Number.MAX_SAFE_INTEGER;
            const pageRect = slot.getBoundingClientRect();
            const scrollRect = scrollport.getBoundingClientRect();
            if (pageRect.bottom < scrollRect.top) return scrollRect.top - pageRect.bottom;
            if (pageRect.top > scrollRect.bottom) return pageRect.top - scrollRect.bottom;
            return 0;
          };

          const renderQueuedPages = async () => {
            if (processingQueue) return;
            processingQueue = true;
            try {
              while (pageQueue.length > 0 && !cancelled) {
                pageQueue.sort(
                  (left, right) =>
                    distanceFromViewport(left) - distanceFromViewport(right) || left - right,
                );
                const pageNumber = pageQueue.shift();
                if (pageNumber === undefined) continue;
                try {
                  await renderPage(pageNumber);
                } catch {
                  showPageError(pageNumber);
                }
              }
            } finally {
              processingQueue = false;
            }
          };

          observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const pageNumber = Number((entry.target as HTMLElement).dataset["pdfPage"]);
                if (!Number.isInteger(pageNumber) || pageNumber < 2 || queuedPages.has(pageNumber))
                  continue;
                queuedPages.add(pageNumber);
                observer?.unobserve(entry.target);
                pageQueue.push(pageNumber);
              }
              void renderQueuedPages();
            },
            { root: container.parentElement, rootMargin: renderProfile.rootMargin },
          );
          slots.slice(1).forEach((slot) => observer?.observe(slot));
        } else {
          for (let pageNumber = 2; pageNumber <= pdf.numPages && !cancelled; pageNumber += 1) {
            try {
              await renderPage(pageNumber);
            } catch {
              showPageError(pageNumber);
            }
          }
        }
      } catch {
        if (!cancelled && !firstPageRendered) {
          setStatus("error");
          onError?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelCurrentRender?.();
      container.replaceChildren();
      if (disposeLoadingTask) void disposeLoadingTask().catch(() => {});
    };
  }, [src, title, zoom, onError]);

  return (
    <div
      role="document"
      aria-label={title}
      aria-busy={status === "loading"}
      className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-black/20 p-2"
    >
      {status === "loading" && (
        <p className="p-8 text-center text-sm text-muted-foreground">Caricamento PDF…</p>
      )}
      {status === "error" && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Anteprima non disponibile. Usa Apri PDF o Scarica PDF.
        </p>
      )}
      <div ref={containerRef} className="space-y-3" aria-hidden={status !== "ready"} />
      {status === "ready" && pageCount > 0 && <span className="sr-only">{pageCount} pagine</span>}
    </div>
  );
}
