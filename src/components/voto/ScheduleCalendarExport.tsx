import { CalendarPlus, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createScheduleCalendarIcs,
  getDefaultSchoolYearEnd,
  localDateString,
} from "@/lib/voto/schedule-calendar";
import type { Schedule } from "@/lib/voto/orario";

export function ScheduleCalendarExport({
  schedule,
  isDidup = false,
}: {
  schedule: Schedule;
  isDidup?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [firstLessonTime, setFirstLessonTime] = useState("08:00");
  const [lessonMinutes, setLessonMinutes] = useState("60");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [untilDate, setUntilDate] = useState(() => getDefaultSchoolYearEnd());
  const [createdCount, setCreatedCount] = useState<number | null>(null);
  const lessonCount = Object.values(schedule)
    .flat()
    .filter((subject) => subject.trim()).length;
  const inputStyle = isDidup
    ? "border-white/20 bg-black text-white"
    : "border-input bg-background text-foreground";

  const exportSchedule = () => {
    try {
      const { content, eventCount } = createScheduleCalendarIcs(schedule, {
        fromDate: localDateString(new Date()),
        untilDate,
        firstLessonTime,
        lessonMinutes: Number(lessonMinutes),
        breakMinutes: Number(breakMinutes),
      });

      if (eventCount === 0) {
        toast("Nessuna lezione da esportare", {
          description: "Inserisci almeno una materia e scegli una data di fine futura.",
        });
        return;
      }

      const fileUrl = URL.createObjectURL(
        new Blob([content], { type: "text/calendar;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = "voto-orario-scolastico.ics";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
      setCreatedCount(eventCount);
      toast.success("File calendario pronto", {
        description: "Apri il file .ics scaricato e scegli Calendario per importare le lezioni.",
      });
    } catch (error) {
      toast.error("Impossibile creare il calendario", {
        description: error instanceof Error ? error.message : "Controlla i dati inseriti.",
      });
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={isDidup ? "secondary" : "default"}
        onClick={() => setOpen(true)}
        className={`h-11 w-full gap-2 ${
          isDidup ? "border border-white/15 bg-[#292929] text-white hover:bg-white/10" : ""
        }`}
      >
        <CalendarPlus className="h-4 w-4" /> Aggiungi al calendario del telefono
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`w-[calc(100%-2rem)] max-w-md ${
            isDidup ? "border-white/15 bg-[#202020] text-white" : ""
          }`}
        >
          <DialogHeader>
            <DialogTitle>Aggiungi l’orario al calendario</DialogTitle>
            <DialogDescription className={isDidup ? "text-white/70" : ""}>
              Creerò un file .ics con un evento settimanale per ogni lezione compilata. Dopo il
              download, apri il file e scegli l’app Calendario del telefono.
            </DialogDescription>
          </DialogHeader>

          <p className={`text-xs ${isDidup ? "text-white/70" : "text-muted-foreground"}`}>
            {lessonCount
              ? `${lessonCount} ${lessonCount === 1 ? "lezione inserita" : "lezioni inserite"}. Orari uguali ogni settimana fino alla data scelta.`
              : "L’orario è vuoto: inserisci le materie prima di esportarlo."}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-xs text-muted-foreground">
              Inizio prima ora
              <input
                type="time"
                value={firstLessonTime}
                onChange={(event) => setFirstLessonTime(event.target.value)}
                className={`h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Durata lezione (min)
              <input
                type="number"
                min={1}
                max={360}
                step={1}
                value={lessonMinutes}
                onChange={(event) => setLessonMinutes(event.target.value)}
                className={`h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Intervallo tra ore (min)
              <input
                type="number"
                min={0}
                max={120}
                step={1}
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(event.target.value)}
                className={`h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`}
              />
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Ripeti fino al
              <input
                type="date"
                value={untilDate}
                min={localDateString(new Date())}
                onChange={(event) => setUntilDate(event.target.value)}
                className={`h-11 w-full rounded-md border px-3 text-sm ${inputStyle}`}
              />
            </label>
          </div>

          {createdCount !== null && (
            <p
              role="status"
              className={`text-xs ${isDidup ? "text-white/75" : "text-muted-foreground"}`}
            >
              File creato con {createdCount}{" "}
              {createdCount === 1 ? "lezione ricorrente" : "lezioni ricorrenti"}. Aprilo dai
              download per importarlo.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={exportSchedule}
              disabled={!lessonCount || !untilDate}
              className={`h-11 w-full ${isDidup ? "bg-[#08a5b5] text-white hover:bg-[#0795a3]" : ""}`}
            >
              <Download className="h-4 w-4" /> Scarica file per il calendario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
