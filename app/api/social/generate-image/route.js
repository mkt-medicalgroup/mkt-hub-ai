import { NextResponse } from 'next/server';

// gemini-2.5-flash-image ("Nano Banana"): modello stabile GA per generazione
// nativa di immagini via generateContent, con responseModalities Text+Image.
const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurata sul server.' }, { status: 500 });
  }

  const { topic, hook, caption, visualGuideline, extraNotes } = await request.json();

  const prompt = `Crea un'immagine per un post Instagram di ambito sanitario.

ARGOMENTO DEL POST: ${topic}
FRASE CHIAVE DEL POST: ${hook}

LINEE GUIDA VISIVE DEL BRAND DA RISPETTARE RIGOROSAMENTE:
${visualGuideline || 'Nessuna linea guida specifica fornita: usa uno stile pulito, professionale, rassicurante, tipico della comunicazione sanitaria.'}

${extraNotes ? `NOTE AGGIUNTIVE PER QUESTA IMMAGINE: ${extraNotes}` : ''}

Formato: quadrato 1:1, adatto a un post Instagram. Nessun testo lungo sovrapposto
all'immagine (al massimo una parola chiave breve, se coerente con le linee guida).
Evita immagini cliniche crude, sangue, o contenuti che possano turbare; punta su
un'immagine evocativa, rassicurante e in linea con il tono del brand.`;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: 502 });
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData);

    if (!imagePart) {
      return NextResponse.json({ error: 'Nessuna immagine generata dal modello.' }, { status: 502 });
    }

    return NextResponse.json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
