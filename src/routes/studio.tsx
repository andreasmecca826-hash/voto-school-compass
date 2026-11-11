import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CalendarDays,
  Calculator,
  CircleDot,
  Layers,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodPicker } from "@/components/voto/PeriodPicker";
import { UniversalCalculator } from "@/components/voto/UniversalCalculator";
import { SchoolEndDateTool } from "@/components/voto/SchoolEndDateTool";
import { SimulatorTool } from "@/components/voto/SimulatorTool";
import { FlashcardsTool, WheelTool } from "@/components/voto/StudyTools";
import { StudyPlannerTool } from "@/components/voto/StudyPlannerTool";
import { InterrogationPrepTool, PhotoImportTool } from "@/components/voto/StudyLabFeatures";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio Lab — VOTO." },
      {
        name: "description",
        content:
          "Calcolatrice scientifica, conversioni, strumenti per documenti e planner di studio in un unico spazio.",
      },
      { property: "og:title", content: "Studio Lab — VOTO." },
      {
        property: "og:description",
        content: "Il tuo spazio personale per studiare e preparare il prossimo voto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Studio,
});

const TOOLS = [
  {
    id: "universal-calculator",
    title: "Calcolatore universale",
    subtitle: "Calcoli, conversioni, QR, documenti e tabelle",
    icon: Calculator,
    tone: "text-primary bg-surface",
  },
  {
    id: "grade-tools",
    title: "Simulatore voti",
    subtitle: "Pianifica i voti futuri nelle tue materie",
    icon: Calculator,
    tone: "text-success bg-surface",
  },
  {
    id: "school-end",
    title: "Fine scuola",
    subtitle: "Imposta la data ufficiale e chiedi all’assistente quanto manca",
    icon: CalendarDays,
    tone: "text-primary bg-surface",
  },
  {
    id: "wheel",
    title: "Ruota del ripasso",
    subtitle: "Lascia decidere al caso",
    icon: CircleDot,
    tone: "text-warning bg-surface",
  },
  {
    id: "flashcards",
    title: "Flashcard",
    subtitle: "Domanda. Risposta. Ripeti.",
    icon: Layers,
    tone: "text-success bg-surface",
  },
  {
    id: "planner",
    title: "Planner di studio",
    subtitle: "Decidi tu cosa studiare, quando e per quanto tempo",
    icon: ListChecks,
    tone: "text-primary bg-surface",
  },
  {
    id: "interrogation-prep",
    title: "Prima dell’interrogazione",
    subtitle: "Checklist, argomenti, conto alla rovescia e domande di ripasso",
    icon: ListChecks,
    tone: "text-warning bg-surface",
  },
  {
    id: "photo-import",
    title: "Importa da foto",
    subtitle: "Leggi appunti, lavagna o diario con OCR locale",
    icon: Camera,
    tone: "text-success bg-surface",
  },
] as const;

function Studio() {
  const [tool, setTool] = useState<string | null>(null);
  const selected = TOOLS.find((item) => item.id === tool);

  return (
    <div className="pt-5">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase text-primary">
            Il tuo spazio studio
          </p>
          <h1 className="font-display text-3xl font-semibold">
            Studio Lab<span className="text-primary">.</span>
          </h1>
        </div>
        <Sparkles className="mt-2 h-6 w-6 text-primary" />
      </div>

      {selected ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setTool(null)} className="mb-4 pl-0">
            <ArrowLeft /> Tutti gli strumenti
          </Button>
          {tool === "universal-calculator" ? (
            <UniversalCalculator />
          ) : tool === "grade-tools" ? (
            <>
              <h2 className="mb-4 font-display text-xl font-semibold">Simulatore voti</h2>
              <PeriodPicker />
              <SimulatorTool />
            </>
          ) : (
            <>
              <h2 className="mb-5 font-display text-xl font-semibold">{selected.title}</h2>
              {tool === "wheel" && <WheelTool />}
              {tool === "flashcards" && <FlashcardsTool />}
              {tool === "planner" && <StudyPlannerTool />}
              {tool === "school-end" && <SchoolEndDateTool />}
              {tool === "interrogation-prep" && <InterrogationPrepTool />}
              {tool === "photo-import" && <PhotoImportTool />}
            </>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {TOOLS.map(({ id, title, subtitle, icon: Icon, tone }) => (
            <Button
              variant="outline"
              key={id}
              onClick={() => setTool(id)}
              className="h-auto min-h-24 w-full justify-start gap-4 whitespace-normal rounded-lg bg-card px-4 py-4 text-left"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}
              >
                <Icon className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">{title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span>
              </span>
              <ArrowRight className="text-muted-foreground" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
