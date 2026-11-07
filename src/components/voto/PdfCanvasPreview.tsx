import { useEffect, useRef, useState } from "react";

type PdfCanvasPreviewProps = {
  src: string;
  title: string;
  onError?: () => void;
};

export function PdfCanvasPreview({ src, title, onError }: PdfCanvasPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();
    setStatus("loading");
    setPageCount(0);

    void (async () => {
      let firstPageRendered = false;
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const loadingTask = pdfjs.getDocument({ url: src, withCredentials: true });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        setPageCount(pdf.numPages);
        const performanceMode = document.documentElement.dataset["performance"] === "on";
        const smallScreen =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(max-width: 767px)").matches;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const renderRatio =
          performanceMode && smallScreen ? Math.min(devicePixelRatio, 1.5) : devicePixelRatio;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) break;
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement("canvas");
          canvas.setAttribute("aria-label", `${title}, pagina ${pageNumber}`);
          canvas.className = "block h-auto w-full rounded-lg bg-white shadow-sm";
          canvas.width = Math.ceil(viewport.width * renderRatio);
          canvas.height = Math.ceil(viewport.height * renderRatio);
          canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("canvas_context_unavailable");
          context.setTransform(renderRatio, 0, 0, renderRatio, 0, 0);
          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled) break;
          container.appendChild(canvas);
          if (pageNumber === 1) {
            firstPageRendered = true;
            setStatus("ready");
            await new Promise<void>((resolve) => {
              if (typeof window.requestAnimationFrame === "function") {
                window.requestAnimationFrame(() => resolve());
              } else {
                window.setTimeout(resolve, 0);
              }
            });
          }
        }
        if (!cancelled) setStatus("ready");
        await pdf.destroy();
      } catch {
        if (!cancelled && !firstPageRendered) {
          setStatus("error");
          onError?.();
        }
      }
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [src, title, onError]);

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
