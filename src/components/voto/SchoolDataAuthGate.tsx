import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { claimSchoolDataAccess, PRIVATE_SCHOOL_DATA_URL, supabase } from "@/lib/supabase-auth";
import { SchoolAuthContext, type PrefetchedSchoolData } from "@/lib/school-auth-context";
import { fetchVotoData } from "@/lib/voto/parse";
import { KEYS, load, save } from "@/lib/voto/storage";
import { isDemoAccessCode } from "@/lib/demo-access";

const OWNER_KEY = "voto.privateOwnerId";
type Step = "checking" | "email" | "otp" | "claim" | "retry" | "ready";

export function SchoolDataAuthGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const prefetchedDataRef = useRef<(PrefetchedSchoolData & { ownerId: string }) | null>(null);

  const consumePrefetchedData = useCallback((): PrefetchedSchoolData | null => {
    const pending = prefetchedDataRef.current;
    if (!pending) return null;
    if (pending.ownerId !== sessionRef.current?.user.id) {
      prefetchedDataRef.current = null;
      return null;
    }
    prefetchedDataRef.current = null;
    return { url: pending.url, data: pending.data, lastSync: pending.lastSync };
  }, []);

  async function activate(userSession: Session) {
    save(KEYS.demoMode, false);
    sessionRef.current = userSession;
    setSession(userSession);
    save(KEYS.url, PRIVATE_SCHOOL_DATA_URL);
    const cached = load<unknown>(KEYS.cache, null);
    const cachedOwner = load<string>(OWNER_KEY, "");
    if (cachedOwner === userSession.user.id && cached && typeof cached === "object") {
      setStep("ready");
      return;
    }
    prefetchedDataRef.current = null;
    try {
      const data = await fetchVotoData(PRIVATE_SCHOOL_DATA_URL);
      const lastSync = new Date().toISOString();
      save(KEYS.cache, data);
      save(KEYS.lastSync, lastSync);
      save(OWNER_KEY, userSession.user.id);
      prefetchedDataRef.current = {
        ownerId: userSession.user.id,
        url: PRIVATE_SCHOOL_DATA_URL,
        data,
        lastSync,
      };
      setError("");
      setStep("ready");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Caricamento non riuscito.";
      if (message.startsWith("PRIVATE_DATA_FORBIDDEN:")) {
        setStep("claim");
        setError("");
      } else if (message.startsWith("PRIVATE_DATA_UNAUTHENTICATED:")) {
        sessionRef.current = null;
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
    const savedDemoMode = load<boolean>(KEYS.demoMode, false) === true;
    if (savedDemoMode) {
      setStep("ready");
    }
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (savedDemoMode) return;
      if (sessionError || !data.session) {
        setStep("email");
        return;
      }
      void activate(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (savedDemoMode) return;
      if (event === "SIGNED_OUT" && mounted) {
        sessionRef.current = null;
        prefetchedDataRef.current = null;
        setSession(null);
        setStep("email");
        setError("");
      } else if (event === "SIGNED_IN" && nextSession && mounted) {
        setStep("checking");
        setError("");
        window.setTimeout(() => {
          if (mounted) void activate(nextSession);
        }, 0);
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
    } catch (caught) {
      const status =
        typeof caught === "object" && caught !== null && "status" in caught
          ? caught.status
          : undefined;
      const code =
        typeof caught === "object" && caught !== null && "code" in caught ? caught.code : undefined;
      if (status === 429 || code === "over_email_send_rate_limit") {
        setError(
          "Limite temporaneo di invio email raggiunto. Attendi prima di richiedere un altro link.",
        );
      } else if (caught instanceof Error && /redirect url/i.test(caught.message)) {
        setError("Il link di ritorno non è autorizzato. Contatta l’assistenza VOTO.");
      } else {
        setError("Non riesco a inviare il link. Controlla l’indirizzo email e riprova.");
      }
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

  async function checkEmailLinkSession() {
    setBusy(true);
    setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session) {
        throw sessionError ?? new Error("Link non ancora verificato.");
      }
      await activate(data.session);
    } catch {
      setError(
        "Non trovo ancora una sessione attiva. Apri il link più recente ricevuto via email.",
      );
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

  const signOut = useCallback(async () => {
    sessionRef.current = null;
    prefetchedDataRef.current = null;
    save(KEYS.demoMode, false);
    await supabase.auth.signOut();
    setSession(null);
    setStep("email");
  }, []);

  async function enterDemo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    if (!isDemoAccessCode(demoCode)) {
      setError("Codice demo non valido.");
      setBusy(false);
      return;
    }
    await supabase.auth.signOut();
    sessionRef.current = null;
    prefetchedDataRef.current = null;
    save(KEYS.demoMode, true);
    save(KEYS.url, null);
    save(KEYS.lastSync, null);
    setSession(null);
    setDemoCode("");
    setStep("ready");
    setBusy(false);
  }

  if (step === "ready") {
    return (
      <SchoolAuthContext.Provider
        value={{ email: session?.user.email ?? "", signOut, consumePrefetchedData }}
      >
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
          <div className="space-y-6">
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
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>SVILUPPATORE</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={enterDemo} className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="demo-access-code">
                Codice modalità demo
              </label>
              <input
                id="demo-access-code"
                type="password"
                autoComplete="off"
                value={demoCode}
                onChange={(event) => setDemoCode(event.target.value)}
                placeholder="Inserisci il codice sviluppatore"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-base outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                disabled={busy || !demoCode.trim()}
                className="w-full rounded-xl border border-primary px-4 py-3 font-semibold text-primary disabled:opacity-60"
              >
                Entra in modalità demo
              </button>
            </form>
          </div>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Abbiamo inviato un link a {email}. Aprilo per completare l’accesso; ti riporterà a
              VOTO. Se hai già aperto il link, tocca il pulsante qui sotto.
            </p>
            <label className="block text-sm font-medium" htmlFor="email-otp">
              Codice email (se presente)
            </label>
            <input
              id="email-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base tracking-[0.2em] outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void checkEmailLinkSession()}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Controllo…" : "Ho aperto il link: continua"}
            </button>
            <button
              type="submit"
              disabled={busy || !otp.trim()}
              className="w-full rounded-xl border border-border px-4 py-3 font-semibold disabled:opacity-60"
            >
              {busy ? "Verifica…" : "Usa il codice email"}
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
