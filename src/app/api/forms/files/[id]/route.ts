import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import { deleteFormFile, openFormFile } from '@/lib/formFiles';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Anexos do questionário de implantação: só o admin da plataforma baixa.
  if ((await getAccess().catch(() => null))?.role !== 'admin') return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const file = await openFormFile(await getDatabase(), (await context.params).id);
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    return new Response(file.body as BodyInit, {
      headers: { 'Content-Type': file.contentType, 'Content-Length': String(file.size), 'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" },
    });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir o arquivo.' }, { status: 503 });
  }
}

// Quem preenche o formulário só remove os próprios anexos (mesmo formId).
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const removed = await deleteFormFile(await getDatabase(), request.nextUrl.searchParams.get('form') || '', (await context.params).id);
    if (!removed) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível remover o arquivo.' }, { status: 503 });
  }
}
