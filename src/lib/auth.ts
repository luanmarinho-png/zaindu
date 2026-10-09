import { cookies } from 'next/headers';
import type { Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { ALL_MODULES, cleanModules, DEFAULT_PROFILES, type Access, type AccessProfile, type Brand } from '@/lib/clinic/permissions';
import { isTemplateId, type TemplateId } from '@/lib/clinic/templates';

// Só contas @zaindu.app entram na clínica, mesmo que alguém crie conta pela API pública do Supabase.
const ALLOWED_EMAIL_DOMAIN = '@zaindu.app';
// Clínica que o admin abriu por último (o admin não pertence a nenhuma clínica, escolhe em /admin).
export const ADMIN_CLINIC_COOKIE = 'zaindu_clinic';
export const DEFAULT_COLOR = '#647055';

export type ClinicDoc = { _id: string; name: string; color: string; logo: string; template: TemplateId; profiles?: AccessProfile[]; createdAt: Date; updatedAt: Date };
// modules guarda o último acesso aplicado; com profileId, vale o que o perfil disser no momento.
// professional: atende pacientes, tem agenda própria e assina documentos. sessionsValidAfter: sessões abertas antes disso deixam de valer.
export type MemberDoc = { _id: string; clinicId: string; role: 'manager' | 'member'; name: string; modules: string[]; profileId?: string; calendarEmail?: string; welcomeSeenAt?: Date; professional?: { specialty: string; registry: string }; sessionsValidAfter?: Date; createdAt: Date; updatedAt: Date };
export type StateDoc = { _id: string; data: Record<string, unknown>; updatedAt?: Date };

export function isClinicEmail(email: string | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN));
}

// "ana" vira ana@zaindu.app; e-mails completos passam como estão.
export function emailFromLogin(value: string): string {
  const clean = value.trim().toLowerCase();
  return clean && !clean.includes('@') ? `${clean}${ALLOWED_EMAIL_DOMAIN}` : clean;
}

export function adminEmails(): string[] {
  return (process.env.ZAINDU_ADMIN_EMAILS || 'admin@zaindu.app').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
}

// Momento do login (claim amr do token): continua o mesmo quando o token é renovado, por isso serve para derrubar sessões antigas.
function signedInAt(token: string | undefined): number {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString()) as { amr?: { timestamp?: number }[]; iat?: number };
    const times = (payload.amr || []).map(entry => Number(entry?.timestamp) || 0);
    return (times.length ? Math.max(...times) : Number(payload.iat) || 0) * 1000;
  } catch {
    return 0;
  }
}

export async function sessionEmail(): Promise<{ email: string; signedInAt: number } | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  // getUser confere o token no Supabase; o token conferido é o da sessão lida em seguida.
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (error || !email || !isClinicEmail(email)) return null;
  const { data: session } = await supabase.auth.getSession();
  return { email, signedInAt: signedInAt(session.session?.access_token) };
}

export const clinics = (db: Db) => db.collection<ClinicDoc>('clinics');
export const members = (db: Db) => db.collection<MemberDoc>('members');
export const states = (db: Db) => db.collection<StateDoc>('clinic_state');

// Antes do multi-clínica existia um só registro ("main"). Ele vira a primeira clínica, de tricologia.
export async function ensureDefaultClinic(db: Db): Promise<void> {
  if (await clinics(db).estimatedDocumentCount() > 0) return;
  const state = await states(db).findOne({ _id: 'main' });
  // Sem o registro antigo não há o que migrar (ex.: todas as clínicas foram apagadas pelo admin).
  if (!state) return;
  const settings = (state?.data?.settings || {}) as Record<string, unknown>;
  const now = new Date();
  await clinics(db).updateOne(
    { _id: 'main' },
    { $setOnInsert: { name: String(settings.clinicName || 'Clínica principal'), color: DEFAULT_COLOR, logo: '', template: 'tricologia', createdAt: now, updatedAt: now } },
    { upsert: true },
  );
}

export function brandOf(clinic: ClinicDoc): Brand {
  return { id: clinic._id, name: clinic.name, color: clinic.color || DEFAULT_COLOR, logo: clinic.logo || '' };
}

// Quem está logado, qual clínica vê e quais módulos pode usar. null = sem acesso.
// No login, a sessão nova ainda não está nos cookies: o e-mail vem do próprio login e o admin começa sem clínica aberta.
export async function getAccess(loginEmail?: string): Promise<Access | null> {
  const session = loginEmail ? { email: loginEmail, signedInAt: Date.now() } : await sessionEmail();
  if (!session) return null;
  const { email } = session;
  const db = await getDatabase();
  if (adminEmails().includes(email)) {
    await ensureDefaultClinic(db);
    const chosen = loginEmail ? undefined : (await cookies()).get(ADMIN_CLINIC_COOKIE)?.value;
    const clinic = chosen ? await clinics(db).findOne({ _id: chosen }, { projection: { _id: 1 } }) : null;
    return { email, name: 'Administrador', role: 'admin', clinicId: clinic?._id || null, modules: ALL_MODULES };
  }
  const member = await members(db).findOne({ _id: email });
  if (!member) return null;
  // Tolerância de 5 s: o login feito logo após a troca de senha não pode cair.
  if (member.sessionsValidAfter && session.signedInAt + 5000 < member.sessionsValidAfter.getTime()) return null;
  const clinic = await clinics(db).findOne({ _id: member.clinicId }, { projection: { _id: 1, profiles: 1 } });
  if (!clinic) return null;
  return {
    email,
    name: member.name,
    role: member.role,
    clinicId: clinic._id,
    modules: member.role === 'manager' ? ALL_MODULES : memberModules(member, profilesOf(clinic)),
    professional: Boolean(member.professional),
  };
}

export const profilesOf = (clinic: Pick<ClinicDoc, 'profiles'> | null | undefined): AccessProfile[] => clinic?.profiles ?? DEFAULT_PROFILES;

export function memberModules(member: Pick<MemberDoc, 'modules' | 'profileId'>, profiles: AccessProfile[]) {
  const profile = member.profileId ? profiles.find(item => item.id === member.profileId) : undefined;
  return cleanModules(profile ? profile.modules : member.modules);
}

export const templateOr = (value: unknown, fallback: TemplateId): TemplateId => isTemplateId(value) ? value : fallback;
