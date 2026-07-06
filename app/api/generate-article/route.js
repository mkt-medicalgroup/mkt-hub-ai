import { NextResponse } from 'next/server';

// Questa route gira sul server (mai nel browser), quindi GEMINI_API_KEY
// resta segreta. Va impostata come variabile d'ambiente su Vercel.
// 'gemini-flash-latest' è un alias auto-aggiornante: punta sempre
// all'ultimo modello Flash disponibile, così non si rompe quando
// Google dismette una versione specifica.
const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY non configurata sul server.' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const {
    notes,
    brandFileNames = [],
    competitorUrl,
    keyword,
    articleType,
    length,
  } = body;

  const prompt = buildPrompt({
    notes,
    brandFileNames,
    competitorUrl,
    keyword,
    articleType,
    length,
  });

  try {
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
      return NextResponse.json({ error: errText }, { status: 502 });
    }

    const data = await res.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ?? '';

    const parsed = safeParse(rawText);

    if (!parsed) {
      // Fallback: se per qualche motivo il modello non ha rispettato il JSON,
      // restituiamo comunque il testo grezzo come articolo, con punteggi neutri.
      return NextResponse.json({
        metaTitle: '',
        metaDescription: '',
        article: rawText || 'Nessun contenuto generato.',
        scores: { originality: 70, seo: 70, geo: 70 },
        notes: ['Non è stato possibile calcolare i punteggi in modo strutturato per questa generazione.'],
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Il modello a volte avvolge il JSON in ```json ... ```: proviamo a ripulire.
    const cleaned = text.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function buildPrompt({ notes, brandFileNames, competitorUrl, keyword, articleType, length }) {
  return `Sei un copywriter SEO/GEO senior e un editor che valuta la qualità dei propri testi.
Scrivi un articolo in italiano, ottimizzato contemporaneamente per:
- SEO (motori di ricerca tradizionali: struttura in H2/H3, keyword nella prima 100 parole,
  uso naturale di sinonimi e entità correlate)
- GEO (Generative Engine Optimization: contenuto strutturato per essere citato da AI come
  ChatGPT/Gemini/Perplexity — risposte dirette e auto-contenute nei primi paragrafi,
  dati verificabili, definizioni chiare, formattazione a blocchi facilmente estraibili)

KEYWORD PRINCIPALE: ${keyword}
TIPOLOGIA DI ARTICOLO: ${articleType}
LUNGHEZZA TARGET: circa ${length} parole
${competitorUrl ? `COMPETITOR DI RIFERIMENTO (ispirati alla struttura, non copiare mai frasi): ${competitorUrl}` : ''}
${brandFileNames.length ? `DOCUMENTI BRAND CARICATI (tienine conto per tono di voce e regole): ${brandFileNames.join(', ')}` : ''}
${notes ? `NOTE SPECIFICHE DA RISPETTARE: ${notes}` : ''}

Dopo aver scritto l'articolo, valuta onestamente il tuo stesso output e assegna tre
punteggi da 0 a 100:
- "originality": quanto il testo è originale e non rischia di risultare plagio o
  eccessivamente simile a contenuti esistenti sullo stesso argomento (100 = totalmente
  originale)
- "seo": quanto l'articolo rispetta le best practice SEO indicate sopra
- "geo": quanto l'articolo è ottimizzato per essere citato da motori generativi/AI

Aggiungi anche 2-4 note pratiche ("notes"): avvisi, punti deboli da rivedere o
suggerimenti concreti per migliorare ulteriormente il pezzo.

Rispondi SOLO con un oggetto JSON valido (nessun testo prima o dopo, nessun blocco
markdown), con esattamente questa struttura:

{
  "metaTitle": "string, max 60 caratteri",
  "metaDescription": "string, max 155 caratteri",
  "article": "string, l'articolo completo con H2/H3 in markdown, pronto per la pubblicazione",
  "scores": { "originality": number, "seo": number, "geo": number },
  "notes": ["string", "string"]
}`;
}
