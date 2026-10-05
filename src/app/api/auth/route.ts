import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_CLINIC_COOKIE, emailFromLogin, getAccess, isClinicEmail } from '@/lib/auth';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

export async function GET() {
  const configured = supabaseConfigured();
  if (!configured) return NextResponse.json({ configured, authenticated: false }, { headers: noStore });
  try {
    const access = await getAccess();
    return NextResponse.json({ configured, authenticated: Boolean(access), access }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: 'Não foi possível verificar o acesso agora.' }, { status: 503, headers: noStore });
  }
}

export async function POST(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para liberar o acesso.' }, { status: 503 });
  let email = '';
  let password = '';
  try {
    const body = await request.json();
    // Usuário sem domínio (ex.: "admin") vira admin@zaindu.app no Supabase.
    email = emailFromLogin(String(body.email || ''));
    password = String(body.password || '');
  } catch { return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 }); }
  if (!email || !password) return NextResponse.json({ error: 'Informe usuário e senha.' }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
  if (!isClinicEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Este usuário não tem acesso à clínica.' }, { status: 403 });
  }
  const access = await getAccess(email).catch(() => undefined);
  if (access === undefined) return NextResponse.json({ error: 'Não foi possível verificar o acesso agora.' }, { status: 503 });
  if (!access) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: 'Este usuário ainda não foi vinculado a uma clínica. Fale com a gestora.' }, { status: 403 });
  }
  const response = NextResponse.json({ authenticated: true, access });
  response.cookies.delete(ADMIN_CLINIC_COOKIE);
  return response;
}

export async function DELETE() {
  if (supabaseConfigured()) await (await createClient()).auth.signOut();
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(ADMIN_CLINIC_COOKIE);
  return response;
}
