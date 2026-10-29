import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getCircularCheckStatus, requestCircularCheck } from "@/lib/voto/circulars";
import { useVoto } from "@/lib/voto/store";

const PENDING_CHECK_KEY = "voto.circularCheckRequestedAt";

export function CircularCheckControl() {
  const v = useVoto();
  const [checkPending, setCheckPending] = useState(false);
  const [checkNotice, setCheckNotice] = useState<{
    kind: "info" | "success" | "error";
    text: string;
  } | null>(null);
  const [pendingCheckAt, setPendingCheckAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PENDING_CHECK_KEY);
      if (saved && Number.isFinite(Date.parse(saved))) {
        setPendingCheckAt(saved);
        setCheckNotice({
          kind: "info",
          text: "Hai un aggiornamento DidUP in corso. Verificane lo stato per ricaricare il JSON.",
        });
      } else {
        window.localStorage.removeItem(PENDING_CHECK_KEY);
      }
    } catch {
      // Il controllo continua a funzionare anche se il browser blocca lo storage locale.
    }
  }, []);

  const watchCheck = async (requestedAt: string): Promise<boolean | null> => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 10_000));
      const status = await getCircularCheckStatus(requestedAt);
      if (status.status === "completed") return status.conclusion === "success";
    }
    return null;
  };

  const applyCheckResult = async (result: boolean | null) => {
    if (result === null) {
      setCheckNotice({
        kind: "info",
        text: "L’aggiornamento è ancora in corso. Usa ‘Verifica stato’ più tardi per ricaricare il JSON.",
      });
      return;
    }
    setPendingCheckAt(null);
    try {
      window.localStorage.removeItem(PENDING_CHECK_KEY);
    } catch {
      // L'eventuale dato locale residuo verrà ignorato al prossimo avvio.
    }
    if (!result) {
      setCheckNotice({ kind: "error", text: "Il controllo non è riuscito. Riprova più tardi." });
      return;
    }
    await v.refresh({ silent: true });
    setCheckNotice({ kind: "success", text: "Aggiornamento DidUP terminato: JSON ricaricato." });
  };

  const checkCirculars = async () => {
    if (checkPending) return;
    setCheckPending(true);
    setCheckNotice({ kind: "info", text: "Avvio aggiornamento dati da DidUP…" });
    try {
      const requestedAt = await requestCircularCheck();
      setPendingCheckAt(requestedAt);
      try {
        window.localStorage.setItem(PENDING_CHECK_KEY, requestedAt);
      } catch {
        // Il polling resta attivo per questa sessione anche senza storage locale.
      }
      setCheckNotice({ kind: "info", text: "Aggiornamento avviato. Attendo il nuovo JSON…" });
      await applyCheckResult(await watchCheck(requestedAt));
    } catch (error) {
      setCheckNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Impossibile avviare il controllo.",
      });
    } finally {
      setCheckPending(false);
    }
  };

  const resumeCircularCheck = async () => {
    if (!pendingCheckAt || checkPending) return;
    setCheckPending(true);
    setCheckNotice({ kind: "info", text: "Verifico lo stato del controllo…" });
    try {
      await applyCheckResult(await watchCheck(pendingCheckAt));
    } catch (error) {
      setCheckNotice({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Impossibile leggere lo stato del controllo.",
      });
    } finally {
      setCheckPending(false);
    }
  };

  return (
    <div className="mb-3 space-y-2">
      <button
        type="button"
        disabled={checkPending}
        onClick={() => void checkCirculars()}
        className="press inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-3 text-xs font-semibold text-primary disabled:opacity-60"
      >
        <RefreshCw className={cn("h-4 w-4", checkPending && "animate-spin")} />
        {checkPending ? "Aggiornamento in corso…" : "Aggiorna dati da DidUP"}
      </button>
      {checkNotice && (
        <p
          role={checkNotice.kind === "error" ? "alert" : "status"}
          className={cn(
            "text-xs",
            checkNotice.kind === "error" && "text-destructive",
            checkNotice.kind === "success" && "text-primary",
            checkNotice.kind === "info" && "text-muted-foreground",
          )}
        >
          {checkNotice.text}
        </p>
      )}
      {pendingCheckAt && (
        <button
          type="button"
          disabled={checkPending}
          onClick={() => void resumeCircularCheck()}
          className="press inline-flex h-9 w-full items-center justify-center rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground disabled:opacity-60"
        >
          {checkPending ? "Verifica in corso…" : "Verifica stato del controllo"}
        </button>
      )}
    </div>
  );
}
