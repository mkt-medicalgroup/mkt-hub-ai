// Logica condivisa tra il trigger manuale e il cron giornaliero.
// NOTA: niente più grounding/ricerca web in tempo reale (tool "google_search"
// rimosso): quella funzione ha una quota gratuita separata e molto bassa
// sull'API Gemini, che si esauriva subito. Ora Gemini propone gli argomenti
// basandosi sulla sua conoscenza generale, senza costi/quota aggiuntivi.

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateProposalsForLocation({ apiKey, location, siteQueries = [] }) {
  const prompt = buildPrompt(location, siteQueries);

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
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

  return parsed.map((p) => ({ ...p, sources: p.sources?.length ? p.sources : [] }));
}

function safeParseJsonArray(text) {
  const cleaned = text.replace(/```json|```/g, '').trim();
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

Basandoti sulla tua conoscenza generale, individua gli argomenti di ambito sanitario
più rilevanti, utili e sempre attuali (prevenzione, buone pratiche, curiosità
scientifiche, domande frequenti dei pazienti) per questa specializzazione.

${
  siteQueries.length
    ? `QUERY DI RICERCA REALI DEGLI UTENTI SUL NOSTRO SITO (tienine conto per orientare
gli argomenti verso ciò che le persone cercano davvero, così ogni post rafforza anche
l'indicizzazione SEO del sito su questi temi): ${siteQueries.join(', ')}`
    : ''
}

Proponi 3 IDEE DIVERSE tra loro per un post Instagram, ciascuna con:
- topic: l'argomento in poche parole
- hook: la prima riga che cattura l'attenzione (max 15 parole)
- caption: il copy completo del post (100-150 parole, tono professionale ma accessibile,
  mai allarmista, nessuna diagnosi o consiglio medico specifico — solo educazione e
  awareness)
- hashtags: 8-12 hashtag pertinenti, separati da spazio
- sources: lascia un array vuoto []

Rispondi SOLO con un array JSON valido (nessun testo prima o dopo), esattamente in questa
forma:
[
  { "topic": "...", "hook": "...", "caption": "...", "hashtags": "...", "sources": [] }
]`;
}
