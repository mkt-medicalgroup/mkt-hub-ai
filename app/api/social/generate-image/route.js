import { NextResponse } from 'next/server';

// Foto stock gratuite (Pexels) al posto della generazione AI a pagamento.
// Nessun costo, nessun limite pratico per un uso quotidiano come questo.
// Serve una chiave gratuita da https://www.pexels.com/api/ (istantanea,
// nessuna approvazione richiesta) salvata come PEXELS_API_KEY su Vercel.
const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';

export async function POST(request) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'PEXELS_API_KEY non configurata sul server.' },
      { status: 500 }
    );
  }

  const { topic, hook, extraNotes } = await request.json();

  const query = `${topic || ''} ${extraNotes || ''} healthcare medical wellness`.trim();

  try {
    const searchRes = await fetch(
      `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=1&orientation=square`,
      { headers: { Authorization: apiKey } }
    );

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return NextResponse.json({ error: `Pexels error: ${errText}` }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const photo = searchData?.photos?.[0];

    if (!photo) {
      return NextResponse.json(
        { error: 'Nessuna foto trovata per questo argomento. Prova a modificare le note aggiuntive.' },
        { status: 404 }
      );
    }

    const imageUrl = photo.src.large;
    const imgRes = await fetch(imageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    return NextResponse.json({
      imageBase64,
      mimeType: 'image/jpeg',
      attribution: `Foto di ${photo.photographer} su Pexels`,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
