// Cerca foto stock su Pexels (gratuito, con attribuzione al fotografo
// richiesta dalle loro condizioni d'uso — la mostriamo sempre in UI).

const PEXELS_URL = 'https://api.pexels.com/v1/search';

export async function searchPexelsPhotos(query, perPage = 6) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) throw new Error('PEXELS_API_KEY non configurata sul server.');

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    orientation: 'square',
  });

  const res = await fetch(`${PEXELS_URL}?${params.toString()}`, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    throw new Error(`Pexels error: ${await res.text()}`);
  }

  const data = await res.json();

  return (data.photos || []).map((p) => ({
    id: p.id,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    pexelsUrl: p.url,
    alt: p.alt || query,
    thumb: p.src.medium,
    large: p.src.large,
  }));
}
