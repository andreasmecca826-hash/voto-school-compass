import { createFileRoute } from "@tanstack/react-router";
import { Bot, Send, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { answerQuestion } from "@/lib/voto/assistant";
import { useVoto } from "@/lib/voto/store";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente — VOTO." },
      { name: "description", content: "Assistente locale per voti, compiti, diario e presenze." },
    ],
  }),
  component: Assistant,
});

const SUGGESTIONS = [
  "Quanto devo prendere in Inglese per arrivare a 8?",
  "Qual è la mia media generale?",
  "Qual è la materia con la media più bassa?",
  "Quanti compiti devo ancora fare?",
  "Quante assenze ho?",
];

function Assistant() {
  const v = useVoto();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Ciao! Sono l’assistente locale di VOTO. Posso aiutarti con medie, voti necessari, compiti, Diario, assenze e ritardi. I dati restano sul dispositivo.",
    },
  ]);

  const ask = (text = question) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: clean },
      { role: "assistant", text: answerQuestion(clean, v.data) },
    ]);
    setQuestion("");
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

      <div className="mt-5 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
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
          placeholder="Scrivi una domanda..."
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
