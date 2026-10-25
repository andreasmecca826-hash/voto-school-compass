import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Clock3 } from "lucide-react";
import { useState } from "react";
import { SectionTitle } from "@/components/voto/ui";
import { DAYS, loadSchedule, saveSchedule, type DayId, type Schedule } from "@/lib/voto/orario";

export const Route = createFileRoute("/orario")({
  head: () => ({
    meta: [
      { title: "Orario — VOTO." },
      { name: "description", content: "Il tuo orario scolastico dal lunedì al venerdì." },
      { property: "og:title", content: "Orario — VOTO." },
      { property: "og:description", content: "Il tuo orario scolastico settimanale." },
    ],
  }),
  component: Orario,
});

function Orario() {
  const [selectedDay, setSelectedDay] = useState<DayId>(DAYS[0].id);
  const [schedule, setSchedule] = useState<Schedule>(() => loadSchedule());
  const day = DAYS.find(({ id }) => id === selectedDay)!;

  const updateSubject = (hour: number, subject: string) => {
    setSchedule((current) => {
      const next = { ...current, [selectedDay]: current[selectedDay].map((item, index) => index === hour ? subject : item) };
      saveSchedule(next);
      return next;
    });
  };

  return (
    <div className="pt-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <CalendarClock className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Orario</h1>
          <p className="text-xs text-muted-foreground">Sei ore al giorno, dal lunedì al venerdì.</p>
        </div>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto" role="tablist" aria-label="Giorni della settimana">
        {DAYS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selectedDay === item.id}
            onClick={() => setSelectedDay(item.id)}
            className={`press min-w-[62px] rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${selectedDay === item.id ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {item.short}
          </button>
        ))}
      </div>

      <SectionTitle>{day.label}</SectionTitle>
      <div className="space-y-2">
        {schedule[selectedDay].map((subject, index) => (
          <label key={index} className="card-surface flex items-center gap-3 p-3.5">
            <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-surface text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              <span className="tabular text-[9px] font-semibold">{index + 1}ª</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] text-muted-foreground">{index + 1}ª ora</span>
              <input
                value={subject}
                onChange={(event) => updateSubject(index, event.target.value)}
                placeholder="Inserisci materia"
                aria-label={`${day.label}, ${index + 1}ª ora`}
                className="mt-0.5 w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/60"
              />
            </span>
          </label>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">Le modifiche vengono salvate automaticamente sul dispositivo.</p>
    </div>
  );
}
