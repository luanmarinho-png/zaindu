import { cookies } from 'next/headers';
import type { Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { ALL_MODULES, cleanModules, type Access, type Brand } from '@/lib/clinic/permissions';
import { isTemplateId, type TemplateId } from '@/lib/clinic/templates';

// Só contas @zaindu.app entram na clínica, mesmo que alguém crie conta pela API pública do Supabase.
const ALLOWED_EMAIL_DOMAIN = '@zaindu.app';
// Clínica que o admin abriu por último (o admin não pertence a nenhuma clínica, escolhe em /admin).
export const ADMIN_CLINIC_COOKIE = 'zaindu_clinic';
export const DEFAULT_COLOR = '#647055';

export type ClinicDoc = { _id: string; name: string; color: string; logo: string; template: TemplateId; createdAt: Date; updatedAt: Date };
export type MemberDoc = { _id: string; clinicId: string; role: 'manager' | 'member'; name: string; modules: string[]; createdAt: Date; updatedAt: Date };
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

export async function sessionEmail(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  return !error && email && isClinicEmail(email) ? email : null;
}

export const clinics = (db: Db) => db.collection<ClinicDoc>('clinics');
export const members = (db: Db) => db.collection<MemberDoc>('members');
export const states = (db: Db) => db.collection<StateDoc>('clinic_state');

// Antes do multi-clínica existia um só registro ("main"). Ele vira a primeira clínica, de tricologia.
export async function ensureDefaultClinic(db: Db): Promise<void> {
  if (await clinics(db).estimatedDocumentCount() > 0) return;
  const state = await states(db).findOne({ _id: 'main' });
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
  const email = loginEmail || await sessionEmail();
  if (!email) return null;
  const db = await getDatabase();
  if (adminEmails().includes(email)) {
    await ensureDefaultClinic(db);
    const chosen = loginEmail ? undefined : (await cookies()).get(ADMIN_CLINIC_COOKIE)?.value;
    const clinic = chosen ? await clinics(db).findOne({ _id: chosen }, { projection: { _id: 1 } }) : null;
    return { email, name: 'Administrador', role: 'admin', clinicId: clinic?._id || null, modules: ALL_MODULES };
  }
  const member = await members(db).findOne({ _id: email });
  if (!member) return null;
  const clinic = await clinics(db).findOne({ _id: member.clinicId }, { projection: { _id: 1 } });
  if (!clinic) return null;
  return {
    email,
    name: member.name,
    role: member.role,
    clinicId: clinic._id,
    modules: member.role === 'manager' ? ALL_MODULES : cleanModules(member.modules),
  };
}

export const templateOr = (value: unknown, fallback: TemplateId): TemplateId => isTemplateId(value) ? value : fallback;
