import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Github, Loader2, Moon, RotateCcw, ShieldAlert, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/voto/ui";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/voto/dates";
import { useVoto, type Accent, type Bg, type CustomTheme, type HomeModuleId, type Mode, type Theme } from "@/lib/voto/store";

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
  "attendance": {"absenceDays":14,"absenceHours":84,"delays":1,"earlyExits":0,"annualHours":990,"absenceLimitHours":247.5},
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
  { id: "original", label: "Originale", description: "Lo stile VOTO attuale", sw: "linear-gradient(135deg,#151515,#e85d5d)" },
  { id: "custom", label: "Personalizzato", description: "Crea il tuo tema direttamente nell’app", sw: "linear-gradient(135deg,#12151c,#61a7ff)" },
  { id: "lavender", label: "Lavender", description: "Morbido, lilla e rilassato", sw: "linear-gradient(135deg,#211832,#c4a7ff)" },
  { id: "cybercore", label: "Cybercore", description: "Neon, terminale e futuristico", sw: "linear-gradient(135deg,#050b0f,#00f0c8)" },
  { id: "brutalist", label: "Brutalist", description: "Netto, forte e senza fronzoli", sw: "linear-gradient(135deg,#f4f000,#111)" },
  { id: "retro-os", label: "Retro OS", description: "Finestre e colori da computer vintage", sw: "linear-gradient(135deg,#c0c0c0,#083c83)" },
  { id: "dark-academia", label: "Dark Academia", description: "Carta, cuoio e atmosfera classica", sw: "linear-gradient(135deg,#201711,#c8a875)" },
  { id: "glassmorphism", label: "Glassmorphism", description: "Superfici morbide e iridescenti", sw: "linear-gradient(135deg,#24205b,#8ee7ff)" },
  { id: "y2k", label: "Y2K", description: "Cromato, rosa e azzurro", sw: "linear-gradient(135deg,#ff77c8,#76e6ff)" },
  { id: "primavera", label: "Primavera", description: "Fiori, verde e colori freschi", sw: "linear-gradient(135deg,#214b3b,#f7a8c4)" },
  { id: "estate", label: "Estate", description: "Sole, mare e colori vivaci", sw: "linear-gradient(135deg,#075985,#ffb84d)" },
  { id: "autunno", label: "Autunno", description: "Foglie, rame e atmosfera calda", sw: "linear-gradient(135deg,#49251c,#d97932)" },
  { id: "inverno", label: "Inverno", description: "Ghiaccio, neve e blu profondi", sw: "linear-gradient(135deg,#102a43,#bde7ff)" },
];
const CUSTOM_COLORS: { key: keyof Pick<CustomTheme, "bgDark" | "cardDark" | "surfaceDark" | "fgDark" | "mutedDark" | "bgLight" | "cardLight" | "surfaceLight" | "fgLight" | "mutedLight" | "primary">; label: string }[] = [
  { key: "bgDark", label: "Sfondo scuro" }, { key: "cardDark", label: "Schede scure" }, { key: "surfaceDark", label: "Superfici scure" },
  { key: "fgDark", label: "Testo scuro" }, { key: "mutedDark", label: "Testo secondario scuro" },
  { key: "bgLight", label: "Sfondo chiaro" }, { key: "cardLight", label: "Schede chiare" }, { key: "surfaceLight", label: "Superfici chiare" },
  { key: "fgLight", label: "Testo chiaro" }, { key: "mutedLight", label: "Testo secondario chiaro" }, { key: "primary", label: "Colore principale" },
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
  useEffect(() => setInput(v.url), [v.url]);

  const status = !v.url ? "Non connesso · dati demo" : v.error ? `Errore: ${v.error}` : "Connesso";

  return (
    <div className="pt-3">
      <h1 className="font-display text-2xl font-semibold">Impostazioni</h1>

      <SectionTitle>Connessione GitHub</SectionTitle>
      <section className="card-surface p-4">
        <label htmlFor="url" className="flex items-center gap-2 text-xs text-muted-foreground"><Github className="h-4 w-4" /> URL raw del file JSON (https)</label>
        <input
          id="url" type="url" inputMode="url" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="https://raw.githubusercontent.com/utente/repo/main/voto.json"
          className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-mono text-xs"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button" disabled={testing || !input.trim()}
            onClick={async () => { setTesting(true); await v.connect(input); setTesting(false); }}
            className="press flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {testing && <Loader2 className="h-4 w-4 animate-spin" />} Testa e salva
          </button>
          {v.url && (
            <button type="button" onClick={v.disconnect} className="press h-11 rounded-xl border border-border px-4 text-sm">Scollega</button>
          )}
        </div>
        <p className={cn("mt-3 text-xs", v.url && !v.error ? "text-success" : v.error ? "text-danger" : "text-muted-foreground")}>{status}</p>
        <p className="text-[11px] text-muted-foreground">Ultima sincronizzazione: {fmtTime(v.lastSync)}</p>
        <div className="mt-4 flex gap-2 rounded-xl bg-surface p-3 text-[11px] text-muted-foreground">
          <ShieldAlert className="h-4 w-4 shrink-0 text-warning" />
          Un repository pubblico rende i dati visibili a chiunque abbia l'URL. Evita nome completo, credenziali o dati personali: preferisci dati pseudonimizzati. Nessun token viene salvato nell'app.
        </div>
      </section>

      <SectionTitle>Home</SectionTitle>
      <section className="card-surface overflow-hidden p-2">
        <p className="px-2 pb-2 pt-1 text-[11px] text-muted-foreground">Attiva i moduli e usa le frecce per scegliere l’ordine nella Home.</p>
        <div className="space-y-1">
          {v.homeModules.map((module, index) => {
            const meta = HOME_MODULE_META.find((item) => item.id === module.id)!;
            return <div key={module.id} className={cn("flex items-center gap-2 rounded-xl p-2", !module.enabled && "opacity-50")}>
              <button type="button" onClick={() => v.toggleHomeModule(module.id)} aria-label={module.enabled ? `Nascondi ${meta.label}` : `Mostra ${meta.label}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                {module.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <span className="min-w-0 flex-1 text-sm">{meta.label}</span>
              <button type="button" disabled={index === 0} onClick={() => v.moveHomeModule(module.id, -1)} aria-label={`Sposta ${meta.label} su`} className="press flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-25"><ChevronUp className="h-4 w-4" /></button>
              <button type="button" disabled={index === v.homeModules.length - 1} onClick={() => v.moveHomeModule(module.id, 1)} aria-label={`Sposta ${meta.label} giù`} className="press flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-25"><ChevronDown className="h-4 w-4" /></button>
            </div>;
          })}
        </div>
        <button type="button" onClick={v.resetHomeModules} className="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Ripristina ordine Home</button>
      </section>

      <SectionTitle>Tema completo</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.slice(0, showMoreCompleteThemes ? THEMES.length : 4).map((t) => <button key={t.id} type="button" aria-pressed={v.theme === t.id} onClick={() => v.setTheme(t.id)} className={cn("press card-surface overflow-hidden p-0 text-left", v.theme === t.id && "border-primary") }>
          <span className="block h-16" style={{ background: t.sw }} />
          <span className="block p-3"><span className="block text-xs font-semibold">{t.label}</span><span className="mt-1 block text-[10px] text-muted-foreground">{t.description}</span></span>
        </button>)}
      </div>
      <button type="button" onClick={() => setShowMoreCompleteThemes((x) => !x)} className="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground">
        {showMoreCompleteThemes ? "Mostra meno temi completi" : "Mostra tutti i temi completi"}<ChevronDown className={cn("h-4 w-4 transition-transform", showMoreCompleteThemes && "rotate-180")} />
      </button>

      {v.theme === "custom" && (
        <section className="card-surface mt-3 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><h2 className="text-sm font-semibold">Il tuo tema</h2><p className="mt-1 text-[11px] text-muted-foreground">Le modifiche si applicano subito e vengono salvate su questo dispositivo.</p></div>
            <button type="button" onClick={v.resetCustomTheme} className="press shrink-0 rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold text-muted-foreground">Ripristina</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CUSTOM_COLORS.map((field) => <label key={field.key} className="flex items-center gap-2 rounded-xl border border-border p-2 text-[11px] text-muted-foreground">
              <input type="color" value={v.customTheme[field.key]} onChange={(e) => v.setCustomTheme({ [field.key]: e.target.value } as Partial<CustomTheme>)} className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label={field.label} />
              <span className="min-w-0"><span className="block truncate">{field.label}</span><span className="font-mono text-[10px] text-foreground">{v.customTheme[field.key]}</span></span>
            </label>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[11px] text-muted-foreground">Arrotondamento <span className="font-mono text-foreground">{v.customTheme.radius.toFixed(2)}rem</span>
              <input type="range" min="0" max="2" step="0.05" value={v.customTheme.radius} onChange={(e) => v.setCustomTheme({ radius: Number(e.target.value) })} className="mt-2 w-full accent-[var(--color-primary)]" />
            </label>
            <label className="text-[11px] text-muted-foreground">Carattere
              <select value={v.customTheme.font} onChange={(e) => v.setCustomTheme({ font: e.target.value as CustomTheme["font"] })} className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground">
                <option value="sans">Sans moderno</option><option value="display">Display morbido</option><option value="mono">Monospace</option><option value="serif">Serif classico</option>
              </select>
            </label>
          </div>
        </section>
      )}

      <SectionTitle>Aspetto</SectionTitle>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {MODES.map((m) => {
          const Icon = m.id === "chiaro" ? Sun : Moon;
          return <button key={m.id} type="button" aria-pressed={v.mode === m.id} onClick={() => v.setMode(m.id)} className={cn("press card-surface flex items-center gap-3 p-3 text-left", v.mode === m.id && "border-primary")}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>
            <span><span className="block text-xs font-semibold">{m.label}</span><span className="block text-[10px] text-muted-foreground">{m.description}</span></span>
          </button>;
        })}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Effetto Liquid glass</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button type="button" aria-pressed={v.glass} onClick={() => v.setGlass(true)} className={cn("press rounded-xl border p-3 text-left text-xs", v.glass ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border text-muted-foreground")}>Attivo<span className="mt-1 block text-[10px] font-normal">Trasparenze e sfocatura</span></button>
        <button type="button" aria-pressed={!v.glass} onClick={() => v.setGlass(false)} className={cn("press rounded-xl border p-3 text-left text-xs", !v.glass ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border text-muted-foreground")}>Disattivo<span className="mt-1 block text-[10px] font-normal">Aspetto piatto</span></button>
      </div>
      {v.theme === "original" && <>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {ACCENTS.slice(0, showMoreThemes ? ACCENTS.length : 6).map((a) => (
            <button key={a.id} type="button" aria-pressed={v.accent === a.id} onClick={() => v.setAccent(a.id)}
              className={cn("press card-surface flex flex-col items-center gap-2 p-3 text-[11px]", v.accent === a.id && "border-primary")}>
              <span className="h-7 w-7 rounded-full" style={{ background: a.sw }} />{a.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowMoreThemes((x) => !x)} className="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground">
          {showMoreThemes ? "Mostra meno colori" : "Mostra altri colori"}<ChevronDown className={cn("h-4 w-4 transition-transform", showMoreThemes && "rotate-180")} />
        </button>
        <p className="mb-2 mt-4 text-xs text-muted-foreground">Sfondo</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BGS.slice(0, showMoreBackgrounds ? BGS.length : 4).map((b) => (
            <button key={b.id} type="button" aria-pressed={v.bg === b.id} onClick={() => v.setBg(b.id)}
              className={cn("press flex h-16 items-end rounded-xl border p-2.5 text-[11px]", v.bg === b.id ? "border-primary" : "border-border")}
              style={{ background: b.sw }}>{b.label}</button>
          ))}
        </div>
        <button type="button" onClick={() => setShowMoreBackgrounds((x) => !x)} className="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground">
          {showMoreBackgrounds ? "Mostra meno sfondi" : "Mostra altri sfondi"}<ChevronDown className={cn("h-4 w-4 transition-transform", showMoreBackgrounds && "rotate-180")} />
        </button>
      </>}

      <SectionTitle>Dati</SectionTitle>
      <button type="button" onClick={v.resetDemo} className="press card-surface flex w-full items-center gap-3 p-4 text-left text-sm">
        <RotateCcw className="h-4 w-4 text-primary" /> Ripristina dati demo
      </button>

      <SectionTitle>Info app</SectionTitle>
      <section className="card-surface p-4 text-xs text-muted-foreground">
        <p><span className="font-display font-semibold text-foreground">VOTO.</span> versione 1.0.0</p>
        <p className="mt-2">Installabile dal browser (Aggiungi a schermata Home). Per l'APK Android segui la guida Capacitor nel README.</p>
      </section>

      <SectionTitle>Schema JSON</SectionTitle>
      <button type="button" onClick={() => setShowSchema((x) => !x)} className="press flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold">
        {showSchema ? "Nascondi schema JSON" : "Visualizza schema JSON"}<ChevronDown className={cn("h-4 w-4 transition-transform", showSchema && "rotate-180")} />
      </button>
      {showSchema && (
        <div className="mt-2">
          <button type="button" onClick={() => navigator.clipboard.writeText(SCHEMA).then(() => toast.success("Schema copiato"), () => toast.error("Copia non riuscita"))} className="press mb-2 inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-primary"><Copy className="h-3.5 w-3.5" /> Copia schema</button>
          <pre className="card-surface no-scrollbar overflow-x-auto p-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground">{SCHEMA}</pre>
          <p className="mt-2 text-[11px] text-muted-foreground">Voti non numerici vengono ignorati; "7+" = 7,25 e "7-" = 6,75. Il peso predefinito è 1.</p>
        </div>
      )}
    </div>
  );
}
