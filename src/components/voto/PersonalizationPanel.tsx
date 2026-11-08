import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Home,
  Music2,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Type,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionTitle } from "@/components/voto/ui";
import { cn } from "@/lib/utils";
import { useUi } from "@/components/voto/AppShell";
import { createHomeSettingsFile, parseHomeSettingsFile } from "@/lib/voto/home-settings-file";
import { processCustomThemeBackground } from "@/lib/voto/custom-theme-background";
import {
  DEFAULT_EMOJI_THEME_EMOJIS,
  MAX_EMOJI_THEME_EMOJIS,
  parseEmojiThemeInput,
} from "@/lib/voto/emoji-theme";
import {
  useVoto,
  type Accent,
  type Bg,
  type CustomTheme,
  type Density,
  type HomeModuleId,
  type Mode,
  type Theme,
} from "@/lib/voto/store";

type View = "menu" | "themes" | "home" | "experience" | "typography" | "registry";

const ACCENTS: { id: Accent; label: string; sw: string }[] = [
  { id: "rosso", label: "Rosso", sw: "oklch(0.68 0.17 25)" },
  { id: "ambra", label: "Ambra", sw: "oklch(0.68 0.15 70)" },
  { id: "viola", label: "Viola", sw: "oklch(0.68 0.15 300)" },
  { id: "blu", label: "Blu", sw: "oklch(0.68 0.16 250)" },
  { id: "verde", label: "Verde", sw: "oklch(0.68 0.14 145)" },
  { id: "azzurro", label: "Azzurro", sw: "oklch(0.68 0.15 205)" },
  { id: "menta", label: "Menta", sw: "oklch(0.68 0.14 165)" },
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
  { id: "rosso", label: "Rosso", sw: "oklch(0.14 0.045 25)" },
  { id: "oceano", label: "Oceano", sw: "oklch(0.14 0.04 235)" },
  { id: "notteblu", label: "Notte blu", sw: "oklch(0.14 0.035 255)" },
  { id: "bosco", label: "Bosco", sw: "oklch(0.15 0.035 155)" },
  { id: "prugna", label: "Prugna", sw: "oklch(0.15 0.035 315)" },
  { id: "carta", label: "Carta", sw: "oklch(0.95 0.025 75)" },
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
    description: "Crea il tuo tema",
    sw: "linear-gradient(135deg,#12151c,#61a7ff)",
  },
  {
    id: "diamante",
    label: "Diamante",
    description: "Zaffiro profondo, vetro glaciale e riflessi azzurri",
    sw: "radial-gradient(circle at 73% 20%,#fff 0 1.4%,#d5f5ff 2.4%,transparent 11%),conic-gradient(from 210deg at 70% 42%,#f3fdff 0deg,#74b9e4 28deg,#dff8ff 53deg,#3273a5 90deg,#f5fcff 120deg,#93d3f3 164deg,#f9ffff 208deg,#1c4770 260deg,#d9f4ff 320deg,#f3fdff 360deg),linear-gradient(135deg,#102039 0%,#244b70 26%,#e8fcff 38%,#79c8ed 45%,#f7ffff 52%,#416e9e 65%,#101d35 100%)",
  },
  {
    id: "sangue",
    label: "Sangue",
    description: "Borgogna profondo, cremisi e riflessi rubino",
    sw: "radial-gradient(circle at 78% 18%,#ff9ba9 0 2%,#d72d4d 3%,transparent 17%),repeating-linear-gradient(135deg,transparent 0 20px,#ff536a18 20px 22px),linear-gradient(145deg,#090a11 0%,#35101c 32%,#7b1730 62%,#c8324d 84%,#230c16 100%)",
  },
  {
    id: "oro",
    label: "Oro",
    description: "Ossidiana, oro satinato e riflessi champagne",
    sw: "radial-gradient(ellipse at 16% 14%,#fff8d8 0 1.5%,#f2d16f 2.3%,transparent 19%),repeating-linear-gradient(0deg,#fff3c21a 0 1px,transparent 1px 3px),linear-gradient(102deg,#33220a 0%,#8b6420 13%,#eed06a 17%,#694710 25%,#d6ad4a 38%,#fff1b0 43%,#8b6320 51%,#d3ae54 67%,#6a4914 80%,#e7c762 91%,#221708 100%)",
  },
  {
    id: "emoji",
    label: "Emoji",
    description: "Palette pastello e sfondo con le emoji che scegli",
    sw: "linear-gradient(135deg,#29223a 0%,#8d557b 52%,#f2a35e 100%)",
  },
  {
    id: "tramonto",
    label: "Tramonto",
    description: "Caldo, tra corallo e ambra",
    sw: "linear-gradient(135deg,#291622,#f08a60)",
  },
  {
    id: "lavender",
    label: "Lavender",
    description: "Aurora lilla, vetro satinato e bagliori viola",
    sw: "radial-gradient(circle at 78% 22%,#f6c8ff 0 4%,transparent 5%),radial-gradient(circle at 24% 28%,#a995ff 0 3%,transparent 4%),linear-gradient(135deg,#17102d 0%,#4e2d73 42%,#b987e8 68%,#261540 100%)",
  },
  {
    id: "cybercore",
    label: "Cybercore",
    description: "Neon e futuristico",
    sw: "linear-gradient(135deg,#050b0f,#00f0c8)",
  },
  {
    id: "brutalist",
    label: "Brutalist",
    description: "Forte e senza fronzoli",
    sw: "linear-gradient(135deg,#f4f000,#111)",
  },
  {
    id: "retro-os",
    label: "Retro OS",
    description: "Computer vintage",
    sw: "linear-gradient(135deg,#c0c0c0,#083c83)",
  },
  {
    id: "windows-98",
    label: "Windows 98",
    description: "Grigio classico, blu navy e bordi in rilievo",
    sw: "linear-gradient(135deg,#dfdfdf 0%,#c0c0c0 42%,#808080 48%,#000080 52%,#1084d0 100%)",
  },
  {
    id: "windows-7",
    label: "Windows 7",
    description: "Aero originale, finestre chiare, menu Start e taskbar",
    sw: "radial-gradient(ellipse at 28% 82%,#87e6f7 0%,transparent 44%),linear-gradient(155deg,#053c79 0%,#087fc3 46%,#55c8e8 67%,#0b5394 100%)",
  },
  {
    id: "dark-academia",
    label: "Dark Academia",
    description: "Cuoio antico, pergamena e dettagli in ottone",
    sw: "radial-gradient(circle at 72% 18%,#fff0c277 0 1px,transparent 8%),repeating-linear-gradient(0deg,transparent 0 6px,#d9bd8520 6px 7px),linear-gradient(90deg,#100a06 0 8%,#a1814f 8% 10%,#27180e 10% 15%,#4a301c 15% 84%,#c0a06a 84% 86%,#24160c 86% 93%,#100a06 93% 100%),linear-gradient(135deg,#20140d,#82603a,#1b1009)",
  },
  {
    id: "glassmorphism",
    label: "Glassmorphism",
    description: "Vetro satinato, riflessi aurora e superfici traslucide",
    sw: "radial-gradient(ellipse at 18% 20%,#63e4f3 0%,transparent 43%),radial-gradient(ellipse at 85% 15%,#9b78ff 0%,transparent 48%),linear-gradient(145deg,#17172f,#28365f)",
  },
  {
    id: "casino",
    label: "Casinò",
    description: "Panno verde, oro satinato e dettagli color rubino",
    sw: "radial-gradient(circle at 78% 30%,#f7d878 0 4%,transparent 5%),linear-gradient(135deg,#102d25,#1f6849 48%,#c59b3b 72%,#592c37)",
  },
  {
    id: "calcio",
    label: "Calcio",
    description: "Campo verde, linee da stadio e luci della partita",
    sw: "radial-gradient(ellipse at 50% 20%,#fff3b0 0%,transparent 35%),repeating-linear-gradient(90deg,#164c31 0 22%,#1f633b 22% 44%)",
  },
  {
    id: "terminale",
    label: "Terminale",
    description: "Console scura, testo monospaziato e verde fosforo",
    sw: "repeating-linear-gradient(0deg,#07140c 0 7px,#0b1c10 7px 8px),linear-gradient(135deg,#07140c,#144322)",
  },
  {
    id: "pixel-arcade",
    label: "Pixel Arcade",
    description: "Console 8-bit, viola profondo e colori arcade",
    sw: "linear-gradient(135deg,#211442 0 32%,#7146c7 32% 55%,#25d8ca 55% 75%,#f2cb4c 75%)",
  },
  {
    id: "y2k",
    label: "Y2K",
    description: "Portale web 2000: cromo, ciano e fucsia",
    sw: "linear-gradient(135deg,#edfaff 0%,#829fba 18%,#192c56 38%,#ff63c5 57%,#53dcf5 76%,#f6fbff 100%)",
  },
  {
    id: "primavera",
    label: "Primavera",
    description: "Salvia, fiori di ciliegio e luce morbida",
    sw: "radial-gradient(ellipse at 18% 82%,#f5b7cd 0 13%,transparent 14%),radial-gradient(circle at 80% 18%,#ffe3a0 0 8%,transparent 9%),linear-gradient(145deg,#143e30 0%,#3e815c 54%,#f0bfd0 100%)",
  },
  {
    id: "estate",
    label: "Estate",
    description: "Mare turchese, riflessi d’onda e sole dorato",
    sw: "radial-gradient(circle at 81% 21%,#ffe99d 0 10%,transparent 11%),repeating-linear-gradient(170deg,transparent 0 18px,#d2fbef26 18px 20px),linear-gradient(150deg,#102c52 0%,#0b7189 54%,#48c8c3 100%)",
  },
  {
    id: "autunno",
    label: "Autunno",
    description: "Ambra, rame e foglie color ruggine",
    sw: "radial-gradient(circle at 78% 22%,#f3c879 0 10%,transparent 11%),linear-gradient(145deg,#271613 0%,#6b3024 43%,#b65d32 74%,#e0a04e 100%)",
  },
  {
    id: "inverno",
    label: "Inverno",
    description: "Blu notte, brina e bagliori di ghiaccio",
    sw: "radial-gradient(ellipse at 82% 16%,#d8f7ff 0 8%,transparent 9%),radial-gradient(ellipse at 14% 86%,#8bcbe6 0 10%,transparent 11%),linear-gradient(145deg,#0a1832 0%,#23496f 56%,#b6dce9 100%)",
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
const FONTS: { id: CustomTheme["font"]; label: string; sample: string }[] = [
  { id: "theme", label: "Come il tema", sample: "Aa" },
  { id: "sans", label: "Sans moderno", sample: "Aa" },
  { id: "display", label: "Display morbido", sample: "Aa" },
  { id: "mono", label: "Monospace", sample: "01" },
  { id: "serif", label: "Serif classico", sample: "Aa" },
];
const HOME_MODULE_META: { id: HomeModuleId; label: string }[] = [
  { id: "media", label: "Media generale" },
  { id: "simulatore", label: "Studio Lab" },
  { id: "prossima-lezione", label: "Prossima lezione" },
  { id: "domani-a-scuola", label: "Domani a scuola" },
  { id: "presenze", label: "Presenze" },
  { id: "compiti", label: "Compiti di oggi" },
  { id: "interrogazioni", label: "Interrogazioni" },
  { id: "note", label: "Note" },
  { id: "promemoria", label: "Promemoria DidUP" },
  { id: "bacheca", label: "Bacheca" },
  { id: "obiettivo", label: "Obiettivo media" },
];
const DENSITY_OPTIONS: { id: Density; label: string; description: string }[] = [
  { id: "standard", label: "Standard", description: "Spazi originali dell’app" },
  { id: "compact", label: "Compatto", description: "Schede più raccolte" },
];
const MOTION_OPTIONS: { id: boolean; label: string; description: string }[] = [
  { id: false, label: "Normali", description: "Transizioni e animazioni" },
  { id: true, label: "Ridotte", description: "Meno movimento nell’interfaccia" },
];

export function PersonalizationPanel() {
  const v = useVoto();
  const { openMusic } = useUi();
  const [view, setView] = useState<View>("menu");
  const [moreBackgrounds, setMoreBackgrounds] = useState(false);
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);
  const homeSettingsInput = useRef<HTMLInputElement>(null);
  const customBackgroundInput = useRef<HTMLInputElement>(null);
  const availableThemes = THEMES;
  const hiddenThemeName = availableThemes.slice(4).find((theme) => theme.id === v.theme)?.label;
  const hiddenAccentName = ACCENTS.slice(6).find((accent) => accent.id === v.accent)?.label;
  const pageClassName =
    v.registryStyle === "didup"
      ? "didup-page min-h-dvh bg-black px-2 pb-[100px] text-white"
      : "pt-3";

  if (view === "menu")
    return (
      <div className={pageClassName}>
        <h1 className="font-display text-2xl font-semibold">Personalizza</h1>
        <p className="mt-1 text-xs text-muted-foreground">Scegli cosa vuoi modificare.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {v.registryStyle === "voto" && (
            <>
              <button
                type="button"
                onClick={() => setView("themes")}
                className="press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Palette className="h-7 w-7" />
                </span>
                <span className="font-semibold">Temi</span>
                <span className="text-center text-[11px] text-muted-foreground">
                  Colori, sfondi e aspetto
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView("home")}
                className="press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Home className="h-7 w-7" />
                </span>
                <span className="font-semibold">Home</span>
                <span className="text-center text-[11px] text-muted-foreground">
                  Moduli e ordine della Home
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView("experience")}
                className="press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <SlidersHorizontal className="h-7 w-7" />
                </span>
                <span className="font-semibold">Esperienza</span>
                <span className="text-center text-[11px] text-muted-foreground">
                  Formato e animazioni
                </span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setView("registry")}
            className="press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <BadgeCheck className="h-7 w-7" />
            </span>
            <span className="font-semibold">Stile del registro</span>
            <span className="text-center text-[11px] text-muted-foreground">
              Scegli l’aspetto VOTO o DidUP
            </span>
          </button>
          {v.theme === "original" && v.registryStyle === "voto" && (
            <button
              type="button"
              onClick={() => setView("typography")}
              className="press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Type className="h-7 w-7" />
              </span>
              <span className="font-semibold">Tipografia</span>
              <span className="text-center text-[11px] text-muted-foreground">
                Font e dimensione dell’interfaccia
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={openMusic}
            className="press card-surface flex min-h-36 flex-col items-center justify-center gap-3 p-4"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Music2 className="h-7 w-7" />
            </span>
            <span className="font-semibold">Musica</span>
            <span className="text-center text-[11px] text-muted-foreground">
              Brani dal dispositivo o da URL
            </span>
          </button>
        </div>
      </div>
    );

  if (view === "typography")
    return (
      <div className={pageClassName}>
        <BackButton onClick={() => setView("menu")} title="Tipografia" />
        <SectionTitle>Font dell’app</SectionTitle>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Il font scelto si applica a tutti i temi. “Come il tema” ripristina lo stile tipografico
          previsto da ciascun tema.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              aria-pressed={v.customTheme.font === font.id}
              onClick={() => v.setCustomTheme({ font: font.id })}
              className={cn(
                "press card-surface flex items-center gap-3 p-3 text-left",
                v.customTheme.font === font.id && "border-primary",
              )}
            >
              <span
                className="text-2xl text-primary"
                style={{
                  fontFamily:
                    font.id === "theme"
                      ? "inherit"
                      : font.id === "serif"
                        ? "Georgia, serif"
                        : font.id === "mono"
                          ? '"JetBrains Mono", monospace'
                          : font.id === "display"
                            ? '"Space Grotesk", sans-serif'
                            : '"Manrope", sans-serif',
                }}
              >
                {font.sample}
              </span>
              <span className="text-xs font-semibold">{font.label}</span>
            </button>
          ))}
        </div>

        <SectionTitle>Dimensione del testo</SectionTitle>
        <section className="card-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="interface-scale" className="text-xs font-semibold">
              Scala testo e interfaccia
            </label>
            <output
              className="tabular text-xs font-semibold text-primary"
              htmlFor="interface-scale"
            >
              {v.interfaceScale}%
            </output>
          </div>
          <input
            id="interface-scale"
            type="range"
            min={80}
            max={140}
            step={5}
            value={v.interfaceScale}
            onChange={(event) => v.setInterfaceScale(Number(event.target.value))}
            aria-label="Dimensione del testo"
            className="mt-3 w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>80%</span>
            <span>140%</span>
          </div>
          <button
            type="button"
            onClick={() => {
              v.setCustomTheme({ font: "theme" });
              v.setInterfaceScale(100);
            }}
            disabled={v.customTheme.font === "theme" && v.interfaceScale === 100}
            className="mt-3 text-[11px] font-medium text-primary disabled:text-muted-foreground"
          >
            Ripristina tipografia
          </button>
        </section>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Le preferenze vengono salvate su questo dispositivo.
        </p>
      </div>
    );

  if (view === "experience")
    return (
      <div className={pageClassName}>
        <BackButton onClick={() => setView("menu")} title="Esperienza" />
        <SectionTitle>Formato delle schede</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {DENSITY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={v.density === option.id}
              onClick={() => v.setDensity(option.id)}
              className={cn(
                "press card-surface p-3 text-left",
                v.density === option.id && "border-primary",
              )}
            >
              <span className="block text-xs font-semibold">{option.label}</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
        </div>
        <SectionTitle>Movimento</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {MOTION_OPTIONS.map((option) => (
            <button
              key={String(option.id)}
              type="button"
              aria-pressed={v.reduceMotion === option.id}
              onClick={() => v.setReduceMotion(option.id)}
              className={cn(
                "press card-surface p-3 text-left",
                v.reduceMotion === option.id && "border-primary",
              )}
            >
              <span className="block text-xs font-semibold">{option.label}</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">
                {option.description}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Le preferenze vengono salvate su questo dispositivo.
        </p>
      </div>
    );

  if (view === "registry")
    return (
      <div className={pageClassName}>
        <BackButton onClick={() => setView("menu")} title="Stile del registro" />
        <SectionTitle>Identità visiva</SectionTitle>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Cambia l’aspetto generale dell’app. Le funzioni e i dati restano quelli di VOTO; il
          profilo DidUP è ispirato al registro e non è l’app ufficiale.
        </p>
        <div className="grid gap-3">
          {[
            {
              id: "voto" as const,
              label: "VOTO",
              description: "Mantieni l’identità visiva attuale e le tue preferenze di tema.",
              swatch: "bg-gradient-to-br from-neutral-950 via-neutral-800 to-rose-500",
            },
            {
              id: "didup" as const,
              label: "DidUP",
              description:
                "Interfaccia più istituzionale, blu e lineare, ispirata al registro DidUP.",
              swatch: "bg-gradient-to-br from-sky-900 via-sky-700 to-sky-400",
            },
          ].map((style) => (
            <button
              key={style.id}
              type="button"
              aria-pressed={v.registryStyle === style.id}
              onClick={() => v.setRegistryStyle(style.id)}
              className={cn(
                "press card-surface flex items-center gap-3 p-4 text-left",
                v.registryStyle === style.id && "border-primary ring-2 ring-primary/30",
              )}
            >
              <span className={cn("h-12 w-12 shrink-0 rounded-xl", style.swatch)} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{style.label}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {style.description}
                </span>
              </span>
              {v.registryStyle === style.id && (
                <span className="shrink-0 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-semibold text-primary">
                  Attivo
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );

  if (view === "home")
    return (
      <div className={pageClassName}>
        <BackButton onClick={() => setView("menu")} title="Home" />
        <SectionTitle>Moduli Home</SectionTitle>
        <section className="card-surface overflow-hidden p-2">
          <p className="px-2 pb-2 pt-1 text-[11px] text-muted-foreground">
            Attiva i moduli, ridimensionali con i cursori e usa le frecce per riordinarli.
          </p>
          <div className="mb-3 rounded-xl border border-border bg-surface/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="home-scale" className="text-xs font-semibold">
                Dimensione generale Home
              </label>
              <output className="tabular text-xs font-semibold text-primary" htmlFor="home-scale">
                {v.homeScale}%
              </output>
            </div>
            <input
              id="home-scale"
              type="range"
              min={80}
              max={120}
              step={5}
              value={v.homeScale}
              onChange={(event) => v.setHomeScale(Number(event.target.value))}
              aria-label="Dimensione generale della Home"
              className="mt-3 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>80%</span>
              <span>120%</span>
            </div>
            <button
              type="button"
              onClick={() => v.setHomeScale(100)}
              disabled={v.homeScale === 100}
              className="mt-2 text-[11px] font-medium text-primary disabled:text-muted-foreground"
            >
              Ripristina 100%
            </button>
          </div>
          <div className="space-y-1">
            {v.homeModules.map((module, index) => {
              const meta = HOME_MODULE_META.find((item) => item.id === module.id)!;
              return (
                <div
                  key={module.id}
                  className={cn("rounded-xl p-2", !module.enabled && "opacity-50")}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => v.toggleHomeModule(module.id)}
                      aria-label={
                        module.enabled ? `Nascondi ${meta.label}` : `Mostra ${meta.label}`
                      }
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-muted-foreground"
                    >
                      {module.enabled ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <span className="min-w-0 flex-1 text-sm">{meta.label}</span>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => v.moveHomeModule(module.id, -1)}
                      aria-label={`Sposta ${meta.label} su`}
                      className="press flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-25"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === v.homeModules.length - 1}
                      onClick={() => v.moveHomeModule(module.id, 1)}
                      aria-label={`Sposta ${meta.label} giù`}
                      className="press flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-25"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 pl-11">
                    <label
                      htmlFor={`home-module-scale-${module.id}`}
                      className="w-16 shrink-0 text-[10px] text-muted-foreground"
                    >
                      Dimensione
                    </label>
                    <input
                      id={`home-module-scale-${module.id}`}
                      type="range"
                      min={80}
                      max={120}
                      step={5}
                      value={module.scale}
                      onChange={(event) =>
                        v.setHomeModuleScale(module.id, Number(event.target.value))
                      }
                      aria-label={`Dimensione del modulo ${meta.label}`}
                      className="min-w-0 flex-1 accent-primary"
                    />
                    <output
                      className="tabular w-9 text-right text-[10px] font-semibold text-primary"
                      htmlFor={`home-module-scale-${module.id}`}
                    >
                      {module.scale}%
                    </output>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={v.resetHomeModules}
            className="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Ripristina la Home
          </button>
        </section>
        <SectionTitle>Trasferisci impostazioni Home</SectionTitle>
        <section className="card-surface p-4">
          <p className="mb-3 text-[11px] text-muted-foreground">
            Esporta o importa ordine, visibilità e dimensioni dei moduli. Il file non contiene voti
            o altri dati personali.
          </p>
          <input
            ref={homeSettingsInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-label="Seleziona file JSON delle impostazioni Home"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              try {
                const settings = parseHomeSettingsFile(await file.text());
                v.setHomeCustomization(settings);
                toast.success("Impostazioni Home importate");
              } catch (error) {
                toast.error("Importazione non riuscita", {
                  description: error instanceof Error ? error.message : "Controlla il file JSON.",
                });
              }
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const contents = createHomeSettingsFile({
                  homeScale: v.homeScale,
                  homeModules: v.homeModules,
                });
                const url = URL.createObjectURL(
                  new Blob([contents], { type: "application/json;charset=utf-8" }),
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = "voto-home-impostazioni.json";
                anchor.click();
                window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast.success("File JSON esportato");
              }}
              className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-semibold"
            >
              <Download className="h-4 w-4" /> Esporta JSON
            </button>
            <button
              type="button"
              onClick={() => homeSettingsInput.current?.click()}
              className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground"
            >
              <Upload className="h-4 w-4" /> Importa JSON
            </button>
          </div>
        </section>
      </div>
    );

  return (
    <div className={pageClassName}>
      <BackButton onClick={() => setView("menu")} title="Temi" />
      <SectionTitle>Tema completo</SectionTitle>
      <div className="grid grid-cols-2 gap-2">
        {availableThemes.slice(0, 4).map((theme) => (
          <ThemeOption
            key={theme.id}
            theme={theme}
            selected={v.theme === theme.id}
            onSelect={v.setTheme}
          />
        ))}
      </div>
      {availableThemes.length > 4 && (
        <Accordion type="single" collapsible className="mt-2 rounded-xl border border-border px-3">
          <AccordionItem value="other-themes" className="border-0">
            <AccordionTrigger className="py-3 text-xs font-semibold hover:no-underline">
              Altri temi ({availableThemes.length - 4})
              {hiddenThemeName ? ` · attivo: ${hiddenThemeName}` : ""}
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <div className="grid grid-cols-2 gap-2">
                {availableThemes.slice(4).map((theme) => (
                  <ThemeOption
                    key={theme.id}
                    theme={theme}
                    selected={v.theme === theme.id}
                    onSelect={v.setTheme}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      {v.theme === "windows-7" && (
        <p className="mt-3 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
          Aero mantiene le finestre chiare, come Windows 7. La modalità chiara o scura cambia la
          tinta del desktop e delle cornici; il menu Start raccoglie tutte le sezioni di VOTO.
          {v.registryStyle === "didup" && " Per visualizzarlo, scegli lo stile del registro VOTO."}
        </p>
      )}
      {v.theme === "emoji" && (
        <section className="card-surface mt-3 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Le tue emoji</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Scegli fino a {MAX_EMOJI_THEME_EMOJIS} emoji: decoreranno lo sfondo a motivo
                ripetuto.
              </p>
            </div>
            <button
              type="button"
              onClick={() => v.setEmojiThemeEmojis([...DEFAULT_EMOJI_THEME_EMOJIS])}
              className="press shrink-0 rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold text-muted-foreground"
            >
              Ripristina
            </button>
          </div>
          <label htmlFor="emoji-theme-selection" className="text-xs font-semibold">
            Emoji del tema
          </label>
          <input
            id="emoji-theme-selection"
            type="text"
            value={v.emojiThemeEmojis.join(" ")}
            onChange={(event) => v.setEmojiThemeEmojis(parseEmojiThemeInput(event.target.value))}
            placeholder="📚 ✏️ 🎒 ✨"
            aria-describedby="emoji-theme-help"
            className="mt-2 h-12 w-full rounded-xl border border-input bg-background px-3 text-xl tracking-wider outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p id="emoji-theme-help" className="mt-2 text-[11px] text-muted-foreground">
            Apri la tastiera emoji e separa le scelte con uno spazio. Lascia vuoto per togliere il
            motivo. Le scelte restano salvate su questo dispositivo.
          </p>
          <div
            aria-label="Anteprima delle emoji scelte"
            className="mt-3 flex min-h-12 flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/30 p-2"
          >
            {v.emojiThemeEmojis.length ? (
              v.emojiThemeEmojis.map((emoji, index) => (
                <span key={`${emoji}-${index}`} className="text-2xl" aria-hidden="true">
                  {emoji}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-muted-foreground">Nessuna emoji selezionata</span>
            )}
          </div>
          <div className="mt-4">
            <h3 className="text-xs font-semibold">Colore dello sfondo</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Cambia il colore dietro al motivo. Puoi scegliere un colore diverso per la modalità
              chiara e quella scura.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { mode: "scuro", label: "Sfondo scuro" },
                  { mode: "chiaro", label: "Sfondo chiaro" },
                ] as const
              ).map(({ mode, label }) => (
                <label
                  key={mode}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-2"
                >
                  <input
                    type="color"
                    value={v.emojiThemeBackgroundColors[mode]}
                    onChange={(event) =>
                      v.setEmojiThemeBackgroundColor(mode, event.currentTarget.value)
                    }
                    aria-label={`Colore ${label.toLocaleLowerCase("it-IT")} del tema Emoji`}
                    className="h-9 w-10 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-medium">{label}</span>
                    <code className="block text-[10px] text-muted-foreground">
                      {v.emojiThemeBackgroundColors[mode]}
                    </code>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>
      )}
      {v.theme !== "original" && (
        <p className="mt-3 rounded-md border border-border bg-card p-3 text-[11px] text-muted-foreground">
          Questo è un tema completo: colori, superfici, caratteri e arrotondamenti sono gestiti dal
          tema. I font personalizzati sono disponibili solo con il tema Originale.
        </p>
      )}
      {v.theme === "custom" && (
        <section className="card-surface mt-3 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Il tuo tema</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Le modifiche vengono salvate su questo dispositivo.
              </p>
            </div>
            <button
              type="button"
              onClick={v.resetCustomTheme}
              className="press rounded-lg border border-border px-2.5 py-2 text-[11px] font-semibold text-muted-foreground"
            >
              Ripristina
            </button>
          </div>
          <div className="mb-4 rounded-xl border border-border bg-surface/30 p-3">
            <h3 className="text-xs font-semibold">Immagine di sfondo</h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Scegli una foto dal dispositivo per personalizzare lo sfondo dell’app.
            </p>
            {v.customTheme.backgroundImage ? (
              <div
                role="img"
                aria-label="Anteprima dello sfondo scelto"
                className="mt-3 h-24 rounded-lg border border-border bg-cover bg-center"
                style={{ backgroundImage: `url("${v.customTheme.backgroundImage}")` }}
              />
            ) : (
              <div
                className="mt-3 flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted-foreground"
                style={{
                  backgroundColor:
                    v.mode === "chiaro" ? v.customTheme.bgLight : v.customTheme.bgDark,
                }}
              >
                Nessuna immagine selezionata
              </div>
            )}
            <input
              ref={customBackgroundInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              aria-label="Scegli un’immagine di sfondo"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                setBackgroundProcessing(true);
                const fallbackColor =
                  v.mode === "chiaro" ? v.customTheme.bgLight : v.customTheme.bgDark;
                void processCustomThemeBackground(file, fallbackColor)
                  .then((backgroundImage) => {
                    v.setCustomTheme({ backgroundImage });
                    toast.success("Sfondo aggiornato");
                  })
                  .catch((error: unknown) => {
                    toast.error("Immagine non caricata", {
                      description:
                        error instanceof Error ? error.message : "Controlla il file e riprova.",
                    });
                  })
                  .finally(() => setBackgroundProcessing(false));
              }}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={backgroundProcessing}
                onClick={() => customBackgroundInput.current?.click()}
                className="press flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {backgroundProcessing
                  ? "Ottimizzo…"
                  : v.customTheme.backgroundImage
                    ? "Cambia immagine"
                    : "Scegli immagine"}
              </button>
              {v.customTheme.backgroundImage && (
                <button
                  type="button"
                  disabled={backgroundProcessing}
                  onClick={() => {
                    v.setCustomTheme({ backgroundImage: "" });
                    toast.success("Immagine rimossa");
                  }}
                  className="press min-h-10 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground disabled:opacity-60"
                >
                  Rimuovi
                </button>
              )}
            </div>
            <p className="mt-2 text-[10px] leading-4 text-muted-foreground">
              JPG, PNG o WebP. L’immagine viene compressa e salvata su questo dispositivo; è inclusa
              nel backup delle preferenze e non viene caricata su Supabase.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CUSTOM_COLORS.map((field) => (
              <label
                key={field.key}
                className="flex items-center gap-2 rounded-xl border border-border p-2 text-[11px] text-muted-foreground"
              >
                <input
                  type="color"
                  value={v.customTheme[field.key]}
                  onChange={(e) =>
                    v.setCustomTheme({ [field.key]: e.target.value } as Partial<CustomTheme>)
                  }
                  className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  aria-label={field.label}
                />
                <span className="min-w-0">
                  <span className="block truncate">{field.label}</span>
                  <span className="font-mono text-[10px] text-foreground">
                    {v.customTheme[field.key]}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[11px] text-muted-foreground">
              Arrotondamento{" "}
              <span className="font-mono text-foreground">
                {v.customTheme.radius.toFixed(2)}rem
              </span>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={v.customTheme.radius}
                onChange={(e) => v.setCustomTheme({ radius: Number(e.target.value) })}
                className="mt-2 w-full accent-[var(--color-primary)]"
              />
            </label>
          </div>
        </section>
      )}
      <SectionTitle>Aspetto</SectionTitle>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {(
          [
            { id: "chiaro", label: "Chiaro", description: "Sfondo chiaro" },
            { id: "scuro", label: "Scuro", description: "Sfondo scuro" },
          ] as { id: Mode; label: string; description: string }[]
        ).map((mode) => {
          const Icon = mode.id === "chiaro" ? Sun : Moon;
          return (
            <button
              key={mode.id}
              type="button"
              aria-pressed={v.mode === mode.id}
              onClick={() => v.setMode(mode.id)}
              className={cn(
                "press card-surface flex items-center gap-3 p-3 text-left",
                v.mode === mode.id && "border-primary",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-xs font-semibold">{mode.label}</span>
                <span className="block text-[10px] text-muted-foreground">{mode.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">Effetto Liquid glass</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={v.glass}
          onClick={() => v.setGlass(true)}
          className={cn(
            "press rounded-xl border p-3 text-left text-xs",
            v.glass
              ? "border-primary bg-primary-soft font-semibold text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          Attivo<span className="mt-1 block text-[10px] font-normal">Trasparenze e sfocatura</span>
        </button>
        <button
          type="button"
          aria-pressed={!v.glass}
          onClick={() => v.setGlass(false)}
          className={cn(
            "press rounded-xl border p-3 text-left text-xs",
            !v.glass
              ? "border-primary bg-primary-soft font-semibold text-primary"
              : "border-border text-muted-foreground",
          )}
        >
          Disattivo<span className="mt-1 block text-[10px] font-normal">Aspetto piatto</span>
        </button>
      </div>
      {v.theme === "original" && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {ACCENTS.slice(0, 6).map((accent) => (
              <AccentOption
                key={accent.id}
                accent={accent}
                selected={v.accent === accent.id}
                onSelect={v.setAccent}
              />
            ))}
          </div>
          {ACCENTS.length > 6 && (
            <Accordion
              type="single"
              collapsible
              className="mt-2 rounded-xl border border-border px-3"
            >
              <AccordionItem value="other-colors" className="border-0">
                <AccordionTrigger className="py-3 text-xs font-semibold hover:no-underline">
                  Altri colori ({ACCENTS.length - 6})
                  {hiddenAccentName ? ` · attivo: ${hiddenAccentName}` : ""}
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {ACCENTS.slice(6).map((accent) => (
                      <AccentOption
                        key={accent.id}
                        accent={accent}
                        selected={v.accent === accent.id}
                        onSelect={v.setAccent}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <p className="mb-2 mt-4 text-xs text-muted-foreground">Sfondo</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BGS.slice(0, moreBackgrounds ? BGS.length : 6).map((bg) => (
              <button
                key={bg.id}
                type="button"
                aria-pressed={v.bg === bg.id}
                onClick={() => v.setBg(bg.id)}
                className={cn(
                  "press flex h-16 items-end rounded-xl border p-2.5 text-[11px]",
                  v.bg === bg.id ? "border-primary" : "border-border",
                )}
                style={{ background: bg.sw }}
              >
                {bg.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMoreBackgrounds((x) => !x)}
            className="press mt-2 flex h-10 w-full items-center justify-center rounded-xl border border-border text-xs font-semibold text-muted-foreground"
          >
            {moreBackgrounds ? "Mostra meno sfondi" : "Mostra altri sfondi"}
          </button>
        </>
      )}
    </div>
  );
}

function ThemeOption({
  theme,
  selected,
  onSelect,
}: {
  theme: (typeof THEMES)[number];
  selected: boolean;
  onSelect: (theme: Theme) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(theme.id)}
      className={cn(
        "press card-surface overflow-hidden p-0 text-left",
        selected && "border-primary",
      )}
    >
      <span className="relative block h-16" style={{ background: theme.sw }}>
        {theme.id === "emoji" && (
          <span
            className="absolute inset-0 flex items-center justify-center gap-3 text-3xl drop-shadow"
            aria-hidden="true"
          >
            📚 ✏️ 🎒 ✨
          </span>
        )}
      </span>
      <span className="block p-3">
        <span className="block text-xs font-semibold">{theme.label}</span>
        <span className="mt-1 block text-[10px] text-muted-foreground">{theme.description}</span>
      </span>
    </button>
  );
}

function AccentOption({
  accent,
  selected,
  onSelect,
}: {
  accent: (typeof ACCENTS)[number];
  selected: boolean;
  onSelect: (accent: Accent) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(accent.id)}
      className={cn(
        "press card-surface flex flex-col items-center gap-2 p-3 text-[11px]",
        selected && "border-primary",
      )}
    >
      <span className="h-7 w-7 rounded-full" style={{ background: accent.sw }} />
      {accent.label}
    </button>
  );
}

function BackButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        className="press flex h-9 w-9 items-center justify-center rounded-xl border border-border"
        aria-label="Torna indietro"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
    </div>
  );
}
