import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { hasClinicSession } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasClinicSession(request)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 });
    const imageId = new ObjectId(id);
    const database = await getDatabase();
    const bucket = new GridFSBucket(database, { bucketName: 'patient_images' });
    const [file] = await bucket.find({ _id: imageId }).limit(1).toArray();
    if (!file) return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 });
    const stream = bucket.openDownloadStream(imageId);
    const contentType = typeof file.metadata?.contentType === 'string' ? file.metadata.contentType : 'application/octet-stream';
    return new Response(Readable.toWeb(stream) as ReadableStream, { headers: { 'Content-Type': contentType, 'Content-Length': String(file.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir a imagem.' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!hasClinicSession(request)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 });
    const database = await getDatabase();
    const bucket = new GridFSBucket(database, { bucketName: 'patient_images' });
    await bucket.delete(new ObjectId(id));
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível remover a imagem.' }, { status: 503 });
  }
}
