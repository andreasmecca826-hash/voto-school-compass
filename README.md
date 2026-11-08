# VOTO.

Dashboard scolastica personale, mobile-first, in italiano.

## Setup

```
npm install
npm run dev
npm run build
```

## Dati scolastici privati

Il monitor DidUP pubblica `grades.json`, `state.json` e `history.md` nel bucket privato Supabase `school-data`; il workflow li ripristina da lì prima di ogni esecuzione. VOTO accede ai voti tramite l'Edge Function `school-data`, che richiede una sessione Supabase valida e autorizza un solo account. L'accesso usa il link email con redirect esplicito a `https://voto-school-compass.lovable.app` (oppure un codice OTP, se presente nel template) e resta memorizzato sul dispositivo; al primo accesso va inserito anche il codice di attivazione monouso. Il dominio deve essere autorizzato nella configurazione URL di Supabase Auth.

La chiave `SUPABASE_SERVICE_ROLE_KEY` resta solo nei secret GitHub Actions e nell'ambiente server Supabase: non inserirla mai nell'app o in variabili `VITE_`. Il client usa soltanto la chiave publishable. Gli ultimi dati validi sono mantenuti in cache locale per un'apertura rapida e per l'uso temporaneo offline.

Il workflow non deve più committare i file scolastici su GitHub. La rimozione di un file dal branch non cancella però le copie già presenti nella cronologia Git: per eliminarle anche dalla storia serve una riscrittura della cronologia e il force-push coordinato.

## Domande AI sulle circolari (Groq API)

La chat nella scheda della circolare estrae il testo PDF/DOCX sul dispositivo e lo invia alla Edge Function `circular-assistant` solo quando l'utente preme **Chiedi**. La funzione richiede la sessione Supabase e verifica il proprietario autorizzato del registro; la modalità demo non è autorizzata. Il modello non può modificare dati o compiere azioni nell'app. Le conversazioni non sono salvate dall'app e i messaggi precedenti non sono inoltrati al provider.

La funzione chiama l'API HTTPS di Groq usando il modello Qwen `qwen/qwen3-32b` come predefinito; il modello si può cambiare con il secret `GROQ_MODEL`. La chiave `GROQ_API_KEY` deve essere configurata nei secret Supabase, mai nell'app o in variabili `VITE_`; non è previsto alcun fallback verso un piano a pagamento. La chiave di servizio `SUPABASE_SERVICE_ROLE_KEY` resta solo nell'ambiente server Supabase.

Il testo della sola circolare aperta e la domanda vengono inviati a Groq solo dopo un'azione esplicita dell'utente; voti e presenze non sono inclusi. L'invio può includere al massimo 60.000 caratteri. Groq dichiara che le richieste di inferenza non sono conservate per impostazione predefinita, ma può registrare temporaneamente input e output fino a 30 giorni per affidabilità o indagini su abusi; i dati sono conservati negli Stati Uniti. Le richieste possono essere rifiutate se si raggiunge una quota o un limite del piano gratuito. I PDF senza testo selezionabile (per esempio scansioni) richiedono OCR, non incluso. Le risposte sono automatiche: controlla date e obblighi sul documento originale.

## PDF delle circolari

Il monitor DidUP acquisisce i PDF tramite la sessione autenticata e li carica nel bucket privato Supabase Storage. Nel JSON salva `attachmentPath`, non un URL Argo da scaricare nuovamente. Quando l'app apre una circolare con path interno, la Edge Function `mirror-circular` crea un URL firmato valido un'ora; la funzione accetta solo path PDF già presenti nel bucket e non scarica link esterni. Nel repository del monitor configura i secrets GitHub `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Non inserire mai una service-role key nelle variabili `VITE_`.

## Controllo manuale delle circolari

L’accesso ai voti e agli altri dati scolastici privati richiede il login descritto sopra; la modalità demo è separata e non concede accesso a quei dati. Il pulsante **Controlla nuove circolari** avvia invece il workflow GitHub `check.yml`: è un’azione distinta dall’autorizzazione a leggere il registro e viene limitata se esiste già un controllo in corso o se il workflow è stato avviato negli ultimi 3 minuti. Per abilitarlo, configura nel repository `voto-school-compass` il secret Actions `VOTO_CIRCULAR_TRIGGER_TOKEN`, usando un fine-grained token limitato al repository `didup-monitor` con permesso `Actions: Read and write`. Il token GitHub resta nel secret runtime della Edge Function Supabase: non inserirlo nel codice o in variabili `VITE_` e non condividerlo. L’esecuzione è ulteriormente controllata dal workflow e dal cooldown lato server.

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
