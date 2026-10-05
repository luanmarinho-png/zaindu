import { NextRequest, NextResponse } from 'next/server';
import { fail, noStore, teamScope } from '@/lib/api';
import { audits } from '@/lib/audit';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Últimas 200 alterações da clínica, para a gestora e o admin.
export async function GET(request: NextRequest) {
  try {
    const target = await teamScope(request.nextUrl.searchParams.get('clinicId'));
    if (target instanceof NextResponse) return target;
    const list = await audits(await getDatabase()).find({ clinicId: target.clinicId }).sort({ at: -1 }).limit(200).toArray();
    return NextResponse.json({ entries: list.map(item => ({ id: item._id.toHexString(), name: item.name, email: item.email, at: item.at, firstAt: item.firstAt, count: item.count, lines: item.lines })) }, { headers: noStore });
  } catch {
    return fail('Não foi possível carregar o histórico.', 503);
  }
}
