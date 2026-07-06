import { NextResponse } from 'next/server';
import { getSupabaseAdmin, requireUser } from '../../../../lib/supabaseAdmin';
import { generateProposalsForLocation } from '../../../../lib/socialProposals';

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await requireUser(request, supabaseAdmin);
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurata sul server.' }, { status: 500 });
  }

  const { locationId } = await request.json();

  const { data: location, error: locError } = await supabaseAdmin
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single();

  if (locError || !location) {
    return NextResponse.json({ error: 'Sede non trovata.' }, { status: 404 });
  }

  const { data: queries } = await supabaseAdmin
    .from('site_queries')
    .select('query')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .limit(30);

  try {
    const proposals = await generateProposalsForLocation({
      apiKey,
      location,
      siteQueries: (queries || []).map((q) => q.query),
    });

    const rows = proposals.map((p) => ({
      location_id: locationId,
      topic: p.topic,
      hook: p.hook,
      caption: p.caption,
      hashtags: p.hashtags,
      sources: p.sources || [],
    }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('social_post_proposals')
      .insert(rows)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ proposals: inserted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
