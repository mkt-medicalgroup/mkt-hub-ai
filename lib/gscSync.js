import { getAccessTokenFromRefreshToken, fetchTopQueries } from './googleSearchConsole';

// Sincronizza le query GSC per UNA sede: cancella le vecchie query con
// source='gsc' per quella sede e inserisce quelle fresche. Le query
// inserite manualmente (source='manual') non vengono mai toccate.
export async function syncLocationFromGSC({ supabaseAdmin, location, refreshToken }) {
  if (!location.gsc_site_url) return { skipped: true };

  const accessToken = await getAccessTokenFromRefreshToken(refreshToken);
  const queries = await fetchTopQueries(accessToken, location.gsc_site_url, 20);

  await supabaseAdmin
    .from('site_queries')
    .delete()
    .eq('location_id', location.id)
    .eq('source', 'gsc');

  if (queries.length) {
    await supabaseAdmin.from('site_queries').insert(
      queries.map((q) => ({ location_id: location.id, query: q, source: 'gsc' }))
    );
  }

  return { synced: queries.length };
}
