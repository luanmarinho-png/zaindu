import { NextRequest, NextResponse } from 'next/server';
import { adminEmails, clinics, emailFromLogin, getAccess, isClinicEmail, members, type MemberDoc } from '@/lib/auth';
import { fail, noStore, readJson } from '@/lib/api';
import { getDatabase } from '@/lib/mongodb';
import { cleanModules, DEFAULT_MEMBER_MODULES, type Access } from '@/lib/clinic/permissions';
import { removeLogin, upsertLogin, type LoginResult } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_PASSWORD = 8;

// Admin gerencia qualquer clínica e cria gestoras; a gestora só gerencia a equipe da própria clínica.
async function scope(requestedClinic: unknown): Promise<{ access: Access; clinicId: string } | NextResponse> {
  const access = await getAccess();
  if (!access) return fail('Acesso não autorizado.', 401);
  if (access.role === 'member') return fail('Só a gestora da clínica gerencia a equipe.', 403);
  const clinicId = access.role === 'admin' ? String(requestedClinic || access.clinicId || '') : access.clinicId;
  if (!clinicId) return fail('Escolha uma clínica.', 400);
  return { access, clinicId };
}

const view = (item: MemberDoc) => ({ email: item._id, username: item._id.replace(/@zaindu\.app$/, ''), name: item.name, role: item.role, modules: item.modules });

function loginMessage(result: LoginResult): string {
  if (result === 'unconfigured') return 'Alterações salvas. A senha não mudou: falta a chave SUPABASE_SECRET_KEY no servidor.';
  if (result === 'updated') return 'Usuário salvo com a senha definida agora.';
  return 'Usuário criado. Ele já pode entrar com o usuário e a senha definidos.';
}

export async function GET(request: NextRequest) {
  try {
    const target = await scope(request.nextUrl.searchParams.get('clinicId'));
    if (target instanceof NextResponse) return target;
    const list = await members(await getDatabase()).find({ clinicId: target.clinicId }).sort({ role: 1, name: 1 }).toArray();
    return NextResponse.json({ members: list.map(view) }, { headers: noStore });
  } catch {
    return fail('Não foi possível carregar a equipe.', 503);
  }
}

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  try {
    const target = await scope(body?.clinicId);
    if (target instanceof NextResponse) return target;
    const email = emailFromLogin(String(body?.username || ''));
    const name = String(body?.name || '').trim().slice(0, 80);
    const password = String(body?.password || '');
    const role = target.access.role === 'admin' && body?.role === 'manager' ? 'manager' : 'member';
    if (!name) return fail('Informe o nome.', 400);
    if (!/^[a-z0-9._-]+@zaindu\.app$/.test(email) || !isClinicEmail(email)) return fail('Usuário pode ter só letras, números, ponto, hífen e sublinhado.', 400);
    if (adminEmails().includes(email)) return fail('Este usuário é reservado ao administrador.', 400);
    // Senha sempre definida aqui: se alguém criou essa conta antes pelo cadastro público, a senha dela deixa de valer.
    if (password.length < MIN_PASSWORD) return fail(`A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`, 400);
    const db = await getDatabase();
    if (!(await clinics(db).findOne({ _id: target.clinicId }, { projection: { _id: 1 } }))) return fail('Clínica não encontrada.', 404);
    const existing = await members(db).findOne({ _id: email });
    if (existing && existing.clinicId !== target.clinicId) return fail('Este usuário já pertence a outra clínica.', 409);
    if (existing) return fail('Este usuário já faz parte da equipe.', 409);
    const result = await upsertLogin(email, password, name).catch((error: Error) => error);
    if (result === 'unconfigured') return fail('Falta a chave SUPABASE_SECRET_KEY no servidor para criar o login. Nada foi salvo.', 503);
    if (result instanceof Error) return fail(result.message.includes('password') ? 'Senha recusada pelo Supabase. Use uma senha mais forte.' : result.message, 400);
    const now = new Date();
    const modules = role === 'manager' ? [] : (Array.isArray(body?.modules) ? cleanModules(body.modules) : DEFAULT_MEMBER_MODULES);
    await members(db).insertOne({ _id: email, clinicId: target.clinicId, role, name, modules, createdAt: now, updatedAt: now });
    return NextResponse.json({ member: view({ _id: email, clinicId: target.clinicId, role, name, modules, createdAt: now, updatedAt: now }), login: result, message: loginMessage(result) }, { status: 201, headers: noStore });
  } catch {
    return fail('Não foi possível salvar o usuário.', 503);
  }
}

export async function PATCH(request: NextRequest) {
  const body = await readJson(request);
  try {
    const target = await scope(body?.clinicId);
    if (target instanceof NextResponse) return target;
    const email = String(body?.email || '').toLowerCase();
    const db = await getDatabase();
    const member = await members(db).findOne({ _id: email, clinicId: target.clinicId });
    if (!member) return fail('Usuário não encontrado nesta clínica.', 404);
    const isAdmin = target.access.role === 'admin';
    if (!isAdmin && member.role === 'manager') return fail('Só o administrador altera uma gestora.', 403);
    const update: Partial<MemberDoc> = { updatedAt: new Date() };
    if (body && 'name' in body) {
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name) return fail('Informe o nome.', 400);
      update.name = name;
    }
    if (body && 'modules' in body) update.modules = cleanModules(body.modules);
    if (isAdmin && (body?.role === 'manager' || body?.role === 'member')) update.role = body.role;
    let message = 'Alterações salvas.';
    const password = String(body?.password || '');
    if (password) {
      if (password.length < MIN_PASSWORD) return fail(`A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`, 400);
      const result = await upsertLogin(email, password, update.name || member.name).catch((error: Error) => error);
      if (result instanceof Error) return fail('Senha recusada pelo Supabase. Use uma senha mais forte.', 400);
      message = loginMessage(result);
    }
    await members(db).updateOne({ _id: email }, { $set: update });
    return NextResponse.json({ saved: true, message }, { headers: noStore });
  } catch {
    return fail('Não foi possível salvar o usuário.', 503);
  }
}

export async function DELETE(request: NextRequest) {
  const body = await readJson(request);
  try {
    const target = await scope(body?.clinicId);
    if (target instanceof NextResponse) return target;
    const email = String(body?.email || '').toLowerCase();
    if (email === target.access.email) return fail('Você não pode remover o próprio acesso.', 400);
    const db = await getDatabase();
    const member = await members(db).findOne({ _id: email, clinicId: target.clinicId });
    if (!member) return fail('Usuário não encontrado nesta clínica.', 404);
    if (target.access.role !== 'admin' && member.role === 'manager') return fail('Só o administrador remove uma gestora.', 403);
    // Sem o vínculo o login já não abre nenhuma clínica; apagar o login no Supabase é limpeza extra.
    await members(db).deleteOne({ _id: email });
    await removeLogin(email).catch(() => {});
    return NextResponse.json({ removed: true }, { headers: noStore });
  } catch {
    return fail('Não foi possível remover o usuário.', 503);
  }
}
