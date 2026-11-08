import { createFileRoute } from "@tanstack/react-router";
import { Bot, LoaderCircle, Search, Send, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAssignmentActionIntent,
  type AssignmentConfirmation,
} from "@/lib/voto/assistant-actions";
import { answerQuestion, scheduleDayToClear } from "@/lib/voto/assistant";
import {
  answerCircularChatQuestion,
  isCircularChatQuestion,
  type CircularAssistantMode,
} from "@/lib/voto/circular-assistant-chat";
import { askGeneralQuestion } from "@/lib/voto/circular-assistant";
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

const AI_MODE_STORAGE_KEY = "voto.circular-assistant-mode.v1";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente — VOTO." },
      {
        name: "description",
        content:
          "Assistente locale e API per domande generali e documenti ufficiali Morselli-Sturzo.",
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
  const activeAssistantMode = isOnline ? assistantMode : "local";
  const [isReplying, setIsReplying] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: "assistant",
      text: "Ciao! Sono l’assistente di VOTO. In Locale posso consultare i dati scolastici e cercare nei regolamenti ufficiali sul dispositivo; con API puoi chiedere anche argomenti generali e avere risposte basate sui documenti pertinenti.",
    },
  ]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    setSuggestions(pickAssistantSuggestions());
    try {
      if (navigator.onLine && window.localStorage.getItem(AI_MODE_STORAGE_KEY) === "api") {
        setAssistantMode("api");
      }
    } catch {
      // Se lo storage non è disponibile, resta attiva la modalità locale.
    }
  }, []);

  useEffect(() => {
    if (isOnline && (typeof navigator === "undefined" || navigator.onLine)) return;
    setAssistantMode("local");
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, "local");
    } catch {
      // La modalità resta locale per la sessione corrente.
    }
  }, [isOnline]);

  const changeAssistantMode = (mode: CircularAssistantMode) => {
    if (mode === "api" && (!isOnline || !navigator.onLine)) return;
    setAssistantMode(mode);
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
    } catch {
      // La scelta vale comunque per la schermata corrente.
    }
  };

  const ask = async (text = question) => {
    const clean = text.trim();
    if (!clean || isReplying) return;
    const requestMode =
      isOnline && (typeof navigator === "undefined" || navigator.onLine) ? assistantMode : "local";
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
    const useCircularAssistant = !hasImmediateActionResponse && isCircularChatQuestion(clean);
    const useSchoolPolicyAssistant =
      !hasImmediateActionResponse && !useCircularAssistant && isSchoolPolicyQuestion(clean);
    const useGeneralApi =
      !hasImmediateActionResponse &&
      !useCircularAssistant &&
      !useSchoolPolicyAssistant &&
      requestMode === "api" &&
      !isAssistantSearchQuery(clean);
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
              : answerQuestion(clean, assistantData, loadSchedule(), now, v.interrogazioni, {
                  previousQuestion,
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
    setPendingAction(nextPendingAction);
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: clean }]);

    if (useCircularAssistant || useSchoolPolicyAssistant || useGeneralApi) {
      setIsReplying(true);
      try {
        let assistantMessage: AssistantChatMessage;
        if (useCircularAssistant) {
          const assistantResponse = await answerCircularChatQuestion(
            clean,
            assistantData.notifications,
            requestMode,
          );
          assistantMessage = {
            role: "assistant",
            text: assistantResponse ?? "Non ho trovato una circolare pertinente.",
          };
        } else if (useSchoolPolicyAssistant) {
          const schoolAnswer = await answerSchoolPolicyQuestion(clean, requestMode);
          assistantMessage = {
            role: "assistant",
            text: schoolAnswer.text,
            sources: schoolAnswer.sources,
          };
        } else {
          assistantMessage = { role: "assistant", text: await askGeneralQuestion(clean) };
        }
        setMessages((current) => [...current, assistantMessage]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "La risposta non è disponibile.";
        setMessages((current) => [...current, { role: "assistant", text: message }]);
      } finally {
        setIsReplying(false);
      }
      return;
    }

    setMessages((current) => [...current, { role: "assistant", text: response }]);
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
            Locale consulta i dati dell’app e cerca nei regolamenti ufficiali; API risponde a
            domande generali usando solo i documenti pertinenti.
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
            {isOnline && (
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
            : "API invia a Groq la domanda e solo gli estratti pertinenti del regolamento, della ricerca PDF utente (non verificata) o della circolare. Non allega automaticamente voti, assenze o cronologia; se scrivi dati personali nella domanda, li invia. Non legge pagine con login e non fa fallback automatico. I costi dipendono dal piano Groq: per zero spese, scegli Locale."}{" "}
          {!isOnline && (
            <span className="font-medium text-primary">Offline: disponibile solo Locale. </span>
          )}
          Verifica sempre eventuali aggiornamenti ufficiali della scuola.
        </p>
        <p className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          Ricerca rapida: scrivi “cerca algebra”, “trova circolare uscita” o una parola per trovare
          corrispondenze in voti, materie, compiti, note, avvisi, diario e interrogazioni.
        </p>
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

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
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
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Chiedi sui tuoi dati o sulle circolari…"
          aria-label="Domanda all'assistente"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!question.trim() || isReplying}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Invia domanda"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
