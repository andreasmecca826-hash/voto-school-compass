# VOTO.

Dashboard scolastica personale, mobile-first, in italiano.

## Setup

```
npm install
npm run dev
npm run build
```

## Dati da GitHub

1. Crea un repository (meglio privato-pseudonimizzato: un repo pubblico rende i dati visibili a chiunque abbia l'URL).
2. Carica `voto.json` seguendo lo schema (Impostazioni → Schema JSON).
3. Apri il file su GitHub → "Raw" e copia l'URL `https://raw.githubusercontent.com/...`.
4. Incollalo in Impostazioni → "Testa e salva".

Gli ultimi dati validi restano salvati sul dispositivo; i compiti completati sono salvati per ID e non vengono sovrascritti dagli aggiornamenti.

## PDF delle circolari

Il monitor DidUP scarica gli allegati usando la propria sessione autenticata e li carica direttamente nel bucket privato Supabase Storage. Nel JSON salva il percorso `attachmentPath`, non un link Argo da scaricare nuovamente. L'app apre il PDF tramite `/api/circulars/mirror`, che lo legge dal bucket con credenziali server-only e lo restituisce inline. Configura nell'ambiente server dell'app `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (oppure `SUPABASE_KEY`) e crea il bucket privato `circulars`. Nel repository del monitor configura anche i secrets GitHub `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`; non usare mai la service-role key con prefisso `VITE_`.

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
