import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { AttendanceCalendar } from "@/components/voto/AttendanceCalendar";
import { useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendario-assenze")({
  head: () => ({
    meta: [
      { title: "Calendario presenze — VOTO." },
      { name: "description", content: "Consulta il calendario annuale delle presenze e delle assenze." },
    ],
  }),
  component: CalendarioAssenze,
});

function CalendarioAssenze() {
  const v = useVoto();
  const isDidup = v.registryStyle === "didup";

  return (
    <main
      className={cn(
        "min-h-dvh pb-8",
        isDidup ? "didup-page bg-black px-3 pb-[110px] text-white" : "pt-2",
      )}
    >
      <header className={cn("flex items-center gap-3", isDidup ? "pt-3" : "py-2")}>
        <Link
          to="/assenze"
          aria-label="Torna ad Assenze"
          className={cn(
            "press flex h-10 w-10 items-center justify-center rounded-full",
            isDidup ? "text-white" : "border border-border text-foreground",
          )}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] uppercase tracking-wide", isDidup ? "text-white/55" : "text-muted-foreground")}>
            Presenze
          </p>
          <h1 className="truncate font-display text-2xl font-semibold">Calendario presenze</h1>
        </div>
        <CalendarDays className={cn("h-7 w-7", isDidup ? "text-[#08a5b5]" : "text-primary")} />
      </header>
      <AttendanceCalendar isDidup={isDidup} />
    </main>
  );
}
