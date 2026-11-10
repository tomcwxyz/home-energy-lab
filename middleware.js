import { NextResponse } from 'next/server';
import { COOKIE, verifySession } from './lib/session.js';

const publicPaths = new Set(['/login', '/api/session/login', '/api/session/logout', '/manifest.webmanifest', '/icon.svg', '/robots.txt']);
const bearerPaths = new Set(['/api/ingest', '/api/cron/sync']);

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  if (publicPaths.has(path) || path.startsWith('/_next/') || bearerPaths.has(path)) return NextResponse.next();
  if (!process.env.DASHBOARD_USER || !process.env.DASHBOARD_PASSWORD ||
      !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    return new NextResponse('Private dashboard sign-in has not been configured.', { status: 503 });
  }
  const ok = await verifySession(request.cookies.get(COOKIE)?.value, process.env.SESSION_SECRET);
  if (!ok) {
    if (path.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
