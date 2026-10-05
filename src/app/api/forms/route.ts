import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 200_000;

type FormAnswer = { secao: string; numero: number; pergunta: string; resposta: string };
type FormResponse = { _id: string; formulario: string; respostas: FormAnswer[]; texto: string; enviadoEm: Date; createdAt: Date; updatedAt: Date };

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
  const enviadoEm = new Date(String(body.enviado_em || ''));

  try {
    const database = await getDatabase();
    const now = new Date();
    await database.collection<FormResponse>('form_responses').updateOne(
      { _id: id },
      {
        $set: { formulario, respostas, texto: String(body.texto || ''), enviadoEm: Number.isNaN(enviadoEm.getTime()) ? now : enviadoEm, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar no MongoDB.' }, { status: 503 });
  }
}
