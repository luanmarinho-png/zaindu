import { NextRequest, NextResponse } from 'next/server';
import { clinicPassword, clinicSessionToken, clinicUsername, CLINIC_SESSION_COOKIE, hasClinicSession, safeSecretEqual } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const configured = Boolean(clinicUsername() && clinicPassword());
  return NextResponse.json({ configured, authenticated: configured && hasClinicSession(request) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const username = clinicUsername();
  const password = clinicPassword();
  if (!username || !password) return NextResponse.json({ error: 'Configure CLINIC_ACCESS_USERNAME e CLINIC_ACCESS_PASSWORD para liberar o acesso.' }, { status: 503 });
  let submittedUsername = '';
  let submittedPassword = '';
  try {
    const body = await request.json();
    submittedUsername = String(body.username || '').trim();
    submittedPassword = String(body.password || '');
  } catch { return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 }); }
  if (!safeSecretEqual(submittedUsername, username) || !safeSecretEqual(submittedPassword, password)) return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
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
