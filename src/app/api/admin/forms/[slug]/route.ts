import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import { fail, noStore, readJson, requireAdmin } from '@/lib/api';
import { cleanFormFields, formResponses, forms } from '@/lib/forms';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const form = await forms(await getDatabase()).findOne({ _id: (await context.params).slug }).catch(() => null);
  if (!form) return fail('Formulário não encontrado.', 404);
  return NextResponse.json({ form: { ...form, slug: form._id } }, { headers: noStore });
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const fields = cleanFormFields(await readJson(request));
  if (fields.sections && !fields.sections.length) return fail('O formulário precisa de pelo menos uma pergunta.', 400);
  try {
    const result = await forms(await getDatabase()).updateOne({ _id: (await context.params).slug }, { $set: { ...fields, updatedAt: new Date() } });
    if (!result.matchedCount) return fail('Formulário não encontrado.', 404);
    return NextResponse.json({ saved: true }, { headers: noStore });
  } catch {
    return fail('Não foi possível salvar o formulário.', 503);
  }
}

// Apaga o formulário, as respostas e os anexos. Exige o identificador digitado.
export async function DELETE(request: NextRequest, context: Ctx) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const slug = (await context.params).slug;
  if (String((await readJson(request))?.confirm || '') !== slug) return fail('Digite o identificador do formulário para confirmar.', 400);
  try {
    const db = await getDatabase();
    const responses = await formResponses(db).find({ formulario: slug }, { projection: { _id: 1 } }).toArray();
    for (const response of responses) {
      const page = await list({ prefix: `formularios/${response._id}/` });
      if (page.blobs.length) await del(page.blobs.map(item => item.url));
    }
    await formResponses(db).deleteMany({ formulario: slug });
    await forms(db).deleteOne({ _id: slug });
    return NextResponse.json({ deleted: true }, { headers: noStore });
  } catch {
    return fail('Não foi possível apagar o formulário.', 503);
  }
}
