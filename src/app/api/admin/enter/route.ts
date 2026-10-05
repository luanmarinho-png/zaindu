import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_CLINIC_COOKIE, clinics } from '@/lib/auth';
import { fail, readJson, requireAdmin } from '@/lib/api';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// O admin abre o painel de uma clínica para dar suporte; o cookie só vale para a conta admin (o servidor confere o papel).
export async function POST(request: NextRequest) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const id = String((await readJson(request))?.clinicId || '');
  const clinic = await clinics(await getDatabase()).findOne({ _id: id }, { projection: { _id: 1 } }).catch(() => null);
  if (!clinic) return fail('Clínica não encontrada.', 404);
  const response = NextResponse.json({ entered: true });
  response.cookies.set(ADMIN_CLINIC_COOKIE, clinic._id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ entered: false });
  response.cookies.delete(ADMIN_CLINIC_COOKIE);
  return response;
}
