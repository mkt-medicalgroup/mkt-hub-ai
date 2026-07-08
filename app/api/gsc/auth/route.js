import { NextResponse } from 'next/server';
import { buildAuthUrl } from '../../../../lib/googleSearchConsole';

export async function GET(request) {
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(buildAuthUrl(origin));
}
