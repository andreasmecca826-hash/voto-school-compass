import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calculator,
  CalendarClock,
  CalendarX2,
  Clock3,
  FileText,
  History,
  Percent,
  QrCode,
  Ruler,
  Search,
  Scale,
  Share2,
  Sparkles,
  Table2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UniversalCalculationPanel } from "@/components/voto/UniversalCalculationPanel";
import { UniversalCreationPanel } from "@/components/voto/UniversalCreationPanel";
import { ClassroomSeatingTool } from "@/components/voto/ClassroomSeatingTool";
import type { UniversalToolId } from "@/lib/voto/universal-calculator";

const HISTORY_KEY = "voto.studio.universal-calculator.history.v1";
const HISTORY_LIMIT = 12;

type ToolId = UniversalToolId;
type Category = "Tutti" | "Calcoli" | "Conversioni" | "Documenti e creazione";

type HistoryEntry = {
  id: string;
  toolId: ToolId;
  toolTitle: string;
  calculation: string;
  result: string;
  createdAt: string;
};

const TOOLS: {
  id: ToolId;
  title: string;
  description: string;
  category: Exclude<Category, "Tutti">;
  keywords: string;
  icon: typeof Calculator;
  tone: string;
}[] = [
  {
    id: "scientific",
    title: "Calcolatrice scientifica",
    description: "Parentesi, potenze, radici, logaritmi e trigonometria",
    category: "Calcoli",
    keywords: "somma sottrazione moltiplicazione divisione sin cos tan pi percentuale",
    icon: Calculator,
    tone: "text-primary",
  },
  {
    id: "fractions",
    title: "Calcolatore frazioni",
    description: "Esegui operazioni e semplifica il risultato",
    category: "Calcoli",
    keywords: "numeratore denominatore semplificazione",
    icon: Scale,
    tone: "text-success",
  },
  {
    id: "vat",
    title: "Calcolatore IVA",
    description: "Ricava imposta e totale dall’imponibile",
    category: "Calcoli",
    keywords: "aliquota imposta imponibile totale",
    icon: Percent,
    tone: "text-warning",
  },
  {
    id: "discount",
    title: "Calcolatore sconti",
    description: "Calcola risparmio e prezzo finale",
    category: "Calcoli",
    keywords: "saldi percentuale prezzo",
    icon: Percent,
    tone: "text-danger",
  },
  {
    id: "average",
    title: "Calcolo media",
    description: "Calcola rapidamente la media semplice di più numeri",
    category: "Calcoli",
    keywords: "media voti numeri average scuola",
    icon: Calculator,
    tone: "text-success",
  },
  {
    id: "absence",
    title: "Calcolo assenze",
    description: "Controlla ore residue e simula nuove assenze",
    category: "Calcoli",
    keywords: "assenze ore limite giornate scuola",
    icon: CalendarX2,
    tone: "text-warning",
  },
  {
    id: "interval",
    title: "Calcolo intervalli",
    description: "Differenza tra orari, anche oltre mezzanotte",
    category: "Calcoli",
    keywords: "ore minuti durata pausa lavoro",
    icon: CalendarClock,
    tone: "text-primary",
  },
  {
    id: "converter",
    title: "Convertitore universale",
    description: "Lunghezze, pesi, volumi, temperature, velocità e valute",
    category: "Conversioni",
    keywords:
      "unità di misura metri chilometri grammi litri gradi celsius fahrenheit euro dollari cambio",
    icon: Ruler,
    tone: "text-success",
  },
  {
    id: "qr",
    title: "Generatore QR",
    description: "Crea e scarica un codice QR da testo o link",
    category: "Documenti e creazione",
    keywords: "qrcode codice scansione link url immagine",
    icon: QrCode,
    tone: "text-primary",
  },
  {
    id: "documents",
    title: "Lettore documenti",
    description: "Estrai testo da PDF, Word, testo e immagini",
    category: "Documenti e creazione",
    keywords: "pdf docx txt png jpg jpeg webp ocr scansione",
    icon: FileText,
    tone: "text-warning",
  },
  {
    id: "tables",
    title: "Generatore tabelle",
    description: "Crea una tabella e scaricala in CSV",
    category: "Documenti e creazione",
    keywords: "righe colonne csv foglio dati esporta excel",
    icon: Table2,
    tone: "text-success",
  },
  {
    id: "share",
    title: "Condivisione sicura compiti",
    description: "Condividi solo il compito scelto, senza voti o dati dell’app",
    category: "Documenti e creazione",
    keywords: "condividi compito messaggio privacy share",
    icon: Share2,
    tone: "text-primary",
  },
  {
    id: "classroom",
    title: "Piantina della classe",
    description: "Disponi i banchi e assegna un posto a ogni nome",
    category: "Documenti e creazione",
    keywords: "classe banchi posti studenti piantina aula",
    icon: Table2,
    tone: "text-primary",
  },
];

const CATEGORIES: Category[] = ["Tutti", "Calcoli", "Conversioni", "Documenti e creazione"];
const VALID_TOOL_IDS = new Set<ToolId>(TOOLS.map(({ id }) => id));

function loadHistory(): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is HistoryEntry =>
          !!item &&
          typeof item === "object" &&
          VALID_TOOL_IDS.has((item as HistoryEntry).toolId) &&
          typeof (item as HistoryEntry).calculation === "string" &&
          typeof (item as HistoryEntry).result === "string" &&
          typeof (item as HistoryEntry).createdAt === "string",
      )
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function UniversalCalculator() {
  const [tool, setTool] = useState<ToolId | null>(null);
  const [category, setCategory] = useState<Category>("Tutti");
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // I calcoli continuano a funzionare anche se lo storage non è disponibile.
    }
  }, [history, storageReady]);

  const filteredTools = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("it-IT");
    return TOOLS.filter((item) => {
      const matchesCategory = category === "Tutti" || item.category === category;
      const searchableText = `${item.title} ${item.description} ${item.keywords}`.toLocaleLowerCase(
        "it-IT",
      );
      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [category, search]);

  function recordCalculation(toolId: ToolId, calculation: string, result: string) {
    const toolTitle = TOOLS.find((item) => item.id === toolId)?.title ?? "Calcolo";
    setHistory((current) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          toolId,
          toolTitle,
          calculation,
          result,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ].slice(0, HISTORY_LIMIT),
    );
  }

  return (
    <div className="space-y-4">
      {tool ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setTool(null)} className="pl-0">
            <ArrowLeft /> Tutti gli strumenti
          </Button>
          {tool === "classroom" ? (
            <ClassroomSeatingTool />
          ) : tool === "scientific" ||
          tool === "converter" ||
          tool === "interval" ||
          tool === "fractions" ||
          tool === "vat" ||
          tool === "discount" ? (
            <UniversalCalculationPanel tool={tool} onCalculation={recordCalculation} />
          ) : (
            <UniversalCreationPanel tool={tool} />
          )}
        </>
      ) : (
        <>
          <section className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft/70 via-card to-card p-4 shadow-sm">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Strumenti tuttofare
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold">Calcolatore universale</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Calcoli, conversioni e piccoli strumenti, in un unico posto. La cronologia resta su
              questo dispositivo.
            </p>
          </section>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Cerca strumenti"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca: IVA, chilometri, QR…"
              className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div
            role="group"
            aria-label="Categorie strumenti"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
                className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  category === item
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <section aria-label="Strumenti disponibili" className="space-y-2">
            {filteredTools.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nessuno strumento corrisponde alla ricerca.
              </p>
            ) : (
              filteredTools.map(
                ({ id, title, description, category: toolCategory, icon: Icon, tone }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setTool(id)}
                    className="press flex min-h-[76px] w-full items-center gap-3 rounded-xl border border-border bg-card p-3.5 text-left shadow-sm"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface ${tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{title}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                        {description}
                      </span>
                      <span className="mt-1 block text-[10px] font-medium text-primary/80">
                        {toolCategory}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-muted-foreground">
                      ›
                    </span>
                  </button>
                ),
              )
            )}
          </section>

          <section className="card-surface space-y-3 p-4" aria-label="Cronologia dei calcoli">
            <div className="flex items-center justify-between gap-3">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-primary" /> Cronologia
              </h4>
              {history.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
                  <Trash2 className="h-3.5 w-3.5" /> Cancella
                </Button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                I calcoli che esegui compariranno qui, salvati solo su questo dispositivo.
              </p>
            ) : (
              <ol className="space-y-2">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded-lg bg-surface px-3 py-2.5">
                    <p className="text-[10px] text-muted-foreground">{entry.toolTitle}</p>
                    <p className="mt-0.5 break-words text-xs">{entry.calculation}</p>
                    <p className="mt-1 break-words text-sm font-semibold text-primary">
                      {entry.result}
                    </p>
                    <time className="mt-1 block text-[10px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("it-IT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <p className="flex items-center gap-2 text-[10px] leading-4 text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 shrink-0" /> I tassi di cambio non sono automatici:
            inserisci un tasso aggiornato nel convertitore valute.
          </p>
        </>
      )}
    </div>
  );
}
