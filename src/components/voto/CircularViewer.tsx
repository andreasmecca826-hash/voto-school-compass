import { Download, FileText, X } from "lucide-react";
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
  const pdfFilename = safePdfFilename(fileName);
  const previewUrl = path ? internalPdfUrl(path) : url;
  const downloadUrl = path ? internalPdfUrl(path, true, pdfFilename) : url;

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
        {previewUrl ? (
          <iframe
            title={title}
            src={previewUrl}
            className="min-h-0 w-full flex-1 rounded-xl border border-border bg-white"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p>Il PDF non è disponibile nello storage interno.</p>
          </div>
        )}
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={pdfFilename}
            className="press mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> Scarica PDF
          </a>
        )}
        {previewUrl && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Se l’anteprima non si carica, puoi scaricare il PDF.
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
