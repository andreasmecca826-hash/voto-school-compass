import { CalendarPlus, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
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
import { isCapacitorNative } from "@/lib/voto/circulars";
import {
  getGoogleCalendarClientId,
  loadGoogleIdentityServices,
  requestGoogleCalendarAccessToken,
  syncScheduleToGoogleCalendar,
} from "@/lib/voto/google-calendar";
import { supabase } from "@/lib/supabase-auth";
import {
  createScheduleCalendarGoogleEvents,
  getDefaultSchoolYearEnd,
  localDateString,
} from "@/lib/voto/schedule-calendar";
import type { Schedule } from "@/lib/voto/orario";

type SyncSummary = {
  created: number;
  updated: number;
  deleted: number;
};

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
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [googleSetupError, setGoogleSetupError] = useState<string | null>(null);
  const [votoEmail, setVotoEmail] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const isNative = isCapacitorNative();
  const clientIdConfigured = Boolean(getGoogleCalendarClientId());
  const lessonCount = Object.values(schedule)
    .flat()
    .filter((subject) => subject.trim()).length;
  const inputStyle = isDidup
    ? "border-white/20 bg-black text-white"
    : "border-input bg-background text-foreground";

  useEffect(() => {
    if (!open || isNative) return;
    let cancelled = false;

    setIsGoogleReady(false);
    setGoogleSetupError(null);
    setSyncSummary(null);

    if (!getGoogleCalendarClientId()) {
      setGoogleSetupError("Il collegamento Google non è ancora configurato per VOTO.");
      return () => {
        cancelled = true;
      };
    }

    void Promise.all([loadGoogleIdentityServices(), supabase.auth.getSession()])
      .then(([, sessionResult]) => {
        if (cancelled) return;
        setVotoEmail(sessionResult.data.session?.user.email ?? "");
        setIsGoogleReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setGoogleSetupError(
          error instanceof Error ? error.message : "Impossibile preparare il collegamento Google.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [open, isNative]);

  const syncSchedule = async () => {
    if (isNative) {
      toast.error("Google Calendar richiede il browser esterno su Android", {
        description:
          "Questa APK non include ancora il collegamento OAuth nativo. Per ora usa VOTO nel browser Chrome.",
      });
      return;
    }

    try {
      const events = createScheduleCalendarGoogleEvents(schedule, {
        fromDate: localDateString(new Date()),
        untilDate,
        firstLessonTime,
        lessonMinutes: Number(lessonMinutes),
        breakMinutes: Number(breakMinutes),
      });

      if (!isGoogleReady) {
        toast.error(googleSetupError ?? "Il collegamento Google non è pronto. Riprova tra poco.");
        return;
      }

      setIsSyncing(true);
      setSyncSummary(null);
      const accessToken = await requestGoogleCalendarAccessToken(votoEmail || undefined);
      const result = await syncScheduleToGoogleCalendar(accessToken, events);
      setSyncSummary(result);
      const total = result.created + result.updated + result.deleted;
      if (total === 0) {
        toast("Nessuna modifica necessaria", {
          description: "Non ci sono lezioni o serie VOTO da aggiornare nel calendario.",
        });
      } else {
        toast.success("Orario sincronizzato con Google Calendar", {
          description: `${result.created} nuove, ${result.updated} aggiornate e ${result.deleted} obsolete rimosse.`,
        });
      }
    } catch (error) {
      toast.error("Impossibile aggiornare Google Calendar", {
        description: error instanceof Error ? error.message : "Controlla i dati e riprova.",
      });
    } finally {
      setIsSyncing(false);
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
        <CalendarPlus className="h-4 w-4" /> Collega Google Calendar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={`w-[calc(100%-2rem)] max-w-md ${
            isDidup ? "border-white/15 bg-[#202020] text-white" : ""
          }`}
        >
          <DialogHeader>
            <DialogTitle>Invia l’orario a Google Calendar</DialogTitle>
            <DialogDescription className={isDidup ? "text-white/70" : ""}>
              VOTO creerà o aggiornerà un evento settimanale per ogni lezione compilata nel tuo
              calendario Google principale. Rimuoverà anche solo le serie create da VOTO che non
              sono più presenti nell’orario; gli altri eventi non vengono toccati. Google chiederà
              l’autorizzazione; VOTO non salva la password né il token di accesso.
            </DialogDescription>
          </DialogHeader>

          <p className={`text-xs ${isDidup ? "text-white/70" : "text-muted-foreground"}`}>
            {lessonCount
              ? `${lessonCount} ${lessonCount === 1 ? "lezione inserita" : "lezioni inserite"}. Gli eventi si ripeteranno ogni settimana fino alla data scelta.`
              : "L’orario è vuoto: se in precedenza avevi inviato lezioni, l’aggiornamento rimuoverà solo le relative serie create da VOTO."}
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

          {isNative ? (
            <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
              Google non consente l’accesso OAuth dentro la WebView Android. Per collegare il
              calendario nell’APK serve un aggiornamento con login nativo; nel frattempo usa VOTO da
              Chrome.
            </p>
          ) : !clientIdConfigured ? (
            <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
              {googleSetupError} Dopo la configurazione OAuth, qui potrai autorizzare l’account
              Google con l’email della sessione VOTO preselezionata.
            </p>
          ) : googleSetupError ? (
            <p role="alert" className="text-xs text-destructive">
              {googleSetupError}
            </p>
          ) : !isGoogleReady ? (
            <p role="status" className="text-xs text-muted-foreground">
              Preparazione del collegamento Google…
            </p>
          ) : null}

          {syncSummary && (
            <p
              role="status"
              className={`text-xs ${isDidup ? "text-white/75" : "text-muted-foreground"}`}
            >
              Google Calendar aggiornato: {syncSummary.created} nuove, {syncSummary.updated} già
              presenti aggiornate e {syncSummary.deleted} serie VOTO obsolete rimosse.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => void syncSchedule()}
              disabled={
                !untilDate || isSyncing || isNative || !clientIdConfigured || !isGoogleReady
              }
              className={`h-11 w-full ${isDidup ? "bg-[#08a5b5] text-white hover:bg-[#0795a3]" : ""}`}
            >
              {isSyncing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
              {isSyncing ? "Aggiornamento in corso…" : "Invia e aggiorna orario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
