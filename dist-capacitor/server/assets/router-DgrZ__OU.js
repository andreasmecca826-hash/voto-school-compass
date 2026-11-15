import { n as claimSchoolDataAccess, r as supabase, t as PRIVATE_SCHOOL_DATA_URL } from "./supabase-auth-BEdIbH2_.js";
import { C as fetchVotoData, b as SchoolAuthContext, t as VotoProvider } from "./store-EhdD6Ug3.js";
import { n as load, r as save, t as KEYS } from "./storage-D7ptFFhi.js";
import { t as SchoolPeriodsProvider } from "./periods-context-BiByHTyY.js";
import { t as StudyProvider } from "./study-context-BQIH1Rbo.js";
import { t as AppShell } from "./AppShell-BD8bYCa-.js";
import { a as verifyPinAgainstRecord, i as removePinLockRecord, o as writePinLockRecord, r as readPinLockRecord, s as AppPinLockContext, t as createPinLockRecord } from "./app-pin-lock-DONkOBCJ.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { LockKeyhole } from "lucide-react";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
//#region src/styles.css?url
var styles_default = "/assets/styles-D-TjqXVe.css";
var DEMO_ACCESS_CODE = ({
	"BASE_URL": "/",
	"DEV": false,
	"MODE": "production",
	"PROD": true,
	"SSR": true,
	"TSS_DEV_SERVER": "false",
	"TSS_DEV_SSR_STYLES_BASEPATH": "/",
	"TSS_DEV_SSR_STYLES_ENABLED": "true",
	"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
	"TSS_INLINE_CSS_ENABLED": "false",
	"TSS_ROUTER_BASEPATH": "",
	"TSS_SERVER_FN_BASE": "/_serverFn/"
}["VITE_DEMO_ACCESS_CODE"] || "21/06/27").trim().toUpperCase();
function isDemoAccessCode(value) {
	const normalized = value.trim().replace(/\s+/g, "-").toUpperCase();
	return normalized.length > 0 && normalized === DEMO_ACCESS_CODE;
}
//#endregion
//#region src/components/voto/SchoolDataAuthGate.tsx
var OWNER_KEY = "voto.privateOwnerId";
function SchoolDataAuthGate({ children }) {
	const [step, setStep] = useState("checking");
	const [session, setSession] = useState(null);
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [claimCode, setClaimCode] = useState("");
	const [demoCode, setDemoCode] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const sessionRef = useRef(null);
	const prefetchedDataRef = useRef(null);
	const consumePrefetchedData = useCallback(() => {
		const pending = prefetchedDataRef.current;
		if (!pending) return null;
		if (pending.ownerId !== sessionRef.current?.user.id) {
			prefetchedDataRef.current = null;
			return null;
		}
		prefetchedDataRef.current = null;
		return {
			url: pending.url,
			data: pending.data,
			lastSync: pending.lastSync
		};
	}, []);
	async function activate(userSession) {
		save(KEYS.demoMode, false);
		sessionRef.current = userSession;
		setSession(userSession);
		save(KEYS.url, PRIVATE_SCHOOL_DATA_URL);
		const cached = load(KEYS.cache, null);
		if (load(OWNER_KEY, "") === userSession.user.id && cached && typeof cached === "object") {
			setStep("ready");
			return;
		}
		prefetchedDataRef.current = null;
		try {
			const data = await fetchVotoData(PRIVATE_SCHOOL_DATA_URL);
			const lastSync = (/* @__PURE__ */ new Date()).toISOString();
			save(KEYS.cache, data);
			save(KEYS.lastSync, lastSync);
			save(OWNER_KEY, userSession.user.id);
			prefetchedDataRef.current = {
				ownerId: userSession.user.id,
				url: PRIVATE_SCHOOL_DATA_URL,
				data,
				lastSync
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
		const savedDemoMode = load(KEYS.demoMode, false) === true;
		if (savedDemoMode) setStep("ready");
		supabase.auth.getSession().then(({ data, error: sessionError }) => {
			if (!mounted) return;
			if (savedDemoMode) return;
			if (sessionError || !data.session) {
				setStep("email");
				return;
			}
			activate(data.session);
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
					if (mounted) activate(nextSession);
				}, 0);
			}
		});
		return () => {
			mounted = false;
			data.subscription.unsubscribe();
		};
	}, []);
	async function requestOtp(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const normalizedEmail = email.trim().toLowerCase();
			const { error: otpError } = await supabase.auth.signInWithOtp({
				email: normalizedEmail,
				options: {
					shouldCreateUser: true,
					emailRedirectTo: "https://voto-school-compass.lovable.app"
				}
			});
			if (otpError) throw otpError;
			setEmail(normalizedEmail);
			setStep("otp");
		} catch (caught) {
			const status = typeof caught === "object" && caught !== null && "status" in caught ? caught.status : void 0;
			const code = typeof caught === "object" && caught !== null && "code" in caught ? caught.code : void 0;
			if (status === 429 || code === "over_email_send_rate_limit") setError("Limite temporaneo di invio email raggiunto. Attendi prima di richiedere un altro link.");
			else if (caught instanceof Error && /redirect url/i.test(caught.message)) setError("Il link di ritorno non è autorizzato. Contatta l’assistenza VOTO.");
			else setError("Non riesco a inviare il link. Controlla l’indirizzo email e riprova.");
		} finally {
			setBusy(false);
		}
	}
	async function verifyOtp(event) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const { data, error: verifyError } = await supabase.auth.verifyOtp({
				email: email.trim().toLowerCase(),
				token: otp.trim(),
				type: "email"
			});
			if (verifyError || !data.session) throw verifyError ?? /* @__PURE__ */ new Error("Sessione non disponibile.");
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
			if (sessionError || !data.session) throw sessionError ?? /* @__PURE__ */ new Error("Link non ancora verificato.");
			await activate(data.session);
		} catch {
			setError("Non trovo ancora una sessione attiva. Apri il link più recente ricevuto via email.");
		} finally {
			setBusy(false);
		}
	}
	async function claimAccess(event) {
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
	async function enterDemo(event) {
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
	if (step === "ready") return /* @__PURE__ */ jsx(SchoolAuthContext.Provider, {
		value: {
			email: session?.user.email ?? "",
			signOut,
			consumePrefetchedData
		},
		children
	});
	return /* @__PURE__ */ jsx("main", {
		className: "flex min-h-dvh items-center justify-center bg-background px-5 py-10 text-foreground",
		children: /* @__PURE__ */ jsxs("section", {
			className: "w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "mb-6 text-center",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "font-display text-3xl font-bold tracking-tight",
							children: "VOTO."
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "mt-4 text-xl font-semibold",
							children: step === "checking" ? "Verifico l’accesso" : step === "otp" ? "Controlla la tua email" : step === "claim" ? "Attiva questo account" : step === "retry" ? "Dati non disponibili" : "Accedi a VOTO"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 text-sm leading-6 text-muted-foreground",
							children: "I dati scolastici sono conservati in uno spazio privato. L’accesso resta memorizzato su questo dispositivo."
						})
					]
				}),
				step === "checking" && /* @__PURE__ */ jsx("p", {
					className: "text-center text-sm text-muted-foreground",
					children: "Un momento…"
				}),
				step === "email" && /* @__PURE__ */ jsxs("div", {
					className: "space-y-6",
					children: [
						/* @__PURE__ */ jsxs("form", {
							onSubmit: requestOtp,
							className: "space-y-4",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "block text-sm font-medium",
									htmlFor: "school-email",
									children: "Email"
								}),
								/* @__PURE__ */ jsx("input", {
									id: "school-email",
									type: "email",
									autoComplete: "email",
									required: true,
									value: email,
									onChange: (event) => setEmail(event.target.value),
									className: "w-full rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
								}),
								/* @__PURE__ */ jsx("button", {
									disabled: busy,
									className: "w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60",
									children: busy ? "Invio…" : "Invia link di accesso"
								})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3 text-xs text-muted-foreground",
							children: [
								/* @__PURE__ */ jsx("span", { className: "h-px flex-1 bg-border" }),
								/* @__PURE__ */ jsx("span", { children: "SVILUPPATORE" }),
								/* @__PURE__ */ jsx("span", { className: "h-px flex-1 bg-border" })
							]
						}),
						/* @__PURE__ */ jsxs("form", {
							onSubmit: enterDemo,
							className: "space-y-3",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "block text-sm font-medium",
									htmlFor: "demo-access-code",
									children: "Codice modalità demo"
								}),
								/* @__PURE__ */ jsx("input", {
									id: "demo-access-code",
									type: "password",
									autoComplete: "off",
									value: demoCode,
									onChange: (event) => setDemoCode(event.target.value),
									placeholder: "Inserisci il codice sviluppatore",
									className: "w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-base outline-none focus:ring-2 focus:ring-primary"
								}),
								/* @__PURE__ */ jsx("button", {
									disabled: busy || !demoCode.trim(),
									className: "w-full rounded-xl border border-primary px-4 py-3 font-semibold text-primary disabled:opacity-60",
									children: "Entra in modalità demo"
								})
							]
						})
					]
				}),
				step === "otp" && /* @__PURE__ */ jsxs("form", {
					onSubmit: verifyOtp,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted-foreground",
							children: [
								"Abbiamo inviato un link a ",
								email,
								". Aprilo per completare l’accesso; ti riporterà a VOTO. Se hai già aperto il link, tocca il pulsante qui sotto."
							]
						}),
						/* @__PURE__ */ jsx("label", {
							className: "block text-sm font-medium",
							htmlFor: "email-otp",
							children: "Codice email (se presente)"
						}),
						/* @__PURE__ */ jsx("input", {
							id: "email-otp",
							inputMode: "numeric",
							autoComplete: "one-time-code",
							value: otp,
							onChange: (event) => setOtp(event.target.value),
							className: "w-full rounded-xl border border-border bg-background px-4 py-3 text-base tracking-[0.2em] outline-none focus:ring-2 focus:ring-primary"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							disabled: busy,
							onClick: () => void checkEmailLinkSession(),
							className: "w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60",
							children: busy ? "Controllo…" : "Ho aperto il link: continua"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							disabled: busy || !otp.trim(),
							className: "w-full rounded-xl border border-border px-4 py-3 font-semibold disabled:opacity-60",
							children: busy ? "Verifica…" : "Usa il codice email"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setStep("email"),
							className: "w-full py-2 text-sm text-muted-foreground",
							children: "Cambia email"
						})
					]
				}),
				step === "claim" && /* @__PURE__ */ jsxs("form", {
					onSubmit: claimAccess,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ jsxs("p", {
							className: "text-sm text-muted-foreground",
							children: [
								"Il codice autorizza una sola volta l’account ",
								session?.user.email,
								". Se non è l’indirizzo giusto, esci prima: dopo l’attivazione questo sarà l’unico account autorizzato."
							]
						}),
						/* @__PURE__ */ jsx("label", {
							className: "block text-sm font-medium",
							htmlFor: "school-claim-code",
							children: "Codice monouso"
						}),
						/* @__PURE__ */ jsx("input", {
							id: "school-claim-code",
							autoComplete: "off",
							required: true,
							value: claimCode,
							onChange: (event) => setClaimCode(event.target.value.toUpperCase()),
							className: "w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-base tracking-wider outline-none focus:ring-2 focus:ring-primary"
						}),
						/* @__PURE__ */ jsx("button", {
							disabled: busy,
							className: "w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60",
							children: busy ? "Attivazione…" : "Attiva account"
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => void signOut(),
							className: "w-full py-2 text-sm text-muted-foreground",
							children: "Esci e cambia email"
						})
					]
				}),
				step === "retry" && /* @__PURE__ */ jsxs("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted-foreground",
							children: error || "Il servizio privato non è ancora pronto."
						}),
						/* @__PURE__ */ jsx("button", {
							disabled: busy || !session,
							onClick: () => session && void activate(session),
							className: "w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60",
							children: busy ? "Riprovo…" : "Riprova"
						}),
						/* @__PURE__ */ jsx("button", {
							onClick: () => void signOut(),
							className: "w-full py-2 text-sm text-muted-foreground",
							children: "Esci"
						})
					]
				}),
				error && step !== "retry" && /* @__PURE__ */ jsx("p", {
					role: "alert",
					className: "mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive",
					children: error
				})
			]
		})
	});
}
//#endregion
//#region src/components/voto/AppPinLockProvider.tsx
function AppPinLockProvider({ children }) {
	const [ready, setReady] = useState(false);
	const [hasPin, setHasPin] = useState(false);
	const [locked, setLocked] = useState(false);
	const [recordError, setRecordError] = useState(null);
	const hasPinRef = useRef(false);
	const pinInputRef = useRef(null);
	useEffect(() => {
		try {
			const record = readPinLockRecord();
			const enabled = Boolean(record);
			setHasPin(enabled);
			setLocked(enabled);
		} catch (error) {
			setHasPin(true);
			setLocked(true);
			setRecordError(error instanceof Error ? error.message : "Impossibile leggere il PIN salvato.");
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
	const savePin = useCallback(async (pin) => {
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
	const unlockWithPin = useCallback(async (pin) => {
		const record = readPinLockRecord();
		if (!record) {
			setHasPin(false);
			setLocked(false);
			return true;
		}
		const valid = await verifyPinAgainstRecord(pin, record);
		if (valid) setLocked(false);
		return valid;
	}, []);
	const value = useMemo(() => ({
		hasPin,
		savePin,
		removePin,
		lockNow
	}), [
		hasPin,
		savePin,
		removePin,
		lockNow
	]);
	return /* @__PURE__ */ jsx(AppPinLockContext.Provider, {
		value,
		children: !ready ? /* @__PURE__ */ jsx("div", {
			className: "flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground",
			children: "Apertura sicura…"
		}) : locked ? /* @__PURE__ */ jsx(PinLockScreen, {
			inputRef: pinInputRef,
			recordError,
			onUnlock: unlockWithPin
		}) : children
	});
}
function PinLockScreen({ inputRef, recordError, onUnlock }) {
	const [pin, setPin] = useState("");
	const [message, setMessage] = useState("");
	const [checking, setChecking] = useState(false);
	const submit = async (event) => {
		event.preventDefault();
		if (recordError) return;
		setChecking(true);
		setMessage("");
		try {
			if (await onUnlock(pin)) setPin("");
			else {
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
	return /* @__PURE__ */ jsx("main", {
		className: "flex min-h-dvh items-center justify-center bg-background px-5 py-8",
		children: /* @__PURE__ */ jsxs("section", {
			className: "card-surface w-full max-w-sm p-6 text-center",
			"aria-label": "Blocco PIN VOTO",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ jsx(LockKeyhole, {
						className: "h-7 w-7",
						"aria-hidden": "true"
					})
				}),
				/* @__PURE__ */ jsx("h1", {
					className: "mt-5 font-display text-2xl font-semibold",
					children: "Accesso bloccato"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Inserisci il PIN per continuare."
				}),
				recordError ? /* @__PURE__ */ jsxs("p", {
					className: "mt-5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-left text-xs text-danger",
					role: "alert",
					children: [recordError, " La cancellazione dei dati locali può rimuovere anche preferenze e collegamento ai dati."]
				}) : /* @__PURE__ */ jsxs("form", {
					onSubmit: submit,
					className: "mt-5 space-y-3",
					children: [
						/* @__PURE__ */ jsx("label", {
							className: "sr-only",
							htmlFor: "app-pin-unlock",
							children: "PIN app"
						}),
						/* @__PURE__ */ jsx("input", {
							ref: inputRef,
							id: "app-pin-unlock",
							type: "password",
							inputMode: "numeric",
							pattern: "[0-9]*",
							autoComplete: "current-password",
							maxLength: 8,
							value: pin,
							onChange: (event) => {
								setPin(event.target.value.replace(/\D/g, "").slice(0, 8));
								setMessage("");
							},
							className: "h-12 w-full rounded-xl border border-input bg-background px-4 text-center text-lg tracking-[0.35em]",
							"aria-invalid": Boolean(message),
							"aria-describedby": message ? "app-pin-error" : void 0,
							autoFocus: true,
							required: true
						}),
						message && /* @__PURE__ */ jsx("p", {
							id: "app-pin-error",
							className: "text-xs text-danger",
							role: "alert",
							children: message
						}),
						/* @__PURE__ */ jsx("button", {
							type: "submit",
							disabled: checking || pin.length < 4,
							className: "press h-12 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50",
							children: checking ? "Verifica…" : "Sblocca"
						})
					]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-5 text-[11px] leading-relaxed text-muted-foreground",
					children: "Il PIN è verificato su questo dispositivo. Non viene inviato a Supabase o GitHub."
				})
			]
		})
	});
}
//#endregion
//#region src/routes/__root.tsx
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "font-display text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Pagina non trovata."
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/",
					className: "mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
					children: "Torna alla dashboard"
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	const router = useRouter();
	useEffect(() => {
		const msg = String(error?.message ?? "");
		if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(msg)) {
			const KEY = "voto.chunkReloadAt";
			const last = Number(sessionStorage.getItem(KEY) || 0);
			if (Date.now() - last > 1e4) {
				sessionStorage.setItem(KEY, String(Date.now()));
				window.location.reload();
				return;
			}
		}
		console.error("Errore nell'applicazione VOTO:", error);
	}, [error]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [/* @__PURE__ */ jsx("h1", {
				className: "text-xl font-semibold text-foreground",
				children: "Qualcosa è andato storto"
			}), /* @__PURE__ */ jsx("button", {
				onClick: () => {
					router.invalidate();
					reset();
				},
				className: "mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
				children: "Riprova"
			})]
		})
	});
}
var Route$19 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover"
			},
			{
				name: "theme-color",
				content: "#090909"
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black-translucent"
			},
			{ title: "VOTO. — La tua dashboard scolastica" },
			{
				name: "description",
				content: "Medie, voti, compiti e avvisi della scuola in un'unica app."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest"
			},
			{
				rel: "icon",
				href: "/icon.svg",
				type: "image/svg+xml"
			},
			{
				rel: "apple-touch-icon",
				href: "/icon.svg"
			},
			{
				rel: "preload",
				href: "/fonts/manrope-latin-variable.woff2",
				as: "font",
				type: "font/woff2",
				crossOrigin: "anonymous"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "it",
		"data-accent": "rosso",
		"data-bg": "nero",
		"data-theme": "original",
		"data-mode": "scuro",
		"data-registry-style": "voto",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$19.useRouteContext();
	return /* @__PURE__ */ jsx(AppPinLockProvider, { children: /* @__PURE__ */ jsx(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ jsx(SchoolDataAuthGate, { children: /* @__PURE__ */ jsxs(VotoProvider, { children: [/* @__PURE__ */ jsx(SchoolPeriodsProvider, { children: /* @__PURE__ */ jsx(StudyProvider, { children: /* @__PURE__ */ jsx(AppShell, { children: /* @__PURE__ */ jsx(Outlet, {}) }) }) }), /* @__PURE__ */ jsx(Toaster, {
			theme: "dark",
			position: "top-center",
			toastOptions: { classNames: {
				toast: "!bg-popover !border-border !text-foreground",
				description: "!text-muted-foreground"
			} }
		})] }) })
	}) });
}
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$17 = () => import("./routes-DbAPAQ8c.js");
var Route$18 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Dashboard — VOTO." },
		{
			name: "description",
			content: "Media generale, presenze, compiti e comunicazioni scolastiche."
		},
		{
			property: "og:title",
			content: "Dashboard — VOTO."
		},
		{
			property: "og:description",
			content: "La tua dashboard scolastica personale."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$17, "component")
});
//#endregion
//#region src/routes/assenze.tsx
var $$splitComponentImporter$16 = () => import("./assenze-CX2rVrEU.js");
var Route$17 = createFileRoute("/assenze")({
	head: () => ({ meta: [{ title: "Assenze — VOTO." }, {
		name: "description",
		content: "Consulta i giorni di assenza registrati nel registro."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$16, "component")
});
//#endregion
//#region src/routes/assistente.tsx
var $$splitComponentImporter$15 = () => import("./assistente-7xCCVl8A.js");
var Route$16 = createFileRoute("/assistente")({
	head: () => ({ meta: [{ title: "Assistente — VOTO." }, {
		name: "description",
		content: "Assistente Locale e API per domande generali e documenti scolastici."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
//#endregion
//#region src/routes/bacheca.tsx
var $$splitComponentImporter$14 = () => import("./bacheca-27C_ii7B.js");
var Route$15 = createFileRoute("/bacheca")({
	head: () => ({ meta: [
		{ title: "Bacheca — VOTO." },
		{
			name: "description",
			content: "Circolari e avvisi della scuola."
		},
		{
			property: "og:title",
			content: "Bacheca — VOTO."
		},
		{
			property: "og:description",
			content: "Circolari e avvisi della scuola."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
//#endregion
//#region src/routes/calendario-assenze.tsx
var $$splitComponentImporter$13 = () => import("./calendario-assenze-CgNOtkg9.js");
var Route$14 = createFileRoute("/calendario-assenze")({
	head: () => ({ meta: [{ title: "Calendario presenze — VOTO." }, {
		name: "description",
		content: "Consulta il calendario annuale delle presenze e delle assenze."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
//#endregion
//#region src/routes/compiti.tsx
var $$splitComponentImporter$12 = () => import("./compiti-DCe41DjR.js");
var Route$13 = createFileRoute("/compiti")({
	head: () => ({ meta: [
		{ title: "Compiti — VOTO." },
		{
			name: "description",
			content: "Compiti di oggi, prossimi e completati."
		},
		{
			property: "og:title",
			content: "Compiti — VOTO."
		},
		{
			property: "og:description",
			content: "Compiti di oggi, prossimi e completati."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
//#endregion
//#region src/routes/diario.tsx
var $$splitComponentImporter$11 = () => import("./diario-CSJ3cU-m.js");
var Route$12 = createFileRoute("/diario")({
	head: () => ({ meta: [{ title: "Diario — VOTO." }, {
		name: "description",
		content: "Le attività svolte in classe dai professori."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
//#endregion
//#region src/routes/eventi-appello.tsx
var $$splitComponentImporter$10 = () => import("./eventi-appello-dYYwnCwF.js");
var Route$11 = createFileRoute("/eventi-appello")({
	head: () => ({ meta: [{ title: "Tutti gli eventi — VOTO." }, {
		name: "description",
		content: "Consulta assenze, ritardi e uscite in una schermata personalizzata."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
//#endregion
//#region src/routes/impostazioni.tsx
var $$splitComponentImporter$9 = () => import("./impostazioni-Cj2RA0Wn.js");
var Route$10 = createFileRoute("/impostazioni")({
	head: () => ({ meta: [
		{ title: "Impostazioni — VOTO." },
		{
			name: "description",
			content: "Accesso privato ai dati scolastici, tema e informazioni app."
		},
		{
			property: "og:title",
			content: "Impostazioni — VOTO."
		},
		{
			property: "og:description",
			content: "Accesso privato ai dati scolastici, tema e informazioni app."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
//#endregion
//#region src/routes/interrogazioni.tsx
var $$splitComponentImporter$8 = () => import("./interrogazioni-d9pu801i.js");
var Route$9 = createFileRoute("/interrogazioni")({
	head: () => ({ meta: [{ title: "Interrogazioni — VOTO." }, {
		name: "description",
		content: "Ricorda le prossime interrogazioni."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
//#endregion
//#region src/routes/note.tsx
var $$splitComponentImporter$7 = () => import("./note-BQTYFQi4.js");
var Route$8 = createFileRoute("/note")({
	head: () => ({ meta: [{ title: "Note — VOTO." }, {
		name: "description",
		content: "Note disciplinari e annotazioni dal registro scolastico."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
//#endregion
//#region src/routes/orario.tsx
var $$splitComponentImporter$6 = () => import("./orario-B1MwoSsz.js");
var Route$7 = createFileRoute("/orario")({
	head: () => ({ meta: [
		{ title: "Orario — VOTO." },
		{
			name: "description",
			content: "Il tuo orario scolastico dal lunedì al venerdì."
		},
		{
			property: "og:title",
			content: "Orario — VOTO."
		},
		{
			property: "og:description",
			content: "Il tuo orario scolastico settimanale."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
//#endregion
//#region src/routes/personalizza.tsx
var $$splitComponentImporter$5 = () => import("./personalizza-CMfOhIM0.js");
var Route$6 = createFileRoute("/personalizza")({
	head: () => ({ meta: [{ title: "Personalizza — VOTO." }, {
		name: "description",
		content: "Personalizza temi e Home di VOTO."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
//#endregion
//#region src/routes/professori.tsx
var $$splitComponentImporter$4 = () => import("./professori-Dz1sGFSs.js");
var Route$5 = createFileRoute("/professori")({
	head: () => ({ meta: [{ title: "Professori — VOTO." }, {
		name: "description",
		content: "Elenco dei docenti e delle materie."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
//#endregion
//#region src/routes/promemoria.tsx
var $$splitComponentImporter$3 = () => import("./promemoria-BBztKWj7.js");
var Route$4 = createFileRoute("/promemoria")({
	head: () => ({ meta: [{ title: "Promemoria — VOTO." }, {
		name: "description",
		content: "Promemoria sincronizzati dal registro DidUP."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
//#endregion
//#region src/routes/scrutini-infraperiodali.tsx
var $$splitComponentImporter$2 = () => import("./scrutini-infraperiodali-1K4W7s2a.js");
var Route$3 = createFileRoute("/scrutini-infraperiodali")({
	head: () => ({ meta: [{ title: "Scrutini infraperiodali — VOTO." }, {
		name: "description",
		content: "Crea e compila pagelle infraperiodali manuali."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
//#endregion
//#region src/routes/studio.tsx
var $$splitComponentImporter$1 = () => import("./studio-DJTLWI5L.js");
var Route$2 = createFileRoute("/studio")({
	head: () => ({ meta: [
		{ title: "Studio Lab — VOTO." },
		{
			name: "description",
			content: "Calcolatrice scientifica, conversioni, strumenti per documenti e planner di studio in un unico spazio."
		},
		{
			property: "og:title",
			content: "Studio Lab — VOTO."
		},
		{
			property: "og:description",
			content: "Il tuo spazio personale per studiare e preparare il prossimo voto."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
//#endregion
//#region src/routes/voti.tsx
var $$splitComponentImporter = () => import("./voti-kX2oUHAy.js");
var Route$1 = createFileRoute("/voti")({
	head: () => ({ meta: [
		{ title: "Voti — VOTO." },
		{
			name: "description",
			content: "Medie e voti per materia."
		},
		{
			property: "og:title",
			content: "Voti — VOTO."
		},
		{
			property: "og:description",
			content: "Medie e voti per materia."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
//#region src/lib/server/supabaseStorageAuth.ts
function normalizeSupabaseUrl(rawUrl) {
	const value = rawUrl.trim().replace(/\/+$/, "");
	if (!value) throw new Error("SUPABASE_URL non configurato.");
	if (/^https:\/\//i.test(value)) return value;
	if (/^http:\/\//i.test(value)) throw new Error("SUPABASE_URL deve usare HTTPS.");
	if (/^[a-z0-9]{20}$/i.test(value)) return `https://${value.toLowerCase()}.supabase.co`;
	return `https://${value}`;
}
//#endregion
//#region src/routes/api/circulars/mirror.ts
var DEFAULT_SUPABASE_URL = "https://jmvxuhgjejzpezvawzfw.supabase.co";
var DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bvXmryNOIbEw1vYUjeFoVw_lBUdU6v1";
var MAX_ATTACHMENT_BYTES = 26214400;
var MAX_RANGE_HEADER_LENGTH = 128;
var ATTACHMENT_REQUEST_TIMEOUT_MS = 45e3;
var SIGNED_URL_CACHE_TTL_MS = 3e5;
var MAX_SIGNED_URL_CACHE_ENTRIES = 64;
var signedUrlCache = /* @__PURE__ */ new Map();
var validPath = (value) => typeof value === "string" && /^\/?circulars\/[a-f0-9]{64}\.(pdf|docx)$/.test(value);
function config() {
	const rawUrl = process.env["VITE_SUPABASE_URL"]?.trim() || process.env["SUPABASE_URL"]?.trim() || DEFAULT_SUPABASE_URL;
	const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim() || process.env["VITE_SUPABASE_ANON_KEY"]?.trim() || process.env["SUPABASE_PUBLISHABLE_KEY"]?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
	return {
		url: normalizeSupabaseUrl(rawUrl),
		key
	};
}
function json(body, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" }
	});
}
var AttachmentTooLargeError = class extends Error {};
function parseSingleByteRange(value) {
	if (value === null) return { kind: "none" };
	const normalized = value.trim();
	const match = normalized.length <= MAX_RANGE_HEADER_LENGTH && /^bytes=(\d*)-(\d*)$/i.exec(normalized);
	if (!match) return { kind: "invalid" };
	const start = match[1] ?? "";
	const end = match[2] ?? "";
	if (!start && !end) return { kind: "invalid" };
	const startNumber = start ? Number(start) : void 0;
	const endNumber = end ? Number(end) : void 0;
	if (startNumber !== void 0 && !Number.isSafeInteger(startNumber) || endNumber !== void 0 && !Number.isSafeInteger(endNumber) || startNumber !== void 0 && endNumber !== void 0 && startNumber > endNumber) return { kind: "invalid" };
	return {
		kind: "valid",
		value: `bytes=${start}-${end}`
	};
}
function parseContentRange(value) {
	const match = value?.trim().match(/^bytes (\d+)-(\d+)\/(\d+)$/i);
	if (!match) return null;
	const start = Number(match[1]);
	const end = Number(match[2]);
	const total = Number(match[3]);
	if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !Number.isSafeInteger(total) || start > end || end >= total) return null;
	return {
		start,
		end,
		total
	};
}
function rangeNotSatisfiable(contentRange = "bytes */*") {
	return new Response(null, {
		status: 416,
		headers: {
			"accept-ranges": "bytes",
			"content-range": contentRange
		}
	});
}
async function cancelBody(body) {
	try {
		await body?.cancel();
	} catch {}
}
async function readLimitedAttachment(response) {
	const contentLength = Number(response.headers.get("content-length") ?? 0);
	if (Number.isFinite(contentLength) && contentLength > MAX_ATTACHMENT_BYTES) {
		await cancelBody(response.body);
		throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
	}
	const reader = response.body?.getReader();
	if (!reader) throw new Error("Il PDF non ha un contenuto leggibile.");
	const chunks = [];
	let totalBytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (totalBytes + value.byteLength > MAX_ATTACHMENT_BYTES) {
				try {
					await reader.cancel();
				} catch {}
				throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
			}
			chunks.push(value);
			totalBytes += value.byteLength;
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(totalBytes);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}
function limitedStream(body, maxBytes, controller, onFinish) {
	const reader = body.getReader();
	let totalBytes = 0;
	let finished = false;
	const finish = () => {
		if (finished) return;
		finished = true;
		onFinish();
	};
	return new ReadableStream({
		async pull(streamController) {
			try {
				const { done, value } = await reader.read();
				if (done) {
					finish();
					streamController.close();
					return;
				}
				if (totalBytes + value.byteLength > maxBytes) {
					try {
						await reader.cancel();
					} catch {}
					controller.abort();
					finish();
					streamController.error(new AttachmentTooLargeError("L'allegato supera il limite di 25 MB."));
					return;
				}
				totalBytes += value.byteLength;
				streamController.enqueue(value);
			} catch (error) {
				controller.abort();
				finish();
				streamController.error(error);
			}
		},
		async cancel(reason) {
			try {
				await reader.cancel(reason);
			} finally {
				controller.abort();
				finish();
			}
		}
	});
}
function attachmentDisposition(value, path) {
	const fallback = path.split("/").at(-1) ?? "allegato";
	const filename = Array.from(value?.trim() || fallback, (char) => {
		const code = char.charCodeAt(0);
		return char === "\\" || char === "/" || char === "\"" || code < 32 || code === 127 ? "_" : char;
	}).join("").replace(/\s+/g, " ").slice(0, 120);
	return `attachment; filename="${filename.normalize("NFKD").replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}
async function signedAttachmentUrl(project, path, signal) {
	const cacheKey = `${project.url}:${path}`;
	const cached = signedUrlCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) {
		signedUrlCache.delete(cacheKey);
		signedUrlCache.set(cacheKey, cached);
		return new URL(cached.url);
	}
	if (cached) signedUrlCache.delete(cacheKey);
	const response = await fetch(`${project.url}/functions/v1/mirror-circular`, {
		method: "POST",
		headers: {
			apikey: project.key,
			Authorization: `Bearer ${project.key}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ path }),
		signal
	});
	if (!response.ok) throw new Error(`sign_http_${response.status}`);
	const result = await response.json();
	if (result.path !== path || typeof result.signedUrl !== "string") throw new Error("signed_url_invalid");
	const url = new URL(result.signedUrl);
	if (url.protocol !== "https:" || url.origin !== project.url) throw new Error("signed_url_origin_invalid");
	signedUrlCache.set(cacheKey, {
		url: url.toString(),
		expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS
	});
	while (signedUrlCache.size > MAX_SIGNED_URL_CACHE_ENTRIES) {
		const oldestKey = signedUrlCache.keys().next().value;
		if (oldestKey === void 0) break;
		signedUrlCache.delete(oldestKey);
	}
	return url;
}
function responseHeaders(response, path, downloadName, contentLength, contentRange) {
	const contentType = path.endsWith(".docx") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/pdf";
	const headers = new Headers({
		"content-type": contentType,
		"content-disposition": downloadName ? attachmentDisposition(downloadName, path) : "inline",
		"cache-control": "private, max-age=300",
		"accept-ranges": "bytes"
	});
	if (contentLength !== void 0) headers.set("content-length", String(contentLength));
	const range = contentRange ?? response.headers.get("content-range");
	if (range) headers.set("content-range", range);
	for (const name of ["etag", "last-modified"]) {
		const value = response.headers.get(name);
		if (value) headers.set(name, value);
	}
	return headers;
}
async function readPrivateAttachment(project, path, downloadName, rangeHeader) {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ATTACHMENT_REQUEST_TIMEOUT_MS);
	let streamOwnsTimeout = false;
	const clearTimeoutIfDone = () => clearTimeout(timeout);
	try {
		const signedUrl = await signedAttachmentUrl(project, path, controller.signal);
		const response = await fetch(signedUrl, {
			signal: controller.signal,
			...rangeHeader ? { headers: { Range: rangeHeader } } : {}
		});
		if (response.status === 416) {
			const unsatisfiedMatch = response.headers.get("content-range")?.match(/^bytes \*\/(\d+)$/i);
			if (unsatisfiedMatch && Number(unsatisfiedMatch[1]) > MAX_ATTACHMENT_BYTES) {
				await cancelBody(response.body);
				throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
			}
			await cancelBody(response.body);
			const headers = new Headers({ "accept-ranges": "bytes" });
			if (unsatisfiedMatch) headers.set("content-range", `bytes */${unsatisfiedMatch[1]}`);
			return new Response(null, {
				status: 416,
				headers
			});
		}
		if (response.status !== 200 && response.status !== 206) {
			await cancelBody(response.body);
			throw new Error(`storage_http_${response.status}`);
		}
		const parsedRange = response.status === 206 ? parseContentRange(response.headers.get("content-range")) : null;
		if (response.status === 206 && !parsedRange) {
			await cancelBody(response.body);
			throw new Error("storage_content_range_invalid");
		}
		if (parsedRange && parsedRange.total > MAX_ATTACHMENT_BYTES) {
			await cancelBody(response.body);
			throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
		}
		const rawContentLength = response.headers.get("content-length");
		let contentLength;
		if (rawContentLength !== null) {
			const parsedLength = Number(rawContentLength);
			if (!/^\d+$/.test(rawContentLength) || !Number.isSafeInteger(parsedLength)) {
				await cancelBody(response.body);
				throw new Error("storage_content_length_invalid");
			}
			contentLength = parsedLength;
		}
		const rangeLength = parsedRange ? parsedRange.end - parsedRange.start + 1 : void 0;
		const byteLimit = rangeLength ?? MAX_ATTACHMENT_BYTES;
		if (contentLength !== void 0 && contentLength > byteLimit) {
			await cancelBody(response.body);
			throw new AttachmentTooLargeError("L'allegato supera il limite di 25 MB.");
		}
		if (rangeLength !== void 0 && contentLength !== void 0 && contentLength !== rangeLength) {
			await cancelBody(response.body);
			throw new Error("storage_range_length_invalid");
		}
		if (!response.body) throw new Error("Il PDF non ha un contenuto leggibile.");
		if (response.status === 200 && contentLength === void 0) {
			const bytes = await readLimitedAttachment(response);
			return new Response(bytes, {
				status: 200,
				headers: responseHeaders(response, path, downloadName ?? null, bytes.byteLength)
			});
		}
		const headers = responseHeaders(response, path, downloadName ?? null, contentLength ?? rangeLength, parsedRange ? response.headers.get("content-range") ?? void 0 : void 0);
		const body = limitedStream(response.body, byteLimit, controller, clearTimeoutIfDone);
		const streamedResponse = new Response(body, {
			status: response.status,
			headers
		});
		streamOwnsTimeout = true;
		return streamedResponse;
	} finally {
		if (!streamOwnsTimeout) clearTimeoutIfDone();
	}
}
async function handleCircularMirrorGet(request) {
	try {
		const params = new URL(request.url).searchParams;
		const path = params.get("path")?.replace(/^\/+/, "") ?? null;
		if (!validPath(path)) return json({ error: "Path allegato non valido" }, 400);
		const range = parseSingleByteRange(request.headers.get("range"));
		if (range.kind === "invalid") return rangeNotSatisfiable();
		const downloadName = params.get("download") === "1" ? params.get("filename") ?? "circolare.pdf" : null;
		return await readPrivateAttachment(config(), path, downloadName, range.kind === "valid" ? range.value : void 0);
	} catch (error) {
		if (error instanceof AttachmentTooLargeError) return json({ error: error.message }, 413);
		console.error("circular download failed", { errorType: error instanceof Error ? error.message : "UnknownError" });
		return json({ error: "Allegato non disponibile nello storage interno" }, 502);
	}
}
var Route = createFileRoute("/api/circulars/mirror")({ server: { handlers: {
	GET: async ({ request }) => handleCircularMirrorGet(request),
	POST: async () => json({ error: "Il download da link esterni è disabilitato." }, 410)
} } });
//#endregion
//#region src/routeTree.gen.ts
var rootRouteChildren = {
	IndexRoute: Route$18.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$19
	}),
	AssenzeRoute: Route$17.update({
		id: "/assenze",
		path: "/assenze",
		getParentRoute: () => Route$19
	}),
	AssistenteRoute: Route$16.update({
		id: "/assistente",
		path: "/assistente",
		getParentRoute: () => Route$19
	}),
	BachecaRoute: Route$15.update({
		id: "/bacheca",
		path: "/bacheca",
		getParentRoute: () => Route$19
	}),
	CalendarioAssenzeRoute: Route$14.update({
		id: "/calendario-assenze",
		path: "/calendario-assenze",
		getParentRoute: () => Route$19
	}),
	CompitiRoute: Route$13.update({
		id: "/compiti",
		path: "/compiti",
		getParentRoute: () => Route$19
	}),
	DiarioRoute: Route$12.update({
		id: "/diario",
		path: "/diario",
		getParentRoute: () => Route$19
	}),
	EventiAppelloRoute: Route$11.update({
		id: "/eventi-appello",
		path: "/eventi-appello",
		getParentRoute: () => Route$19
	}),
	ImpostazioniRoute: Route$10.update({
		id: "/impostazioni",
		path: "/impostazioni",
		getParentRoute: () => Route$19
	}),
	InterrogazioniRoute: Route$9.update({
		id: "/interrogazioni",
		path: "/interrogazioni",
		getParentRoute: () => Route$19
	}),
	NoteRoute: Route$8.update({
		id: "/note",
		path: "/note",
		getParentRoute: () => Route$19
	}),
	OrarioRoute: Route$7.update({
		id: "/orario",
		path: "/orario",
		getParentRoute: () => Route$19
	}),
	PersonalizzaRoute: Route$6.update({
		id: "/personalizza",
		path: "/personalizza",
		getParentRoute: () => Route$19
	}),
	ProfessoriRoute: Route$5.update({
		id: "/professori",
		path: "/professori",
		getParentRoute: () => Route$19
	}),
	PromemoriaRoute: Route$4.update({
		id: "/promemoria",
		path: "/promemoria",
		getParentRoute: () => Route$19
	}),
	ScrutiniInfraperiodaliRoute: Route$3.update({
		id: "/scrutini-infraperiodali",
		path: "/scrutini-infraperiodali",
		getParentRoute: () => Route$19
	}),
	StudioRoute: Route$2.update({
		id: "/studio",
		path: "/studio",
		getParentRoute: () => Route$19
	}),
	VotiRoute: Route$1.update({
		id: "/voti",
		path: "/voti",
		getParentRoute: () => Route$19
	}),
	ApiCircularsMirrorRoute: Route.update({
		id: "/api/circulars/mirror",
		path: "/api/circulars/mirror",
		getParentRoute: () => Route$19
	})
};
var routeTree = Route$19._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
if (typeof window !== "undefined") {
	const KEY = "voto.chunkReloadAt";
	const reloadOnce = () => {
		const last = Number(sessionStorage.getItem(KEY) || 0);
		if (Date.now() - last < 1e4) return;
		sessionStorage.setItem(KEY, String(Date.now()));
		window.location.reload();
	};
	window.addEventListener("vite:preloadError", (e) => {
		e.preventDefault();
		reloadOnce();
	});
	window.addEventListener("unhandledrejection", (e) => {
		const msg = String(e.reason?.message ?? e.reason ?? "");
		if (/dynamically imported module|Importing a module script failed|error loading dynamically/i.test(msg)) {
			e.preventDefault();
			reloadOnce();
		}
	});
}
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
