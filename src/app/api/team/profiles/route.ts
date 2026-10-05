import { NextRequest, NextResponse } from 'next/server';
import { clinics, members, profilesOf } from '@/lib/auth';
import { fail, noStore, readJson, teamScope } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { getDatabase } from '@/lib/mongodb';
import { cleanModules, type AccessProfile } from '@/lib/clinic/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PROFILES = 20;
const slug = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'perfil';

// Grava a lista inteira de perfis da clínica. Quem usava um perfil removido passa a "Personalizado" com os mesmos módulos.
export async function PUT(request: NextRequest) {
  const body = await readJson(request);
  try {
    const target = await teamScope(body?.clinicId);
    if (target instanceof NextResponse) return target;
    if (!Array.isArray(body?.profiles) || body.profiles.length > MAX_PROFILES) return fail('Lista de perfis inválida.', 400);
    const used = new Set<string>();
    const profiles: AccessProfile[] = [];
    for (const raw of body.profiles as Record<string, unknown>[]) {
      const name = String(raw?.name || '').trim().slice(0, 40);
      if (!name) return fail('Todo perfil precisa de nome.', 400);
      let id = /^[a-z0-9-]{1,40}$/.test(String(raw?.id || '')) ? String(raw.id) : slug(name);
      while (used.has(id)) id = `${id}-${used.size}`;
      used.add(id);
      profiles.push({ id, name, modules: cleanModules(raw?.modules), ...(raw?.professional === true ? { professional: true } : {}) });
    }
    const db = await getDatabase();
    const clinic = await clinics(db).findOne({ _id: target.clinicId }, { projection: { profiles: 1 } });
    if (!clinic) return fail('Clínica não encontrada.', 404);
    const removed = profilesOf(clinic).filter(item => !used.has(item.id));
    for (const profile of removed) {
      await members(db).updateMany({ clinicId: target.clinicId, profileId: profile.id }, { $set: { modules: profile.modules, updatedAt: new Date() }, $unset: { profileId: '' } });
    }
    for (const profile of profiles) {
      await members(db).updateMany({ clinicId: target.clinicId, profileId: profile.id }, { $set: { modules: profile.modules, updatedAt: new Date() } });
    }
    await clinics(db).updateOne({ _id: target.clinicId }, { $set: { profiles, updatedAt: new Date() } });
    await recordAudit(db, target.clinicId, target.access, [`Perfis de acesso alterados: ${profiles.map(item => item.name).join(', ') || 'nenhum'}`]).catch(() => {});
    return NextResponse.json({ profiles }, { headers: noStore });
  } catch {
    return fail('Não foi possível salvar os perfis.', 503);
  }
}
