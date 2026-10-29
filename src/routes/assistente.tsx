import { createFileRoute } from "@tanstack/react-router";
import { Bot, Search, Send, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAssignmentActionIntent,
  type AssignmentConfirmation,
} from "@/lib/voto/assistant-actions";
import { answerQuestion, scheduleDayToClear } from "@/lib/voto/assistant";
import { pickAssistantSuggestions } from "@/lib/voto/assistant-suggestions";
import { clearScheduleDay, DAYS, loadSchedule } from "@/lib/voto/orario";
import { useStudy } from "@/lib/voto/study-context";
import { useClock, useVoto } from "@/lib/voto/store";

type PendingAction =
  | { type: "clear-day"; day: NonNullable<ReturnType<typeof scheduleDayToClear>> }
  | { type: "assignment"; action: AssignmentConfirmation };

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente — VOTO." },
      {
        name: "description",
        content: "Assistente locale per dati scolastici, riepiloghi giornalieri e Studio Lab.",
      },
    ],
  }),
  component: Assistant,
});

function Assistant() {
  const v = useVoto();
  const study = useStudy();
  const now = useClock();
  const [question, setQuestion] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Ciao! Sono l’assistente locale di VOTO. Chiedimi informazioni sui tuoi dati scolastici: tutto resta su questo dispositivo.",
    },
  ]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    setSuggestions(pickAssistantSuggestions());
  }, []);

  const ask = (text = question) => {
    const clean = text.trim();
    if (!clean) return;
    const dayToClear = scheduleDayToClear(clean);
    const assistantData = {
      ...v.data,
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
    const nextPendingAction: PendingAction | null = dayToClear
      ? { type: "clear-day", day: dayToClear }
      : assignmentIntent?.kind === "confirm"
        ? { type: "assignment", action: assignmentIntent.action }
        : null;
    const response = dayToClear
      ? `Posso cancellare tutte le lezioni dell’orario di ${DAYS.find((day) => day.id === dayToClear)?.label}. Vuoi confermare?`
      : assignmentIntent?.kind === "confirm"
        ? `Posso ${assignmentIntent.action.completed ? "segnare come completato" : "riaprire"} il compito “${assignmentIntent.action.title}”${assignmentIntent.action.subject ? ` di ${assignmentIntent.action.subject}` : ""}. Confermi? Non cambierò nulla finché non confermi. La modifica resta locale a VOTO e non aggiorna DidUP.`
        : assignmentIntent?.kind === "clarify" || assignmentIntent?.kind === "already"
          ? assignmentIntent.message
          : answerQuestion(clean, assistantData, loadSchedule(), now, v.interrogazioni, {
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
            });
    setMessages((current) => [
      ...current,
      { role: "user", text: clean },
      { role: "assistant", text: response },
    ]);
    setPendingAction(nextPendingAction);
    setQuestion("");
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    let result: string;
    if (pendingAction.type === "clear-day") {
      clearScheduleDay(loadSchedule(), pendingAction.day);
      const label = DAYS.find((day) => day.id === pendingAction.day)?.label;
      result = `Fatto: ho cancellato tutte le lezioni dell’orario di ${label}.`;
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
            Risposte locali sui tuoi dati scolastici.
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Bot className="h-5 w-5" />
        </span>
      </div>

      <section className="card-surface mt-5 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Nessun dato inviato online
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          L’assistente usa solo i dati già caricati nell’app e fa i calcoli direttamente sul
          dispositivo.
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
              {message.text}
            </div>
            {message.role === "user" && (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-muted-foreground">
                <UserRound className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}
      </div>

      {pendingAction && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-xs">
          <span className="flex-1">
            {pendingAction.type === "clear-day" ? (
              <>
                Confermi la cancellazione dell’orario di{" "}
                <strong>{DAYS.find((day) => day.id === pendingAction.day)?.label}</strong>?
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
            className="press rounded-full border border-border px-3 py-2 text-left text-[11px] text-muted-foreground"
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
          placeholder="Fai una domanda o cerca nei tuoi dati..."
          aria-label="Domanda all'assistente"
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!question.trim()}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Invia domanda"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
