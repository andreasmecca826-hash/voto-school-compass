import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  Minus,
  Paperclip,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CircularAttachment } from "@/lib/voto/types";
import { answerCircularQuestionLocally } from "@/lib/voto/circular-local-answer";
import {
  analyzeCircularDocx,
  analyzeCircularPdf,
  extractCircularDocxText,
  extractCircularPdfText,
  renderCircularPdfPageImages,
  type CircularAnalysis,
} from "@/lib/voto/circular-reader";
import {
  askAboutCircular,
  askAboutCircularImages,
  type CircularAssistantMessage,
} from "@/lib/voto/circular-assistant";
import { useOnlineStatus } from "@/lib/voto/use-online-status";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { PdfCanvasPreview } from "./PdfCanvasPreview";

const MAX_AI_DOCUMENT_LENGTH = 60_000;
const AI_MODE_STORAGE_KEY = "voto.circular-assistant-mode.v1";
type CircularAssistantMode = "local" | "api" | "api-vision";

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
      if (!existing) continue;
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

function DocxPreview({
  src,
  title,
  initialText,
}: {
  src: string;
  title: string;
  initialText?: string | undefined;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const styleRef = useRef<HTMLStyleElement>(null);
  const fallbackText = initialText?.trim() ?? "";
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState<"loading" | "rendered" | "text" | "error">(
    fallbackText ? "text" : "loading",
  );

  useEffect(() => {
    let cancelled = false;
    setStatus(fallbackText ? "text" : "loading");
    if (bodyRef.current) bodyRef.current.replaceChildren();
    if (styleRef.current) styleRef.current.replaceChildren();

    void fetch(src, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`docx_download_${response.status}`);
        return response.blob();
      })
      .then(async (blob) => {
        const { renderAsync } = await import("docx-preview");
        if (!bodyRef.current || cancelled) return;
        await renderAsync(blob, bodyRef.current, styleRef.current ?? undefined, {
          breakPages: true,
          ignoreWidth: true,
          ignoreHeight: true,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true,
        });
        if (cancelled) return;
        setStatus("rendered");
      })
      .catch(() => {
        if (!cancelled) setStatus(fallbackText ? "text" : "error");
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackText, src]);

  return (
    <div className="min-h-0 flex-1 space-y-2">
      <div className="flex shrink-0 items-center justify-between rounded-xl border border-border bg-card px-2 py-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">Zoom preview</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Riduci zoom DOCX"
            onClick={() => setZoom((current) => Math.max(0.7, Math.round((current - 0.1) * 10) / 10))}
            className="press inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-foreground"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Reimposta zoom DOCX"
            onClick={() => setZoom(1)}
            className="press min-w-[48px] rounded-lg px-1.5 py-1 text-[10px] font-semibold text-primary"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            aria-label="Aumenta zoom DOCX"
            onClick={() => setZoom((current) => Math.min(1.4, Math.round((current + 0.1) * 10) / 10))}
            className="press inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Adatta DOCX allo schermo"
            onClick={() => setZoom(0.88)}
            className="press rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground"
          >
            Adatta
          </button>
        </div>
      </div>
      <div
        role="document"
        aria-label={title}
        aria-busy={status === "loading"}
        className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-black/10 p-2"
      >
      {status === "loading" && (
        <p className="p-8 text-center text-sm text-muted-foreground">Caricamento anteprima DOCX…</p>
      )}
      {status === "error" && (
        <p className="p-8 text-center text-sm leading-relaxed text-muted-foreground">
          Anteprima non disponibile. Usa il pulsante sotto per aprire o scaricare il DOCX.
        </p>
      )}
      {status === "text" && (
        <div className="rounded-lg bg-card p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Testo estratto
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{fallbackText}</p>
        </div>
      )}
      <style ref={styleRef} />
      <div
        ref={bodyRef}
        className={status === "rendered" ? "docx-preview-body" : "hidden"}
        style={{ "--docx-zoom": zoom } as React.CSSProperties}
      />
      <style>{`
        .docx-preview-body,
        .docx-preview-body .docx-wrapper {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }
        .docx-preview-body section.docx {
          box-sizing: border-box !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          min-height: auto !important;
          margin: 0 0 0.75rem !important;
          padding: 1rem !important;
          overflow: hidden !important;
          box-shadow: 0 1px 3px rgb(0 0 0 / 12%) !important;
        }
        .docx-preview-body section.docx:last-child {
          margin-bottom: 0 !important;
        }
        .docx-preview-body table,
        .docx-preview-body img {
          max-width: 100% !important;
        }
        .docx-preview-body table {
          table-layout: auto !important;
        }
        .docx-preview-body td,
        .docx-preview-body th {
          overflow-wrap: anywhere;
        }
        .docx-preview-body section.docx {
          zoom: var(--docx-zoom, 1);
          width: calc(100% / var(--docx-zoom, 1)) !important;
        }
      `}</style>
      </div>
    </div>
  );
}

export function CircularViewer({
  open,
  onOpenChange,
  title,
  fileName,
  url,
  path,
  attachments,
  extractedText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fileName: string | undefined;
  url: string | undefined;
  path?: string | undefined;
  attachments?: CircularAttachment[] | undefined;
  extractedText?: string | undefined;
}) {
  const files = mergeAttachments(attachments, { name: fileName, path, url });
  const isOnline = useOnlineStatus();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | undefined>();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CircularAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | undefined>();
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiMode, setAiMode] = useState<CircularAssistantMode>("local");
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<CircularAssistantMessage[]>([]);
  const [aiError, setAiError] = useState<string | undefined>();
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [aiProgressMessage, setAiProgressMessage] = useState<string | undefined>();
  const [aiDocumentTruncated, setAiDocumentTruncated] = useState(false);
  const activeAiMode = isOnline && (aiMode === "api" || aiMode === "api-vision") ? aiMode : "local";
  const aiRequestId = useRef(0);

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
      if (!navigator.onLine || savedMode === "device" || savedMode === "vision") {
        setAiMode("local");
        window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
      } else if (savedMode === "local" || savedMode === "api" || savedMode === "api-vision") {
        setAiMode(savedMode);
      }
      window.localStorage.removeItem("voto.circular-ai-models.v1");
    } catch {
      // Se lo storage non è disponibile, resta attiva la modalità locale predefinita.
    }
  }, []);

  useEffect(() => {
    if ((isOnline && (typeof navigator === "undefined" || navigator.onLine)) || aiMode === "local")
      return;
    setAiMode("local");
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
    } catch {
      // La modalità resta locale per la sessione corrente.
    }
  }, [aiMode, isOnline]);

  useEffect(() => {
    if (open) {
      setSelectedIndex(0);
      setAnalysis(null);
      setAnalysisError(undefined);
      setIsAnalysisOpen(false);
      setIsAiChatOpen(false);
      setAiQuestion("");
      setAiMessages([]);
      setAiError(undefined);
      setAiProgressMessage(undefined);
      setAiDocumentTruncated(false);
      setIsAskingAi(false);
      aiRequestId.current += 1;
    }
  }, [open, title]);

  const activeIndex = Math.min(selectedIndex, Math.max(0, files.length - 1));
  const activeFile = files[activeIndex];

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(undefined);
    setIsAnalysisOpen(false);
    setIsAiChatOpen(false);
    setAiQuestion("");
    setAiMessages([]);
    setAiError(undefined);
    setAiProgressMessage(undefined);
    setIsAskingAi(false);
    setAiDocumentTruncated(false);
    aiRequestId.current += 1;
  }, [activeFile?.path, activeFile?.url, activeFile?.name]);

  const attachmentFilename = safeAttachmentFilename(activeFile?.name);
  const internalPreviewUrl = activeFile?.path ? internalPdfUrl(activeFile.path) : undefined;
  const previewUrl = internalPreviewUrl ?? activeFile?.url;
  const downloadUrl = activeFile?.path
    ? internalPdfUrl(activeFile.path, true, attachmentFilename)
    : activeFile?.url;
  const isPdf = /\.pdf$/i.test(activeFile?.name ?? "") || /\.pdf$/i.test(activeFile?.path ?? "");
  const isDocx = /\.docx$/i.test(activeFile?.name ?? "") || /\.docx$/i.test(activeFile?.path ?? "");
  const hasTextOnlyContent = !previewUrl && Boolean(extractedText?.trim());
  const documentLabel = hasTextOnlyContent ? "comunicazione" : "circolare";
  const canAnalyze = Boolean(previewUrl && (isPdf || isDocx));
  const canAskAi = canAnalyze || hasTextOnlyContent;
  const effectiveAiMode = !isPdf && activeAiMode === "api-vision" ? "local" : activeAiMode;
  const availableAiModeCount = 1 + Number(isOnline) + Number(isPdf && isOnline);
  const aiModeGridClass =
    availableAiModeCount <= 1
      ? "grid-cols-1"
      : availableAiModeCount === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  function chooseAiMode(mode: CircularAssistantMode) {
    if ((mode === "api" || mode === "api-vision") && (!isOnline || !navigator.onLine)) return;
    if (mode === aiMode) return;
    setAiMode(mode);
    setAiQuestion("");
    setAiMessages([]);
    setAiError(undefined);
    setAiProgressMessage(undefined);
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
    } catch {
      // La scelta resta valida per la sessione corrente anche se non si può salvare.
    }
  }

  async function analyzeDocument() {
    if (!previewUrl || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(undefined);
    setAnalysis(null);
    try {
      const linkedAttachments = files.map((file) => file.name ?? "").filter(Boolean);
      const result = isPdf
        ? await analyzeCircularPdf(previewUrl, linkedAttachments)
        : await analyzeCircularDocx(previewUrl, linkedAttachments);
      setAnalysis(result);
      setIsAnalysisOpen(true);
    } catch {
      setAnalysisError(
        "Non sono riuscito a leggere questo PDF. Verifica la connessione o scarica il documento e riprova.",
      );
      setIsAnalysisOpen(true);
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function askAiAboutDocument(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = aiQuestion.trim();
    if ((!previewUrl && !extractedText?.trim()) || !question || isAskingAi) return;
    const browserOnline = isOnline && (typeof navigator === "undefined" || navigator.onLine);
    const responseMode = effectiveAiMode;

    const requestId = aiRequestId.current + 1;
    aiRequestId.current = requestId;
    setAiQuestion("");
    setAiError(undefined);
    setAiMessages((current) => [...current, { role: "user", text: question }]);
    setIsAskingAi(true);
    setAiProgressMessage(
      responseMode === "api-vision" ? "Preparo le immagini delle pagine…" : undefined,
    );

    try {
      let answer: string;
      if (responseMode === "api-vision") {
        if (!isPdf || !previewUrl) throw new Error("L’API visiva è disponibile solo per i PDF.");
        const visualInput = await renderCircularPdfPageImages(previewUrl);
        const pagesForApi = visualInput.pages.slice(0, 3);
        setAiDocumentTruncated(visualInput.truncated || visualInput.pages.length > 3);
        setAiProgressMessage("Invio le immagini a Groq per l’analisi visiva…");
        answer = await askAboutCircularImages({ question, pageImages: pagesForApi });
      } else {
        const availableText = extractedText?.trim();
        const extractedDocument = availableText
          ? { text: availableText, truncated: false }
          : previewUrl
            ? isPdf
              ? await extractCircularPdfText(previewUrl)
              : await extractCircularDocxText(previewUrl)
            : { text: "", truncated: false };
        const documentText = extractedDocument.text.trim();
        if (!documentText) {
          throw new Error(
            "Non trovo testo selezionabile nella circolare. Per analizzare una scansione, usa API visiva.",
          );
        }
        const documentTruncated =
          extractedDocument.truncated || documentText.length > MAX_AI_DOCUMENT_LENGTH;
        setAiDocumentTruncated(documentTruncated);
        const limitedDocumentText = documentText.slice(0, MAX_AI_DOCUMENT_LENGTH);
        const canUseApi = responseMode === "api" && browserOnline;
        if (canUseApi) {
          answer = await askAboutCircular({
            question,
            documentText: limitedDocumentText,
            documentTruncated,
          });
        } else {
          answer = answerCircularQuestionLocally(question, limitedDocumentText);
        }
      }
      if (aiRequestId.current === requestId) {
        setAiMessages((current) => [...current, { role: "assistant", text: answer }]);
      }
    } catch (error) {
      if (aiRequestId.current === requestId) {
        setAiError(error instanceof Error ? error.message : "Domanda non riuscita. Riprova.");
      }
    } finally {
      if (aiRequestId.current === requestId) {
        setIsAskingAi(false);
        setAiProgressMessage(undefined);
      }
    }
  }

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
            {activeFile?.name ?? (hasTextOnlyContent ? "Comunicazione testuale" : "Circolare")}
          </SheetDescription>
        </SheetHeader>
        {canAskAi && (
          <div className="mb-3 shrink-0 space-y-2">
            <div className={canAnalyze ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2"}>
              {canAnalyze && (
                <button
                  type="button"
                  onClick={() => {
                    if (analysis || analysisError) setIsAnalysisOpen((openNow) => !openNow);
                    else void analyzeDocument();
                  }}
                  disabled={isAnalyzing}
                  className="press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-[11px] font-semibold text-primary disabled:opacity-60"
                >
                  {isAnalyzing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isAnalyzing
                    ? "Lettura in corso…"
                    : analysis || analysisError
                      ? isAnalysisOpen
                        ? "Nascondi analisi"
                        : "Mostra analisi"
                      : "Riassumi sul dispositivo"}
                </button>
              )}
              <button
                type="button"
                aria-expanded={isAiChatOpen}
                aria-controls="circular-ai-chat"
                onClick={() => setIsAiChatOpen((openNow) => !openNow)}
                className="press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-[11px] font-semibold text-foreground"
              >
                {isAiChatOpen ? "Nascondi chat" : "Fai una domanda"}
              </button>
            </div>
            {isAnalysisOpen && (analysis || analysisError) && (
              <section
                aria-label="Analisi locale della circolare"
                className="max-h-44 space-y-2 overflow-y-auto rounded-xl border border-border bg-card p-3 text-xs"
              >
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Analisi eseguita sul dispositivo
                </p>
                {analysis && analysis.layout !== "text" && (
                  <p className="rounded-lg bg-primary-soft px-2.5 py-2 leading-relaxed text-primary">
                    {analysis.layout === "timetable"
                      ? "Rilevato un orario settimanale: testo ricostruito rispettando le righe e le distanze tra le celle. Per associare con certezza ogni classe a giorno e ora, controlla la tabella originale."
                      : "Rilevato un layout tabellare: le posizioni delle celle sono state mantenute. Controlla i dati nella tabella originale prima di usarli."}
                  </p>
                )}
                {analysisError && <p className="text-destructive">{analysisError}</p>}
                {analysis && (
                  <>
                    {analysis.summary ? (
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">In breve</p>
                        <p className="leading-relaxed text-muted-foreground">{analysis.summary}</p>
                      </div>
                    ) : analysis.layout !== "text" ? (
                      <p className="text-muted-foreground">
                        Riepilogo automatico omesso per non confondere le celle. Date e destinatari
                        riconoscibili sono riportati separatamente; verifica le associazioni nella
                        tabella originale.
                      </p>
                    ) : isDocx ? (
                      <p className="text-muted-foreground">
                        Non è stato possibile estrarre testo leggibile dal DOCX.
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Non è stato rilevato testo selezionabile. Il PDF potrebbe essere una
                        scansione: il riconoscimento OCR non è disponibile.
                      </p>
                    )}
                    {analysis.actions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="font-medium text-foreground">Cosa fare</p>
                        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                          {analysis.actions.map((action, index) => (
                            <li key={`${action}-${index}`}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        Scadenze rilevate
                      </p>
                      {analysis.deadlines.length ? (
                        analysis.deadlines.map((date, index) => (
                          <p key={`deadline-${index}`} className="pl-5 text-muted-foreground">
                            <span className="font-medium text-foreground">{date.value}</span> —{" "}
                            {date.context}
                          </p>
                        ))
                      ) : (
                        <p className="pl-5 text-muted-foreground">Nessuna scadenza riconosciuta.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        Date rilevate
                      </p>
                      {analysis.dates.length ? (
                        analysis.dates.map((date, index) => (
                          <p key={`${date.value}-${index}`} className="pl-5 text-muted-foreground">
                            <span className="font-medium text-foreground">{date.value}</span> —{" "}
                            {date.context}
                          </p>
                        ))
                      ) : (
                        <p className="pl-5 text-muted-foreground">Nessuna data riconosciuta.</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        Destinatari
                      </p>
                      <p className="pl-5 text-muted-foreground">
                        {analysis.recipients.length
                          ? analysis.recipients.join(" · ")
                          : "Non indicati in modo riconoscibile."}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="flex items-center gap-1.5 font-medium text-foreground">
                        <Paperclip className="h-3.5 w-3.5 text-primary" />
                        Allegati collegati
                      </p>
                      <p className="pl-5 text-muted-foreground">
                        {analysis.attachments.length
                          ? analysis.attachments.join(" · ")
                          : "Nessun allegato registrato."}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {isPdf
                        ? `${analysis.pagesAnalyzed} pagine lette`
                        : "Testo DOCX letto localmente"}
                      {analysis.truncated && isPdf
                        ? " (analisi limitata alle prime 80 pagine o 300.000 caratteri)"
                        : ""}
                      . Verifica sempre le informazioni sul documento originale.
                    </p>
                  </>
                )}
              </section>
            )}
          </div>
        )}
        {canAskAi && isAiChatOpen && (
          <section
            id="circular-ai-chat"
            className="mb-3 shrink-0 space-y-2 rounded-xl border border-primary/25 bg-primary-soft/40 p-3"
          >
            <div>
              <h3 className="text-xs font-semibold text-foreground">
                Fai una domanda alla {documentLabel}
              </h3>
              <div
                role="group"
                aria-label="Modalità di risposta"
                className={`mt-2 grid ${aiModeGridClass} gap-1 rounded-lg bg-background/70 p-1`}
              >
                <button
                  type="button"
                  aria-pressed={effectiveAiMode === "local"}
                  disabled={isAskingAi}
                  onClick={() => chooseAiMode("local")}
                  className={`rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${
                    effectiveAiMode === "local"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Locale (sul dispositivo)
                </button>
                {isOnline && (
                  <button
                    type="button"
                    aria-pressed={effectiveAiMode === "api"}
                    disabled={isAskingAi}
                    onClick={() => chooseAiMode("api")}
                    className={`rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${
                      effectiveAiMode === "api"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    API Groq (Qwen)
                  </button>
                )}
                {isPdf && isOnline && (
                  <button
                    type="button"
                    aria-pressed={effectiveAiMode === "api-vision"}
                    disabled={isAskingAi}
                    onClick={() => chooseAiMode("api-vision")}
                    className={`rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${
                      effectiveAiMode === "api-vision"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    API visiva (Qwen)
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                {effectiveAiMode === "local"
                  ? "Il testo viene cercato sul dispositivo e non inviato a Groq. La modalità locale mostra passaggi pertinenti, senza generare una risposta."
                  : effectiveAiMode === "api-vision"
                    ? "Solo quando premi Chiedi, vengono inviate a Groq la domanda e le immagini JPEG delle prime 3 pagine PDF. Il documento esce dal dispositivo e la chiamata usa la quota API (eventuali limiti/costi dipendono dall’account). Non vengono inviati titolo, cronologia, voti o presenze."
                    : "Solo quando premi Chiedi, vengono inviati a Groq il testo selezionabile e la domanda corrente. Non vengono inviati titolo, cronologia, voti o presenze."}{" "}
                {!isOnline && (
                  <span className="font-medium text-primary">
                    Offline: disponibili solo le funzioni Locale.{" "}
                  </span>
                )}
                Verifica sempre la risposta sul documento originale.
              </p>
            </div>
            {aiDocumentTruncated && effectiveAiMode === "api-vision" && (
              <p className="rounded-lg bg-warning/10 px-2.5 py-2 text-[10px] text-warning">
                Per l’analisi visiva API sono state inviate solo le prime 3 pagine del PDF.
              </p>
            )}
            {aiDocumentTruncated && effectiveAiMode !== "api-vision" && (
              <p className="rounded-lg bg-warning/10 px-2.5 py-2 text-[10px] text-warning">
                Testo lungo: per la domanda è stato considerato un estratto. La risposta potrebbe
                non includere informazioni presenti nelle parti omesse.
              </p>
            )}
            {aiMessages.length > 0 && (
              <div
                aria-live="polite"
                aria-label={`Conversazione sulla ${documentLabel}`}
                className="max-h-36 space-y-2 overflow-y-auto rounded-lg bg-card/80 p-2"
              >
                {aiMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`text-[11px] leading-relaxed ${
                      message.role === "user"
                        ? "text-right text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <>
                        <p className="font-semibold">AI:</p>
                        <AssistantMarkdown text={message.text} />
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">
                        <span className="font-semibold">Tu: </span>
                        {message.text}
                      </p>
                    )}
                  </div>
                ))}
                {isAskingAi && (
                  <p
                    role="status"
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                  >
                    <LoaderCircle className="h-3 w-3 animate-spin" />
                    {aiProgressMessage ?? `Sto leggendo la ${documentLabel}…`}
                  </p>
                )}
              </div>
            )}
            {aiError && <p className="text-[11px] text-destructive">{aiError}</p>}
            <form onSubmit={askAiAboutDocument} className="flex gap-2">
              <input
                value={aiQuestion}
                onChange={(event) => setAiQuestion(event.target.value)}
                placeholder="Es. Entro quando va consegnato?"
                aria-label={`Domanda sulla ${documentLabel}`}
                maxLength={1_000}
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={!aiQuestion.trim() || isAskingAi}
                className="press rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {isAskingAi ? "Attendi" : "Chiedi"}
              </button>
            </form>
          </section>
        )}
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
        ) : previewUrl && isDocx ? (
          <DocxPreview
            key={activeFile?.path ?? activeFile?.url ?? activeIndex}
            title={activeFile?.name ?? title}
            src={previewUrl}
            initialText={extractedText}
          />
        ) : hasTextOnlyContent ? (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Testo della comunicazione
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {extractedText}
            </p>
          </div>
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
          <div className={`mt-2 grid shrink-0 gap-2 ${previewUrl ? "grid-cols-2" : "grid-cols-1"}`}>
            {isPdf && previewUrl && (
              <button
                type="button"
                onClick={openAttachment}
                className="press inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[10px] font-semibold text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                Apri PDF
              </button>
            )}
            {!isPdf && previewUrl && (
              <button
                type="button"
                onClick={openAttachment}
                className="press inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-card px-2 text-[10px] font-semibold text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                Apri DOCX
              </button>
            )}
            <button
              type="button"
              onClick={downloadAttachment}
              disabled={isDownloading}
              className="press inline-flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-[10px] font-semibold text-primary-foreground"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              {isDownloading ? "Download in corso…" : isPdf ? "Scarica PDF" : "Scarica DOCX"}
            </button>
          </div>
        )}
        {downloadError && (
          <p className="mt-2 text-center text-[11px] text-destructive">{downloadError}</p>
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
