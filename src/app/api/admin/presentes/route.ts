import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api';
import { getDatabase } from '@/lib/mongodb';
import { listPrizes, updatePrize, PrizeError } from '@/lib/prizes/store';
import { prizeBody, prizeFailure, prizeJson } from '@/lib/prizes/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    return prizeJson({ rows: await listPrizes(await getDatabase()) });
  } catch (error) { return prizeFailure(error); }
}
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    if (admin instanceof NextResponse) return admin;
    const body = await prizeBody(request);
    if (body.action === 'activate' && body.confirmAccessReady !== true) throw new PrizeError('Confirme que o acesso já foi disponibilizado à participante.');
    await updatePrize(await getDatabase(), Number(body.card), String(body.action), admin.email);
    return prizeJson({ rows: await listPrizes(await getDatabase()) });
  } catch (error) { return prizeFailure(error); }
}
