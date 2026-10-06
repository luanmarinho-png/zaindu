import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import { forms } from '@/lib/forms';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Definição pública de um formulário publicado (sem login). Rascunho e encerrado não aparecem.
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const slug = (await context.params).slug;
    // Pré-visualização (?previa=1): o admin abre qualquer formulário, inclusive rascunho e encerrado.
    const preview = request.nextUrl.searchParams.has('previa') && (await getAccess().catch(() => null))?.role === 'admin';
    const form = await forms(await getDatabase()).findOne(preview ? { _id: slug } : { _id: slug, status: 'publicado' });
    if (!form) return NextResponse.json({ error: 'Formulário indisponível.' }, { status: 404 });
    const { _id, title, eyebrow, greeting, intro, thanksTitle, thanksText, color, sections, status } = form;
    return NextResponse.json({ slug: _id, title, eyebrow, greeting, intro, thanksTitle, thanksText, color, sections, ...(preview ? { status } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir o formulário.' }, { status: 503 });
  }
}
