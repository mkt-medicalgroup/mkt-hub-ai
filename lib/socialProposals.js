// Logica condivisa tra il trigger manuale e il cron giornaliero.
// NOTA: non usa più il grounding con la ricerca web (quel tool richiede la
// fatturazione attiva sulla chiave Gemini). Le proposte si basano sulla
// conoscenza generale del modello + sulle query di ricerca reali del sito,
// così resta nella fascia gratuita.

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateProposalsForLocation({ apiKey, location, siteQueries = [] }) {
  const prompt = buildPrompt(location, siteQueries);

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error: ${errText}`);
  }

  const data = await res.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ?? '';

  const parsed = safeParseJsonArray(rawText);

  if (!parsed) {
    throw new Error('Impossibile interpretare la risposta di Gemini come JSON.');
  }

  return parsed.map((p) => ({ ...p, sources: [] }));
}

function safeParseJsonArray(text) {
  let cleaned = text.replace(/```json|```/g, '').trim();

  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  try {
    const obj = JSON.parse(cleaned);
    return Array.isArray(obj) ? obj : obj.proposals ?? null;
  } catch {
    return null;
  }
}

function buildPrompt(location, siteQueries) {
  return `Sei un social media manager specializzato in comunicazione sanitaria su Instagram.

SEDE: ${location.name}${location.city ? ` (${location.city})` : ''}
SPECIALIZZAZIONE: ${location.specialization || 'generico ambito sanitario'}

Non hai accesso alla ricerca web in tempo reale: basati sulla tua conoscenza
generale di argomenti sanitari sempre validi, di stagione o di interesse
ricorrente, pertinenti a questa specializzazione (evita di affermare che
qualcosa è "di tendenza oggi" o citare eventi specifici che non puoi verificare).

${
  siteQueries.length
    ? `QUERY DI RICERCA REALI DEGLI UTENTI SUL NOSTRO SITO (usale come bussola
principale per scegliere gli argomenti: sono il segnale più concreto di cosa
interessa davvero alle persone, e ogni post che ne riprende i temi rafforza
anche l'indicizzazione SEO del sito): ${siteQueries.join(', ')}`
    : ''
}

Proponi 3 IDEE DIVERSE tra loro per un post Instagram, ciascuna con:
- topic: l'argomento in poche parole
- hook: la prima riga che cattura l'attenzione (max 15 parole)
- caption: SOLO un gancio breve, non un testo lungo — massimo 2 frasi (max 30
  parole totali), tono colloquiale, pensato per invogliare a leggere/commentare
  (es. termina con una domanda o un invito all'azione). Il copy esteso lo scrive
  poi il team internamente: qui serve solo l'aggancio.
- hashtags: 8-12 hashtag pertinenti, separati da spazio

Rispondi SOLO con un array JSON valido (nessun testo prima o dopo), esattamente in questa
forma:
[
  { "topic": "...", "hook": "...", "caption": "...", "hashtags": "..." }
]`;
}
