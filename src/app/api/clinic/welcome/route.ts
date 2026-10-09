import { NextResponse } from 'next/server';
import { getAccess, members } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };

export async function POST() {
  try {
    const access = await getAccess();
    if (!access?.clinicId || access.role === 'admin') return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403, headers });
    const result = await members(await getDatabase()).updateOne(
      { _id: access.email, clinicId: access.clinicId },
      { $set: { welcomeSeenAt: new Date() } },
    );
    if (!result.matchedCount) return NextResponse.json({ error: 'Pessoa não encontrada nesta clínica.' }, { status: 404, headers });
    return NextResponse.json({ saved: true }, { headers });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 503, headers });
  }
}
