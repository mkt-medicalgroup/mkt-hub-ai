import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '../../../../lib/googleSearchConsole';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${url.origin}/tools/social-post?gsc=error`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, url.origin);

    if (!tokens.refresh_token) {
      // Succede se avevi già autorizzato prima e Google non ridà un nuovo
      // refresh_token. Bisogna revocare l'accesso da https://myaccount.google.com/permissions
      // e riprovare, oppure il primo collegamento va sempre a buon fine.
      return NextResponse.redirect(`${url.origin}/tools/social-post?gsc=no-refresh-token`);
    }

    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin
      .from('gsc_tokens')
      .upsert({ id: 1, refresh_token: tokens.refresh_token, connected_at: new Date().toISOString() });

    return NextResponse.redirect(`${url.origin}/tools/social-post?gsc=connected`);
  } catch (err) {
    return NextResponse.redirect(`${url.origin}/tools/social-post?gsc=error`);
  }
}
