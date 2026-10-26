import { ExternalLink, FileText, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function CircularViewer({
  open,
  onOpenChange,
  title,
  fileName,
  url,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileName: string | undefined;
  url: string | undefined;
}) {
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
            className="min-h-0 flex-1 w-full rounded-xl border border-border bg-white"
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8" />
            <p>Il PDF è in preparazione nello storage interno.</p>
          </div>
        )}
        {url && (
          <div className="mt-3 flex gap-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground"
            >
              <ExternalLink className="h-4 w-4" /> Apri o scarica il PDF
            </a>
          </div>
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
