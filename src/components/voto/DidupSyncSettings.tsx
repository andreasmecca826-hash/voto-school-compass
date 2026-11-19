import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  clearNativeDidupSync,
  getNativeDidupSyncStatus,
  openNativeDidupAppSettings,
  requestNativeDidupSync,
  saveNativeDidupCredentials,
  setNativeDidupQuietHours,
  setNativeDidupSyncEnabled,
  type DidupSyncStatus,
} from "@/lib/native-didup-sync";
import { cn } from "@/lib/utils";

const DEFAULT_STATUS: DidupSyncStatus = {
  enabled: false,
  hasCredentials: false,
  hasSession: false,
  intervalMinutes: 360,
  quietHoursEnabled: true,
  quietHoursStart: "00:00",
  quietHoursEnd: "06:00",
  status: "idle",
  message: "",
  lastSyncAt: "",
  lastAttemptAt: "",
};

const SYNC_INTERVAL_OPTIONS = [
  { minutes: 15, label: "Ogni 15 minuti" },
  { minutes: 60, label: "Ogni ora" },
  { minutes: 180, label: "Ogni 3 ore" },
  { minutes: 360, label: "Ogni 6 ore" },
  { minutes: 720, label: "Ogni 12 ore" },
  { minutes: 1440, label: "Ogni 24 ore" },
];

function formatDate(value: string) {
  if (!value) return "Mai";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function intervalLabel(minutes: number) {
  return (
    SYNC_INTERVAL_OPTIONS.find((option) => option.minutes === minutes)?.label.toLocaleLowerCase(
      "it-IT",
    ) ?? `ogni ${minutes} minuti`
  );
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
  const [intervalMinutes, setIntervalMinutes] = useState(360);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState("00:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("06:00");
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const refreshStatus = useCallback(async () => {
    if (Capacitor.getPlatform() !== "android") return;
    try {
      const next = await getNativeDidupSyncStatus();
      setStatus(next);
      setIntervalMinutes(next.intervalMinutes || 360);
      setQuietHoursEnabled(next.quietHoursEnabled ?? true);
      setQuietHoursStart(next.quietHoursStart || "00:00");
      setQuietHoursEnd(next.quietHoursEnd || "06:00");
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
    if (!isAndroid) return;
    void refreshStatus();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshStatus();
    };
    const timer = window.setInterval(refreshWhenVisible, 15_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
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
        intervalMinutes,
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

  async function handleOpenBatterySettings() {
    try {
      await openNativeDidupAppSettings();
    } catch (error) {
      toast.error("Impossibile aprire le impostazioni Android", {
        description:
          error instanceof Error ? error.message : "Apri manualmente le info app di VOTO.",
      });
    }
  }

  async function handleEnabledChange(enabled: boolean) {
    const previousEnabled = status.enabled;
    setBusy(true);
    setStatus((current) => ({ ...current, enabled }));
    try {
      await setNativeDidupSyncEnabled(enabled, intervalMinutes);
      await refreshStatus();
      // Mantieni lo stato richiesto anche se il bridge restituisce per un istante il valore cache.
      setStatus((current) => ({ ...current, enabled }));
      toast.success(
        enabled ? "Sincronizzazione periodica attivata." : "Sincronizzazione periodica sospesa.",
      );
    } catch {
      setStatus((current) => ({ ...current, enabled: previousEnabled }));
      toast.error("Non è stato possibile aggiornare la pianificazione.");
    } finally {
      setBusy(false);
    }
  }

  async function handleIntervalSave() {
    setBusy(true);
    try {
      await setNativeDidupSyncEnabled(status.enabled, intervalMinutes);
      await refreshStatus();
      toast.success("Intervallo aggiornato.");
    } catch {
      toast.error("Non è stato possibile aggiornare l’intervallo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleQuietHoursSave() {
    if (quietHoursEnabled && quietHoursStart === quietHoursEnd) {
      toast.error("Scegli due orari diversi per la pausa.");
      return;
    }
    setBusy(true);
    try {
      await setNativeDidupQuietHours(quietHoursEnabled, quietHoursStart, quietHoursEnd);
      await refreshStatus();
      setStatus((current) => ({
        ...current,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
      }));
      toast.success(
        quietHoursEnabled
          ? `Pausa automatica impostata dalle ${quietHoursStart} alle ${quietHoursEnd}.`
          : "Pausa automatica disattivata.",
      );
    } catch (error) {
      toast.error("Non è stato possibile salvare la fascia senza controlli.", {
        description: error instanceof Error ? error.message : undefined,
      });
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
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {status.hasCredentials
                ? `Controllo periodico ${status.enabled ? "attivo" : "sospeso"} · ${intervalLabel(status.intervalMinutes)} · pausa ${status.quietHoursEnabled ? `${status.quietHoursStart}–${status.quietHoursEnd}` : "disattivata"}`
                : "Salva le credenziali DidUP per attivare il controllo periodico."}
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
                "press inline-flex min-h-11 min-w-[7.5rem] shrink-0 items-center justify-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                status.enabled
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-background text-muted-foreground",
              )}
              aria-label="Sincronizzazione periodica DidUP"
              title={
                status.enabled ? "Sospendi sincronizzazione DidUP" : "Attiva sincronizzazione DidUP"
              }
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative block h-6 w-11 shrink-0 rounded-full transition-colors",
                  status.enabled ? "bg-success" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    status.enabled ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </span>
              <span>{status.enabled ? "Attiva" : "Sospesa"}</span>
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
            value={intervalMinutes}
            onChange={(event) => setIntervalMinutes(Number(event.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs"
          >
            {SYNC_INTERVAL_OPTIONS.map((option) => (
              <option key={option.minutes} value={option.minutes}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-3 rounded-xl border border-border bg-surface/40 p-3">
          <legend className="px-1 text-xs font-semibold">Fascia senza controlli</legend>
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-muted-foreground">
              Ora locale del telefono; vale solo per i controlli automatici.
            </p>
            <label
              htmlFor="didup-quiet-hours-enabled"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-xs font-semibold"
            >
              <input
                id="didup-quiet-hours-enabled"
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(event) => setQuietHoursEnabled(event.target.checked)}
                disabled={busy}
                className="h-4 w-4 accent-primary"
              />
              Pausa attiva
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label htmlFor="didup-quiet-hours-start" className="text-[11px] font-medium">
              Non controllare dalle
              <input
                id="didup-quiet-hours-start"
                type="time"
                step="60"
                value={quietHoursStart}
                onChange={(event) => setQuietHoursStart(event.target.value)}
                disabled={!quietHoursEnabled || busy}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm disabled:opacity-50"
              />
            </label>
            <label htmlFor="didup-quiet-hours-end" className="text-[11px] font-medium">
              Fino alle
              <input
                id="didup-quiet-hours-end"
                type="time"
                step="60"
                value={quietHoursEnd}
                onChange={(event) => setQuietHoursEnd(event.target.value)}
                disabled={!quietHoursEnabled || busy}
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm disabled:opacity-50"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleQuietHoursSave()}
            className="press h-10 w-full rounded-xl border border-border text-xs font-semibold disabled:opacity-60"
          >
            Applica fascia oraria
          </button>
        </fieldset>

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
        aver forzato l’arresto dell’app, apri nuovamente VOTO per riattivare i job. La pausa
        selezionata vale solo per i controlli automatici; “Controlla adesso” resta disponibile. La
        sincronizzazione si sospende al logout VOTO e puoi rimuovere in ogni momento le credenziali
        locali.
      </p>
      <div className="mt-3 rounded-xl border border-border bg-surface/40 p-3">
        <p className="text-xs font-semibold">Aiuta VOTO a sincronizzare in background</p>
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
          Su alcuni telefoni, soprattutto con risparmio energetico o restrizioni Samsung, Android
          può ritardare i controlli. Apri le info app di VOTO e, se disponibile, imposta Batteria su
          “Senza restrizioni” e abilita l’attività in background. È facoltativo e può aumentare il
          consumo della batteria; gli orari restano comunque gestiti da Android.
        </p>
        <button
          type="button"
          onClick={() => void handleOpenBatterySettings()}
          className="press mt-3 h-10 w-full rounded-xl border border-border text-xs font-semibold"
        >
          Apri impostazioni app Android
        </button>
      </div>
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
