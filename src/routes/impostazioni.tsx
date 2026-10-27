import { createFileRoute } from "@tanstack/react-router";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Github,
  Loader2,
  Moon,
  RotateCcw,
  Save,
  ShieldAlert,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/voto/ui";
import { AppPinLockSettings } from "@/components/voto/AppPinLockSettings";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/voto/dates";
import { parseVotoData } from "@/lib/voto/parse";
import {
  useVoto,
  type Accent,
  type Bg,
  type CustomTheme,
  type HomeModuleId,
  type Mode,
  type Theme,
} from "@/lib/voto/store";

export const Route = createFileRoute("/impostazioni")({
  head: () => ({
    meta: [
      { title: "Impostazioni — VOTO." },
      { name: "description", content: "Connessione GitHub, tema e informazioni app." },
      { property: "og:title", content: "Impostazioni — VOTO." },
      { property: "og:description", content: "Connessione GitHub, tema e informazioni app." },
    ],
  }),
  component: Settings,
});

const SCHEMA = `{
  "student": {"name":"Studente","className":"4B","schoolYear":"2026/2027"},
  "updatedAt": "2026-10-25T08:30:00+02:00",
  "previousAverage": 7.35,
  "attendance": {"absenceDays":14,"absenceHours":84,"delays":1,"earlyExits":0,"annualHours":990,"absenceLimitHours":264},
  "subjects": [
    {"id":"matematica","name":"Matematica","color":"#E85D5D",
     "grades":[{"id":"g1","value":7.5,"date":"2026-10-20","type":"scritto","weight":1,"comment":"Equazioni"}]}
  ],
  "assignments": [{"id":"a1","title":"Esercizi pagina 42","subject":"Matematica","dueDate":"2026-10-25","dueTime":"18:00","completed":false,"details":"esercizi 1-8"}],
  "notifications": [{"id":"n1","type":"note","title":"Avviso","message":"...","date":"2026-10-24","read":false}]
}`;

const ACCENTS: { id: Accent; label: string; sw: string }[] = [
  { id: "rosso", label: "Rosso", sw: "oklch(0.68 0.17 25)" },
  { id: "ambra", label: "Ambra", sw: "oklch(0.68 0.15 70)" },
  { id: "viola", label: "Viola", sw: "oklch(0.68 0.15 300)" },
  { id: "blu", label: "Blu", sw: "oklch(0.68 0.16 250)" },
  { id: "verde", label: "Verde", sw: "oklch(0.68 0.14 145)" },
  { id: "azzurro", label: "Azzurro", sw: "oklch(0.68 0.15 205)" },
  { id: "rosa", label: "Rosa", sw: "oklch(0.68 0.15 345)" },
  { id: "arancio", label: "Arancio", sw: "oklch(0.68 0.18 45)" },
  { id: "turchese", label: "Turchese", sw: "oklch(0.68 0.15 180)" },
  { id: "indaco", label: "Indaco", sw: "oklch(0.68 0.16 275)" },
  { id: "lime", label: "Lime", sw: "oklch(0.68 0.16 115)" },
  { id: "oro", label: "Oro", sw: "oklch(0.68 0.19 85)" },
  { id: "corallo", label: "Corallo", sw: "oklch(0.68 0.19 12)" },
  { id: "mono", label: "Mono", sw: "oklch(0.92 0 0)" },
];
const BGS: { id: Bg; label: string; sw: string }[] = [
  { id: "nero", label: "Nero", sw: "oklch(0.13 0 0)" },
  { id: "carbone", label: "Carbone", sw: "oklch(0.18 0.004 260)" },
  { id: "grafite", label: "Grafite", sw: "oklch(0.23 0.006 250)" },
  { id: "chiaro", label: "Chiaro", sw: "oklch(0.97 0.008 90)" },
  { id: "notteblu", label: "Notte blu", sw: "oklch(0.14 0.035 255)" },
  { id: "bosco", label: "Bosco", sw: "oklch(0.15 0.035 155)" },
  { id: "prugna", label: "Prugna", sw: "oklch(0.15 0.035 315)" },
  { id: "carta", label: "Carta", sw: "oklch(0.95 0.025 75)" },
];
const MODES: { id: Mode; label: string; description: string }[] = [
  { id: "scuro", label: "Scuro", description: "Contrasto morbido e sfondo scuro" },
  { id: "chiaro", label: "Chiaro", description: "Sfondo chiaro e testo scuro" },
];
const THEMES: { id: Theme; label: string; description: string; sw: string }[] = [
  {
    id: "original",
    label: "Originale",
    description: "Lo stile VOTO attuale",
    sw: "linear-gradient(135deg,#151515,#e85d5d)",
  },
  {
    id: "custom",
    label: "Personalizzato",
    description: "Crea il tuo tema direttamente nell’app",
    sw: "linear-gradient(135deg,#12151c,#61a7ff)",
  },
  {
    id: "lavender",
    label: "Lavender",
    description: "Morbido, lilla e rilassato",
    sw: "linear-gradient(135deg,#211832,#c4a7ff)",
  },
  {
    id: "cybercore",
    label: "Cybercore",
    description: "Neon, terminale e futuristico",
    sw: "linear-gradient(135deg,#050b0f,#00f0c8)",
  },
  {
    id: "brutalist",
    label: "Brutalist",
    description: "Netto, forte e senza fronzoli",
    sw: "linear-gradient(135deg,#f4f000,#111)",
  },
  {
    id: "retro-os",
    label: "Retro OS",
    description: "Finestre e colori da computer vintage",
    sw: "linear-gradient(135deg,#c0c0c0,#083c83)",
  },
  {
    id: "dark-academia",
    label: "Dark Academia",
    description: "Carta, cuoio e atmosfera classica",
    sw: "linear-gradient(135deg,#201711,#c8a875)",
  },
  {
    id: "glassmorphism",
    label: "Glassmorphism",
    description: "Superfici morbide e iridescenti",
    sw: "linear-gradient(135deg,#24205b,#8ee7ff)",
  },
  {
    id: "y2k",
    label: "Y2K",
    description: "Cromato, rosa e azzurro",
    sw: "linear-gradient(135deg,#ff77c8,#76e6ff)",
  },
  {
    id: "primavera",
    label: "Primavera",
    description: "Fiori, verde e colori freschi",
    sw: "linear-gradient(135deg,#214b3b,#f7a8c4)",
  },
  {
    id: "estate",
    label: "Estate",
    description: "Sole, mare e colori vivaci",
    sw: "linear-gradient(135deg,#075985,#ffb84d)",
  },
  {
    id: "autunno",
    label: "Autunno",
    description: "Foglie, rame e atmosfera calda",
    sw: "linear-gradient(135deg,#49251c,#d97932)",
  },
  {
    id: "inverno",
    label: "Inverno",
    description: "Ghiaccio, neve e blu profondi",
    sw: "linear-gradient(135deg,#102a43,#bde7ff)",
  },
];
const CUSTOM_COLORS: {
  key: keyof Pick<
    CustomTheme,
    | "bgDark"
    | "cardDark"
    | "surfaceDark"
    | "fgDark"
    | "mutedDark"
    | "bgLight"
    | "cardLight"
    | "surfaceLight"
    | "fgLight"
    | "mutedLight"
    | "primary"
  >;
  label: string;
}[] = [
  { key: "bgDark", label: "Sfondo scuro" },
  { key: "cardDark", label: "Schede scure" },
  { key: "surfaceDark", label: "Superfici scure" },
  { key: "fgDark", label: "Testo scuro" },
  { key: "mutedDark", label: "Testo secondario scuro" },
  { key: "bgLight", label: "Sfondo chiaro" },
  { key: "cardLight", label: "Schede chiare" },
  { key: "surfaceLight", label: "Superfici chiare" },
  { key: "fgLight", label: "Testo chiaro" },
  { key: "mutedLight", label: "Testo secondario chiaro" },
  { key: "primary", label: "Colore principale" },
];
const HOME_MODULE_META: { id: HomeModuleId; label: string }[] = [
  { id: "media", label: "Media generale" },
  { id: "simulatore", label: "Simulatore voto" },
  { id: "presenze", label: "Presenze" },
  { id: "compiti", label: "Compiti di oggi" },
  { id: "interrogazioni", label: "Interrogazioni" },
  { id: "note", label: "Note" },
  { id: "bacheca", label: "Bacheca" },
  { id: "obiettivo", label: "Obiettivo media" },
];

function Settings() {
  const v = useVoto();
  const [input, setInput] = useState(v.url);
  const [testing, setTesting] = useState(false);
  const [showMoreThemes, setShowMoreThemes] = useState(false);
  const [showMoreCompleteThemes, setShowMoreCompleteThemes] = useState(false);
  const [showMoreBackgrounds, setShowMoreBackgrounds] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugJson, setDebugJson] = useState("");
  const debugTaps = useRef({ count: 0, last: 0 });
  useEffect(() => setInput(v.url), [v.url]);

  const handleInfoTap = () => {
    if (v.source !== "demo") return;
    const now = Date.now();
    const nextCount = now - debugTaps.current.last < 900 ? debugTaps.current.count + 1 : 1;
    debugTaps.current = { count: nextCount, last: now };
    if (nextCount >= 3) {
      setDebugJson(JSON.stringify(v.data, null, 2));
      setDebugOpen(true);
      debugTaps.current = { count: 0, last: 0 };
      toast.success("Debug demo attivato");
    }
  };

  const applyDebugData = () => {
    try {
      const parsed = parseVotoData(JSON.parse(debugJson) as unknown);
      v.setDemoData(parsed);
      setDebugJson(JSON.stringify(parsed, null, 2));
    } catch (error) {
      toast.error("Dati demo non validi", {
        description: error instanceof Error ? error.message : "Controlla il JSON.",
      });
    }
  };

  const status = !v.url ? "Non connesso · dati demo" : v.error ? `Errore: ${v.error}` : "Connesso";

  return (
    <div className="pt-3">
      <h1 className="font-display text-2xl font-semibold">Impostazioni</h1>

      <SectionTitle>Connessione GitHub</SectionTitle>
      <section className="card-surface p-4">
        <label htmlFor="url" className="flex items-center gap-2 text-xs text-muted-foreground">
          <Github className="h-4 w-4" /> URL raw del file JSON (https)
        </label>
        <input
          id="url"
          type="url"
          inputMode="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://raw.githubusercontent.com/utente/repo/main/voto.json"
          className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={testing || !input.trim()}
            onClick={async () => {
              setTesting(true);
              await v.connect(input);
              setTesting(false);
            }}
            className="press flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {testing && <Loader2 className="h-4 w-4 animate-spin" />} Testa e salva
          </button>
          {v.url && (
            <button
              type="button"
              onClick={v.disconnect}
              className="press h-11 rounded-xl border border-border px-4 text-sm"
            >
              Scollega
            </button>
          )}
        </div>
        <p
          className={cn(
            "mt-3 text-xs",
            v.url && !v.error ? "text-success" : v.error ? "text-danger" : "text-muted-foreground",
          )}
        >
          {status}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Ultima sincronizzazione: {fmtTime(v.lastSync)}
        </p>
        <div className="mt-4 flex gap-2 rounded-xl bg-surface p-3 text-[11px] text-muted-foreground">
          <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
          Un repository pubblico rende i dati visibili a chiunque abbia l'URL. Evita nome completo,
          credenziali o dati personali: preferisci dati pseudonimizzati. Nessun token viene salvato
          nell'app.
        </div>
      </section>

      <AppPinLockSettings />

      <SectionTitle>Dati</SectionTitle>
      <button
        type="button"
        onClick={v.resetDemo}
        className="press card-surface flex w-full items-center gap-3 p-4 text-left text-sm"
      >
        <RotateCcw className="h-4 w-4 text-primary" /> Ripristina dati demo
      </button>

      <SectionTitle>Info app</SectionTitle>
      <section
        onClick={handleInfoTap}
        className="card-surface cursor-pointer p-4 text-xs text-muted-foreground"
      >
        <p>
          <span className="font-display font-semibold text-foreground">VOTO.</span> versione 2.4.0 ·
          made by Andrew Smecca
        </p>
      </section>

      {debugOpen && v.source === "demo" && (
        <section className="card-surface mt-3 border-warning/40 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Bug className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Debug dati demo</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Modifica, aggiungi o rimuovi direttamente nel JSON voti, compiti, diario, bacheca,
                notifiche, materie e presenze. Questi dati restano solo su questo dispositivo e non
                modificano DidUP.
              </p>
            </div>
          </div>
          <textarea
            value={debugJson}
            onChange={(event) => setDebugJson(event.target.value)}
            spellCheck={false}
            className="mt-3 min-h-[360px] w-full rounded-xl border border-input bg-background p-3 font-mono text-[10px] leading-relaxed text-foreground outline-none focus:border-primary"
            aria-label="Dati demo in formato JSON"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={applyDebugData}
              className="press flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground"
            >
              <Save className="h-3.5 w-3.5" /> Applica dati demo
            </button>
            <button
              type="button"
              onClick={() => setDebugOpen(false)}
              className="press h-10 rounded-xl border border-border px-3 text-xs font-semibold"
            >
              Chiudi
            </button>
          </div>
        </section>
      )}

      {v.source === "demo" && (
        <>
          <SectionTitle>Schema JSON</SectionTitle>
          <button
            type="button"
            onClick={() => setShowSchema((x) => !x)}
            className="press flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold"
          >
            {showSchema ? "Nascondi schema JSON" : "Visualizza schema JSON"}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showSchema && "rotate-180")}
            />
          </button>
          {showSchema && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(SCHEMA).then(
                    () => toast.success("Schema copiato"),
                    () => toast.error("Copia non riuscita"),
                  )
                }
                className="press mb-2 inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-primary"
              >
                <Copy className="h-3.5 w-3.5" /> Copia schema
              </button>
              <pre className="card-surface no-scrollbar overflow-x-auto p-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
                {SCHEMA}
              </pre>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Voti non numerici vengono ignorati; "7+" = 7,25 e "7-" = 6,75. Il peso predefinito è
                1.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
