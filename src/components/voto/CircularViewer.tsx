import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  Paperclip,
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
  answerCircularQuestionOnDevice,
  isOnDeviceCircularAiSupported,
  isOnDeviceModelDownloaded,
  releaseOnDeviceCircularAi,
} from "@/lib/voto/on-device-circular-ai";
import {
  analyzeCircularDocx,
  analyzeCircularPdf,
  extractCircularDocxText,
  extractCircularPdfText,
  type CircularAnalysis,
} from "@/lib/voto/circular-reader";
import { askAboutCircular, type CircularAssistantMessage } from "@/lib/voto/circular-assistant";
import { useOnlineStatus } from "@/lib/voto/use-online-status";
import { AssistantMarkdown } from "./AssistantMarkdown";
import { PdfCanvasPreview } from "./PdfCanvasPreview";

const MAX_AI_DOCUMENT_LENGTH = 60_000;
const MAX_ON_DEVICE_EVIDENCE_LENGTH = 8_000;
const AI_MODE_STORAGE_KEY = "voto.circular-assistant-mode.v1";
type CircularAssistantMode = "local" | "device" | "api";
type DeviceAiAvailability = "checking" | "supported" | "not-downloaded" | "unsupported";

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
  const [deviceAiAvailability, setDeviceAiAvailability] =
    useState<DeviceAiAvailability>("checking");
  const deviceAiReady = deviceAiAvailability === "supported";
  const activeAiMode =
    (isOnline && aiMode === "api") || (aiMode === "device" && deviceAiReady) ? aiMode : "local";
  const aiRequestId = useRef(0);

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
      if (!navigator.onLine && savedMode !== "device") {
        setAiMode("local");
        window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
      } else if (savedMode === "local" || savedMode === "api" || savedMode === "device") {
        setAiMode(savedMode);
      }
    } catch {
      // Se lo storage non è disponibile, resta attiva la modalità locale predefinita.
    }
  }, []);

  useEffect(() => {
    if (
      (isOnline && (typeof navigator === "undefined" || navigator.onLine)) ||
      aiMode === "local" ||
      aiMode === "device"
    )
      return;
    setAiMode("local");
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
    } catch {
      // La modalità resta locale per la sessione corrente.
    }
  }, [aiMode, isOnline]);

  useEffect(() => {
    if (!open || !isAiChatOpen) return;
    let isCurrent = true;
    setDeviceAiAvailability("checking");
    void isOnDeviceCircularAiSupported().then((supported) => {
      if (isCurrent)
        setDeviceAiAvailability(
          supported
            ? isOnDeviceModelDownloaded()
              ? "supported"
              : "not-downloaded"
            : "unsupported",
        );
    });
    return () => {
      isCurrent = false;
    };
  }, [isAiChatOpen, open]);

  useEffect(() => {
    if (deviceAiAvailability === "supported" || aiMode !== "device") return;
    setAiMode("local");
    setAiError(
      deviceAiAvailability === "not-downloaded"
        ? "Scarica prima il modello da Impostazioni > AI sul dispositivo. Ho ripristinato Locale."
        : "AI generativa non supportata su questo telefono/browser. Ho ripristinato Locale.",
    );
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
    } catch {
      // Il fallback resta valido per la sessione corrente.
    }
  }, [aiMode, deviceAiAvailability]);

  useEffect(() => {
    if (!open) void releaseOnDeviceCircularAi();
  }, [open]);

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
    void releaseOnDeviceCircularAi();
  }, [activeFile?.path, activeFile?.url, activeFile?.name]);

  const attachmentFilename = safeAttachmentFilename(activeFile?.name);
  const internalPreviewUrl = activeFile?.path ? internalPdfUrl(activeFile.path) : undefined;
  const previewUrl = internalPreviewUrl ?? activeFile?.url;
  const downloadUrl = activeFile?.path
    ? internalPdfUrl(activeFile.path, true, attachmentFilename)
    : activeFile?.url;
  const isPdf = /\.pdf$/i.test(activeFile?.name ?? "") || /\.pdf$/i.test(activeFile?.path ?? "");
  const isDocx = /\.docx$/i.test(activeFile?.name ?? "") || /\.docx$/i.test(activeFile?.path ?? "");
  const canAnalyze = Boolean(previewUrl && (isPdf || isDocx));

  function chooseAiMode(mode: CircularAssistantMode) {
    if (mode === "api" && (!isOnline || !navigator.onLine)) return;
    if (mode === "device" && deviceAiAvailability !== "supported") return;
    if (mode === aiMode) return;
    if (aiMode === "device") void releaseOnDeviceCircularAi();
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
    if (!previewUrl || !question || isAskingAi) return;
    const browserOnline = isOnline && (typeof navigator === "undefined" || navigator.onLine);
    const responseMode = browserOnline ? aiMode : aiMode === "device" ? "device" : "local";

    const requestId = aiRequestId.current + 1;
    aiRequestId.current = requestId;
    setAiQuestion("");
    setAiError(undefined);
    setAiMessages((current) => [...current, { role: "user", text: question }]);
    setIsAskingAi(true);
    setAiProgressMessage(responseMode === "device" ? "Avvio l’AI sul telefono…" : undefined);

    try {
      const extractedDocument = extractedText?.trim()
        ? { text: extractedText.trim(), truncated: false }
        : isPdf
          ? await extractCircularPdfText(previewUrl)
          : await extractCircularDocxText(previewUrl);
      const documentText = extractedDocument.text.trim();
      if (!documentText) {
        throw new Error(
          "Non trovo testo selezionabile nella circolare. Se è una scansione, serve prima un OCR.",
        );
      }
      const documentTruncated =
        extractedDocument.truncated || documentText.length > MAX_AI_DOCUMENT_LENGTH;
      setAiDocumentTruncated(documentTruncated);
      const limitedDocumentText = documentText.slice(0, MAX_AI_DOCUMENT_LENGTH);
      const canUseApi = responseMode === "api" && browserOnline;
      let answer: string;
      if (canUseApi) {
        answer = await askAboutCircular({
          question,
          documentText: limitedDocumentText,
          documentTruncated,
        });
      } else {
        const localAnswer = answerCircularQuestionLocally(question, limitedDocumentText);
        if (responseMode === "device") {
          const hasRelevantPassages =
            !localAnswer.startsWith("Non trovo") && !localAnswer.startsWith("Non riesco");
          const evidence = hasRelevantPassages
            ? localAnswer.slice(0, MAX_ON_DEVICE_EVIDENCE_LENGTH)
            : limitedDocumentText.slice(0, MAX_ON_DEVICE_EVIDENCE_LENGTH);
          try {
            answer = await answerCircularQuestionOnDevice(question, evidence, (progress) => {
              if (aiRequestId.current !== requestId) return;
              const percentage = Math.round(progress.progress * 100);
              setAiProgressMessage(`Caricamento del modello sul telefono: ${percentage}%`);
            });
          } catch {
            answer = localAnswer;
            if (aiRequestId.current === requestId) {
              setAiMode("local");
              setAiError(
                "AI generativa non disponibile su questo telefono (WebGPU o memoria insufficiente). Ho usato la modalità Locale.",
              );
              try {
                window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
              } catch {
                // Il fallback resta valido per la sessione corrente.
              }
            }
          }
        } else {
          answer = localAnswer;
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
            {activeFile?.name ?? "Circolare"}
          </SheetDescription>
        </SheetHeader>
        {canAnalyze && (
          <div className="mb-3 shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
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
        {canAnalyze && isAiChatOpen && (
          <section
            id="circular-ai-chat"
            className="mb-3 shrink-0 space-y-2 rounded-xl border border-primary/25 bg-primary-soft/40 p-3"
          >
            <div>
              <h3 className="text-xs font-semibold text-foreground">
                Fai una domanda alla circolare
              </h3>
              <div
                role="group"
                aria-label="Modalità di risposta"
                className={`mt-2 grid ${isOnline && deviceAiAvailability === "supported" ? "grid-cols-3" : isOnline || deviceAiAvailability === "supported" ? "grid-cols-2" : "grid-cols-1"} gap-1 rounded-lg bg-background/70 p-1`}
              >
                <button
                  type="button"
                  aria-pressed={activeAiMode === "local"}
                  disabled={isAskingAi}
                  onClick={() => chooseAiMode("local")}
                  className={`rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${
                    activeAiMode === "local"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  Locale (sul dispositivo)
                </button>
                {deviceAiAvailability === "supported" && (
                  <button
                    type="button"
                    aria-pressed={activeAiMode === "device"}
                    disabled={isAskingAi}
                    onClick={() => chooseAiMode("device")}
                    className={`rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${
                      activeAiMode === "device"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    AI sul telefono (Qwen)
                  </button>
                )}
                {isOnline && (
                  <button
                    type="button"
                    aria-pressed={activeAiMode === "api"}
                    disabled={isAskingAi}
                    onClick={() => chooseAiMode("api")}
                    className={`rounded-md px-2 py-1.5 text-[10px] font-medium disabled:opacity-50 ${
                      activeAiMode === "api"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    API Groq (Qwen)
                  </button>
                )}
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                {activeAiMode === "local"
                  ? "Il testo viene cercato sul dispositivo e non inviato a Groq. La modalità locale mostra passaggi pertinenti, senza generare una risposta."
                  : activeAiMode === "device"
                    ? "Qwen generativo gira sul telefono: domanda e testo non vengono inviati a un servizio AI. Il modello è stato preparato da Impostazioni e resta nella cache del browser."
                    : "Solo quando premi Chiedi, vengono inviati a Groq il testo selezionabile e la domanda corrente. Non vengono inviati titolo, cronologia, voti o presenze."}{" "}
                {!isOnline && (
                  <span className="font-medium text-primary">
                    {activeAiMode === "device"
                      ? "Offline: l’AI sul telefono funziona solo se il modello è già scaricato."
                      : "Offline: disponibile solo Locale."}{" "}
                  </span>
                )}
                Verifica sempre la risposta sul documento originale.
              </p>
              {deviceAiAvailability === "checking" && (
                <p role="status" className="text-[10px] text-muted-foreground">
                  Verifico il supporto AI del telefono…
                </p>
              )}
              {deviceAiAvailability === "unsupported" && (
                <p role="status" className="text-[10px] text-muted-foreground">
                  Questo browser o telefono non offre WebGPU per il modello generativo; resta
                  disponibile la modalità Locale.
                </p>
              )}
              {deviceAiAvailability === "not-downloaded" && (
                <p role="status" className="text-[10px] text-muted-foreground">
                  Per usare AI sul telefono, scarica prima il modello da Impostazioni &gt; AI sul
                  dispositivo.
                </p>
              )}
            </div>
            {aiDocumentTruncated && (
              <p className="rounded-lg bg-warning/10 px-2.5 py-2 text-[10px] text-warning">
                Circolare lunga: per la domanda è stato considerato un estratto del testo. La
                risposta potrebbe non includere informazioni presenti nelle parti omesse.
              </p>
            )}
            {aiMessages.length > 0 && (
              <div
                aria-live="polite"
                aria-label="Conversazione sulla circolare"
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
                    {aiProgressMessage ??
                      (activeAiMode === "device"
                        ? "Genero la risposta sul telefono…"
                        : "Sto leggendo la circolare…")}
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
                aria-label="Domanda sulla circolare"
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
