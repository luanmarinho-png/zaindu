import { NextRequest, NextResponse } from 'next/server';
import type { Db } from 'mongodb';
import { adminEmails, clinics, emailFromLogin, isClinicEmail, memberModules, members, profilesOf, type MemberDoc } from '@/lib/auth';
import { fail, noStore, readJson, teamScope as scope } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { getDatabase } from '@/lib/mongodb';
import { cleanModules, DEFAULT_MEMBER_MODULES, type AccessProfile } from '@/lib/clinic/permissions';
import { calendarGuestEmail } from '@/lib/clinic/googleCalendar';
import { removeLogin, upsertLogin, type LoginResult } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_PASSWORD = 8;

const view = (item: MemberDoc, profiles: AccessProfile[]) => ({
  email: item._id, username: item._id.replace(/@zaindu\.app$/, ''), name: item.name, role: item.role,
  profileId: item.profileId && profiles.some(profile => profile.id === item.profileId) ? item.profileId : '',
  modules: memberModules(item, profiles),
  professional: item.professional || null, calendarEmail: item.calendarEmail || '',
});

// Profissional atende pacientes, tem agenda própria e assina documentos (registro = CRM/CRBM/COREN etc.).
function professionalFrom(body: Record<string, unknown> | null): MemberDoc['professional'] | null {
  const raw = body?.professional;
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  return { specialty: String(value.specialty || '').trim().slice(0, 80), registry: String(value.registry || '').trim().slice(0, 40) };
}

const clinicProfiles = async (db: Db, clinicId: string) => profilesOf(await clinics(db).findOne({ _id: clinicId }, { projection: { profiles: 1 } }));

// Com perfil escolhido, os módulos vêm dele; sem perfil ("Personalizado"), da lista enviada.
function accessFrom(body: Record<string, unknown> | null, profiles: AccessProfile[]): { profileId: string; modules: string[] } | string {
  const profileId = String(body?.profileId || '');
  if (profileId) {
    const profile = profiles.find(item => item.id === profileId);
    return profile ? { profileId, modules: profile.modules } : 'Perfil de acesso não encontrado.';
  }
  return { profileId: '', modules: Array.isArray(body?.modules) ? cleanModules(body.modules) : DEFAULT_MEMBER_MODULES };
}

function loginMessage(result: LoginResult): string {
  if (result === 'unconfigured') return 'Alterações salvas. A senha não mudou: falta a chave SUPABASE_SECRET_KEY no servidor.';
  if (result === 'updated') return 'Usuário salvo com a senha definida agora.';
  return 'Usuário criado. Ele já pode entrar com o usuário e a senha definidos.';
}

export async function GET(request: NextRequest) {
  try {
    const target = await scope(request.nextUrl.searchParams.get('clinicId'));
    if (target instanceof NextResponse) return target;
    const db = await getDatabase();
    const [list, profiles] = await Promise.all([members(db).find({ clinicId: target.clinicId }).sort({ role: 1, name: 1 }).toArray(), clinicProfiles(db, target.clinicId)]);
    return NextResponse.json({ members: list.map(item => view(item, profiles)), profiles }, { headers: noStore });
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
    const calendarEmail = String(body?.calendarEmail || '').trim();
    if (calendarEmail && !calendarGuestEmail(calendarEmail)) return fail('Informe um e-mail válido para o Google Agenda.', 400);
    const role = target.access.role === 'admin' && body?.role === 'manager' ? 'manager' : 'member';
    if (!name) return fail('Informe o nome.', 400);
    if (!/^[a-z0-9._-]+@zaindu\.app$/.test(email) || !isClinicEmail(email)) return fail('Usuário pode ter só letras, números, ponto, hífen e sublinhado.', 400);
    if (adminEmails().includes(email)) return fail('Este usuário é reservado ao administrador.', 400);
    // Senha sempre definida aqui: se alguém criou essa conta antes pelo cadastro público, a senha dela deixa de valer.
    if (password.length < MIN_PASSWORD) return fail(`A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`, 400);
    const db = await getDatabase();
    const clinic = await clinics(db).findOne({ _id: target.clinicId }, { projection: { profiles: 1 } });
    if (!clinic) return fail('Clínica não encontrada.', 404);
    const profiles = profilesOf(clinic);
    const chosen = role === 'manager' ? { profileId: '', modules: [] } : accessFrom(body, profiles);
    if (typeof chosen === 'string') return fail(chosen, 400);
    const existing = await members(db).findOne({ _id: email });
    if (existing && existing.clinicId !== target.clinicId) return fail('Este usuário já pertence a outra clínica.', 409);
    if (existing) return fail('Este usuário já faz parte da equipe.', 409);
    const result = await upsertLogin(email, password, name).catch((error: Error) => error);
    if (result === 'unconfigured') return fail('Falta a chave SUPABASE_SECRET_KEY no servidor para criar o login. Nada foi salvo.', 503);
    if (result instanceof Error) return fail(result.message.includes('password') ? 'Senha recusada pelo Supabase. Use uma senha mais forte.' : result.message, 400);
    const now = new Date();
    const professional = professionalFrom(body);
    const doc: MemberDoc = { _id: email, clinicId: target.clinicId, role, name, calendarEmail, modules: chosen.modules, ...(chosen.profileId ? { profileId: chosen.profileId } : {}), ...(professional ? { professional } : {}), createdAt: now, updatedAt: now };
    await members(db).insertOne(doc);
    await recordAudit(db, target.clinicId, target.access, [`Pessoa adicionada à equipe: ${name} (${role === 'manager' ? 'gestora' : profiles.find(item => item.id === chosen.profileId)?.name || 'personalizado'})`]).catch(() => {});
    return NextResponse.json({ member: view(doc, profiles), login: result, message: loginMessage(result) }, { status: 201, headers: noStore });
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
    const unset: Record<string, ''> = {};
    const changes: string[] = [];
    if (body && 'calendarEmail' in body) {
      const calendarEmail = String(body.calendarEmail || '').trim();
      if (calendarEmail && !calendarGuestEmail(calendarEmail)) return fail('Informe um e-mail válido para o Google Agenda.', 400);
      update.calendarEmail = calendarEmail;
      if (calendarEmail !== (member.calendarEmail || '')) changes.push('e-mail do Google Agenda atualizado');
    }
    if (body && 'professional' in body) {
      const professional = professionalFrom(body);
      if (professional) update.professional = professional; else unset.professional = '';
      changes.push(professional ? 'marcada como profissional' : 'deixou de ser profissional');
    }
    // Desconectar: toda sessão aberta antes de agora deixa de valer (também acontece ao trocar a senha).
    if (body?.revoke === true) { update.sessionsValidAfter = new Date(); changes.push('sessões encerradas em todos os aparelhos'); }
    if (body && ('modules' in body || 'profileId' in body)) {
      const chosen = accessFrom(body, await clinicProfiles(db, target.clinicId));
      if (typeof chosen === 'string') return fail(chosen, 400);
      update.modules = chosen.modules;
      if (chosen.profileId) update.profileId = chosen.profileId; else unset.profileId = '';
      changes.push('acesso alterado');
    }
    if (isAdmin && (body?.role === 'manager' || body?.role === 'member')) update.role = body.role;
    let message = 'Alterações salvas.';
    const password = String(body?.password || '');
    if (password) {
      if (password.length < MIN_PASSWORD) return fail(`A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`, 400);
      const result = await upsertLogin(email, password, update.name || member.name).catch((error: Error) => error);
      if (result instanceof Error) return fail('Senha recusada pelo Supabase. Use uma senha mais forte.', 400);
      message = `${loginMessage(result)} Sessões abertas em outros aparelhos foram encerradas.`;
      update.sessionsValidAfter = new Date();
      changes.push('senha trocada');
    }
    await members(db).updateOne({ _id: email, clinicId: target.clinicId }, { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    if (changes.length) await recordAudit(db, target.clinicId, target.access, [`${update.name || member.name}: ${changes.join(', ')}`]).catch(() => {});
    if (body?.revoke === true && !password) message = `Sessões de ${member.name} encerradas em todos os aparelhos.`;
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
    await recordAudit(db, target.clinicId, target.access, [`Pessoa removida da equipe: ${member.name}`]).catch(() => {});
    return NextResponse.json({ removed: true }, { headers: noStore });
  } catch {
    return fail('Não foi possível remover o usuário.', 503);
  }
}
