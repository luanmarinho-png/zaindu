import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import { MEDIA_ID, saveImage } from '@/lib/media';
import { SAFE_IMAGE } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

// Envio pelo servidor (até 4,5 MB, limite da Vercel). Usado na migração de fotos antigas do navegador;
// a tela de anexar envia direto ao Blob por /api/media/upload, sem esse limite.
export async function POST(request: NextRequest) {
  try {
    const access = await getAccess();
    if (!access?.clinicId || !access.modules.includes('prontuario')) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    const form = await request.formData();
    const file = form.get('image');
    const rawMetadata = form.get('metadata');
    if (!(file instanceof File) || !file.size || typeof rawMetadata !== 'string') return NextResponse.json({ error: 'Selecione uma imagem.' }, { status: 400 });
    if (!SAFE_IMAGE.test(file.type)) return NextResponse.json({ error: 'Use uma imagem JPG, PNG, WEBP, GIF ou HEIC.' }, { status: 415 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'A imagem deve ter até 12 MB.' }, { status: 413 });
    const metadata = JSON.parse(rawMetadata) as Record<string, unknown>;
    const requestedId = String(metadata.storageKey || '');
    const id = MEDIA_ID.test(requestedId) ? requestedId : crypto.randomUUID();
    await saveImage(access.clinicId, id, Buffer.from(await file.arrayBuffer()), file.type);
    return NextResponse.json({ uploaded: true, id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Não foi possível guardar a imagem no armazenamento privado.' }, { status: 503 });
  }
}
