import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { fail, noStore, requireAdmin } from '@/lib/api';
import { exportResponse } from '@/lib/formExport';
import { formResponses } from '@/lib/forms';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

// Uma resposta em JSON (para baixar) e exclusão da resposta com os anexos.
export async function GET(request: NextRequest, context: Ctx) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const item = await formResponses(await getDatabase()).findOne({ _id: (await context.params).id }).catch(() => null);
  if (!item) return fail('Resposta não encontrada.', 404);
  const payload = { formulario: item.formulario, ...exportResponse(item, request.nextUrl.origin) };
  return new NextResponse(JSON.stringify(payload, null, 2), { headers: { ...noStore, 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="resposta-${item.formulario}-${item._id.slice(0, 8)}.json"` } });
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const id = (await context.params).id;
  try {
    const page = await list({ prefix: `formularios/${id}/` });
    if (page.blobs.length) await del(page.blobs.map(item => item.url));
    const result = await formResponses(await getDatabase()).deleteOne({ _id: id });
    if (!result.deletedCount) return fail('Resposta não encontrada.', 404);
    return NextResponse.json({ deleted: true }, { headers: noStore });
  } catch {
    return fail('Não foi possível apagar a resposta.', 503);
  }
}
