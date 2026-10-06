import { del, get, list, put } from '@vercel/blob';
import { GridFSBucket, ObjectId, type Db } from 'mongodb';
import { SAFE_IMAGE } from '@/lib/api';

// Fotos do prontuário ficam no Vercel Blob privado (região São Paulo), separadas por clínica.
// Nada é público: a imagem só sai pela rota /api/media, que confere login, módulo Prontuário e clínica.
// Fotos antigas (GridFS no MongoDB) continuam abrindo e são migradas para o Blob no primeiro acesso.
const path = (clinicId: string, id: string) => `clinicas/${clinicId}/fotos/${id}`;
export const MEDIA_ID = /^[A-Za-z0-9-]{8,64}$/;

export async function saveImage(clinicId: string, id: string, body: Buffer, contentType: string) {
  await put(path(clinicId, id), body, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true });
}

type Opened = { body: ReadableStream<Uint8Array> | Uint8Array; contentType: string; size: number };

export async function openImage(db: Db, clinicId: string, id: string): Promise<Opened | null> {
  if (!MEDIA_ID.test(id)) return null;
  // Leitura sem cache: foto apagada some na hora e foto recém-migrada já aparece (o cache guardaria a versão anterior).
  const blob = await get(path(clinicId, id), { access: 'private', useCache: false });
  if (blob?.statusCode === 200) return { body: blob.stream, contentType: blob.blob.contentType, size: blob.blob.size };
  const legacy = await legacyImage(db, clinicId, id);
  if (!legacy) return null;
  // Migração preguiçosa: copia para o Blob e apaga do Mongo.
  await saveImage(clinicId, id, legacy.body, legacy.contentType);
  await new GridFSBucket(db, { bucketName: 'patient_images' }).delete(new ObjectId(id)).catch(() => {});
  return { body: new Uint8Array(legacy.body), contentType: legacy.contentType, size: legacy.body.length };
}

export async function deleteImage(db: Db, clinicId: string, id: string): Promise<boolean> {
  if (!MEDIA_ID.test(id)) return false;
  const blob = await get(path(clinicId, id), { access: 'private', useCache: false });
  if (blob) { await del(path(clinicId, id)); return true; }
  const legacy = await legacyImage(db, clinicId, id);
  if (!legacy) return false;
  await new GridFSBucket(db, { bucketName: 'patient_images' }).delete(new ObjectId(id));
  return true;
}

// Apaga todas as fotos de uma clínica (Blob e restos no GridFS).
export async function deleteClinicImages(db: Db, clinicId: string) {
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: `clinicas/${clinicId}/`, cursor, limit: 1000 });
    if (page.blobs.length) await del(page.blobs.map(item => item.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const bucket = new GridFSBucket(db, { bucketName: 'patient_images' });
  const filter = clinicId === 'main' ? { $or: [{ 'metadata.clinicId': 'main' }, { 'metadata.clinicId': { $exists: false } }] } : { 'metadata.clinicId': clinicId };
  for (const file of await bucket.find(filter, { projection: { _id: 1 } }).toArray()) await bucket.delete(file._id).catch(() => {});
}

async function legacyImage(db: Db, clinicId: string, id: string): Promise<{ body: Buffer; contentType: string } | null> {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id.toLowerCase()) return null;
  const bucket = new GridFSBucket(db, { bucketName: 'patient_images' });
  const [file] = await bucket.find({ _id: new ObjectId(id) }).limit(1).toArray();
  if (!file || String(file.metadata?.clinicId || 'main') !== clinicId) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(file._id)) chunks.push(chunk as Buffer);
  const stored = typeof file.metadata?.contentType === 'string' ? file.metadata.contentType : '';
  return { body: Buffer.concat(chunks), contentType: SAFE_IMAGE.test(stored) ? stored : 'application/octet-stream' };
}
