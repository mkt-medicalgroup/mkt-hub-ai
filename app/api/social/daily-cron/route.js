import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { generateProposalsForLocation } from '../../../../lib/socialProposals';

// Chiamata automaticamente da Vercel Cron una volta al giorno (vedi vercel.json).
// Protetta da CRON_SECRET: solo Vercel (o chi conosce il secret) può invocarla.
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorizzato.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurata.' }, { status: 500 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: locations, error } = await supabaseAdmin.from('locations').select('*');

  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

  const results = [];

  for (const location of locations || []) {
    try {
      const { data: queries } = await supabaseAdmin
        .from('site_queries')
        .select('query')
        .eq('location_id', location.id)
        .order('created_at', { ascending: false })
        .limit(30);

      const proposals = await generateProposalsForLocation({
        apiKey,
        location,
        siteQueries: (queries || []).map((q) => q.query),
      });

      const rows = proposals.map((p) => ({
        location_id: location.id,
        topic: p.topic,
        hook: p.hook,
        caption: p.caption,
        hashtags: p.hashtags,
        sources: p.sources || [],
      }));

      await supabaseAdmin.from('social_post_proposals').insert(rows);
      results.push({ location: location.name, count: rows.length });
    } catch (err) {
      results.push({ location: location.name, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
