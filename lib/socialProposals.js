// Logica condivisa tra il trigger manuale e il cron giornaliero.
// Usa "google_search" come tool: Gemini cerca sul web in tempo reale
// prima di proporre gli argomenti (grounding), poi restituisce un
// JSON strutturato con 5 proposte di post.

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function generateProposalsForLocation({ apiKey, location, siteQueries = [] }) {
  const prompt = buildPrompt(location, siteQueries);

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error: ${errText}`);
  }

  const data = await res.json();
  const rawText =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ?? '';

  const sources = (data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
    .map((c) => c?.web?.uri)
    .filter(Boolean);

  const parsed = safeParseJsonArray(rawText);

  if (!parsed) {
    throw new Error('Impossibile interpretare la risposta di Gemini come JSON.');
  }

  return parsed.map((p) => ({ ...p, sources: p.sources?.length ? p.sources : sources }));
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

Usa la ricerca web per trovare gli argomenti di ambito sanitario più discussi,
attuali o di interesse in questo momento, rilevanti per questa specializzazione.

${
  siteQueries.length
    ? `QUERY DI RICERCA REALI DEGLI UTENTI SUL NOSTRO SITO (tienine conto per orientare
gli argomenti verso ciò che le persone cercano davvero, così ogni post rafforza anche
l'indicizzazione SEO del sito su questi temi): ${siteQueries.join(', ')}`
    : ''
}

Proponi 5 IDEE DIVERSE tra loro per un post Instagram, ciascuna con:
- topic: l'argomento in poche parole
- hook: la prima riga che cattura l'attenzione (max 15 parole)
- caption: SOLO un gancio breve, non un testo lungo — massimo 2 frasi (max 30
  parole totali), tono colloquiale, pensato per invogliare a leggere/commentare
  (es. termina con una domanda o un invito all'azione). Il copy esteso lo scrive
  poi il team internamente: qui serve solo l'aggancio.
- hashtags: 8-12 hashtag pertinenti, separati da spazio
- sources: array di URL delle fonti che hai trovato con la ricerca web

Rispondi SOLO con un array JSON valido (nessun testo prima o dopo), esattamente in questa
forma:
[
  { "topic": "...", "hook": "...", "caption": "...", "hashtags": "...", "sources": ["..."] }
]`;
}
