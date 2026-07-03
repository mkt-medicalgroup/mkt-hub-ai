# Control Room — Hub AI per marketing e comunicazione

Hub interno con login, protetto da username/password, con moduli (box) per tool AI di
marketing. Il primo modulo attivo è **Article**, che genera articoli ottimizzati SEO
e GEO a partire da brand kit, competitor e keyword.

## Come funziona l'architettura (leggi prima di iniziare)

GitHub da solo ospita solo file statici: non basta per login, upload di file e
chiamate AI protette. Per questo l'hub usa tre servizi, tutti gratuiti per iniziare:

| Servizio | A cosa serve |
|---|---|
| **GitHub** | Contiene il codice (quello che stai leggendo ora) |
| **Vercel** | Fa girare il sito 24/7, sempre online, si aggiorna automaticamente ad ogni modifica su GitHub |
| **Supabase** | Login utenti, database (storico articoli), spazio per i file del brand |
| **Google Gemini** | Genera il testo degli articoli |

Nessuno di questi "si addormenta" per inattività lato utente. L'unica eccezione:
Supabase, sul piano gratuito, mette in pausa il progetto se **nessuna richiesta**
arriva per 7 giorni consecutivi. Alla fine di questa guida trovi come evitarlo.

---

## STEP 1 — Crea il progetto Supabase

1. Vai su [supabase.com](https://supabase.com) → crea un account gratuito → **New project**.
2. Scegli un nome (es. `mkt-hub`) e una password del database (salvala da parte).
3. Aspetta 1-2 minuti che il progetto sia pronto.
4. Vai su **Project Settings → API**: copia `Project URL` e `anon public key`. Ti serviranno dopo.
5. Vai su **SQL Editor → New query**, incolla il contenuto del file `supabase/schema.sql`
   di questo repo, poi clicca **Run**. Questo crea la tabella dello storico articoli
   e le regole di sicurezza (ogni utente vede solo i propri dati).
6. Vai su **Storage → New bucket**: nome `brand-assets`, lascialo **privato** (non pubblico).
7. Vai su **Authentication → Users → Add user**: crea qui gli utenti che potranno
   accedere all'hub (email + password). Ripeti per ogni collega.

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
4. Clicca **Deploy**. Dopo 1-2 minuti ottieni un URL tipo `mkt-hub-ai.vercel.app`:
   è il tuo hub, online 24/7.
5. Da ora, ogni volta che modifichi il codice su GitHub (anche tramite Claude),
   Vercel ripubblica automaticamente in 1-2 minuti.

## STEP 5 — Primo accesso

1. Vai sull'URL Vercel → verrai reindirizzato a `/login`.
2. Accedi con una delle email/password create allo Step 1.7.
3. Nella dashboard troverai il box **Article** attivo e i box dei prossimi
   moduli, segnati come "in arrivo".

---

## Evitare che Supabase vada in pausa

Sul piano gratuito, un progetto Supabase senza **nessuna** richiesta API per 7 giorni
si mette in pausa (va poi riattivato manualmente dal pannello). Due opzioni:

- **Semplice**: se l'hub viene usato almeno una volta a settimana da qualcuno, non
  serve fare nulla — l'uso normale tiene il progetto attivo.
- **Automatica**: aggiungi una GitHub Action che fa un ping settimanale al database
  (posso preparartela se ti serve).
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
cp .env.local.example .env.local   # poi compila le 3 variabili
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).
