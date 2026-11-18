import { useMemo, useState } from "react";
import { Camera, Check, Clipboard, Copy, LoaderCircle, Plus, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useVoto } from "@/lib/voto/store";
import { DEFAULT_PREPARATION, type Interrogazione } from "@/lib/voto/interrogazioni";

const FIELD = "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm";

function formatCountdown(date: string) {
  const target = new Date(`${date.slice(0, 10)}T08:00:00`).getTime();
  const distance = target - Date.now();
  if (!Number.isFinite(target) || distance <= 0) return "È oggi o è già passata";
  const days = Math.floor(distance / 86_400_000);
  const hours = Math.floor((distance % 86_400_000) / 3_600_000);
  return `${days} ${days === 1 ? "giorno" : "giorni"} e ${hours} ore`;
}

export function InterrogationPrepTool() {
  const v = useVoto();
  const [selectedId, setSelectedId] = useState("");
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [topics, setTopics] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const selected = v.interrogazioni.find((item) => item.id === selectedId);
  const active: Interrogazione | null =
    selected ??
    (subject && date
      ? {
          id: "draft",
          subject,
          date,
          completed: false,
          checklist: DEFAULT_PREPARATION.map((item) => ({ ...item })),
        }
      : null);
  const pending = active?.checklist.filter((item) => !item.done).length ?? 0;
  const randomQuestion = questions.length
    ? questions[Math.floor(Math.random() * questions.length)]
    : null;

  function selectInterrogation(id: string) {
    const item = v.interrogazioni.find((entry) => entry.id === id);
    setSelectedId(id);
    if (item) {
      setSubject(item.subject);
      setDate(item.date.slice(0, 10));
      setTopics(item.notes ?? "");
    }
  }

  function addQuestion() {
    const value = question.trim().slice(0, 240);
    if (!value || questions.length >= 30) return;
    setQuestions((current) => [...current, value]);
    setQuestion("");
  }

  function toggleChecklist(id: string) {
    if (active?.id === "draft") return;
    v.toggleInterrogazionePrep(active?.id ?? "", id);
  }

  return (
    <div className="space-y-4">
      <section className="card-surface space-y-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold">Prima dell’interrogazione</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Una schermata rapida con argomenti, checklist, obiettivo e domande da ripassare.
          </p>
        </div>
        {v.interrogazioni.length > 0 && (
          <label className="block space-y-1 text-xs font-medium">
            Usa un’interrogazione già registrata
            <select
              className={FIELD}
              value={selectedId}
              onChange={(event) => selectInterrogation(event.target.value)}
            >
              <option value="">Nuova preparazione</option>
              {v.interrogazioni.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subject} · {item.date.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block space-y-1 text-xs font-medium">
            Materia
            <input
              className={FIELD}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Es. Storia"
            />
          </label>
          <label className="block space-y-1 text-xs font-medium">
            Data
            <input
              className={FIELD}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>
        {active && (
          <div className="rounded-xl bg-primary-soft p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Tempo rimanente
            </p>
            <p className="mt-1 font-display text-xl font-bold">{formatCountdown(active.date)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {active.subject} ·{" "}
              {pending ? `${pending} attività da completare` : "Checklist completata"}
            </p>
          </div>
        )}
        <label className="block space-y-1 text-xs font-medium">
          Argomenti e appunti
          <textarea
            className="min-h-24 w-full rounded-lg border border-input bg-card p-3 text-sm"
            value={topics}
            onChange={(event) => setTopics(event.target.value.slice(0, 4000))}
            placeholder="Capitoli, formule, parole chiave…"
          />
        </label>
        <div className="space-y-2">
          <p className="text-xs font-semibold">Checklist</p>
          {(active?.checklist ?? DEFAULT_PREPARATION).map((item) => (
            <label
              key={item.id}
              className="flex min-h-10 items-center gap-2 rounded-lg bg-surface px-3 text-xs"
            >
              <input
                type="checkbox"
                checked={item.done}
                disabled={!active || active.id === "draft"}
                onChange={() => toggleChecklist(item.id)}
              />
              <span className={item.done ? "text-muted-foreground line-through" : ""}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </section>
      <section className="card-surface space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Domande di ripasso</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Inserisci le domande che vuoi saper spiegare a voce.
            </p>
          </div>
          <Shuffle className="h-4 w-4 text-primary" />
        </div>
        <div className="flex gap-2">
          <input
            className={FIELD}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addQuestion();
              }
            }}
            placeholder="Es. Quali sono le cause…"
            maxLength={240}
          />
          <Button
            type="button"
            size="icon"
            onClick={addQuestion}
            disabled={!question.trim()}
            aria-label="Aggiungi domanda"
          >
            <Plus />
          </Button>
        </div>
        {randomQuestion && (
          <div className="rounded-xl border border-primary/20 bg-primary-soft p-3">
            <p className="text-[10px] font-semibold uppercase text-primary">Domanda del momento</p>
            <p className="mt-1 text-sm font-medium">{randomQuestion}</p>
          </div>
        )}
        {questions.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {questions.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-lg bg-surface px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={!questions.length}
          onClick={() => {
            const value = questions[Math.floor(Math.random() * questions.length)];
            if (value && navigator.clipboard) {
              void navigator.clipboard
                .writeText(value)
                .then(() => toast.success("Domanda copiata"));
            }
          }}
        >
          <Copy /> Copia una domanda
        </Button>
      </section>
      <p className="flex gap-2 rounded-lg bg-surface p-3 text-[10px] leading-4 text-muted-foreground">
        <Check className="h-3.5 w-3.5 shrink-0 text-success" /> La preparazione e le domande restano
        sul dispositivo.
      </p>
    </div>
  );
}

export function PhotoImportTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function extract() {
    if (!file) return;
    setBusy(true);
    setError("");
    setText("");
    setProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("ita", 1, {
        logger: (message) => {
          if (message.status === "recognizing text")
            setProgress(Math.round(message.progress * 100));
        },
      });
      try {
        const result = await worker.recognize(file);
        setText(result.data.text.trim() || "Nessun testo riconosciuto.");
      } finally {
        await worker.terminate();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "OCR non riuscito.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Testo copiato");
    } catch {
      toast.error("Copia non disponibile: seleziona il testo manualmente.");
    }
  }

  return (
    <div className="space-y-4">
      <section className="card-surface space-y-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold">Importa da foto</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Scegli una foto dalla galleria oppure scattala al momento, se il dispositivo lo
            consente. L’OCR estrae il testo direttamente nel browser.
          </p>
        </div>
        <label className="block space-y-1 text-xs font-medium">
          Foto o screenshot
          <input
            className="block min-h-12 w-full rounded-lg border border-input bg-card px-2 py-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:font-semibold file:text-primary"
            type="file"
            accept="image/*"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setText("");
              setError("");
            }}
          />
        </label>
        {file && (
          <p className="break-all text-[11px] text-muted-foreground">
            {file.name} · {(file.size / 1_048_576).toFixed(1)} MB
          </p>
        )}
        <Button className="w-full" disabled={!file || busy} onClick={extract}>
          {busy ? (
            <>
              <LoaderCircle className="animate-spin" /> OCR in corso {progress}%
            </>
          ) : (
            <>
              <Camera /> Leggi la foto
            </>
          )}
        </Button>
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </p>
        )}
        {text && (
          <>
            <label className="block space-y-1 text-xs font-medium">
              Testo riconosciuto
              <textarea
                className="min-h-52 w-full rounded-lg border border-input bg-card p-3 text-xs leading-5"
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
            </label>
            <Button variant="outline" className="w-full" onClick={copy}>
              <Clipboard /> Copia testo
            </Button>
          </>
        )}
      </section>
      <p className="text-[10px] leading-4 text-muted-foreground">
        L’immagine non viene caricata su server: il riconoscimento avviene localmente. Verifica
        sempre numeri, date e formule.
      </p>
    </div>
  );
}
