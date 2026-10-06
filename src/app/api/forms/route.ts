import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { forms, LEGACY_FORMS } from '@/lib/forms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 200_000;

type FormAnswer = { secao: string; numero: number; pergunta: string; resposta: string };
type FormFile = { id: string; nome: string; tamanho: number; tipo: string; pergunta: number };
type FormResponse = { _id: string; formulario: string; respostas: FormAnswer[]; anexos: FormFile[]; texto: string; enviadoEm: Date; createdAt: Date; updatedAt: Date };

export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Respostas grandes demais.' }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 }); }

  const id = String(body.id || '').trim();
  const formulario = String(body.formulario || '').trim();
  if (!/^[\w-]{8,64}$/.test(id) || !/^[\w-]{1,64}$/.test(formulario) || !Array.isArray(body.respostas)) {
    return NextResponse.json({ error: 'Os dados do formulário estão incompletos.' }, { status: 400 });
  }
  const respostas: FormAnswer[] = body.respostas.slice(0, 100).map(item => {
    const answer = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return { secao: String(answer.secao || ''), numero: Number(answer.numero) || 0, pergunta: String(answer.pergunta || ''), resposta: String(answer.resposta || '') };
  });
  const anexos: FormFile[] = (Array.isArray(body.anexos) ? body.anexos : []).slice(0, 30).map(item => {
    const file = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    return { id: String(file.id || '').slice(0, 24), nome: String(file.nome || '').slice(0, 180), tamanho: Number(file.tamanho) || 0, tipo: String(file.tipo || '').slice(0, 80), pergunta: Number(file.pergunta) || 0 };
  }).filter(file => /^[a-f\d]{24}$/i.test(file.id));
  const enviadoEm = new Date(String(body.enviado_em || ''));

  // Só aceita respostas do questionário fixo (/forms) ou de um formulário publicado no admin.
  if (!LEGACY_FORMS.some(item => item.slug === formulario)) {
    const form = await forms(await getDatabase()).findOne({ _id: formulario, status: 'publicado' }, { projection: { _id: 1 } }).catch(() => null);
    if (!form) return NextResponse.json({ error: 'Este formulário não está recebendo respostas.' }, { status: 403 });
  }

  try {
    const database = await getDatabase();
    const now = new Date();
    await database.collection<FormResponse>('form_responses').updateOne(
      { _id: id },
      {
        $set: { formulario, respostas, anexos, texto: String(body.texto || ''), enviadoEm: Number.isNaN(enviadoEm.getTime()) ? now : enviadoEm, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('forms: falha ao salvar no MongoDB', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Não foi possível salvar no MongoDB.' }, { status: 503 });
  }
}
