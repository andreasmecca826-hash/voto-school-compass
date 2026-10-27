import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Calculator, CircleDot, Layers, SlidersHorizontal, Timer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUi } from "@/components/voto/AppShell";
import { GenericAverageCalculator } from "@/components/voto/GenericAverageCalculator";
import { FlashcardsTool, PomodoroTool, WheelTool } from "@/components/voto/StudyTools";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [
    { title: "Studio Lab — VOTO." },
    { name: "description", content: "Pomodoro, flashcard, ruota di ripasso, simulatore dei voti e calcolo media." },
    { property: "og:title", content: "Studio Lab — VOTO." },
    { property: "og:description", content: "Il tuo spazio personale per studiare e preparare il prossimo voto." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Studio,
});
const TOOLS = [
  { id: "pomodoro", title: "Pomodoro", subtitle: "Un passo alla volta", icon: Timer, tone: "text-primary bg-primary-soft" },
  { id: "simulator", title: "Simulatore voti", subtitle: "Che voto mi serve?", icon: SlidersHorizontal, tone: "text-success bg-success-soft" },
  { id: "wheel", title: "Ruota del ripasso", subtitle: "Lascia decidere al caso", icon: CircleDot, tone: "text-warning bg-surface" },
  { id: "flashcards", title: "Flashcard", subtitle: "Domanda. Risposta. Ripeti.", icon: Layers, tone: "text-success bg-success-soft" },
  { id: "average", title: "Calcolo media", subtitle: "I tuoi numeri, una media", icon: Calculator, tone: "text-primary bg-primary-soft" },
] as const;
function Studio() {
  const [tool, setTool] = useState<string | null>(null);
  const ui = useUi();
  const selected = TOOLS.find((item) => item.id === tool);
  return <div className="pt-5">
    <div className="mb-6 flex items-start justify-between gap-3"><div><p className="mb-1 text-[10px] font-semibold uppercase text-primary">Il tuo spazio studio</p><h1 className="font-display text-3xl font-semibold">Studio Lab<span className="text-primary">.</span></h1></div><Sparkles className="mt-2 h-6 w-6 text-primary" /></div>
    {selected ? <>
      <Button variant="ghost" size="sm" onClick={() => setTool(null)} className="mb-4 pl-0"><ArrowLeft />Tutti gli strumenti</Button>
      <h2 className="mb-5 font-display text-xl font-semibold">{selected.title}</h2>
      {tool === "pomodoro" && <PomodoroTool />}{tool === "wheel" && <WheelTool />}{tool === "flashcards" && <FlashcardsTool />}{tool === "average" && <GenericAverageCalculator />}
    </> : <div className="space-y-3">{TOOLS.map(({ id, title, subtitle, icon: Icon, tone }) => <Button variant="outline" key={id} onClick={() => id === "simulator" ? ui.openSimulator() : setTool(id)} className="h-auto min-h-24 w-full justify-start gap-4 whitespace-normal rounded-lg bg-card px-4 py-4 text-left"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="size-6" /></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span></span><ArrowRight className="text-muted-foreground" /></Button>)}</div>}
  </div>;
}