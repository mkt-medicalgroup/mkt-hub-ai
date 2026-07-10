import { NextResponse } from 'next/server';
import { searchPexelsPhotos } from '../../../../lib/pexels';

// Nessuna chiamata a Gemini qui: usiamo direttamente l'argomento/keyword
// della proposta come query di ricerca su Pexels, per non consumare quota
// gratuita extra oltre a quella già usata per generare le proposte.
export async function POST(request) {
  const { topic, hook } = await request.json();

  const query = (topic || hook || '').trim();
  if (!query) {
    return NextResponse.json({ error: 'Nessuna keyword disponibile per la ricerca.' }, { status: 400 });
  }

  try {
    const photos = await searchPexelsPhotos(query, 6);

    if (!photos.length) {
      return NextResponse.json(
        { error: `Nessuna foto trovata su Pexels per "${query}".` },
        { status: 404 }
      );
    }

    return NextResponse.json({ query, photos });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
