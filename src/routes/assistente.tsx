import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  FileText,
  LoaderCircle,
  Paperclip,
  ScanText,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getAssignmentActionIntent,
  type AssignmentConfirmation,
} from "@/lib/voto/assistant-actions";
import { answerQuestion, scheduleDayToClear } from "@/lib/voto/assistant";
import {
  answerCircularChatQuestion,
  isCircularChatQuestion,
  isCircularFollowUpQuestion,
  type CircularAssistantMode,
} from "@/lib/voto/circular-assistant-chat";
import {
  askGeneralQuestion,
  askWithDocument,
  getLastApiQuota,
  type ApiQuota,
} from "@/lib/voto/circular-assistant";
import {
  extractCircularDocxText,
  extractCircularPdfText,
  renderCircularPdfPageImages,
} from "@/lib/voto/circular-reader";
import { isAssistantSearchQuery } from "@/lib/voto/assistant-search";
import { AssistantMarkdown } from "@/components/voto/AssistantMarkdown";
import {
  answerSchoolPolicyQuestion,
  isSchoolPolicyQuestion,
  type SchoolDocumentSource,
} from "@/lib/voto/school-documents";
import { pickAssistantSuggestions } from "@/lib/voto/assistant-suggestions";
import { loadAbsenceHoursPerDay } from "@/lib/voto/absence-preferences";
import { clearScheduleDayIfUnchanged, DAYS, loadSchedule } from "@/lib/voto/orario";
import { loadSchoolClosures } from "@/lib/voto/school-holidays";
import { loadSchoolEndDate } from "@/lib/voto/school-end-date";
import { useStudy } from "@/lib/voto/study-context";
import { useClock, useVoto } from "@/lib/voto/store";
import { useOnlineStatus } from "@/lib/voto/use-online-status";
import {
  getRandomCompleteThemeIntent,
  type RandomThemeConfirmation,
} from "@/lib/voto/assistant-theme-actions";

type PendingAction =
  | {
      type: "clear-day";
      day: NonNullable<ReturnType<typeof scheduleDayToClear>>;
      expectedLessons: string[];
    }
  | { type: "assignment"; action: AssignmentConfirmation }
  | { type: "theme"; action: RandomThemeConfirmation };

type AssistantChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: SchoolDocumentSource[];
};

type ChatAttachment = {
  file: File;
  text: string;
  truncated?: boolean;
};

const MAX_CHAT_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_CHAT_ATTACHMENT_TEXT = 120_000;

const AI_MODE_STORAGE_KEY = "voto.circular-assistant-mode.v1";
const ASSISTANT_MESSAGES_KEY = "voto.assistant-messages.v1";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente — VOTO." },
      {
        name: "description",
        content: "Assistente Locale e API per domande generali e documenti scolastici.",
      },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const v = useVoto();
  const study = useStudy();
  const now = useClock();
  const isOnline = useOnlineStatus();
  const [question, setQuestion] = useState("");
  const [assistantMode, setAssistantMode] = useState<CircularAssistantMode>("local");
  const [apiQuota, setApiQuota] = useState<ApiQuota | null>(() => getLastApiQuota());
  const canUseApi = isOnline && (typeof navigator === "undefined" || navigator.onLine);
  const activeAssistantMode = canUseApi && assistantMode === "api" ? "api" : "local";
  const [isReplying, setIsReplying] = useState(false);
  const [isReadingAttachment, setIsReadingAttachment] = useState(false);
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => {
    if (typeof window === "undefined") {
      return [
        {
          role: "assistant",
          text: "Ciao! Sono l’assistente di VOTO. In Locale consulto i dati scolastici e i documenti sul dispositivo; con API puoi chiedere anche argomenti generali e avere risposte basate sui documenti pertinenti.",
        },
      ];
    }
    try {
      const saved = window.localStorage.getItem(ASSISTANT_MESSAGES_KEY);
      const parsed = saved ? (JSON.parse(saved) as AssistantChatMessage[]) : null;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(-20);
    } catch {
      // La chat parte vuota se la memoria locale non è disponibile.
    }
    return [
      {
        role: "assistant",
        text: "Ciao! Sono l’assistente di VOTO. In Locale consulto i dati scolastici e i documenti sul dispositivo; con API puoi chiedere anche argomenti generali e avere risposte basate sui documenti pertinenti.",
      },
    ];
  });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(ASSISTANT_MESSAGES_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // La chat resta disponibile nella sessione corrente.
    }
  }, [messages]);

  useEffect(() => {
    setSuggestions(pickAssistantSuggestions());
    try {
      const savedMode = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
      if (navigator.onLine && savedMode === "api") setAssistantMode("api");
      else if (savedMode === "device" || savedMode === "vision" || savedMode === "api-vision") {
        setAssistantMode("local");
        window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
      }
      window.localStorage.removeItem("voto.circular-ai-models.v1");
    } catch {
      // Se lo storage non è disponibile, resta attiva la modalità locale.
    }
  }, []);

  useEffect(() => {
    if (canUseApi || assistantMode !== "api") return;
    setAssistantMode("local");
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
    } catch {
      // La modalità resta locale per la sessione corrente.
    }
  }, [assistantMode, canUseApi]);

  const changeAssistantMode = (mode: CircularAssistantMode) => {
    if (mode === "api" && !canUseApi) return;
    setAssistantMode(mode);
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
    } catch {
      // La scelta vale comunque per la schermata corrente.
    }
  };

  const readImageWithOcr = async (file: File) => {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("ita", 1);
    try {
      const result = await worker.recognize(file);
      return result.data.text.trim();
    } finally {
      await worker.terminate();
    }
  };

  const readAttachment = async () => {
    if (!attachment || isReadingAttachment) return;
    setIsReadingAttachment(true);
    setAttachmentError("");
    const objectUrl = URL.createObjectURL(attachment.file);
    try {
      let text = "";
      let truncated = false;
      if (attachment.file.type === "application/pdf") {
        const extracted = await extractCircularPdfText(objectUrl);
        text = extracted.text.trim();
        truncated = extracted.truncated;
        if (!text) {
          const visual = await renderCircularPdfPageImages(objectUrl);
          const { createWorker } = await import("tesseract.js");
          const worker = await createWorker("ita", 1);
          try {
            const pages: string[] = [];
            for (const page of visual.pages) {
              const result = await worker.recognize(page.dataUrl);
              pages.push(`[Pagina ${page.pageNumber}]\n${result.data.text.trim()}`);
            }
            text = pages.filter(Boolean).join("\n\n");
            truncated = visual.truncated;
          } finally {
            await worker.terminate();
          }
        }
      } else if (
        attachment.file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const extracted = await extractCircularDocxText(objectUrl);
        text = extracted.text.trim();
        truncated = extracted.truncated;
      } else if (attachment.file.type.startsWith("image/")) {
        text = await readImageWithOcr(attachment.file);
      } else {
        throw new Error("Formato non supportato. Scegli un’immagine, un PDF o un DOCX.");
      }
      if (!text) throw new Error("Non ho trovato testo leggibile nell’allegato.");
      setAttachment((current) =>
        current
          ? {
              ...current,
              text: text.slice(0, MAX_CHAT_ATTACHMENT_TEXT),
              truncated: truncated || text.length > MAX_CHAT_ATTACHMENT_TEXT,
            }
          : current,
      );
    } catch (error) {
      setAttachmentError(
        error instanceof Error ? error.message : "Lettura dell’allegato non riuscita.",
      );
    } finally {
      URL.revokeObjectURL(objectUrl);
      setIsReadingAttachment(false);
    }
  };

  const selectAttachment = (file: File | undefined) => {
    if (!file) return;
    setAttachmentError("");
    if (file.size > MAX_CHAT_ATTACHMENT_BYTES) {
      setAttachment(null);
      setAttachmentError("L’allegato supera il limite di 15 MB.");
      return;
    }
    const supported =
      file.type.startsWith("image/") ||
      [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(file.type);
    if (!supported) {
      setAttachment(null);
      setAttachmentError("Formato non supportato. Scegli un’immagine, un PDF o un DOCX.");
      return;
    }
    setAttachment({ file, text: "" });
  };

  const ask = async (text = question) => {
    const clean = text.trim();
    if ((!clean && !attachment?.text) || isReplying || isReadingAttachment) return;
    const attachmentText = attachment?.text.trim() ?? "";
    const attachmentLabel = attachment?.file.name;
    const userMessage = attachmentText
      ? `${clean || "Leggi questo allegato."}\n\n📎 ${attachmentLabel}\n${attachmentText}${attachment?.truncated ? "\n\n[Testo abbreviato]" : ""}`
      : clean;
    const requestMode = assistantMode === "api" && canUseApi ? "api" : "local";
    const dayToClear = scheduleDayToClear(clean);
    const expectedLessons = dayToClear ? [...loadSchedule()[dayToClear]] : [];
    const assistantData = {
      ...v.data,
      student: {
        ...v.data.student,
        name: v.displayName || v.data.student.name,
      },
      assignments: v.data.assignments.map((item) => ({
        ...item,
        completed: v.isDone(item.id, item.completed),
      })),
      notifications: v.data.notifications.map((item) => ({
        ...item,
        read: v.isRead(item.id, item.read),
      })),
    };
    const assignmentIntent = getAssignmentActionIntent(clean, assistantData.assignments);
    const randomThemeIntent = getRandomCompleteThemeIntent(clean, v.theme);
    const nextPendingAction: PendingAction | null = dayToClear
      ? { type: "clear-day", day: dayToClear, expectedLessons }
      : randomThemeIntent?.kind === "confirm"
        ? { type: "theme", action: randomThemeIntent.action }
        : assignmentIntent?.kind === "confirm"
          ? { type: "assignment", action: assignmentIntent.action }
          : null;
    const lessonsToClear = expectedLessons
      .map((lesson, index) => (lesson.trim() ? `${index + 1}ª ora: ${lesson.trim()}` : null))
      .filter((lesson): lesson is string => lesson !== null);
    const previousQuestion = [...messages]
      .reverse()
      .find((message) => message.role === "user")?.text;
    const hasImmediateActionResponse =
      Boolean(nextPendingAction) ||
      assignmentIntent?.kind === "clarify" ||
      assignmentIntent?.kind === "already";
    const useCircularAssistant =
      !hasImmediateActionResponse &&
      (isCircularChatQuestion(clean) || isCircularFollowUpQuestion(clean, previousQuestion));
    const useSchoolPolicyAssistant =
      !hasImmediateActionResponse && !useCircularAssistant && isSchoolPolicyQuestion(clean);
    const useGeneralApi =
      !hasImmediateActionResponse &&
      !useCircularAssistant &&
      !useSchoolPolicyAssistant &&
      requestMode === "api" &&
      !isAssistantSearchQuery(clean);
    const useAttachmentApi = Boolean(attachmentText) && requestMode === "api";
    const localAnswer = () =>
      answerQuestion(clean, assistantData, loadSchedule(), now, v.interrogazioni, {
        ...(previousQuestion ? { previousQuestion } : {}),
        source: v.source,
        lastSync: v.lastSync,
        syncError: v.error,
        hasRemoteUrl: Boolean(v.url),
        target: v.target,
        theme: v.theme,
        mode: v.mode,
        accent: v.accent,
        background: v.bg,
        density: v.density,
        reduceMotion: v.reduceMotion,
        customFont: v.customTheme.font,
        interfaceScale: v.interfaceScale,
        homeScale: v.homeScale,
        homeModules: v.homeModules,
        flashcards: study.cards,
        schoolEndDate: loadSchoolEndDate(),
        schoolClosures: loadSchoolClosures(),
        absenceHoursPerDay: loadAbsenceHoursPerDay(),
      });
    const response = dayToClear
      ? `Posso cancellare tutte le lezioni dell’orario di ${DAYS.find((day) => day.id === dayToClear)?.label}.${lessonsToClear.length ? ` Lezioni: ${lessonsToClear.join("; ")}.` : " L’orario risulta già vuoto."} Vuoi confermare?`
      : randomThemeIntent?.kind === "confirm"
        ? `Ho scelto a caso il tema completo “${randomThemeIntent.action.label}”. Vuoi applicarlo? Cambierà insieme colori, superfici, caratteri e arrotondamenti.`
        : assignmentIntent?.kind === "confirm"
          ? `Posso ${assignmentIntent.action.completed ? "segnare come completato" : "riaprire"} il compito “${assignmentIntent.action.title}”${assignmentIntent.action.subject ? ` di ${assignmentIntent.action.subject}` : ""}. Confermi? Non cambierò nulla finché non confermi. La modifica resta locale a VOTO e non aggiorna DidUP.`
          : assignmentIntent?.kind === "clarify" || assignmentIntent?.kind === "already"
            ? assignmentIntent.message
            : useCircularAssistant || useSchoolPolicyAssistant || useGeneralApi
              ? ""
              : localAnswer();
    setPendingAction(nextPendingAction);
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: userMessage }]);
    setAttachment(null);

    if (useAttachmentApi || useCircularAssistant || useSchoolPolicyAssistant || useGeneralApi) {
      setIsReplying(true);
      try {
        let assistantMessage: AssistantChatMessage;
        if (useAttachmentApi) {
          assistantMessage = {
            role: "assistant",
            text: await askWithDocument({
              question: clean || "Riassumi il contenuto dell’allegato.",
              documentText: attachmentText,
              documentTruncated: Boolean(attachment?.truncated),
            }),
          };
        } else if (useCircularAssistant) {
          const assistantResponse = await answerCircularChatQuestion(
            clean,
            assistantData.notifications,
            requestMode,
            previousQuestion,
          );
          assistantMessage = {
            role: "assistant",
            text: assistantResponse ?? "Non ho trovato una circolare pertinente.",
          };
        } else if (useSchoolPolicyAssistant) {
          const schoolAnswer = await answerSchoolPolicyQuestion(
            clean,
            requestMode === "api" ? "api" : "local",
          );
          assistantMessage = {
            role: "assistant",
            text: schoolAnswer.text,
            sources: schoolAnswer.sources,
          };
        } else {
          assistantMessage = { role: "assistant", text: await askGeneralQuestion(clean) };
        }
        setMessages((current) => [...current, assistantMessage]);
        setApiQuota(getLastApiQuota());
      } catch (error) {
        const message = error instanceof Error ? error.message : "La risposta non è disponibile.";
        setMessages((current) => [...current, { role: "assistant", text: message }]);
        setApiQuota(getLastApiQuota());
      } finally {
        setIsReplying(false);
      }
      return;
    }

    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        text: attachmentText
          ? `Ho estratto il testo da “${attachmentLabel}”.\n\n${attachmentText}${attachment?.truncated ? "\n\n[Testo abbreviato]" : ""}`
          : response,
      },
    ]);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    let result: string;
    if (pendingAction.type === "clear-day") {
      const label = DAYS.find((day) => day.id === pendingAction.day)?.label;
      const clearResult = clearScheduleDayIfUnchanged(
        loadSchedule(),
        pendingAction.day,
        pendingAction.expectedLessons,
      );
      result =
        clearResult === "cleared"
          ? `Fatto: ho cancellato tutte le lezioni dell’orario di ${label}.`
          : clearResult === "empty"
            ? `L’orario di ${label} è già vuoto. Non ho modificato nulla.`
            : `L’orario di ${label} è cambiato mentre aspettavi. Non ho cancellato nulla; controllalo e chiedimi di nuovo se vuoi svuotarlo.`;
    } else if (pendingAction.type === "theme") {
      if (v.theme !== pendingAction.action.expectedTheme) {
        result =
          "Il tema è cambiato mentre aspettavi; non ho applicato quello sorteggiato. Se vuoi, chiedimi di nuovo un tema casuale.";
      } else {
        v.setTheme(pendingAction.action.theme);
        result = `Fatto: ho applicato il tema completo “${pendingAction.action.label}”. Puoi cambiarlo in qualsiasi momento da Personalizza > Tema completo.`;
      }
    } else {
      const assignment = v.data.assignments.find((item) => item.id === pendingAction.action.id);
      if (!assignment) {
        result = "Non trovo più quel compito nei dati caricati: non ho apportato modifiche.";
      } else if (v.isDone(assignment.id, assignment.completed) === pendingAction.action.completed) {
        result = `“${assignment.title}” è già nello stato richiesto; non ho apportato altre modifiche.`;
      } else {
        v.toggleDone(assignment.id, assignment.completed);
        result = pendingAction.action.completed
          ? `Fatto: “${assignment.title}” è stato segnato come completato solo in VOTO. DidUP non è stato modificato.`
          : `Fatto: “${assignment.title}” è stato riaperto solo in VOTO. DidUP non è stato modificato.`;
      }
    }
    setMessages((current) => [...current, { role: "assistant", text: result }]);
    setPendingAction(null);
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
    setMessages((current) => [
      ...current,
      { role: "assistant", text: "Azione annullata. Non ho modificato nulla." },
    ]);
  };

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Assistente</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Locale consulta i dati dell’app; API risponde a domande generali usando i documenti
            pertinenti.
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Bot className="h-5 w-5" />
        </span>
      </div>

      <section className="card-surface mt-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            {activeAssistantMode === "local" ? "Modalità Locale" : "Modalità API Groq (Qwen)"}
          </div>
          <div
            className="flex rounded-xl border border-border p-1"
            role="group"
            aria-label="Modalità assistente"
          >
            <button
              type="button"
              aria-pressed={activeAssistantMode === "local"}
              disabled={isReplying}
              onClick={() => changeAssistantMode("local")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${activeAssistantMode === "local" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Locale
            </button>
            {canUseApi && (
              <button
                type="button"
                aria-pressed={activeAssistantMode === "api"}
                disabled={isReplying}
                onClick={() => changeAssistantMode("api")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${activeAssistantMode === "api" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                API
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {activeAssistantMode === "local"
            ? "Locale consulta sul dispositivo il regolamento ufficiale Morselli-Sturzo e la ricerca PDF fornita dall’utente (non verificata). Domande, circolari e dati scolastici non vengono inviati a Groq."
            : "API invia a Groq la domanda e gli estratti pertinenti dei documenti. Non invia automaticamente dati scolastici o cronologia; i dati personali scritti nella domanda vengono inviati. Per zero spese, scegli Locale o AI telefono."}{" "}
          {!canUseApi && (
            <span className="font-medium text-primary">
              Offline: API non disponibile; è disponibile Locale.
            </span>
          )}
          Verifica sempre eventuali aggiornamenti ufficiali della scuola.
        </p>
        {activeAssistantMode === "api" && apiQuota && (
          <div className="mt-3 rounded-lg border border-border bg-surface/60 px-3 py-2 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <strong className="text-foreground">Ultima quota Groq ricevuta</strong>
              <span>
                Richieste: {apiQuota.remainingRequests ?? "non disponibile"}
                {apiQuota.limitRequests !== undefined ? ` / ${apiQuota.limitRequests}` : ""}
              </span>
              <span>
                Token: {apiQuota.remainingTokens ?? "non disponibile"}
                {apiQuota.limitTokens !== undefined ? ` / ${apiQuota.limitTokens}` : ""}
              </span>
            </div>
            <p className="mt-1">
              Osservata {new Date(apiQuota.observedAt).toLocaleString("it-IT")}. È una fotografia
              dell’ultima chiamata API, non un contatore locale garantito.
              {apiQuota.resetRequests ? ` Reset richieste: ${apiQuota.resetRequests}.` : ""}
            </p>
          </div>
        )}
      </section>

      <div className="mt-5 space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Bot className="h-4 w-4" />
              </span>
            )}
            <div
              className={`max-w-[86%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-foreground"}`}
            >
              {message.role === "assistant" ? (
                <AssistantMarkdown text={message.text} />
              ) : (
                message.text
              )}
              {message.sources?.map((source) => {
                const key = `${source.sourceKind}-${source.title}-${source.page ?? "document"}`;
                const attribution =
                  source.sourceKind === "user-provided"
                    ? "Ricerca fornita dall’utente, non verificata"
                    : "Fonte ufficiale";
                const sourceText = `${attribution}: ${source.title}${source.page ? ` · pagina ${source.page}` : ""}`;
                const className =
                  "mt-2 block border-t border-border pt-2 text-xs text-primary underline underline-offset-2";
                return source.url ? (
                  <a
                    key={key}
                    href={`${source.url}${source.page ? `#page=${source.page}` : ""}`}
                    target="_blank"
                    rel="noreferrer"
                    className={className}
                  >
                    {sourceText}
                  </a>
                ) : (
                  <p key={key} className={`${className} no-underline`}>
                    {sourceText}
                  </p>
                );
              })}
            </div>
            {message.role === "user" && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground">
                <UserRound className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}
      </div>

      {isReplying && (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {activeAssistantMode === "api"
            ? "Preparo la risposta API con la domanda e le fonti pertinenti…"
            : "Cerco nei documenti sul dispositivo…"}
        </p>
      )}

      {pendingAction && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs">
          <span className="flex-1">
            {pendingAction.type === "clear-day" ? (
              <>
                Confermi la cancellazione dell’orario di{" "}
                <strong>{DAYS.find((day) => day.id === pendingAction.day)?.label}</strong>?
                {pendingAction.expectedLessons.some((lesson) => lesson.trim()) ? (
                  <span className="mt-1 block">
                    Lezioni selezionate:{" "}
                    {pendingAction.expectedLessons
                      .map((lesson, index) =>
                        lesson.trim() ? `${index + 1}ª ora: ${lesson.trim()}` : null,
                      )
                      .filter((lesson): lesson is string => lesson !== null)
                      .join("; ")}
                  </span>
                ) : (
                  <span className="mt-1 block">Il giorno risulta già vuoto.</span>
                )}
              </>
            ) : pendingAction.type === "theme" ? (
              <>
                Ho scelto il tema completo <strong>“{pendingAction.action.label}”</strong>. Vuoi
                applicarlo? Palette, superfici, caratteri e arrotondamenti cambieranno insieme.
              </>
            ) : (
              <>
                Confermi di{" "}
                {pendingAction.action.completed ? "segnare come completato" : "riaprire"}{" "}
                <strong>“{pendingAction.action.title}”</strong>
                {pendingAction.action.subject ? ` · ${pendingAction.action.subject}` : ""}?
                {pendingAction.action.dueDate
                  ? ` Scadenza: ${pendingAction.action.dueDate.slice(8, 10)}/${pendingAction.action.dueDate.slice(5, 7)}.`
                  : ""}
              </>
            )}
          </span>
          <button
            type="button"
            onClick={confirmPendingAction}
            className={`press rounded-lg px-3 py-2 font-semibold ${pendingAction.type === "clear-day" ? "bg-danger text-white" : "bg-primary text-primary-foreground"}`}
          >
            {pendingAction.type === "clear-day"
              ? "Cancella"
              : pendingAction.type === "theme"
                ? "Applica tema"
                : pendingAction.action.completed
                  ? "Segna completato"
                  : "Riapri"}
          </button>
          <button
            type="button"
            onClick={cancelPendingAction}
            className="press rounded-lg border border-border px-3 py-2 font-semibold"
          >
            Annulla
          </button>
        </div>
      )}

      {attachment && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-3 py-2 text-xs">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate" title={attachment.file.name}>
            {attachment.file.name}
            {attachment.text ? " · testo pronto" : " · premi OCR per leggerlo"}
          </span>
          <button
            type="button"
            onClick={readAttachment}
            disabled={isReadingAttachment}
            className="press inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-soft px-2 py-1.5 font-semibold text-primary disabled:opacity-50"
            aria-label="Tessera allegato"
            title="Tessera allegato"
          >
            {isReadingAttachment ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ScanText className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">OCR</span>
          </button>
          <button
            type="button"
            onClick={() => setAttachment(null)}
            className="press rounded-lg p-1.5 text-muted-foreground hover:bg-background"
            aria-label="Rimuovi allegato"
            title="Rimuovi allegato"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {attachmentError && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {attachmentError}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestions.slice(0, 2).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => ask(suggestion)}
            disabled={isReplying}
            className="press rounded-full border border-border px-3 py-2 text-left text-[11px] text-muted-foreground disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask();
        }}
        className="sticky bottom-20 mt-5 flex gap-2 rounded-2xl border border-border bg-background/95 p-2 backdrop-blur md:bottom-8"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          aria-label="Allega file alla chat"
          onChange={(event) => {
            selectAttachment(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReplying || isReadingAttachment}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground disabled:opacity-40"
          aria-label="Allega file alla chat"
          title="Allega file alla chat"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Chiedi sui tuoi dati o sulle circolari…"
          aria-label="Domanda all'assistente"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={(!question.trim() && !attachment?.text) || isReplying || isReadingAttachment}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Invia domanda"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
