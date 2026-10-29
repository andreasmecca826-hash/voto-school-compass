import { Download, FileText, Share2, X } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function safePdfFilename(value?: string) {
  const cleaned = Array.from(value?.trim() || "circolare.pdf", (char) => {
    const code = char.charCodeAt(0);
    return char === "\\" || char === "/" || char === '"' || code < 32 || code === 127 ? "_" : char;
  })
    .join("")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return /\.pdf$/i.test(cleaned) ? cleaned : `${cleaned}.pdf`;
}

function internalPdfUrl(path: string, download = false, filename?: string) {
  const params = new URLSearchParams({ path });
  if (download) {
    params.set("download", "1");
    params.set("filename", filename ?? "circolare.pdf");
  }
  return `/api/circulars/mirror?${params.toString()}`;
}

function downloadFile(file: File) {
  const href = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

export function CircularViewer({
  open,
  onOpenChange,
  title,
  fileName,
  url,
  path,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileName: string | undefined;
  url: string | undefined;
  path?: string;
}) {
  const [sharing, setSharing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const pdfFilename = safePdfFilename(fileName);
  const downloadUrl = path ? internalPdfUrl(path, true, pdfFilename) : url;

  const openWithPhoneReader = async () => {
    if (!path) {
      setActionMessage("Il PDF non è disponibile nello storage dell’app.");
      return;
    }

    setSharing(true);
    setActionMessage(null);
    let file: File | null = null;
    try {
      const response = await fetch(internalPdfUrl(path), { cache: "no-store" });
      if (!response.ok) throw new Error("download_failed");
      file = new File([await response.blob()], pdfFilename, { type: "application/pdf" });

      const shareData: ShareData = { files: [file], title };
      if (navigator.share && navigator.canShare?.(shareData)) {
        setActionMessage("Nel menu del telefono scegli il tuo lettore PDF.");
        await navigator.share(shareData);
      } else {
        downloadFile(file);
        setActionMessage(
          "Menu non supportato dal browser: PDF scaricato. Aprilo da Download e scegli il tuo lettore PDF.",
        );
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (file) {
        downloadFile(file);
        setActionMessage(
          "Menu non disponibile: PDF scaricato. Aprilo da Download con il tuo lettore.",
        );
      } else {
        setActionMessage("Non sono riuscito a caricare il PDF. Prova con “Scarica PDF”.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex h-[92dvh] w-full max-w-[720px] flex-col rounded-t-3xl border-border bg-popover px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" aria-hidden />
        <SheetHeader className="mb-3 pr-8 text-left">
          <SheetTitle className="flex items-center gap-2 font-display text-base tracking-tight">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{title}</span>
          </SheetTitle>
          <SheetDescription className="truncate">{fileName ?? "Circolare"}</SheetDescription>
        </SheetHeader>
        {url ? (
          <iframe
            title={title}
            src={url}
            className="min-h-0 w-full flex-1 rounded-xl border border-border bg-white"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p>Il PDF non è disponibile nello storage interno.</p>
          </div>
        )}
        {url && downloadUrl && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a
              href={downloadUrl}
              download={pdfFilename}
              className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border px-2 text-xs font-semibold"
            >
              <Download className="h-4 w-4" /> Scarica PDF
            </a>
            <button
              type="button"
              onClick={() => void openWithPhoneReader()}
              disabled={sharing}
              className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" />
              {sharing ? "Preparo PDF…" : "Apri con lettore"}
            </button>
          </div>
        )}
        {actionMessage && (
          <p role="status" className="mt-2 text-center text-[11px] text-muted-foreground">
            {actionMessage}
          </p>
        )}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="sr-only"
          aria-label="Chiudi visualizzatore"
        >
          <X />
        </button>
      </SheetContent>
    </Sheet>
  );
}
