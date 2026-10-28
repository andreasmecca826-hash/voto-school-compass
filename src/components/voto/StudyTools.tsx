import { useRef, useState } from "react";
import {
  Download,
  FlipHorizontal2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/lib/voto/study-context";
import { parseFlashcards, wheelIndex, type PomodoroMode } from "@/lib/voto/study";
import { useVoto } from "@/lib/voto/store";

const FIELD = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm";

export function PomodoroTool() {
  const timer = useStudy();
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Fase Pomodoro">
        {(
          [
            ["focus", "Studio"],
            ["short", "Pausa breve"],
            ["long", "Pausa lunga"],
          ] as const
        ).map(([mode, label]) => (
          <Button
            key={mode}
            variant={timer.mode === mode ? "default" : "secondary"}
            className="px-1 text-xs"
            onClick={() => timer.selectMode(mode as PomodoroMode)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="relative mx-auto flex aspect-square w-60 max-w-full flex-col items-center justify-center rounded-full border-8 border-primary-soft">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {timer.mode === "focus" ? "Concentrazione" : "Pausa"}
        </span>
        <span role="timer" className="tabular my-3 font-display text-5xl font-semibold">
          {String(Math.floor(timer.seconds / 60)).padStart(2, "0")}:
          {String(timer.seconds % 60).padStart(2, "0")}
        </span>
        <span className="text-xs text-primary">{timer.completed} sessioni completate</span>
      </div>
      <div className="flex justify-center gap-2">
        <Button onClick={timer.toggle}>
          {timer.running ? <Pause /> : <Play />}
          {timer.running ? "Pausa" : "Avvia"}
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Azzera timer"
          title="Azzera timer"
          onClick={timer.reset}
        >
          <RotateCcw />
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        25 min studio · 5 min pausa · 15 min ogni 4 sessioni
      </p>
    </div>
  );
}

export function WheelTool() {
  const { data } = useVoto();
  const [text, setText] = useState(() => data.subjects.map((s) => s.name).join("\n"));
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
  const spin = () => {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    const index = wheelIndex(options.length, random / 4294967296);
    if (index === null) return;
    const selected = options[index];
    if (!selected) return;
    setSpinning(true);
    setResult(null);
    const next =
      rotation +
      1440 +
      ((360 - ((index + 0.5) * 360) / options.length - (rotation % 360) + 360) % 360);
    setRotation(next);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      setResult(selected);
      setSpinning(false);
    }, 1800);
  };
  return (
    <div className="space-y-4">
      <div className="relative mx-auto w-60 max-w-full">
        <span
          className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-xl text-primary"
          aria-hidden
        >
          ▼
        </span>
        <svg
          viewBox="0 0 240 240"
          className="w-full transition-transform duration-[1800ms] ease-out motion-reduce:transition-none"
          style={{ transform: `rotate(${rotation}deg)` }}
          role="img"
          aria-label="Ruota delle materie"
        >
          {options.map((option, index) => {
            const start = (index * 2 * Math.PI) / options.length - Math.PI / 2;
            const end = ((index + 1) * 2 * Math.PI) / options.length - Math.PI / 2;
            const mid = (start + end) / 2;
            return (
              <g key={index}>
                <path
                  d={
                    options.length === 1
                      ? "M120 0 A120 120 0 1 1 119.99 0 Z"
                      : `M120 120 L${120 + 118 * Math.cos(start)} ${120 + 118 * Math.sin(start)} A118 118 0 ${options.length === 1 ? 1 : 0} 1 ${120 + 118 * Math.cos(end)} ${120 + 118 * Math.sin(end)} Z`
                  }
                  className={
                    index % 3 === 0
                      ? "fill-primary-soft stroke-primary"
                      : index % 3 === 1
                        ? "fill-success-soft stroke-success"
                        : "fill-surface stroke-border"
                  }
                />
                <text
                  x={120 + 76 * Math.cos(mid)}
                  y={120 + 76 * Math.sin(mid)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground text-[9px]"
                >
                  {option.slice(0, 13)}
                </text>
              </g>
            );
          })}
          <circle cx="120" cy="120" r="17" className="fill-background stroke-border" />
        </svg>
      </div>
      <div
        aria-live="polite"
        className="flex min-h-12 items-center justify-center text-center font-display text-xl font-semibold text-primary"
      >
        {spinning ? "Estrazione…" : (result ?? "Cosa ripassiamo?")}
      </div>
      <Button className="w-full" onClick={spin} disabled={spinning || options.length === 0}>
        <Shuffle />
        Gira la ruota
      </Button>
      <label className="block text-xs text-muted-foreground">
        Materie o argomenti · uno per riga
        <textarea
          value={text}
          disabled={spinning}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          rows={5}
          className="mt-2 w-full rounded-lg border border-input bg-card p-3 text-sm"
        />
      </label>
    </div>
  );
}

export function FlashcardsTool() {
  const { cards, setCards } = useStudy();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [subject, setSubject] = useState("");
  const [filter, setFilter] = useState("all");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const filtered = cards.filter(
    (c) => (filter === "all" || c.subject === filter) && !known.includes(c.id),
  );
  const card = filtered[index % Math.max(1, filtered.length)];
  const saveCard = () => {
    if (!question.trim() || !answer.trim()) return;
    const next = {
      id: editing ?? crypto.randomUUID(),
      question: question.trim(),
      answer: answer.trim(),
      subject: subject.trim(),
    };
    setCards((all) => (editing ? all.map((c) => (c.id === editing ? next : c)) : [...all, next]));
    setQuestion("");
    setAnswer("");
    setSubject("");
    setEditing(null);
  };
  const exportCards = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "voto-flashcard.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={!cards.length} onClick={exportCards}>
          <Download />
          Esporta
        </Button>
        <Button variant="outline" size="sm" onClick={() => file.current?.click()}>
          <Upload />
          Importa
        </Button>
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {cards.length} carte
        </span>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Importa flashcard"
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          if (!selected) return;
          try {
            if (selected.size > 5 * 1024 * 1024) throw new Error("File troppo grande.");
            const imported = parseFlashcards(await selected.text());
            setCards(imported);
            setKnown([]);
            setIndex(0);
            setFlipped(false);
            toast.success("Flashcard importate");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Importazione non riuscita");
          }
          e.target.value = "";
        }}
      />
      <p className="text-xs text-muted-foreground">
        Carte della sessione: esportale per conservarle e reimportarle in seguito.
      </p>
      <select
        aria-label="Materia flashcard"
        value={filter}
        onChange={(e) => {
          setFilter(e.target.value);
          setIndex(0);
          setFlipped(false);
        }}
        className={FIELD}
      >
        <option value="all">Tutte le materie</option>
        {[...new Set(cards.map((c) => c.subject))].map((s) => (
          <option key={s} value={s}>
            {s || "Senza materia"}
          </option>
        ))}
      </select>
      {card ? (
        <>
          <Button
            variant="outline"
            onClick={() => setFlipped(!flipped)}
            className="flex min-h-48 w-full flex-col gap-3 whitespace-normal break-words px-5 py-6 text-center"
          >
            <span className="text-[10px] uppercase text-muted-foreground">
              {flipped ? "Risposta" : "Domanda"} · {card.subject || "Generale"}
            </span>
            <span className="text-lg">{flipped ? card.answer : card.question}</span>
            <FlipHorizontal2 className="text-primary" />
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIndex(index + 1);
                setFlipped(false);
              }}
            >
              Da ripassare
            </Button>
            <Button
              onClick={() => {
                setKnown([...known, card.id]);
                setFlipped(false);
              }}
            >
              La so
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {known.length} imparate · {filtered.length} da ripassare
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQuestion(card.question);
                  setAnswer(card.answer);
                  setSubject(card.subject);
                  setEditing(card.id);
                }}
              >
                Modifica
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Elimina flashcard"
                title="Elimina flashcard"
                onClick={() => {
                  setCards(cards.filter((c) => c.id !== card.id));
                  setFlipped(false);
                }}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {cards.length ? "Ripasso completato!" : "Il tuo mazzo è ancora vuoto."}
        </p>
      )}
      {known.length > 0 && (
        <Button
          variant="outline"
          onClick={() => {
            setKnown([]);
            setIndex(0);
          }}
        >
          <RotateCcw />
          Ricomincia ripasso
        </Button>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveCard();
        }}
        className="space-y-2 border-t border-border pt-4"
      >
        <h3 className="text-sm font-semibold">{editing ? "Modifica carta" : "Nuova flashcard"}</h3>
        <input
          aria-label="Materia della nuova flashcard"
          placeholder="Materia"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={FIELD}
          maxLength={100}
        />
        <textarea
          aria-label="Domanda"
          placeholder="Domanda"
          required
          maxLength={2000}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full rounded-lg border border-input bg-card p-3 text-sm"
        />
        <textarea
          aria-label="Risposta"
          placeholder="Risposta"
          required
          maxLength={4000}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full rounded-lg border border-input bg-card p-3 text-sm"
        />
        <Button type="submit" disabled={!question.trim() || !answer.trim()} className="w-full">
          <Plus />
          {editing ? "Salva modifiche" : "Aggiungi carta"}
        </Button>
        {editing && (
          <Button
            variant="ghost"
            onClick={() => {
              setEditing(null);
              setQuestion("");
              setAnswer("");
              setSubject("");
            }}
          >
            Annulla
          </Button>
        )}
      </form>
    </div>
  );
}
