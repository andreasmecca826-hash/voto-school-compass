import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  clearNativeDidupSync,
  getNativeDidupSyncStatus,
  requestNativeDidupSync,
  saveNativeDidupCredentials,
  setNativeDidupSyncEnabled,
  type DidupSyncStatus,
} from "@/lib/native-didup-sync";
import { cn } from "@/lib/utils";

const DEFAULT_STATUS: DidupSyncStatus = {
  enabled: false,
  hasCredentials: false,
  hasSession: false,
  intervalHours: 6,
  status: "idle",
  message: "",
  lastSyncAt: "",
  lastAttemptAt: "",
};

function formatDate(value: string) {
  if (!value) return "Mai";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function statusLabel(status: DidupSyncStatus) {
  if (status.status === "success") return "Sincronizzazione riuscita";
  if (status.status === "queued") return "Sincronizzazione in coda";
  if (status.status === "didup_credentials_rejected") return "Credenziali da controllare";
  if (status.status === "access_denied") return "Account VOTO non autorizzato";
  if (status.status === "session_required") return "Accedi a VOTO per avviare la sync";
  if (status.status === "credentials_required") return "Credenziali DidUP non configurate";
  if (status.status === "attachment_retry") return "Allegati in retry";
  if (status.status === "attachment_pending") return "Allegati in coda";
  if (status.status === "attachment_issue") return "Verifica un allegato";
  if (status.status === "idle") return status.hasCredentials ? "Pronta" : "Non configurata";
  return status.message || "In attesa di sincronizzazione";
}

export function DidupSyncSettings() {
  const [android, setAndroid] = useState(false);
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [schoolCode, setSchoolCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [intervalHours, setIntervalHours] = useState(6);
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const refreshStatus = useCallback(async () => {
    if (Capacitor.getPlatform() !== "android") return;
    try {
      const next = await getNativeDidupSyncStatus();
      setStatus(next);
      setIntervalHours(next.intervalHours || 6);
    } catch {
      // Native bridge availability is reflected by the platform check and build version.
    }
  }, []);

  const waitForResult = useCallback(async () => {
    if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
    let attempts = 0;
    pollTimer.current = window.setInterval(() => {
      attempts += 1;
      void getNativeDidupSyncStatus()
        .then((next) => {
          setStatus(next);
          if (next.status !== "queued" || attempts >= 36) {
            if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
            pollTimer.current = null;
          }
        })
        .catch(() => {
          if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
          pollTimer.current = null;
        });
    }, 2500);
  }, []);

  useEffect(() => {
    const isAndroid = Capacitor.getPlatform() === "android";
    setAndroid(isAndroid);
    if (isAndroid) void refreshStatus();
    return () => {
      if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
    };
  }, [refreshStatus]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!schoolCode.trim() || !username.trim() || !password) {
      toast.error("Inserisci codice scuola, utente e password DidUP.");
      return;
    }
    setBusy(true);
    try {
      await saveNativeDidupCredentials({
        schoolCode: schoolCode.trim(),
        username: username.trim(),
        password,
        intervalHours,
      });
      setSchoolCode("");
      setUsername("");
      setPassword("");
      await refreshStatus();
      await requestNativeDidupSync();
      await refreshStatus();
      await waitForResult();
      toast.success("Credenziali cifrate sul dispositivo; controllo DidUP avviato.");
    } catch (error) {
      toast.error("Impossibile avviare la sincronizzazione", {
        description: error instanceof Error ? error.message : "Riprova tra poco.",
      });
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSync() {
    setBusy(true);
    try {
      await requestNativeDidupSync();
      await refreshStatus();
      await waitForResult();
      toast.success("Controllo DidUP aggiunto alla coda Android.");
    } catch (error) {
      toast.error("Sincronizzazione non avviata", {
        description: error instanceof Error ? error.message : "Controlla accesso e configurazione.",
      });
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function handleEnabledChange(enabled: boolean) {
    setBusy(true);
    try {
      await setNativeDidupSyncEnabled(enabled, intervalHours);
      await refreshStatus();
      toast.success(
        enabled ? "Sincronizzazione periodica attivata." : "Sincronizzazione periodica sospesa.",
      );
    } catch {
      toast.error("Non è stato possibile aggiornare la pianificazione.");
    } finally {
      setBusy(false);
    }
  }

  async function handleIntervalSave() {
    setBusy(true);
    try {
      await setNativeDidupSyncEnabled(status.enabled, intervalHours);
      await refreshStatus();
      toast.success("Intervallo aggiornato.");
    } catch {
      toast.error("Non è stato possibile aggiornare l’intervallo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await clearNativeDidupSync();
      setStatus(DEFAULT_STATUS);
      setPassword("");
      toast.success("Credenziali e token cifrati rimossi da questo dispositivo.");
    } catch {
      toast.error("Non è stato possibile cancellare la configurazione locale.");
    } finally {
      setBusy(false);
    }
  }

  if (!android) return null;

  return (
    <section className="card-surface mt-4 p-4" aria-labelledby="didup-sync-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <span aria-hidden="true" className="text-lg">
            ↻
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="didup-sync-title" className="text-sm font-semibold">
            Sincronizzazione DidUP su Android
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Il telefono controlla DidUP dalla propria rete. Password e token restano cifrati
            nell’Android Keystore; a Supabase vengono inviati lo snapshot scolastico e le copie
            PDF/DOCX delle circolari nel bucket privato.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-surface/40 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold">Stato</p>
            <p
              className={cn(
                "mt-1 text-[11px]",
                status.status === "success" ? "text-success" : "text-muted-foreground",
              )}
            >
              {statusLabel(status)}
            </p>
          </div>
          {status.hasCredentials && (
            <button
              type="button"
              role="switch"
              aria-checked={status.enabled}
              disabled={busy}
              onClick={() => void handleEnabledChange(!status.enabled)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
                status.enabled ? "bg-primary" : "bg-muted",
              )}
              aria-label={
                status.enabled ? "Sospendi sincronizzazione DidUP" : "Attiva sincronizzazione DidUP"
              }
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                  status.enabled ? "translate-x-[22px]" : "translate-x-0.5",
                )}
              />
            </button>
          )}
        </div>
        {status.message && status.status !== "idle" && status.status !== "success" && (
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{status.message}</p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <p>
            Ultimo successo:{" "}
            <span className="font-medium text-foreground">{formatDate(status.lastSyncAt)}</span>
          </p>
          <p>
            Ultimo tentativo:{" "}
            <span className="font-medium text-foreground">{formatDate(status.lastAttemptAt)}</span>
          </p>
        </div>
      </div>

      <form onSubmit={(event) => void handleSave(event)} className="mt-4 space-y-3">
        <p className="text-xs font-semibold">
          {status.hasCredentials ? "Aggiorna le credenziali" : "Collega il tuo account DidUP"}
        </p>
        {status.hasCredentials && (
          <p className="text-[10px] text-muted-foreground">
            Le credenziali già salvate non vengono mostrate. Per sostituirle inserisci di nuovo
            tutti e tre i valori.
          </p>
        )}
        <label className="block text-[11px] font-medium" htmlFor="didup-school-code">
          Codice scuola
        </label>
        <input
          id="didup-school-code"
          autoComplete="off"
          value={schoolCode}
          onChange={(event) => setSchoolCode(event.target.value)}
          required
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />
        <label className="block text-[11px] font-medium" htmlFor="didup-username">
          Utente DidUP
        </label>
        <input
          id="didup-username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />
        <label className="block text-[11px] font-medium" htmlFor="didup-password">
          Password DidUP
        </label>
        <input
          id="didup-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        />

        <div className="flex items-center gap-3">
          <label htmlFor="didup-sync-interval" className="min-w-0 flex-1 text-[11px] font-medium">
            Controllo periodico
          </label>
          <select
            id="didup-sync-interval"
            value={intervalHours}
            onChange={(event) => setIntervalHours(Number(event.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
          >
            {[1, 3, 6, 12, 24].map((hours) => (
              <option key={hours} value={hours}>
                Ogni {hours} {hours === 1 ? "ora" : "ore"}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="press h-11 w-full rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Avvio…" : status.hasCredentials ? "Salva e sincronizza" : "Salva e sincronizza"}
        </button>
        {status.hasCredentials && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleManualSync()}
              className="press h-10 rounded-xl border border-border text-xs font-semibold disabled:opacity-60"
            >
              Controlla adesso
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleIntervalSave()}
              className="press h-10 rounded-xl border border-border text-xs font-semibold disabled:opacity-60"
            >
              Applica intervallo
            </button>
          </div>
        )}
      </form>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Android esegue il controllo in background quando il sistema lo consente, con rete
        disponibile. L’intervallo è indicativo: modalità risparmio energetico, rete e criteri
        Android possono ritardare l’esecuzione. Il servizio non è garantito a orario fisso; dopo
        aver forzato l’arresto dell’app, apri nuovamente VOTO per riattivare i job. La
        sincronizzazione si sospende al logout VOTO e puoi rimuovere in ogni momento le credenziali
        locali.
      </p>
      {status.hasCredentials && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleClear()}
          className="mt-3 w-full text-left text-[11px] font-medium text-destructive disabled:opacity-60"
        >
          Rimuovi credenziali e configurazione da questo dispositivo
        </button>
      )}
    </section>
  );
}
