import { NextResponse } from 'next/server';
import { searchPexelsPhotos } from '../../../../lib/pexels';

const GEMINI_MODEL = 'gemini-flash-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function POST(request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurata sul server.' }, { status: 500 });
  }

  const { topic, hook, visualGuideline } = await request.json();

  try {
    const query = await buildSearchQuery({ topic, hook, visualGuideline, geminiKey });
    const photos = await searchPexelsPhotos(query, 6);

    if (!photos.length) {
      return NextResponse.json({ error: 'Nessuna foto trovata su Pexels per questo argomento.' }, { status: 404 });
    }

    return NextResponse.json({ query, photos });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function buildSearchQuery({ topic, hook, visualGuideline, geminiKey }) {
  const prompt = `Devi creare UNA query di ricerca per Pexels (banca di foto stock),
in INGLESE, di massimo 5 parole, per trovare una foto adatta a un post
Instagram di ambito sanitario.

ARGOMENTO: ${topic}
FRASE CHIAVE: ${hook}
${visualGuideline ? `LINEE GUIDA VISIVE DEL BRAND (rispettale, es. cosa evitare): ${visualGuideline}` : ''}

Regole: niente camici bianchi, niente sangue o immagini cliniche crude, niente
testo nell'immagine. Preferisci soggetti quotidiani, mani, ambienti luminosi,
persone in situazioni naturali legate al benessere.

Rispondi SOLO con la query di ricerca in inglese, nessun'altra parola,
nessuna virgoletta.`;

  const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ') ?? '';
  const cleaned = text.replace(/["'\n]/g, '').trim();

  return cleaned || topic;
}
