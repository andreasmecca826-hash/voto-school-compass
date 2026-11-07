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
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          if (cancelled) break;
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement("canvas");
          canvas.setAttribute("aria-label", `${title}, pagina ${pageNumber}`);
          canvas.className = "block h-auto w-full rounded-lg bg-white shadow-sm";
          const ratio = window.devicePixelRatio || 1;
          canvas.width = Math.ceil(viewport.width * ratio);
          canvas.height = Math.ceil(viewport.height * ratio);
          canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("canvas_context_unavailable");
          context.setTransform(ratio, 0, 0, ratio, 0, 0);
          container.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
        if (!cancelled) setStatus("ready");
        await pdf.destroy();
      } catch {
        if (!cancelled) {
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
      {status === "ready" && pageCount > 0 && (
        <span className="sr-only">{pageCount} pagine</span>
      )}
    </div>
  );
}
