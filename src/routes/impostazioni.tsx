import { createFileRoute } from "@tanstack/react-router";
import { Copy, Github, Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/voto/ui";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/voto/dates";
import { useVoto, type Accent, type Bg } from "@/lib/voto/store";

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
  { id: "mono", label: "Mono", sw: "oklch(0.92 0 0)" },
];
const BGS: { id: Bg; label: string; sw: string }[] = [
  { id: "nero", label: "Nero", sw: "oklch(0.13 0 0)" },
  { id: "carbone", label: "Carbone", sw: "oklch(0.18 0.004 260)" },
  { id: "grafite", label: "Grafite", sw: "oklch(0.23 0.006 250)" },
];

function Settings() {
  const v = useVoto();
  const [input, setInput] = useState(v.url);
  const [testing, setTesting] = useState(false);
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

      <SectionTitle action={<button type="button" onClick={() => navigator.clipboard.writeText(SCHEMA).then(() => toast.success("Schema copiato"), () => toast.error("Copia non riuscita"))} className="inline-flex items-center gap-1 text-xs font-medium text-primary"><Copy className="h-3.5 w-3.5" /> Copia</button>}>
        Schema JSON
      </SectionTitle>
      <pre className="card-surface no-scrollbar overflow-x-auto p-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground">{SCHEMA}</pre>
      <p className="mt-2 text-[11px] text-muted-foreground">Voti non numerici (es. "giust.") vengono ignorati; "7+" = 7,25, "7-" = 6,75; peso predefinito 1.</p>

      <SectionTitle>Tema</SectionTitle>
      <div className="grid grid-cols-4 gap-2">
        {ACCENTS.map((a) => (
          <button key={a.id} type="button" aria-pressed={v.accent === a.id} onClick={() => v.setAccent(a.id)}
            className={cn("press card-surface flex flex-col items-center gap-2 p-3 text-[11px]", v.accent === a.id && "border-primary")}>
            <span className="h-7 w-7 rounded-full" style={{ background: a.sw }} />{a.label}
          </button>
        ))}
      </div>
      <p className="mb-2 mt-4 text-xs text-muted-foreground">Sfondo</p>
      <div className="grid grid-cols-3 gap-2">
        {BGS.map((b) => (
          <button key={b.id} type="button" aria-pressed={v.bg === b.id} onClick={() => v.setBg(b.id)}
            className={cn("press flex h-16 items-end rounded-xl border p-2.5 text-[11px]", v.bg === b.id ? "border-primary" : "border-border")}
            style={{ background: b.sw }}>{b.label}</button>
        ))}
      </div>

      <SectionTitle>Dati</SectionTitle>
      <button type="button" onClick={v.resetDemo} className="press card-surface flex w-full items-center gap-3 p-4 text-left text-sm">
        <RotateCcw className="h-4 w-4 text-primary" /> Ripristina dati demo
      </button>

      <SectionTitle>Info app</SectionTitle>
      <section className="card-surface p-4 text-xs text-muted-foreground">
        <p><span className="font-display font-semibold text-foreground">VOTO.</span> versione 1.0.0</p>
        <p className="mt-2">Installabile dal browser (Aggiungi a schermata Home). Per l'APK Android segui la guida Capacitor nel README.</p>
      </section>
    </div>
  );
}
