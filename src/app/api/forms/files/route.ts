import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A Vercel limita o corpo da requisição a 4,5 MB.
const MAX_FORM_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(png|jpe?g|webp|gif|svg\+xml|heic|heif)|application\/(pdf|postscript|illustrator))$/;

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const formId = String(form.get('formId') || '');
    const question = String(form.get('question') || '');
    if (!/^[\w-]{8,64}$/.test(formId) || !/^q\d{1,3}$/.test(question)) return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 });
    if (!(file instanceof File) || !file.size) return NextResponse.json({ error: 'Selecione um arquivo.' }, { status: 400 });
    if (file.size > MAX_FORM_FILE_BYTES) return NextResponse.json({ error: 'O arquivo deve ter até 4 MB.' }, { status: 413 });
    if (!ALLOWED_TYPES.test(file.type)) return NextResponse.json({ error: 'Envie imagem ou PDF.' }, { status: 415 });
    const database = await getDatabase();
    const bucket = new GridFSBucket(database, { bucketName: 'form_files' });
    const id = new ObjectId();
    const upload = bucket.openUploadStreamWithId(id, file.name.slice(0, 180), { metadata: { contentType: file.type, formId, question } });
    const contents = Buffer.from(await file.arrayBuffer());
    await new Promise<void>((resolve, reject) => {
      Readable.from(contents).pipe(upload).on('error', reject).on('finish', resolve);
    });
    return NextResponse.json({ id: id.toHexString(), name: file.name.slice(0, 180), size: file.size, type: file.type });
  } catch (error) {
    console.error('forms: falha ao salvar anexo', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Não foi possível salvar o arquivo.' }, { status: 503 });
  }
}
