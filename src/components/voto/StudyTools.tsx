import { useEffect, useRef, useState } from "react";
import {
  Download,
  FlipHorizontal2,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/lib/voto/study-context";
import {
  DEFAULT_WHEEL_COLORS,
  isWheelColor,
  normalizeWheelSettings,
  parseFlashcards,
  wheelIndex,
  wheelTextColor,
} from "@/lib/voto/study";
import { KEYS, load, save } from "@/lib/voto/storage";
import { useVoto } from "@/lib/voto/store";

const FIELD = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm";
const WHEEL_PALETTES = [
  { name: "Alba", colors: ["#FDBA74", "#6EE7B7"] },
  { name: "Lavanda", colors: ["#C4B5FD", "#93C5FD"] },
  { name: "Mare", colors: ["#67E8F9", "#FDE68A"] },
  { name: "Fragola", colors: ["#FDA4AF", "#F9A8D4"] },
] as const;

export function WheelTool() {
  const { data } = useVoto();
  const [settings, setSettings] = useState(() =>
    normalizeWheelSettings(
      load<unknown>(KEYS.studyWheel, null),
      data.subjects.map((subject) => subject.name),
    ),
  );
  const [newSubject, setNewSubject] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = settings.subjects;
  const cleanNewSubject = newSubject.trim().replace(/\s+/g, " ").slice(0, 40);
  const subjectExists = options.some(
    (subject) => subject.toLocaleLowerCase() === cleanNewSubject.toLocaleLowerCase(),
  );
  const canAddSubject = Boolean(cleanNewSubject) && !subjectExists && options.length < 50;
  const colorForSubject = (subject: string, index: number) =>
    settings.subjectColors[subject] ?? settings.colors[index % 2] ?? DEFAULT_WHEEL_COLORS[0];

  useEffect(() => {
    save(KEYS.studyWheel, settings);
  }, [settings]);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  const addSubject = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canAddSubject || spinning) return;
    setSettings((current) => ({ ...current, subjects: [...current.subjects, cleanNewSubject] }));
    setNewSubject("");
    setResult(null);
  };

  const removeSubject = (subjectToRemove: string) => {
    setSettings((current) => {
      const subjectColors = { ...current.subjectColors };
      delete subjectColors[subjectToRemove];
      return {
        ...current,
        subjects: current.subjects.filter((subject) => subject !== subjectToRemove),
        subjectColors,
      };
    });
    setResult(null);
  };

  const setWheelColor = (index: 0 | 1, color: string) => {
    if (!isWheelColor(color)) return;
    setSettings((current) => {
      const colors: [string, string] = [...current.colors];
      colors[index] = color;
      return { ...current, colors };
    });
  };

  const setSubjectColor = (subject: string, color: string) => {
    if (!isWheelColor(color)) return;
    setSettings((current) => ({
      ...current,
      subjectColors: { ...current.subjectColors, [subject]: color },
    }));
  };

  const resetSubjectColor = (subject: string) => {
    setSettings((current) => {
      const subjectColors = { ...current.subjectColors };
      delete subjectColors[subject];
      return { ...current, subjectColors };
    });
  };

  const spin = () => {
    const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
    const index = wheelIndex(options.length, random / 4294967296);
    if (index === null || spinning) return;
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
      <section className="card-surface overflow-hidden p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold">È ora di ripassare</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Lascia scegliere alla ruota la prossima materia.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {options.length} / 50
          </span>
        </div>

        <div className="relative mx-auto mb-3 w-64 max-w-[82%] pt-3">
          <span
            className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl leading-none text-primary drop-shadow-sm"
            aria-hidden="true"
          >
            ▼
          </span>
          <svg
            viewBox="0 0 240 240"
            className="w-full drop-shadow-lg transition-transform duration-[1800ms] ease-out motion-reduce:transition-none"
            style={{ transform: `rotate(${rotation}deg)` }}
            role="img"
            aria-label={options.length ? `Ruota con ${options.length} materie` : "Ruota vuota"}
          >
            {options.length === 1 && (
              <circle cx="120" cy="120" r="118" fill={colorForSubject(options[0] ?? "", 0)} />
            )}
            {options.length > 1 &&
              options.map((option, index) => {
                const start = (index * 2 * Math.PI) / options.length - Math.PI / 2;
                const end = ((index + 1) * 2 * Math.PI) / options.length - Math.PI / 2;
                const mid = (start + end) / 2;
                const color = colorForSubject(option, index);
                const label = options.length <= 12 ? option.slice(0, 11) : String(index + 1);
                const labelX = 120 + 76 * Math.cos(mid);
                const labelY = 120 + 76 * Math.sin(mid);
                return (
                  <g key={option}>
                    <path
                      d={`M120 120 L${120 + 118 * Math.cos(start)} ${120 + 118 * Math.sin(start)} A118 118 0 0 1 ${120 + 118 * Math.cos(end)} ${120 + 118 * Math.sin(end)} Z`}
                      fill={color}
                      stroke="var(--background)"
                      strokeWidth="2"
                    />
                    <text
                      x={labelX}
                      y={labelY}
                      transform={`rotate(${-rotation} ${labelX} ${labelY})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={wheelTextColor(color)}
                      className="text-[9px] font-semibold"
                    >
                      {label}
                    </text>
                  </g>
                );
              })}
            {options.length === 1 && (
              <text
                x="120"
                y="55"
                transform={`rotate(${-rotation} 120 55)`}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={wheelTextColor(colorForSubject(options[0] ?? "", 0))}
                className="text-[10px] font-semibold"
              >
                {options[0]?.slice(0, 13)}
              </text>
            )}
            <circle
              cx="120"
              cy="120"
              r="24"
              fill="var(--card)"
              stroke="var(--background)"
              strokeWidth="4"
            />
            <text
              x="120"
              y="120"
              transform={`rotate(${-rotation} 120 120)`}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--foreground)"
              className="text-[8px] font-bold"
            >
              VAI
            </text>
          </svg>
        </div>

        <div
          aria-live="polite"
          className="mb-3 flex min-h-[4.25rem] flex-col items-center justify-center rounded-xl bg-surface px-3 py-2 text-center"
        >
          {spinning ? (
            <span className="text-sm font-medium text-muted-foreground">
              La ruota sta scegliendo…
            </span>
          ) : result ? (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Oggi si ripassa
              </span>
              <span className="font-display text-xl font-bold text-primary">{result}</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {options.length
                ? "Pronto per la prossima materia?"
                : "Aggiungi una materia per iniziare."}
            </span>
          )}
        </div>

        <Button className="w-full" onClick={spin} disabled={spinning || options.length === 0}>
          <Shuffle />
          {spinning ? "Estrazione in corso…" : "Gira la ruota"}
        </Button>
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="wheel-subjects-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 id="wheel-subjects-title" className="text-sm font-semibold">
              Le tue materie
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Aggiungile qui; usa il campione per scegliere un colore e × per rimuoverle.
            </p>
          </div>
          <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        </div>

        <form onSubmit={addSubject} className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="wheel-new-subject" className="mb-1 block text-xs font-medium">
              Nuova materia o argomento
            </label>
            <input
              id="wheel-new-subject"
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              disabled={spinning || options.length >= 50}
              maxLength={40}
              placeholder="Es. Matematica"
              className={FIELD}
            />
          </div>
          <Button
            type="submit"
            disabled={spinning || !canAddSubject}
            className="min-h-11 shrink-0 px-3"
          >
            <Plus />
            Aggiungi
          </Button>
        </form>

        {subjectExists && cleanNewSubject && (
          <p className="text-xs text-warning" role="status">
            Questa materia è già nella ruota.
          </p>
        )}

        {options.length ? (
          <ul className="space-y-2" aria-label="Materie nella ruota">
            {options.map((subject, index) => (
              <li
                key={subject}
                className="flex min-h-12 items-center gap-2 rounded-xl border border-border bg-surface px-2"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <span className="sr-only">Colore per {subject}</span>
                  <input
                    type="color"
                    aria-label={`Colore per ${subject}`}
                    value={colorForSubject(subject, index)}
                    disabled={spinning}
                    onChange={(event) => setSubjectColor(subject, event.target.value)}
                    className="h-8 w-9 shrink-0 cursor-pointer rounded border border-input bg-transparent p-0.5"
                  />
                  <span className="min-w-0 truncate text-xs font-medium">{subject}</span>
                </label>
                {settings.subjectColors[subject] && (
                  <button
                    type="button"
                    aria-label={`Ripristina colore predefinito per ${subject}`}
                    title="Usa il colore della palette"
                    disabled={spinning}
                    onClick={() => resetSubjectColor(subject)}
                    className="press inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Rimuovi ${subject}`}
                  title={`Rimuovi ${subject}`}
                  disabled={spinning}
                  onClick={() => removeSubject(subject)}
                  className="press inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface/60 px-3 py-4 text-center">
            <p className="text-sm font-medium">La ruota è ancora vuota</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Scrivi una materia qui sopra e premi «Aggiungi».
            </p>
          </div>
        )}
      </section>

      <section className="card-surface space-y-3 p-4" aria-labelledby="wheel-colors-title">
        <div>
          <h3 id="wheel-colors-title" className="text-sm font-semibold">
            Colori predefiniti
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Scegli la palette di base; i colori impostati sulle singole materie restano
            indipendenti.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {WHEEL_PALETTES.map((palette) => {
            const selected = palette.colors.every(
              (color, index) => color.toLowerCase() === settings.colors[index]?.toLowerCase(),
            );
            return (
              <button
                key={palette.name}
                type="button"
                aria-label={`Palette ${palette.name}`}
                aria-pressed={selected}
                disabled={spinning}
                onClick={() =>
                  setSettings((current) => ({ ...current, colors: [...palette.colors] }))
                }
                className={`press flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors ${
                  selected
                    ? "border-primary bg-primary-soft text-foreground"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                <span className="flex -space-x-1" aria-hidden="true">
                  {palette.colors.map((color) => (
                    <span
                      key={color}
                      className="h-4 w-4 rounded-full border-2 border-card"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </span>
                {palette.name}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          {settings.colors.map((color, index) => (
            <label key={index} className="block text-xs font-medium">
              Colore {index === 0 ? "A" : "B"}
              <span className="mt-1.5 flex h-11 items-center gap-2 rounded-lg border border-input bg-card px-2">
                <input
                  type="color"
                  aria-label={`Colore ${index === 0 ? "A" : "B"} della ruota`}
                  value={color}
                  disabled={spinning}
                  onChange={(event) => setWheelColor(index as 0 | 1, event.target.value)}
                  className="h-8 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="font-mono text-[11px] text-muted-foreground">
                  {color.toUpperCase()}
                </span>
              </span>
            </label>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={
            spinning ||
            settings.colors.every((color, index) => color === DEFAULT_WHEEL_COLORS[index])
          }
          onClick={() =>
            setSettings((current) => ({ ...current, colors: [...DEFAULT_WHEEL_COLORS] }))
          }
          className="px-0 text-xs text-muted-foreground"
        >
          <RotateCcw />
          Ripristina i colori
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Materie e colori vengono salvati solo su questo dispositivo.
        </p>
      </section>
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
