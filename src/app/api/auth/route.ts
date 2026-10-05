import { NextRequest, NextResponse } from 'next/server';
import { hasClinicSession } from '@/lib/auth';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = supabaseConfigured();
  return NextResponse.json({ configured, authenticated: configured && await hasClinicSession() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.json({ error: 'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para liberar o acesso.' }, { status: 503 });
  let email = '';
  let password = '';
  try {
    const body = await request.json();
    email = String(body.email || '').trim();
    password = String(body.password || '');
  } catch { return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 }); }
  if (!email || !password) return NextResponse.json({ error: 'Informe e-mail e senha.' }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
  return NextResponse.json({ authenticated: true });
}

export async function DELETE() {
  if (supabaseConfigured()) await (await createClient()).auth.signOut();
  return NextResponse.json({ authenticated: false });
}
