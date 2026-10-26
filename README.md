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

Il monitor DidUP acquisisce i PDF tramite la sessione autenticata e li carica nel bucket privato Supabase Storage. Nel JSON salva `attachmentPath`, non un URL Argo da scaricare nuovamente. Quando l'app apre una circolare con path interno, la Edge Function `mirror-circular` crea un URL firmato valido un'ora; la funzione accetta solo path PDF già presenti nel bucket e non scarica link esterni. Nel repository del monitor configura i secrets GitHub `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Non inserire mai una service-role key nelle variabili `VITE_`.

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
