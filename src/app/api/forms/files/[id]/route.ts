import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'node:stream';
import { NextRequest, NextResponse } from 'next/server';
import { getAccess } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Anexos do questionário de implantação: só o admin da plataforma baixa.
  if ((await getAccess().catch(() => null))?.role !== 'admin') return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    const fileId = new ObjectId(id);
    const bucket = new GridFSBucket(await getDatabase(), { bucketName: 'form_files' });
    const [file] = await bucket.find({ _id: fileId }).limit(1).toArray();
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    const contentType = typeof file.metadata?.contentType === 'string' ? file.metadata.contentType : 'application/octet-stream';
    return new Response(Readable.toWeb(bucket.openDownloadStream(fileId)) as ReadableStream, {
      headers: { 'Content-Type': contentType, 'Content-Length': String(file.length), 'Content-Disposition': `attachment; filename="${encodeURIComponent(file.filename)}"`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return NextResponse.json({ error: 'Não foi possível abrir o arquivo.' }, { status: 503 });
  }
}

// Quem preenche o formulário só remove os próprios anexos (mesmo formId).
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const formId = request.nextUrl.searchParams.get('form') || '';
    if (!ObjectId.isValid(id) || !formId) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    const fileId = new ObjectId(id);
    const bucket = new GridFSBucket(await getDatabase(), { bucketName: 'form_files' });
    const [file] = await bucket.find({ _id: fileId, 'metadata.formId': formId }).limit(1).toArray();
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 });
    await bucket.delete(fileId);
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível remover o arquivo.' }, { status: 503 });
  }
}
