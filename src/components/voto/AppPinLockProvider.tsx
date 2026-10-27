import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { LockKeyhole } from "lucide-react";
import { AppPinLockContext } from "@/lib/voto/app-pin-lock-context";
import {
  createPinLockRecord,
  readPinLockRecord,
  removePinLockRecord,
  verifyPinAgainstRecord,
  writePinLockRecord,
} from "@/lib/voto/app-pin-lock";
import type { PinLockRecord } from "@/lib/voto/app-pin-lock";

export function AppPinLockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [locked, setLocked] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const hasPinRef = useRef(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const record = readPinLockRecord();
      const enabled = Boolean(record);
      setHasPin(enabled);
      setLocked(enabled);
    } catch (error) {
      setHasPin(true);
      setLocked(true);
      setRecordError(
        error instanceof Error ? error.message : "Impossibile leggere il PIN salvato.",
      );
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    hasPinRef.current = hasPin;
  }, [hasPin]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && hasPinRef.current) setLocked(true);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const savePin = useCallback(async (pin: string) => {
    const record = await createPinLockRecord(pin);
    writePinLockRecord(record);
    hasPinRef.current = true;
    setHasPin(true);
    setRecordError(null);
  }, []);

  const removePin = useCallback(() => {
    removePinLockRecord();
    hasPinRef.current = false;
    setHasPin(false);
    setLocked(false);
    setRecordError(null);
  }, []);

  const lockNow = useCallback(() => {
    if (hasPinRef.current) setLocked(true);
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const record: PinLockRecord | null = readPinLockRecord();
    if (!record) {
      setHasPin(false);
      setLocked(false);
      return true;
    }
    const valid = await verifyPinAgainstRecord(pin, record);
    if (valid) setLocked(false);
    return valid;
  }, []);

  const value = useMemo(
    () => ({ hasPin, savePin, removePin, lockNow }),
    [hasPin, savePin, removePin, lockNow],
  );

  return (
    <AppPinLockContext.Provider value={value}>
      {!ready ? (
        <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
          Apertura sicura…
        </div>
      ) : locked ? (
        <PinLockScreen inputRef={pinInputRef} recordError={recordError} onUnlock={unlockWithPin} />
      ) : (
        children
      )}
    </AppPinLockContext.Provider>
  );
}

function PinLockScreen({
  inputRef,
  recordError,
  onUnlock,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  recordError: string | null;
  onUnlock: (pin: string) => Promise<boolean>;
}) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (recordError) return;
    setChecking(true);
    setMessage("");
    try {
      const unlocked = await onUnlock(pin);
      if (unlocked) {
        setPin("");
      } else {
        setPin("");
        setMessage("PIN non corretto. Riprova.");
        inputRef.current?.focus();
      }
    } catch {
      setMessage("Non riesco a verificare il PIN. Riprova.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-8">
      <section
        className="card-surface w-full max-w-sm p-6 text-center"
        aria-label="Blocco PIN VOTO"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold">Accesso bloccato</h1>
        <p className="mt-2 text-sm text-muted-foreground">Inserisci il PIN per continuare.</p>

        {recordError ? (
          <p
            className="mt-5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-left text-xs text-danger"
            role="alert"
          >
            {recordError} La cancellazione dei dati locali può rimuovere anche preferenze e
            collegamento ai dati.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="sr-only" htmlFor="app-pin-unlock">
              PIN app
            </label>
            <input
              ref={inputRef}
              id="app-pin-unlock"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="current-password"
              maxLength={8}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 8));
                setMessage("");
              }}
              className="h-12 w-full rounded-xl border border-input bg-background px-4 text-center text-lg tracking-[0.35em]"
              aria-invalid={Boolean(message)}
              aria-describedby={message ? "app-pin-error" : undefined}
              autoFocus
              required
            />
            {message && (
              <p id="app-pin-error" className="text-xs text-danger" role="alert">
                {message}
              </p>
            )}
            <button
              type="submit"
              disabled={checking || pin.length < 4}
              className="press h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {checking ? "Verifica…" : "Sblocca"}
            </button>
          </form>
        )}

        <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
          Il PIN è verificato su questo dispositivo. Non viene inviato a Supabase o GitHub.
        </p>
      </section>
    </main>
  );
}
