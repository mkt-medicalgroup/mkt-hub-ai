import { NextResponse } from 'next/server';
import { getSupabaseAdmin, requireUser } from '../../../../lib/supabaseAdmin';
import { syncLocationFromGSC } from '../../../../lib/gscSync';

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin();
  const user = await requireUser(request, supabaseAdmin);
  if (!user) {
    return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 });
  }

  const { locationId } = await request.json();

  const { data: tokenRow } = await supabaseAdmin
    .from('gsc_tokens')
    .select('refresh_token')
    .eq('id', 1)
    .single();

  if (!tokenRow?.refresh_token) {
    return NextResponse.json(
      { error: 'Google Search Console non è ancora collegato.' },
      { status: 400 }
    );
  }

  const { data: location, error: locError } = await supabaseAdmin
    .from('locations')
    .select('*')
    .eq('id', locationId)
    .single();

  if (locError || !location) {
    return NextResponse.json({ error: 'Sede non trovata.' }, { status: 404 });
  }

  if (!location.gsc_site_url) {
    return NextResponse.json(
      { error: 'Questa sede non ha ancora un URL di proprietà Search Console impostato.' },
      { status: 400 }
    );
  }

  try {
    const result = await syncLocationFromGSC({
      supabaseAdmin,
      location,
      refreshToken: tokenRow.refresh_token,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
