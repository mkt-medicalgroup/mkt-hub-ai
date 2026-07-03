import { NextResponse } from 'next/server';

// Questa route gira sul server (mai nel browser), quindi GEMINI_API_KEY
// resta segreta. Va impostata come variabile d'ambiente su Vercel.
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
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: 502 });
    }

    const data = await res.json();
    const article =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ??
      'Nessun contenuto generato.';

    return NextResponse.json({ article });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function buildPrompt({ notes, brandFileNames, competitorUrl, keyword, articleType, length }) {
  return `Sei un copywriter SEO/GEO senior. Scrivi un articolo in italiano, ottimizzato
contemporaneamente per:
- SEO (motori di ricerca tradizionali: struttura in H2/H3, keyword nella prima 100 parole,
  meta title e meta description suggeriti, uso naturale di sinonimi e entità correlate)
- GEO (Generative Engine Optimization: contenuto strutturato per essere citato da AI come
  ChatGPT/Gemini/Perplexity — risposte dirette e auto-contenute nei primi paragrafi,
  dati verificabili, definizioni chiare, formattazione a blocchi facilmente estraibili)

KEYWORD PRINCIPALE: ${keyword}
TIPOLOGIA DI ARTICOLO: ${articleType}
LUNGHEZZA TARGET: circa ${length} parole
${competitorUrl ? `COMPETITOR DI RIFERIMENTO (ispirati alla struttura, non copiare): ${competitorUrl}` : ''}
${brandFileNames.length ? `DOCUMENTI BRAND CARICATI (tienine conto per tono di voce e regole): ${brandFileNames.join(', ')}` : ''}
${notes ? `NOTE SPECIFICHE DA RISPETTARE: ${notes}` : ''}

Restituisci:
1. Meta title (max 60 caratteri)
2. Meta description (max 155 caratteri)
3. L'articolo completo con H2/H3, pronto per la pubblicazione.`;
}
