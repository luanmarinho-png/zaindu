import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Imagem só abre para quem tem prontuário na mesma clínica. Fotos de antes do multi-clínica são da clínica "main".
async function imageFor(id: string) {
  const access = await getAccess();
  if (!access?.clinicId || !access.modules.includes('prontuario')) return { status: 401 as const };
  if (!ObjectId.isValid(id)) return { status: 404 as const };
  const database = await getDatabase();
  const bucket = new GridFSBucket(database, { bucketName: 'patient_images' });
  const [file] = await bucket.find({ _id: new ObjectId(id) }).limit(1).toArray();
  if (!file || String(file.metadata?.clinicId || 'main') !== access.clinicId) return { status: 404 as const };
  return { status: 200 as const, bucket, file };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const found = await imageFor((await context.params).id);
    if (found.status === 401) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    if (found.status === 404) return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 });
    const { bucket, file } = found;
    const stream = bucket.openDownloadStream(file._id);
    const contentType = typeof file.metadata?.contentType === 'string' ? file.metadata.contentType : 'application/octet-stream';
    return new Response(Readable.toWeb(stream) as ReadableStream, { headers: { 'Content-Type': contentType, 'Content-Length': String(file.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir a imagem.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const found = await imageFor((await context.params).id);
    if (found.status === 401) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    if (found.status === 404) return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 });
    await found.bucket.delete(found.file._id);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível remover a imagem.' }, { status: 503 });
  }
}
