# Piano: AI locale facoltativa in VOTO

## Obiettivo e perimetro

Aggiungere nell'app Android VOTO una terza modalità dell'Assistente, **AI sul telefono**, basata sul solo modello Qwen3 0.6B scelto dall'utente. Il modello non è incluso nell'APK: si scarica soltanto da Impostazioni, su richiesta, e si può rimuovere. Prima versione limitata a un modello e una generazione alla volta; altri modelli restano un'estensione futura. La modalità Locale resta separata da Qwen e Groq: oltre ai dati e ai documenti, usa risposte deterministiche curate su funzioni VOTO, calcoli, metodo di studio e informazioni amministrative scolastiche fornite dall'utente, senza rete né generazione libera su argomenti non coperti. I fatti ufficiali condivisi tra le modalità sono risolti localmente prima di inviare una richiesta a un provider generativo.

Il download usa l'artefatto LiteRT-LM `Qwen3-0.6B.litertlm`, dimensione verificata 613.722.264 byte, versione modello bloccata alla revisione Hugging Face `8d42ab5f1db14cad987fac57aeb17d070f9e180d` e SHA-256 `c5f39b4191926786c3e6668b62af4d6eb15248dfc7a5348252a9b406f33f2108`. La licenza indicata dal repository è Apache-2.0. Il download richiede connessione solo per ottenere il file; le richieste e i documenti passati al modello non devono essere trasmessi a servizi remoti.

## Approccio implementativo

- Usare il runtime Android LiteRT-LM `0.19.1`, con backend CPU nella prima versione per ridurre requisiti specifici di GPU/NPU e privilegiando compatibilità e semplicità su Android. Inizializzazione e generazione si svolgono fuori dal thread UI; il runtime chiude motore e conversazione quando non più necessari. La v1 restituisce la risposta completa al termine della generazione; lo streaming token-per-token resta un possibile miglioramento.
- Aggiungere un plugin Capacitor nativo Android per stato, download controllato, annullamento/riprova, cancellazione e generazione locale. Conservare modello e file parziali nello spazio privato dell'app, verificare dimensione e checksum prima di marcarlo installato, non chiedere permessi di archivio condiviso e non salvare input dell'utente nei log nativi.
- Il runtime AAR include la libreria nativa `arm64-v8a` (oltre a `x86_64`); abilitare AI sul telefono solo quando il dispositivo espone `arm64-v8a`, lasciando intatte le altre funzioni dell'app sugli ABI senza motore. Usare un adapter Kotlin sottile per l'API LiteRT-LM.
- Mostrare in Impostazioni una scheda modello con stato non installato/in download/pronto, dimensione, spazio libero, progresso, possibilità di annullare o eliminare e nota di privacy/uso locale. Il download deve partire soltanto da un'azione esplicita.
- Esporre il bridge TypeScript e aggiungere nel pannello Assistente la modalità AI sul telefono. Se il modello manca, mostrare un messaggio con collegamento a Impostazioni; in caso di errore o indisponibilità, restare in modalità locale e chiedere una scelta esplicita, senza passare automaticamente a Groq.
- Usare il modello per richieste testuali generative e testo già estratto localmente da allegati/regolamenti/circolari, con contesto/output limitati. Mantenere deterministiche le azioni che modificano dati, le risposte strutturate dell'app e gli elenchi/confronti che già non richiedono generazione. La funzione separata di visualizzazione circolari con analisi immagini non viene cambiata in questa prima versione.
- Riutilizzare i componenti, i token e le superfici esistenti di VOTO, senza redesign delle schermate. Non introdurre un backend o modifiche alle Edge Function.

## Struttura di progetto

- `android/app/src/main/java/it/voto/school/`: plugin Capacitor Android, registrazione in `MainActivity`, gestione download e runtime LiteRT-LM.
- `android/app/build.gradle` e `android/build.gradle`: dipendenza runtime fissata e configurazione Kotlin/ABI solo se necessaria al bridge nativo.
- `src/lib/native-local-llm.ts`: API TypeScript tipizzata per stato, download, eliminazione e generazione.
- `src/components/voto/LocalModelSettings.tsx` e `src/routes/impostazioni.tsx`: gestione esplicita dell'artefatto locale.
- `src/lib/voto/`: adapter testabile della generazione locale, risposte curate offline della modalità Locale e routing di documenti/circolari/regolamenti senza alterare la chiamata Groq.
- `src/lib/voto/assistant-general-help.ts`: risposte deterministiche su formule VOTO, indicatori, Circolari/Comunicazioni e metodi di studio.
- `src/lib/voto/school-administrative-info.ts`: orari uffici, sede e ricevimento dirigente trascritti dall’avviso fornito; risposte condivise tra Locale, AI sul telefono e API, senza inviare la domanda in rete.
- `src/routes/assistente.tsx`: scelta/persistenza della modalità e feedback di caricamento/errori.
- `src/test/` e `android/app/src/test/`: test di routing UI/TypeScript e comportamento nativo verificabile senza rete.

## Vincoli materiali

Il file pesa circa 586 MiB e deve essere scaricato su richiesta; il controllo spazio libero deve considerare il file temporaneo del download. Il runtime può usare molta più RAM della sola dimensione del modello: S23 Ultra è il dispositivo di riferimento dell'utente, ma la disponibilità varia per configurazione e app in background. Il bridge deve rifiutare in modo leggibile download incompleti, checksum errato, spazio insufficiente e inferenza non disponibile, senza mai inviare il prompt in rete come fallback. La distribuzione resta un APK ordinario, senza pesi AI incorporati.
