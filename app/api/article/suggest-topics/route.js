import { NextResponse } from 'next/server';

// Stessa identica modalità "gratuita" della generazione articolo: nessun
// grounding, nessun tool aggiuntivo, solo una chiamata generateContent.
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurata sul server.' }, { status: 500 });
  }

  const { siteQueries = [], notes = '' } = await request.json();

  const prompt = buildPrompt(siteQueries, notes);

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: 502 });
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ?? '';
    const topics = safeParseJsonArray(rawText);

    if (!topics) {
      return NextResponse.json(
        { error: 'Impossibile interpretare la risposta di Gemini come JSON.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ topics });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
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
    return Array.isArray(obj) ? obj : obj.topics ?? null;
  } catch {
    return null;
  }
}

function buildPrompt(siteQueries, notes) {
  return `Sei un content strategist SEO. Devi proporre 3 idee di articolo per un
blog aziendale, pensate per intercettare ricerche reali degli utenti.

${
  siteQueries.length
    ? `QUERY DI RICERCA REALI DEGLI UTENTI SUL SITO: ${siteQueries.join(', ')}`
    : 'Non ci sono query di ricerca del sito disponibili: proponi argomenti evergreen di buon senso per un blog aziendale generico.'
}
${notes ? `NOTE/ACCORGIMENTI DEL BRAND DA TENERE PRESENTE: ${notes}` : ''}

Per ciascuna delle 3 idee, restituisci:
- topic: l'argomento in poche parole
- keyword: la keyword SEO principale da usare per generare l'articolo
- articleType: una tra "Informativo", "Comparativo", "Scientifico / dati alla mano", "Guida pratica (how-to)", "Opinione / editoriale", "Case study"
- rationale: una frase breve sul perché questo argomento è rilevante (es. quale query lo motiva)

Rispondi SOLO con un array JSON valido, nessun testo prima o dopo, in questa forma:
[
  { "topic": "...", "keyword": "...", "articleType": "...", "rationale": "..." }
]`;
}
