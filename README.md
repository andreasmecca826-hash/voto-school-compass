# VOTO.

Dashboard scolastica personale, mobile-first, in italiano.

## Setup

```
npm install
npm run dev
npm run build
```

## Dati scolastici privati

Il monitor DidUP pubblica `grades.json`, `state.json` e `history.md` nel bucket privato Supabase `school-data`; il workflow li ripristina da lì prima di ogni esecuzione. VOTO accede ai voti tramite l'Edge Function `school-data`, che richiede una sessione Supabase valida e autorizza un solo account. L'accesso avviene tramite link email con redirect esplicito a `https://voto-school-compass.lovable.app`: non viene richiesto di copiare o digitare un codice OTP. Al primo accesso resta necessario il codice di attivazione monouso, separato dal link email, per autorizzare l'account ai dati privati. Il login è la schermata iniziale; un’eventuale modalità demo non viene ripristinata automaticamente al riavvio. Il dominio deve essere autorizzato nella configurazione URL di Supabase Auth.

La chiave `SUPABASE_SERVICE_ROLE_KEY` resta solo nei secret GitHub Actions e nell'ambiente server Supabase: non inserirla mai nell'app o in variabili `VITE_`. Il client usa soltanto la chiave publishable. Gli ultimi dati validi sono mantenuti in cache locale per un'apertura rapida e per l'uso temporaneo offline.

Il workflow non deve più committare i file scolastici su GitHub. La rimozione di un file dal branch non cancella però le copie già presenti nella cronologia Git: per eliminarle anche dalla storia serve una riscrittura della cronologia e il force-push coordinato.

## Assistente, regolamento Morselli e circolari (Groq API)

La chat nella scheda della circolare e l’assistente aperto dall’icona in alto a destra condividono la scelta tra **Locale** e **API Groq (Qwen)**; la modalità locale è quella predefinita. La chat può cercare sul dispositivo nel regolamento pubblico Morselli-Sturzo A.S. 2025–2026, e mostra i passaggi e le pagine fonte. La copia testuale viene aggiornata manualmente quando la scuola pubblica una nuova versione. La modalità Locale usa anche i dati caricati nell’app e può estrarre le circolari recenti senza inviarle a un provider; non è un modello generativo. In modalità API, l’assistente può rispondere a domande generali inviando a Groq solo la domanda corrente. Per una domanda sulle regole Morselli, cerca localmente le pagine pertinenti del regolamento e, solo se si sceglie API, invia quelle pagine alla funzione. Per una circolare, usa il documento caricato nella Bacheca dell’app e ne invia il testo solo dopo l’invio esplicito della domanda. Le sezioni “La Segreteria Comunica” del sito richiedono autenticazione; l’app non cerca di aggirare tale accesso né scarica automaticamente le circolari riservate. L’API non riceve automaticamente voti, assenze, altri dati dell’app o cronologia. Se l’utente scrive dati personali direttamente nella domanda, questi vengono trasmessi. La funzione richiede la sessione Supabase e verifica il proprietario autorizzato del registro; la modalità demo non è autorizzata. Il modello non può modificare dati o compiere azioni nell’app. Le conversazioni non sono salvate dall’app e i messaggi precedenti non sono inoltrati al provider.

La funzione chiama l'API HTTPS di Groq usando il modello Qwen `qwen/qwen3.8-27b` come predefinito; il modello si può cambiare con il secret `GROQ_MODEL`. Il precedente `qwen/qwen3-32b` è stato disattivato da Groq: se quel valore è ancora impostato nel secret Supabase, aggiornalo a `qwen/qwen3.8-27b` oppure rimuovi il secret per usare il predefinito. La chiave `GROQ_API_KEY` deve essere configurata nei secret Supabase, mai nell'app o in variabili `VITE_`; la funzione non effettua upgrade del piano né fallback automatico verso un piano a pagamento. La chiave di servizio `SUPABASE_SERVICE_ROLE_KEY` resta solo nell'ambiente server Supabase.

Solo in modalità API, dopo l'invio esplicito, Groq riceve la domanda corrente e, quando pertinente, gli estratti delle pagine ufficiali trovate localmente oppure il testo selezionabile della circolare caricata (massimo 60.000 caratteri). Non vengono allegati automaticamente voti, assenze, cronologia o altri dati dell’app; eventuali dati personali digitati direttamente nella domanda vengono però trasmessi. Groq dichiara che le richieste di inferenza non sono conservate per impostazione predefinita, ma può registrare temporaneamente input e output fino a 30 giorni per affidabilità o indagini su abusi; i dati sono conservati negli Stati Uniti. Le richieste possono essere rifiutate se si raggiunge una quota o un limite del piano; l'app non effettua upgrade né fallback automatici. Per passare da Free a Developer, Groq richiede un metodo di pagamento; sul piano Developer le richieste sono a consumo e possono avere un costo. Per mantenere il costo a zero, non attivare Developer e usa la modalità Locale se non sai quale piano è associato alla chiave. I PDF senza testo selezionabile (per esempio scansioni) richiedono OCR, non incluso. Le risposte API sono automatiche: controlla sempre il documento originale e la data della versione.

## PDF delle circolari

Il monitor DidUP acquisisce i PDF e i DOCX tramite la sessione autenticata e li carica nel bucket privato Supabase Storage. Nel JSON salva `attachmentPath`, non un URL Argo da scaricare nuovamente. La Edge Function `mirror-circular` accetta solo path interni PDF/DOCX e restituisce un URL firmato valido un'ora; usa il service role solo lato server e richiede una sessione Supabase valida al client. La Web App usa il proxy server `/api/circulars/mirror`; l'APK Capacitor contiene invece un bundle statico senza route server TanStack e ottiene l'URL firmato invocando direttamente `mirror-circular`. Nel repository del monitor configura i secrets GitHub `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Non inserire mai una service-role key nelle variabili `VITE_`.

## Controllo manuale delle circolari

L’accesso ai voti e agli altri dati scolastici privati richiede il login descritto sopra; la modalità demo è separata e non concede accesso a quei dati. Il pulsante **Controlla nuove circolari** avvia invece il workflow GitHub `check.yml`: è un’azione distinta dall’autorizzazione a leggere il registro e viene limitata se esiste già un controllo in corso o se il workflow è stato avviato negli ultimi 3 minuti. Per abilitarlo, configura nel repository `voto-school-compass` il secret Actions `VOTO_CIRCULAR_TRIGGER_TOKEN`, usando un fine-grained token limitato al repository `didup-monitor` con permesso `Actions: Read and write`. Il token GitHub resta nel secret runtime della Edge Function Supabase: non inserirlo nel codice o in variabili `VITE_` e non condividerlo. L’esecuzione è ulteriormente controllata dal workflow e dal cooldown lato server.

## APK Android (Capacitor)

Da **Personalizza → Icona app** nell’app Android puoi scegliere l’icona VOTO o una delle due icone incluse e applicare una delle etichette **VOTO**, **didUP Famiglia** o **ClasseViva Studenti e Famiglie**. Per un’immagine dalla galleria puoi creare un collegamento personale alla schermata Home, con nome personalizzato e conferma del launcher, e nasconderne il testo. Il launcher può sovrapporre un badge all’icona del collegamento; Android non offre all’app un comando per disabilitarlo. Nel browser la funzione non è disponibile. Per preparare l’APK aggiornata, crea prima il bundle e sincronizzalo con il progetto Android:

```
npm run build
npx cap sync android
```

Poi genera e firma l’APK dal progetto `android`. Usa sempre un URL HTTPS per il JSON.
