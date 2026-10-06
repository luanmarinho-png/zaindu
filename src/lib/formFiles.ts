import { del, get, put } from '@vercel/blob';
import { randomBytes } from 'node:crypto';
import { GridFSBucket, ObjectId, type Db } from 'mongodb';

// Anexos do questionário /forms no Vercel Blob privado, numa pasta por formulário.
// O id continua com 24 caracteres hexadecimais, o formato que o envio das respostas já valida.
export const FORM_FILE_ID = /^[a-f\d]{24}$/i;
export const FORM_ID = /^[\w-]{8,64}$/;
const path = (formId: string, id: string) => `formularios/${formId}/${id.toLowerCase()}`;

export async function saveFormFile(formId: string, body: Buffer, contentType: string): Promise<string> {
  const id = randomBytes(12).toString('hex');
  await put(path(formId, id), body, { access: 'private', contentType, addRandomSuffix: false });
  return id;
}

type Found = { body: ReadableStream<Uint8Array> | Uint8Array; contentType: string; size: number; name: string };

// Só o admin baixa; o formulário dono do arquivo vem das respostas enviadas. Anexos antigos (GridFS) migram no primeiro acesso.
export async function openFormFile(db: Db, id: string): Promise<Found | null> {
  if (!FORM_FILE_ID.test(id)) return null;
  const response = await db.collection<{ _id: string; anexos?: { id: string; nome: string }[] }>('form_responses').findOne({ 'anexos.id': id }, { projection: { anexos: 1 } });
  const name = response?.anexos?.find(item => item.id === id)?.nome || 'anexo';
  if (response) {
    const blob = await get(path(response._id, id), { access: 'private', useCache: false });
    if (blob?.statusCode === 200) return { body: blob.stream, contentType: blob.blob.contentType, size: blob.blob.size, name };
  }
  const bucket = new GridFSBucket(db, { bucketName: 'form_files' });
  const [file] = await bucket.find({ _id: new ObjectId(id) }).limit(1).toArray();
  if (!file) return null;
  const chunks: Buffer[] = [];
  for await (const chunk of bucket.openDownloadStream(file._id)) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);
  const contentType = typeof file.metadata?.contentType === 'string' ? file.metadata.contentType : 'application/octet-stream';
  const formId = String(file.metadata?.formId || response?._id || '');
  if (FORM_ID.test(formId)) {
    await put(path(formId, id), body, { access: 'private', contentType, addRandomSuffix: false, allowOverwrite: true });
    await bucket.delete(file._id).catch(() => {});
  }
  return { body: new Uint8Array(body), contentType, size: body.length, name: name === 'anexo' ? file.filename : name };
}

// Quem preenche só remove anexos do próprio formulário (o caminho já inclui o formId).
export async function deleteFormFile(db: Db, formId: string, id: string): Promise<boolean> {
  if (!FORM_ID.test(formId) || !FORM_FILE_ID.test(id)) return false;
  const blob = await get(path(formId, id), { access: 'private', useCache: false });
  if (blob) { await del(path(formId, id)); return true; }
  const bucket = new GridFSBucket(db, { bucketName: 'form_files' });
  const [file] = await bucket.find({ _id: new ObjectId(id), 'metadata.formId': formId }).limit(1).toArray();
  if (!file) return false;
  await bucket.delete(file._id);
  return true;
}
