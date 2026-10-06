import { NextRequest, NextResponse } from 'next/server';
import { fail, noStore, readJson, requireAdmin } from '@/lib/api';
import { BLANK_TEMPLATE, CAPTACAO_TEMPLATE, cleanFormFields, formResponses, forms, LEGACY_FORMS, slugify } from '@/lib/forms';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lista os formulários (criados no admin e o fixo da Dra. Celina) com a contagem de respostas.
export async function GET() {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  try {
    const db = await getDatabase();
    const [list, counts] = await Promise.all([
      forms(db).find({}, { projection: { sections: 0 } }).sort({ updatedAt: -1 }).toArray(),
      formResponses(db).aggregate<{ _id: string; total: number; last: Date }>([{ $group: { _id: '$formulario', total: { $sum: 1 }, last: { $max: '$enviadoEm' } } }]).toArray(),
    ]);
    const count = (slug: string) => counts.find(item => item._id === slug);
    return NextResponse.json({
      forms: [
        ...list.map(item => ({ slug: item._id, title: item.title, client: item.client, status: item.status, color: item.color, url: `/formulario/${item._id}`, legacy: false, responses: count(item._id)?.total || 0, lastResponse: count(item._id)?.last || null, updatedAt: item.updatedAt })),
        ...LEGACY_FORMS.map(item => ({ ...item, status: 'publicado', color: '', legacy: true, responses: count(item.slug)?.total || 0, lastResponse: count(item.slug)?.last || null, updatedAt: null })),
      ],
    }, { headers: noStore });
  } catch {
    return fail('Não foi possível carregar os formulários.', 503);
  }
}

// Cria a partir de um modelo: captação (perguntas do questionário da Dra. Celina), em branco ou cópia de outro formulário.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const body = await readJson(request);
  const client = String(body?.client || '').trim().slice(0, 120);
  const title = String(body?.title || '').trim().slice(0, 120) || (client ? `Questionário ${client}` : 'Novo formulário');
  try {
    const db = await getDatabase();
    let slug = slugify(String(body?.slug || '') || title) || 'formulario';
    if (LEGACY_FORMS.some(item => item.slug === slug) || await forms(db).findOne({ _id: slug }, { projection: { _id: 1 } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const source = String(body?.template || 'captacao');
    const copy = source.startsWith('copia:') ? await forms(db).findOne({ _id: source.slice(6) }) : null;
    const sections = copy ? copy.sections : source === 'branco' ? BLANK_TEMPLATE : CAPTACAO_TEMPLATE;
    const now = new Date();
    await forms(db).insertOne({
      _id: slug, title, client,
      eyebrow: copy?.eyebrow ?? 'Marca e site',
      greeting: client ? `Olá, ${client}` : 'Olá',
      intro: copy?.intro ?? 'Estas perguntas ajudam a construir sua identidade visual, seu site e a organizar o atendimento online. Responda do seu jeito, sem se preocupar com o texto.',
      thanksTitle: client ? `Obrigado(a), ${client}` : 'Obrigado(a)!',
      thanksText: copy?.thanksText ?? 'Recebemos suas respostas. O próximo passo é uma conversa rápida para alinhar os detalhes.',
      color: copy?.color || (/^#[0-9a-f]{6}$/i.test(String(body?.color)) ? String(body?.color) : '#3F6B5E'),
      status: 'rascunho',
      sections: cleanFormFields({ sections }).sections || [],
      createdAt: now, updatedAt: now,
    });
    return NextResponse.json({ slug }, { status: 201, headers: noStore });
  } catch {
    return fail('Não foi possível criar o formulário.', 503);
  }
}
