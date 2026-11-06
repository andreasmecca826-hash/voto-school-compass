import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CircularAttachment } from "@/lib/voto/types";
import { PdfCanvasPreview } from "./PdfCanvasPreview";

function safeAttachmentFilename(value?: string) {
  const cleaned = Array.from(value?.trim() || "allegato", (char) => {
    const code = char.charCodeAt(0);
    return char === "\\" || char === "/" || char === '"' || code < 32 || code === 127 ? "_" : char;
  })
    .join("")
    .replace(/\s+/g, " ")
    .slice(0, 120);
  return cleaned || "allegato";
}

function internalPdfUrl(path: string, download = false, filename?: string) {
  const params = new URLSearchParams({ path });
  if (download) {
    params.set("download", "1");
    params.set("filename", filename ?? "circolare.pdf");
  }
  return `/api/circulars/mirror?${params.toString()}`;
}

function mergeAttachments(
  attachments: CircularAttachment[] | undefined,
  fallback: CircularAttachment,
): CircularAttachment[] {
  const merged: CircularAttachment[] = [];
  for (const file of [...(attachments ?? []), fallback]) {
    if (!file.name && !file.path && !file.url) continue;
    const name = file.name?.trim().toLocaleLowerCase("it-IT");
    const existingIndex = name
      ? merged.findIndex((item) => item.name?.trim().toLocaleLowerCase("it-IT") === name)
      : -1;
    if (existingIndex >= 0) {
      const existing = merged[existingIndex];
      merged[existingIndex] = {
        ...file,
        ...existing,
        ...(existing.path || !file.path ? {} : { path: file.path }),
        ...(existing.url || !file.url ? {} : { url: file.url }),
      };
      continue;
    }
    merged.push(file);
  }
  return merged;
}

export function CircularViewer({
  open,
  onOpenChange,
  title,
  fileName,
  url,
  path,
  attachments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileName: string | undefined;
  url: string | undefined;
  path?: string | undefined;
  attachments?: CircularAttachment[] | undefined;
}) {
  const files = mergeAttachments(attachments, { name: fileName, path, url });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | undefined>();

  useEffect(() => {
    if (open) setSelectedIndex(0);
  }, [open, title]);

  const activeIndex = Math.min(selectedIndex, Math.max(0, files.length - 1));
  const activeFile = files[activeIndex];
  const attachmentFilename = safeAttachmentFilename(activeFile?.name);
  const internalPreviewUrl = activeFile?.path ? internalPdfUrl(activeFile.path) : undefined;
  const previewUrl = internalPreviewUrl ?? activeFile?.url;
  const downloadUrl = activeFile?.path
    ? internalPdfUrl(activeFile.path, true, attachmentFilename)
    : activeFile?.url;
  const isPdf = /\.pdf$/i.test(activeFile?.name ?? "") || /\.pdf$/i.test(activeFile?.path ?? "");

  async function downloadAttachment() {
    if (!downloadUrl || isDownloading) return;
    if (!activeFile?.path) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setIsDownloading(true);
    setDownloadError(undefined);
    try {
      const response = await fetch(downloadUrl, { credentials: "same-origin" });
      if (!response.ok) throw new Error(`download_${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = attachmentFilename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch {
      setDownloadError("Download non riuscito. Riprova tra qualche secondo.");
    } finally {
      setIsDownloading(false);
    }
  }

  function openAttachment() {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  }

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
          <SheetDescription className="truncate">
            {activeFile?.name ?? "Circolare"}
          </SheetDescription>
        </SheetHeader>
        {files.length > 1 && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              Allegati ({files.length})
            </p>
            <div
              role="tablist"
              aria-label="Allegati della circolare"
              className="flex gap-2 overflow-x-auto pb-1"
            >
              {files.map((file, index) => (
                <button
                  key={`${file.path ?? file.name ?? "allegato"}-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  onClick={() => setSelectedIndex(index)}
                  className={`press max-w-[220px] shrink-0 truncate rounded-lg border px-3 py-2 text-xs font-medium ${
                    index === activeIndex
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {file.name ?? `Allegato ${index + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}
        {previewUrl && isPdf ? (
          <PdfCanvasPreview
            key={activeFile?.path ?? activeFile?.url ?? activeIndex}
            title={activeFile?.name ?? title}
            src={previewUrl}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p>
              {activeFile?.name
                ? "Questo formato non ha un’anteprima integrata. Usa il pulsante sotto per aprirlo o scaricarlo."
                : "Questo allegato non è disponibile."}
            </p>
          </div>
        )}
        {downloadUrl && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {isPdf && previewUrl && (
              <button
                type="button"
                onClick={openAttachment}
                className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Apri PDF
              </button>
            )}
            {!isPdf && previewUrl && (
              <button
                type="button"
                onClick={openAttachment}
                className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-semibold text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
                Apri DOCX
              </button>
            )}
            <button
              type="button"
              onClick={downloadAttachment}
              disabled={isDownloading}
              className="press inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Download in corso…" : isPdf ? "Scarica PDF" : "Scarica DOCX"}
            </button>
          </div>
        )}
        {downloadError && (
          <p className="mt-2 text-center text-[11px] text-destructive">{downloadError}</p>
        )}
        {previewUrl && isPdf && (
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
