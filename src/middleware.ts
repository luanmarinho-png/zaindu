import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  // A página comercial é pública e não precisa consultar a sessão da clínica.
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();
  if (host === 'lp.zaindu.app' && request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/lp';
    return NextResponse.rewrite(url);
  }
  if (request.nextUrl.pathname === '/lp' || request.nextUrl.pathname.startsWith('/lp/')) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|forms|formulario|api/forms|api/public-forms|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)'],
};
