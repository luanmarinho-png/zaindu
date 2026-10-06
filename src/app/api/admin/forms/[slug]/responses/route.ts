import { NextRequest, NextResponse } from 'next/server';
import { fail, noStore, requireAdmin } from '@/lib/api';
import { exportResponse } from '@/lib/formExport';
import { formResponses, forms, LEGACY_FORMS } from '@/lib/forms';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Respostas de um formulário, da mais recente para a mais antiga. ?download=1 baixa tudo em JSON.
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const slug = (await context.params).slug;
  try {
    const db = await getDatabase();
    const form = await forms(db).findOne({ _id: slug }, { projection: { title: 1, client: 1 } });
    const legacy = LEGACY_FORMS.find(item => item.slug === slug);
    if (!form && !legacy) return fail('Formulário não encontrado.', 404);
    const items = await formResponses(db).find({ formulario: slug }).sort({ enviadoEm: -1 }).toArray();
    const origin = request.nextUrl.origin;
    const payload = {
      formulario: { identificador: slug, titulo: form?.title || legacy?.title, cliente: form?.client || legacy?.client || '' },
      exportadoEm: new Date().toISOString(),
      respostas: items.map(item => exportResponse(item, origin)),
    };
    if (request.nextUrl.searchParams.get('download')) {
      return new NextResponse(JSON.stringify(payload, null, 2), { headers: { ...noStore, 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="respostas-${slug}.json"` } });
    }
    return NextResponse.json(payload, { headers: noStore });
  } catch {
    return fail('Não foi possível carregar as respostas.', 503);
  }
}
