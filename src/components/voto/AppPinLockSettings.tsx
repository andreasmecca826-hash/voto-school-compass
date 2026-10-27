import { useState, type FormEvent } from "react";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { toast } from "sonner";
import { SectionTitle } from "@/components/voto/ui";
import { isValidPin, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "@/lib/voto/app-pin-lock";
import { useAppPinLock } from "@/lib/voto/app-pin-lock-context";

export function AppPinLockSettings() {
  const { hasPin, savePin, removePin, lockNow } = useAppPinLock();
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidPin(pin)) {
      toast.error(`Inserisci da ${PIN_MIN_LENGTH} a ${PIN_MAX_LENGTH} cifre.`);
      return;
    }
    if (pin !== confirmation) {
      toast.error("I due PIN non coincidono.");
      return;
    }
    setSaving(true);
    try {
      await savePin(pin);
      setPin("");
      setConfirmation("");
      toast.success(hasPin ? "PIN aggiornato." : "Blocco PIN attivato.");
    } catch (error) {
      toast.error("Non sono riuscito a salvare il PIN.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const disable = () => {
    if (!window.confirm("Disattivare il blocco PIN su questo dispositivo?")) return;
    try {
      removePin();
      setPin("");
      setConfirmation("");
      toast.success("Blocco PIN disattivato.");
    } catch {
      toast.error("Non sono riuscito a disattivare il PIN.");
    }
  };

  return (
    <>
      <SectionTitle>Blocco app</SectionTitle>
      <section className="card-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            {hasPin ? <LockKeyhole className="h-5 w-5" /> : <LockKeyholeOpen className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="text-sm font-semibold">{hasPin ? "PIN attivo" : "PIN disattivato"}</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {hasPin
                ? "Verrà richiesto all'apertura e al rientro nell'app."
                : "Imposta un PIN per bloccare l'app."}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="app-pin-new" className="text-xs text-muted-foreground">
              {hasPin ? "Nuovo PIN" : "PIN"}
            </label>
            <input
              id="app-pin-new"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              minLength={PIN_MIN_LENGTH}
              maxLength={PIN_MAX_LENGTH}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH))
              }
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm tracking-[0.2em]"
              placeholder={`${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} cifre`}
              required
            />
          </div>
          <div>
            <label htmlFor="app-pin-confirm" className="text-xs text-muted-foreground">
              Conferma PIN
            </label>
            <input
              id="app-pin-confirm"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="new-password"
              minLength={PIN_MIN_LENGTH}
              maxLength={PIN_MAX_LENGTH}
              value={confirmation}
              onChange={(event) =>
                setConfirmation(event.target.value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH))
              }
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm tracking-[0.2em]"
              placeholder="Ripeti il PIN"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Da {PIN_MIN_LENGTH} a {PIN_MAX_LENGTH} cifre; consiglio almeno 6.
          </p>
          <button
            type="submit"
            disabled={saving || pin.length < PIN_MIN_LENGTH || confirmation.length < PIN_MIN_LENGTH}
            className="press h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvataggio…" : hasPin ? "Cambia PIN" : "Attiva blocco PIN"}
          </button>
        </form>

        {hasPin && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={lockNow}
              className="press h-10 rounded-xl border border-border text-xs font-medium"
            >
              Blocca ora
            </button>
            <button
              type="button"
              onClick={disable}
              className="press h-10 rounded-xl border border-danger/30 text-xs font-medium text-danger"
            >
              Disattiva PIN
            </button>
          </div>
        )}

        <p className="mt-4 rounded-xl bg-surface p-3 text-[11px] leading-relaxed text-muted-foreground">
          VOTO conserva soltanto un verificatore derivato dal PIN e un sale casuale sul dispositivo;
          il PIN non viene inviato a Supabase o GitHub. Il blocco protegge la schermata, ma non
          cifra i dati e può essere rimosso da chi può cancellare i dati locali dell'app.
        </p>
      </section>
    </>
  );
}
