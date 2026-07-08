// Helper per collegare Google Search Console senza che nessuna chiave
// segreta finisca mai nel browser: tutto qui gira solo lato server.

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function getRedirectUri(origin) {
  // Deve corrispondere ESATTAMENTE a quello registrato in Google Cloud Console.
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/gsc/callback`;
}

export function buildAuthUrl(origin) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getRedirectUri(origin),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline', // serve per ricevere il refresh_token
    prompt: 'consent', // forza il consenso, altrimenti Google a volte non ridà il refresh_token
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code, origin) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: getRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

export async function getAccessTokenFromRefreshToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// Restituisce le query più cercate per una proprietà, negli ultimi 28 giorni.
export async function fetchTopQueries(accessToken, siteUrl, rowLimit = 20) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: fmt(start),
        endDate: fmt(end),
        dimensions: ['query'],
        rowLimit,
      }),
    }
  );

  if (!res.ok) throw new Error(`GSC query failed for ${siteUrl}: ${await res.text()}`);
  const data = await res.json();
  return (data.rows || []).map((r) => r.keys[0]);
}
