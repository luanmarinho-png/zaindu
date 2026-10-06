import { NextRequest, NextResponse } from 'next/server';
import { forms } from '@/lib/forms';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Definição pública de um formulário publicado (sem login). Rascunho e encerrado não aparecem.
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const slug = (await context.params).slug;
    const form = await forms(await getDatabase()).findOne({ _id: slug, status: 'publicado' });
    if (!form) return NextResponse.json({ error: 'Formulário indisponível.' }, { status: 404 });
    const { _id, title, eyebrow, greeting, intro, thanksTitle, thanksText, color, sections } = form;
    return NextResponse.json({ slug: _id, title, eyebrow, greeting, intro, thanksTitle, thanksText, color, sections }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir o formulário.' }, { status: 503 });
  }
}
