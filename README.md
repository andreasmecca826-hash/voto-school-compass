# VOTO.

Dashboard scolastica personale, mobile-first, in italiano.

## Setup

```
npm install
npm run dev
npm run build
```

## Dati scolastici privati

Il monitor DidUP pubblica `grades.json`, `state.json` e `history.md` nel bucket privato Supabase `school-data`; il workflow li ripristina da lì prima di ogni esecuzione. VOTO accede ai voti tramite l'Edge Function `school-data`, che richiede una sessione Supabase valida e autorizza un solo account. L'accesso usa il codice OTP numerico inviato all'email (da inserire nell'app, senza aprire il link) e resta memorizzato sul dispositivo; al primo accesso va inserito anche il codice di attivazione monouso.

La chiave `SUPABASE_SERVICE_ROLE_KEY` resta solo nei secret GitHub Actions e nell'ambiente server Supabase: non inserirla mai nell'app o in variabili `VITE_`. Il client usa soltanto la chiave publishable. Gli ultimi dati validi sono mantenuti in cache locale per un'apertura rapida e per l'uso temporaneo offline.

Il workflow non deve più committare i file scolastici su GitHub. La rimozione di un file dal branch non cancella però le copie già presenti nella cronologia Git: per eliminarle anche dalla storia serve una riscrittura della cronologia e il force-push coordinato.

## Monitoraggio errori (Sentry)

VOTO invia a Sentry gli errori gestiti dal confine globale dell'interfaccia, solo nelle build di produzione. La configurazione invia tipo d'errore e stack trace, ma rimuove messaggi, richieste, breadcrumb, utente e contesto; replay e tracing sono disattivati. Il DSN client è una chiave pubblica di ingestione e può essere sostituito con `VITE_SENTRY_DSN` durante la build. Non configurare mai qui token Sentry o credenziali private.

## PDF delle circolari

Il monitor DidUP acquisisce i PDF tramite la sessione autenticata e li carica nel bucket privato Supabase Storage. Nel JSON salva `attachmentPath`, non un URL Argo da scaricare nuovamente. Quando l'app apre una circolare con path interno, la Edge Function `mirror-circular` crea un URL firmato valido un'ora; la funzione accetta solo path PDF già presenti nel bucket e non scarica link esterni. Nel repository del monitor configura i secrets GitHub `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Non inserire mai una service-role key nelle variabili `VITE_`.

## Controllo manuale delle circolari

Il pulsante **Controlla nuove circolari** avvia il workflow `check.yml`; viene bloccato se è già in corso un run o se il registro è stato controllato negli ultimi 15 minuti. Per abilitarlo, configura nel repository `voto-school-compass` il secret Actions `VOTO_CIRCULAR_TRIGGER_TOKEN`, usando un fine-grained token limitato al repository `didup-monitor` con permesso `Actions: Read and write`. Il workflow trasferisce il valore al secret runtime della Edge Function Supabase. Non inserirlo mai nel codice o in variabili `VITE_` e non inviarlo in chat.

L'app non richiede login: chiunque conosca il suo indirizzo può usare il pulsante, ma non può leggere il token GitHub e i run manuali sono limitati e deduplicati lato server/workflow. Per consentire l'avvio solo a te servirebbe aggiungere un'autenticazione all'app.

## APK Android (Capacitor)

```
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init VOTO it.voto.app
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

Usa sempre un URL HTTPS per il JSON.
