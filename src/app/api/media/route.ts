import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { hasClinicSession } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!hasClinicSession(request)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get('image');
    const rawMetadata = form.get('metadata');
    if (!(file instanceof File) || !file.size || typeof rawMetadata !== 'string') return NextResponse.json({ error: 'Selecione uma imagem.' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'O arquivo precisa ser uma imagem.' }, { status: 415 });
    if (file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'A imagem deve ter até 12 MB.' }, { status: 413 });
    const metadata = JSON.parse(rawMetadata) as Record<string, unknown>;
    const requestedId = String(metadata.storageKey || '');
    const id = ObjectId.isValid(requestedId) ? new ObjectId(requestedId) : new ObjectId();
    const database = await getDatabase();
    const bucket = new GridFSBucket(database, { bucketName: 'patient_images' });
    const upload = bucket.openUploadStreamWithId(id, file.name.slice(0, 180), {
      metadata: { contentType: file.type, patientId: String(metadata.patientId || ''), appointmentId: String(metadata.appointmentId || ''), kind: String(metadata.kind || '') },
    });
    const contents = Buffer.from(await file.arrayBuffer());
    await new Promise<void>((resolve, reject) => {
      Readable.from(contents).pipe(upload).on('error', reject).on('finish', resolve);
    });
    return NextResponse.json({ uploaded: true, id: id.toHexString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Não foi possível guardar a imagem no armazenamento privado.' }, { status: 503 });
  }
}
