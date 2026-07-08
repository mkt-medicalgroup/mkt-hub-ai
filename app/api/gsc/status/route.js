import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data } = await supabaseAdmin.from('gsc_tokens').select('connected_at').eq('id', 1).single();
    return NextResponse.json({ connected: !!data, connectedAt: data?.connected_at });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
