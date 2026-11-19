import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { claimSchoolDataAccess, PRIVATE_SCHOOL_DATA_URL, supabase } from "@/lib/supabase-auth";
import { SchoolAuthContext, type PrefetchedSchoolData } from "@/lib/school-auth-context";
import { fetchVotoData } from "@/lib/voto/parse";
import { KEYS, load, save } from "@/lib/voto/storage";
import { isDemoAccessCode } from "@/lib/demo-access";
import {
  clearNativeDidupSync,
  clearNativeSupabaseSession,
  getNativeSupabaseSession,
  persistNativeSupabaseSession,
} from "@/lib/native-didup-sync";

const OWNER_KEY = "voto.privateOwnerId";
type Step = "checking" | "email" | "link-sent" | "claim" | "retry" | "ready";

export function SchoolDataAuthGate({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<Step>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
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
    void persistNativeSupabaseSession(userSession)
      .then(async () => {
        if (Capacitor.isNativePlatform()) await supabase.auth.startAutoRefresh();
      })
      .catch(() => undefined);
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
        void clearNativeSupabaseSession();
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
    let appUrlListener: { remove: () => Promise<void> } | null = null;
    let appStateListener: { remove: () => Promise<void> } | null = null;

    const reconcileSession = async (): Promise<Session | null> => {
      const { data: localData } = await supabase.auth.getSession();
      let currentSession = localData.session;
      if (!Capacitor.isNativePlatform()) return currentSession;

      const nativeSession = await getNativeSupabaseSession();
      if (nativeSession) {
        const localExpiry = currentSession?.expires_at ?? 0;
        const nativeIsNewer =
          !currentSession ||
          nativeSession.expiresAt > localExpiry ||
          (nativeSession.expiresAt === localExpiry &&
            nativeSession.refreshToken !== currentSession.refresh_token);
        if (nativeIsNewer) {
          const { data: restored, error: restoreError } = await supabase.auth.setSession({
            access_token: nativeSession.accessToken,
            refresh_token: nativeSession.refreshToken,
          });
          if (restored.session) currentSession = restored.session;
          else if (!currentSession || (currentSession.expires_at ?? 0) <= Date.now() / 1000) {
            throw restoreError ?? new Error("La sessione VOTO salvata non è recuperabile.");
          }
        }
      }

      if (currentSession && (currentSession.expires_at ?? 0) <= Date.now() / 1000 + 60) {
        const { data: refreshed, error: refreshError } =
          await supabase.auth.refreshSession(currentSession);
        if (refreshed.session) currentSession = refreshed.session;
        else if ((currentSession.expires_at ?? 0) <= Date.now() / 1000) {
          throw refreshError ?? new Error("La sessione VOTO è scaduta.");
        }
      }
      return currentSession;
    };

    const handleAppUrl = async (url: string) => {
      if (!url.startsWith("it.voto.school://login-callback")) return;

      setStep("checking");
      setError("");

      try {
        const code = new URL(url).searchParams.get("code");
        if (!code) throw new Error("Codice PKCE mancante nel link di accesso.");

        const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

        if (authError && mounted) {
          setError("Non riesco a completare l'accesso. Richiedi un nuovo link email.");
          setStep("email");
        }
      } catch {
        if (mounted) {
          setError("Non riesco a completare l'accesso. Richiedi un nuovo link email.");
          setStep("email");
        }
      }
    };

    if (Capacitor.isNativePlatform()) {
      void App.addListener("appUrlOpen", ({ url }) => {
        void handleAppUrl(url);
      }).then((listener) => {
        appUrlListener = listener;
        if (!mounted) void listener.remove();
      });

      void App.getLaunchUrl().then((launch) => {
        if (launch?.url) void handleAppUrl(launch.url);
      });

      void App.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          void supabase.auth.stopAutoRefresh();
          return;
        }
        void reconcileSession()
          .then((activeSession) => {
            if (mounted && activeSession) void activate(activeSession);
          })
          .catch(() => undefined);
      }).then((listener) => {
        appStateListener = listener;
        if (!mounted) void listener.remove();
      });
    }

    // A demo scelta in una sessione precedente non deve sostituire il login al riavvio.
    save(KEYS.demoMode, false);

    void reconcileSession()
      .then((activeSession) => {
        if (!mounted) return;
        if (!activeSession) {
          setStep("email");
          return;
        }
        void activate(activeSession);
      })
      .catch(() => {
        if (!mounted) return;
        setStep("email");
        setError("La sessione VOTO non è recuperabile. Accedi di nuovo.");
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (nextSession) void persistNativeSupabaseSession(nextSession).catch(() => undefined);
      if (event === "SIGNED_OUT" && mounted) {
        void supabase.auth.stopAutoRefresh();
        void clearNativeSupabaseSession();
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
      if (appUrlListener) void appUrlListener.remove();
      if (appStateListener) void appStateListener.remove();
    };
  }, []);

  async function requestMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error: linkError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: Capacitor.isNativePlatform()
            ? "it.voto.school://login-callback"
            : "https://voto-school-compass.lovable.app",
        },
      });
      if (linkError) throw linkError;
      setEmail(normalizedEmail);
      setStep("link-sent");
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
    await clearNativeDidupSync();
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
    await clearNativeDidupSync();
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
      : step === "link-sent"
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
            <form onSubmit={requestMagicLink} className="space-y-4">
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

        {step === "link-sent" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Abbiamo inviato un link di accesso a {email}. Aprilo per completare l’accesso; VOTO
              proseguirà automaticamente. Se hai già aperto il link, puoi continuare qui sotto.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void checkEmailLinkSession()}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Controllo…" : "Ho aperto il link: continua"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full py-2 text-sm text-muted-foreground"
            >
              Cambia email o richiedi un nuovo link
            </button>
          </div>
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
