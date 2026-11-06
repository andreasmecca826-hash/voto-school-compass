import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { claimSchoolDataAccess, PRIVATE_SCHOOL_DATA_URL, supabase } from "@/lib/supabase-auth";
import { SchoolAuthContext } from "@/lib/school-auth-context";
import { fetchVotoData } from "@/lib/voto/parse";
import { KEYS, load, save } from "@/lib/voto/storage";

const OWNER_KEY = "voto.privateOwnerId";
type Step = "checking" | "email" | "otp" | "claim" | "retry" | "ready";

export function SchoolDataAuthGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function activate(userSession: Session) {
    setSession(userSession);
    save(KEYS.url, PRIVATE_SCHOOL_DATA_URL);
    const cached = load<unknown>(KEYS.cache, null);
    const cachedOwner = load<string>(OWNER_KEY, "");
    if (cachedOwner === userSession.user.id && cached && typeof cached === "object") {
      setStep("ready");
      return;
    }
    try {
      const data = await fetchVotoData(PRIVATE_SCHOOL_DATA_URL);
      save(KEYS.cache, data);
      save(KEYS.lastSync, new Date().toISOString());
      save(OWNER_KEY, userSession.user.id);
      setError("");
      setStep("ready");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Caricamento non riuscito.";
      if (message.startsWith("PRIVATE_DATA_FORBIDDEN:")) {
        setStep("claim");
        setError("");
      } else if (message.startsWith("PRIVATE_DATA_UNAUTHENTICATED:")) {
        setSession(null);
        setStep("email");
        setError("La sessione è scaduta. Accedi di nuovo.");
      } else {
        setStep("retry");
        setError(message);
      }
    }
  }

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError || !data.session) {
        setStep("email");
        return;
      }
      void activate(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT" && mounted) {
        setSession(null);
        setStep("email");
        setError("");
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function requestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: "https://voto-school-compass.lovable.app",
        },
      });
      if (otpError) throw otpError;
      setEmail(normalizedEmail);
      setStep("otp");
    } catch {
      setError("Non riesco a inviare il codice. Controlla l’indirizzo email e riprova.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp.trim(),
        type: "email",
      });
      if (verifyError || !data.session) throw verifyError ?? new Error("Sessione non disponibile.");
      await activate(data.session);
    } catch {
      setError("Codice email non valido o scaduto. Richiedine uno nuovo.");
    } finally {
      setBusy(false);
    }
  }

  async function claimAccess(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await claimSchoolDataAccess(claimCode.trim());
      save(OWNER_KEY, session.user.id);
      setClaimCode("");
      await activate(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Codice non accettato.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setStep("email");
  }

  if (step === "ready") {
    return (
      <SchoolAuthContext.Provider value={{ email: session?.user.email ?? "", signOut }}>
        {children}
      </SchoolAuthContext.Provider>
    );
  }

  const title =
    step === "checking"
      ? "Verifico l’accesso"
      : step === "otp"
        ? "Controlla la tua email"
        : step === "claim"
          ? "Attiva questo account"
          : step === "retry"
            ? "Dati non disponibili"
            : "Accedi a VOTO";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl font-bold tracking-tight">VOTO.</p>
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            I dati scolastici sono conservati in uno spazio privato. L’accesso resta memorizzato su
            questo dispositivo.
          </p>
        </div>

        {step === "checking" && (
          <p className="text-center text-sm text-muted-foreground">Un momento…</p>
        )}

        {step === "email" && (
          <form onSubmit={requestOtp} className="space-y-4">
            <label className="block text-sm font-medium" htmlFor="school-email">
              Email
            </label>
            <input
              id="school-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Invio…" : "Invia link di accesso"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Abbiamo inviato un link a {email}. Aprilo per completare l’accesso; ti riporterà a
              VOTO.
            </p>
            <label className="block text-sm font-medium" htmlFor="email-otp">
              Codice email (se presente)
            </label>
            <input
              id="email-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base tracking-[0.2em] outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Verifica…" : "Verifica e continua"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full py-2 text-sm text-muted-foreground"
            >
              Cambia email
            </button>
          </form>
        )}

        {step === "claim" && (
          <form onSubmit={claimAccess} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Il codice autorizza una sola volta l’account {session?.user.email}. Se non è
              l’indirizzo giusto, esci prima: dopo l’attivazione questo sarà l’unico account
              autorizzato.
            </p>
            <label className="block text-sm font-medium" htmlFor="school-claim-code">
              Codice monouso
            </label>
            <input
              id="school-claim-code"
              autoComplete="off"
              required
              value={claimCode}
              onChange={(event) => setClaimCode(event.target.value.toUpperCase())}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-base tracking-wider outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              disabled={busy}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Attivazione…" : "Attiva account"}
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full py-2 text-sm text-muted-foreground"
            >
              Esci e cambia email
            </button>
          </form>
        )}

        {step === "retry" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error || "Il servizio privato non è ancora pronto."}
            </p>
            <button
              disabled={busy || !session}
              onClick={() => session && void activate(session)}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Riprovo…" : "Riprova"}
            </button>
            <button
              onClick={() => void signOut()}
              className="w-full py-2 text-sm text-muted-foreground"
            >
              Esci
            </button>
          </div>
        )}

        {error && step !== "retry" && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
