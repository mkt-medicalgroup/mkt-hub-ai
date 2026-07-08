import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { syncLocationFromGSC } from '../../../../lib/gscSync';

// Chiamata automaticamente da Vercel Cron ogni giorno, un po' prima del
// cron delle proposte social, così le query sono già fresche.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: tokenRow } = await supabaseAdmin
    .from('gsc_tokens')
    .select('refresh_token')
    .eq('id', 1)
    .single();

  if (!tokenRow?.refresh_token) {
    return NextResponse.json({ ok: true, skipped: 'Google Search Console non collegato.' });
  }

  const { data: locations } = await supabaseAdmin
    .from('locations')
    .select('*')
    .not('gsc_site_url', 'is', null);

  const results = [];
  for (const location of locations || []) {
    try {
      const result = await syncLocationFromGSC({
        supabaseAdmin,
        location,
        refreshToken: tokenRow.refresh_token,
      });
      results.push({ location: location.name, ...result });
    } catch (err) {
      results.push({ location: location.name, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
