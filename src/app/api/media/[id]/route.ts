import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { deleteImage, openImage } from '@/lib/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = (contentType: string, size: number) => ({ 'Content-Type': contentType, 'Content-Length': String(size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" });

// Imagem só abre para quem tem Prontuário, e só da própria clínica (o caminho no Blob já inclui a clínica).
async function scope() {
  const access = await getAccess();
  return access?.clinicId && access.modules.includes('prontuario') ? access.clinicId : null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const clinicId = await scope();
    if (!clinicId) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const image = await openImage(await getDatabase(), clinicId, (await context.params).id);
    if (!image) return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 });
    return new Response(image.body as BodyInit, { headers: headers(image.contentType, image.size) });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir a imagem.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const clinicId = await scope();
    if (!clinicId) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const removed = await deleteImage(await getDatabase(), clinicId, (await context.params).id);
    if (!removed) return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível remover a imagem.' }, { status: 503 });
  }
}
