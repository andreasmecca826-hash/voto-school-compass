import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CalendarX2,
  Calculator,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AbsenceCalculator } from "@/components/voto/AbsenceCalculator";
import { GenericAverageCalculator } from "@/components/voto/GenericAverageCalculator";
import { PeriodPicker } from "@/components/voto/PeriodPicker";
import { SimulatorTool } from "@/components/voto/SimulatorTool";
import { UniversalCalculator } from "@/components/voto/UniversalCalculator";
import { SchoolEndDateTool } from "@/components/voto/SchoolEndDateTool";

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
    subtitle: "Calcoli, conversioni, documenti e strumenti di studio",
    icon: Calculator,
    tone: "text-primary bg-surface",
  },
  {
    id: "school-end",
    title: "Fine scuola",
    subtitle: "Imposta la data ufficiale e chiedi all’assistente quanto manca",
    icon: CalendarDays,
    tone: "text-primary bg-surface",
  },
  {
    id: "average",
    title: "Calcolo media",
    subtitle: "Calcola una media semplice senza cambiare i voti del registro",
    icon: Calculator,
    tone: "text-success bg-surface",
  },
  {
    id: "absence",
    title: "Calcolo assenze",
    subtitle: "Controlla le ore residue e simula nuove assenze",
    icon: CalendarX2,
    tone: "text-warning bg-surface",
  },
  {
    id: "simulator",
    title: "Simulatore voti",
    subtitle: "Prova i voti futuri nelle tue materie",
    icon: Calculator,
    tone: "text-success bg-surface",
  },
] as const;

export function Studio() {
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
          ) : (
            <>
              <h2 className="mb-5 font-display text-xl font-semibold">{selected.title}</h2>
              {tool === "average" && <GenericAverageCalculator />}
              {tool === "absence" && <AbsenceCalculator />}
              {tool === "simulator" && (
                <div className="space-y-4">
                  <PeriodPicker />
                  <SimulatorTool />
                </div>
              )}
              {tool === "school-end" && <SchoolEndDateTool />}
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
