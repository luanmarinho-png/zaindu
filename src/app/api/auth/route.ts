import { NextRequest, NextResponse } from 'next/server';
import { clinicPassword, clinicSessionToken, CLINIC_SESSION_COOKIE, hasClinicSession, safeSecretEqual } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const configured = Boolean(clinicPassword());
  return NextResponse.json({ configured, authenticated: configured && hasClinicSession(request) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const password = clinicPassword();
  if (!password) return NextResponse.json({ error: 'Configure CLINIC_ACCESS_PASSWORD para liberar o acesso.' }, { status: 503 });
  let submitted = '';
  try { submitted = String((await request.json()).password || ''); } catch { return NextResponse.json({ error: 'Informe a senha de acesso.' }, { status: 400 }); }
  if (!safeSecretEqual(submitted, password)) return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 });
  const token = clinicSessionToken();
  if (!token) return NextResponse.json({ error: 'A sessão não pôde ser iniciada.' }, { status: 503 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(CLINIC_SESSION_COOKIE, token, { httpOnly: true, secure: request.nextUrl.protocol === 'https:', sameSite: 'strict', path: '/', maxAge: 60 * 60 * 12 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(CLINIC_SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
