import { NextRequest, NextResponse } from 'next/server';
import { brandOf, clinics, getAccess, states } from '@/lib/auth';
import { cleanLogo, COLOR, fail, noStore, readJson } from '@/lib/api';
import { recordAudit } from '@/lib/audit';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Identidade visual da própria clínica: a gestora (ou o admin dentro da clínica) muda nome, cor e logo.
export async function PATCH(request: NextRequest) {
  try {
    const access = await getAccess();
    if (!access?.clinicId) return fail('Acesso não autorizado.', 401);
    if (access.role === 'member') return fail('Só a gestora muda a identidade da clínica.', 403);
    const body = await readJson(request);
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body && 'name' in body) {
      const name = String(body.name || '').trim().slice(0, 80);
      if (!name) return fail('Informe o nome da clínica.', 400);
      update.name = name;
    }
    if (body && 'color' in body) {
      if (!COLOR.test(String(body.color))) return fail('Cor inválida.', 400);
      update.color = String(body.color);
    }
    if (body && 'logo' in body) {
      const logo = cleanLogo(body.logo);
      if (logo === null) return fail('O logo precisa ser PNG, JPG, WEBP ou SVG de até 300 KB.', 400);
      update.logo = logo;
    }
    const db = await getDatabase();
    await clinics(db).updateOne({ _id: access.clinicId }, { $set: update });
    if (update.name) await states(db).updateOne({ _id: access.clinicId, data: { $exists: true } }, { $set: { 'data.settings.clinicName': update.name, updatedAt: new Date() } });
    await recordAudit(db, access.clinicId, access, ['Identidade visual alterada']).catch(() => {});
    const clinic = await clinics(db).findOne({ _id: access.clinicId });
    return NextResponse.json({ brand: clinic && brandOf(clinic) }, { headers: noStore });
  } catch {
    return fail('Não foi possível salvar a identidade da clínica.', 503);
  }
}
