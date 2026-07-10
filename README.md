# Control Room — Hub AI per marketing e comunicazione

Hub interno con login, protetto da username/password, con moduli (box) per tool AI di
marketing. Moduli attivi: **Article** (articoli SEO/GEO) e **Social Post** (idee di
post + immagini, per sede, aggiornate ogni giorno).

## 👉 Da dove iniziare

- **Non hai ancora fatto nessuno step**: segui questa guida da cima a fondo, in ordine.
- **Hai già completato lo Step 1-5** (login funzionante, modulo Article attivo) e vuoi
  solo aggiungere il modulo Social Post: salta direttamente a
  **["Aggiungere il modulo Social Post"](#modulo-02--social-post-setup)** più in basso.
  Non serve rifare nulla di quanto già fatto, e i tuoi dati/utenti restano intatti.

## Come funziona l'architettura (leggi prima di iniziare)

GitHub da solo ospita solo file statici: non basta per login, upload di file e
chiamate AI protette. Per questo l'hub usa tre servizi, tutti gratuiti per iniziare:

| Servizio | A cosa serve |
|---|---|
| **GitHub** | Contiene il codice (quello che stai leggendo ora) |
| **Vercel** | Fa girare il sito 24/7, sempre online, si aggiorna automaticamente ad ogni modifica su GitHub |
| **Supabase** | Login utenti, database, spazio per i file del brand |
| **Google Gemini** | Genera testo e immagini |

Nessuno di questi "si addormenta" per inattività lato utente. L'unica eccezione:
Supabase, sul piano gratuito, mette in pausa il progetto se **nessuna richiesta**
arriva per 7 giorni consecutivi. Più in basso trovi come evitarlo.

---

## STEP 1 — Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → crea un account gratuito → **New project**.
2. Scegli un nome (es. `mkt-hub`) e una password del database (salvala da parte).
3. Aspetta 1-2 minuti che il progetto sia pronto.
4. Vai su **Project Settings → API**: copia `Project URL` e `anon public key`. Ti serviranno dopo.
5. Vai su **SQL Editor → New query**, incolla il contenuto del file `supabase/schema.sql`
   di questo repo, poi clicca **Run**. Questo crea tutte le tabelle e le regole di
   sicurezza (ogni utente vede solo i dati a cui ha accesso).
6. Vai su **Storage → New bucket**: nome `brand-assets`, lascialo **privato** (non pubblico).
7. Vai su **Authentication → Users → Add user**: crea qui gli utenti che potranno
   accedere all'hub (email + password, con "Auto Confirm User" spuntato). Ripeti per ogni collega.

## STEP 2 — Ottieni la chiave Gemini

1. Vai su [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Accedi con un account Google → **Create API key** → copiala.

## STEP 3 — Carica il codice su GitHub

1. Su [github.com](https://github.com) crea un nuovo repository (es. `mkt-hub-ai`), vuoto,
   senza README (per non avere conflitti).
2. In questa cartella di progetto, apri il terminale ed esegui:

```bash
git init
git add .
git commit -m "Setup iniziale hub"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/mkt-hub-ai.git
git push -u origin main
```

## STEP 4 — Deploy su Vercel (qui il sito diventa "vivo")

1. Vai su [vercel.com](https://vercel.com) → accedi con GitHub.
2. **Add New → Project** → seleziona il repository appena creato.
3. Nella schermata di configurazione, apri **Environment Variables** e aggiungi:
   - `NEXT_PUBLIC_SUPABASE_URL` → il Project URL di Supabase (Step 1.4)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la anon key di Supabase (Step 1.4)
   - `GEMINI_API_KEY` → la chiave presa allo Step 2
   - `SUPABASE_SERVICE_ROLE_KEY` → service_role key da Supabase → Project Settings → API (serve al modulo Social Post)
   - `CRON_SECRET` → una stringa lunga a caso, a tua scelta (serve al cron del modulo Social Post)
4. Clicca **Deploy**. Dopo 1-2 minuti ottieni un URL tipo `mkt-hub-ai.vercel.app`:
   è il tuo hub, online 24/7.
5. Da ora, ogni volta che modifichi il codice su GitHub (anche tramite Claude),
   Vercel ripubblica automaticamente in 1-2 minuti.

## STEP 5 — Primo accesso

1. Vai sull'URL Vercel → verrai reindirizzato a `/login`.
2. Accedi con una delle email/password create allo Step 1.7.
3. Nella dashboard troverai i box dei moduli attivi e quelli dei prossimi
   moduli, segnati come "in arrivo".

---

## Evitare che Supabase vada in pausa

Sul piano gratuito, un progetto Supabase senza **nessuna** richiesta API per 7 giorni
si mette in pausa (va poi riattivato manualmente dal pannello). Due opzioni:

- **Semplice**: se l'hub viene usato almeno una volta a settimana da qualcuno, non
  serve fare nulla — l'uso normale tiene il progetto attivo. Il cron giornaliero del
  modulo Social Post, tra l'altro, conta come uso automatico.
- **Definitiva**: passa al piano Supabase Pro (da $25/mese), che elimina del tutto
  la pausa automatica — consigliato se l'hub diventa uno strumento usato ogni giorno
  dal team.

## Come aggiungere un nuovo modulo/tool in futuro

1. Crea una cartella `app/tools/nome-tool/page.js` con la UI del nuovo tool
   (puoi copiare la struttura di `app/tools/article/page.js` come base).
2. Apri `app/dashboard/page.js` e aggiungi una riga all'array `TOOLS` in cima al file:

```js
{
  title: 'Nome Tool',
  description: 'Cosa fa questo tool.',
  status: 'online',
  href: '/tools/nome-tool',
},
```

3. Salva, fai commit e push su GitHub: Vercel ripubblica da solo e il nuovo box
   compare nella griglia dell'hub.

## Sviluppo in locale (facoltativo)

```bash
npm install
cp .env.local.example .env.local   # poi compila le variabili
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## Libreria "I miei articoli" / "I miei post"

Se avevi già configurato l'hub prima di questa funzione, esegui in Supabase → SQL
Editor il file `supabase/migration-003-library-flag.sql` (non tocca nulla di
esistente). Aggiunge solo il flag che permette di salvare esplicitamente un
articolo in "I miei articoli" — i post sono già filtrati di default, dato che
finiscono in libreria solo quando premi "Salva post".

---

## Google Search Console automatico

Se avevi già configurato l'hub prima di questa funzione: esegui in Supabase →
SQL Editor il file `supabase/migration-004-gsc-integration.sql` (non tocca
nulla di esistente).

Questo collegamento permette al modulo Social Post di prendere da solo, ogni
giorno, le query di ricerca reali del tuo sito da Google Search Console,
senza doverle incollare a mano. Il collegamento (fatto una volta sola) vale
per tutto l'hub; ogni sede sceglie poi a quale proprietà GSC riferirsi.

**Setup (circa 10 minuti, una tantum):**

1. Vai su [Google Cloud Console](https://console.cloud.google.com/) → crea un
   progetto nuovo (o usane uno esistente).
2. **APIs & Services → Library** → cerca "Search Console API" → **Enable**.
3. **APIs & Services → OAuth consent screen**: tipo "External" (o "Internal" se
   usi Google Workspace), nome app a piacere, la tua email come contatto.
   Non serve pubblicarla, va bene anche in modalità "Testing" — in quel caso
   aggiungi la tua email in **Test users**.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** →
   tipo "Web application".
   - **Authorized redirect URIs**: aggiungi `https://TUO-DOMINIO.vercel.app/api/gsc/callback`
     (sostituisci con il tuo dominio Vercel reale).
5. Copia **Client ID** e **Client Secret**.
6. Vercel → Settings → Environment Variables: aggiungi `GOOGLE_CLIENT_ID` e
   `GOOGLE_CLIENT_SECRET` con quei valori → Redeploy.
7. Apri l'hub → Social Post → "gestisci sedi & query" → **"Collega Search
   Console"**: ti porta sulla schermata di consenso Google, autorizza con
   l'account che ha accesso alla Search Console del tuo sito.
8. Per ogni sede, clicca "modifica" e compila **URL proprietà Search Console**
   esattamente come appare nel menu a tendina in alto a sinistra su
   [search.google.com/search-console](https://search.google.com/search-console)
   (es. `https://www.tuosito.it/` oppure, per le proprietà a dominio,
   `sc-domain:tuosito.it`).
9. Solo le sedi con questo campo compilato si sincronizzano — le altre restano
   manuali finché non lo imposti anche per loro. Puoi anche premere
   "sincronizza ora" per testarlo subito, senza aspettare il cron notturno.

**Nota**: se in futuro ricolleghi l'account e non ricevi un nuovo
collegamento valido, vai su
[myaccount.google.com/permissions](https://myaccount.google.com/permissions),
rimuovi l'accesso alla tua app e ripeti il collegamento da capo.

---

## Foto da Pexels invece che generate con AI

Dal modulo Social Post, le immagini non vengono più generate dall'AI: vengono
cercate su [Pexels](https://www.pexels.com) (banca di foto stock gratuita),
scegliendo tra alcune proposte quella più adatta. Gemini traduce l'argomento
del post in una query di ricerca efficace in inglese, tenendo conto delle
linee guida visive del brand. Le proposte giornaliere sono inoltre passate da
5 a 3.

Se avevi già configurato l'hub prima di questa funzione:

1. Vai su [pexels.com/api](https://www.pexels.com/api/) → crea un account
   gratuito → copia la tua API key (gratuita, nessun limite di scadenza).
2. Vercel → Settings → Environment Variables → aggiungi `PEXELS_API_KEY` →
   Redeploy.
3. Supabase → SQL Editor → esegui `supabase/migration-005-pexels-images.sql`
   (non tocca nulla di esistente).
4. Sostituisci nel repo GitHub: `app/tools/social-post/page.js`,
   `lib/socialProposals.js`, `app/dashboard/page.js`.
5. Aggiungi (nuovi): `lib/pexels.js`, `app/api/social/search-images/route.js`.
6. **Rimuovi** la vecchia cartella `app/api/social/generate-image/` (non serve
   più — se la lasci non causa danni, ma è codice morto).

Nota: l'attribuzione al fotografo viene mostrata automaticamente sotto ogni
immagine, come richiesto dalle condizioni d'uso di Pexels — non va rimossa.

**Aggiornamento**: la ricerca delle foto ora usa direttamente l'argomento/keyword
della proposta come query di ricerca su Pexels, senza passare da una chiamata
Gemini intermedia — così ogni post consuma solo la quota gratuita della
generazione testo (proposte), non di più. Se avevi già configurato questo
modulo, sostituisci `app/api/social/search-images/route.js` e
`app/tools/social-post/page.js` con le versioni aggiornate.

---

## Proposte social senza costi di fatturazione

Le proposte giornaliere del modulo Social Post non usano più la ricerca web
in tempo reale di Gemini (quella funzione, chiamata "grounding", richiede la
fatturazione attiva sulla chiave API anche per pochi utilizzi). Ora Gemini
si basa sulla sua conoscenza generale di argomenti sanitari ricorrenti e,
soprattutto, sulle query di ricerca reali del sito (manuali o da Search
Console) — che restano la bussola più concreta per capire cosa interessa
davvero alle persone. Nessuna configurazione aggiuntiva richiesta: basta
sostituire `lib/socialProposals.js` con la versione aggiornata.

---

## MODULO 02 — Social Post: setup

Se hai già completato lo Step 1-5 sopra **prima** che esistesse questo modulo, segui
questi passaggi — non toccano né cancellano nulla di ciò che hai già configurato:

1. **Supabase → SQL Editor → New query**: incolla il contenuto di
   `supabase/migration-002-social-post.sql` (non `schema.sql` — quello lo rilanceresti
   solo se stessi creando un progetto Supabase nuovo da zero) → **Run**. Aggiunge solo
   le tabelle nuove di questo modulo.
2. **Supabase → Storage → New bucket**: nome `social-assets`, privato — come hai già
   fatto per `brand-assets`.
3. **Supabase → Project Settings → API**: copia la chiave `service_role` (attenzione:
   più potente della `anon key`, non va mai esposta nel browser).
4. **Vercel → il tuo progetto → Settings → Environment Variables**: aggiungi
   `SUPABASE_SERVICE_ROLE_KEY` (valore del punto 3) e `CRON_SECRET` (una stringa
   lunga a caso, a tua scelta).
5. Sostituisci/aggiungi nel tuo repo GitHub tutti i file di questo modulo (li trovi
   in questo progetto): `vercel.json`, `lib/supabaseAdmin.js`, `lib/socialProposals.js`,
   `components/Timeline.js`, `app/tools/social-post/page.js`,
   `app/api/social/generate-proposals/route.js`, `app/api/social/generate-image/route.js`,
   `app/api/social/daily-cron/route.js`, e la card aggiornata in `app/dashboard/page.js`.
6. `git add . && git commit -m "modulo social post" && git push` → Vercel rifà il
   deploy da solo. Il file `vercel.json` registra automaticamente anche il cron
   giornaliero (una ricerca al giorno, alle 6:00 UTC).
7. Apri l'hub → Social Post → "gestisci sedi & query" per aggiungere le tue sedi.
   Per ogni sede puoi anche incollare le query di ricerca più frequenti del sito
   (manualmente per ora, es. copiandole da Google Search Console).
8. Compila `brand-visual-guidelines-template.md` (incluso in questo repo) e
   incolla il contenuto nel box "Linee guida visive del brand" dentro il modulo
   (Step 2 della sua timeline): verrà applicato a ogni immagine generata, per tutte le sedi.

**Nota costi**: a differenza della generazione testo, l'API di generazione
immagini di Gemini non ha un piano gratuito — ogni immagine generata ha un
costo (circa $0,04 con il modello usato in questo progetto). Le proposte di
testo (i 5 post al giorno) restano invece nel piano gratuito di Gemini.

### Idee per migliorare ulteriormente questo modulo

- **Google Search Console collegato in automatico** (invece del copia-incolla
  manuale delle query): richiede OAuth con Google, lo posso costruire come
  passo successivo se ti interessa.
- **Pubblicazione diretta su Instagram** tramite le API Meta, così "Salva post"
  diventa "Pubblica ora" o "Pianifica per domani alle 9:00".
- **Calendario editoriale**: vista mensile di tutti i post salvati/pianificati
  per sede, invece della sola lista giornaliera.
- **Feedback delle performance**: collegando gli insight di Instagram, il
  modulo potrebbe imparare quali argomenti/formati funzionano meglio per sede
  e proporne di più simili nei giorni successivi.
- **Varianti A/B della caption**: generare 2 tagli di tono (es. più diretto vs
  più narrativo) per lo stesso argomento, da testare.
- **Caroselli multi-slide**: generare 3-5 immagini coordinate per un unico post
  a carosello, non solo un'immagine singola.
- **Flusso di approvazione**: se lavora anche un collega, un post generato
  potrebbe restare "in revisione" finché un secondo utente non lo approva
  prima del salvataggio finale.
