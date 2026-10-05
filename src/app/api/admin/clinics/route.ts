import { GridFSBucket } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { audits } from '@/lib/audit';
import { removeLogin } from '@/lib/supabase/admin';
import { brandOf, clinics, DEFAULT_COLOR, ensureDefaultClinic, members, states, templateOr } from '@/lib/auth';
import { cleanLogo, COLOR, fail, noStore, readJson, requireAdmin } from '@/lib/api';
import { getDatabase } from '@/lib/mongodb';
import { seedStore } from '@/lib/clinic/seed';
import { TEMPLATES } from '@/lib/clinic/templates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slug = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'clinica';

export async function GET() {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  try {
    const db = await getDatabase();
    await ensureDefaultClinic(db);
    const [list, team] = await Promise.all([clinics(db).find().sort({ createdAt: 1 }).toArray(), members(db).find().toArray()]);
    return NextResponse.json({
      clinics: list.map(clinic => ({
        ...brandOf(clinic),
        template: clinic.template,
        templateName: TEMPLATES[templateOr(clinic.template, 'tricologia')].name,
        members: team.filter(item => item.clinicId === clinic._id).map(item => ({ email: item._id, name: item.name, role: item.role, modules: item.modules })),
      })),
    }, { headers: noStore });
  } catch {
    return fail('Não foi possível carregar as clínicas.', 503);
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const body = await readJson(request);
  const name = String(body?.name || '').trim().slice(0, 80);
  if (!name) return fail('Informe o nome da clínica.', 400);
  const color = COLOR.test(String(body?.color || '')) ? String(body?.color) : DEFAULT_COLOR;
  const logo = cleanLogo(body?.logo ?? '');
  if (logo === null) return fail('O logo precisa ser PNG, JPG, WEBP ou SVG de até 300 KB.', 400);
  const template = templateOr(body?.template, 'geral');
  try {
    const db = await getDatabase();
    const now = new Date();
    let id = slug(name);
    if (await clinics(db).findOne({ _id: id }, { projection: { _id: 1 } })) id = `${id}-${Math.random().toString(36).slice(2, 6)}`;
    await clinics(db).insertOne({ _id: id, name, color, logo, template, createdAt: now, updatedAt: now });
    const data = seedStore(template, { clinicName: name, professionalName: String(body?.professionalName || '').trim().slice(0, 80), specialty: String(body?.specialty || '').trim().slice(0, 80) });
    await states(db).updateOne({ _id: id }, { $setOnInsert: { data: data as unknown as Record<string, unknown>, updatedAt: now } }, { upsert: true });
    return NextResponse.json({ id }, { status: 201, headers: noStore });
  } catch {
    return fail('Não foi possível criar a clínica.', 503);
  }
}

// Nome, cor e logo. O nome também atualiza o que aparece no painel da clínica.
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const body = await readJson(request);
  const id = String(body?.id || '');
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
  try {
    const db = await getDatabase();
    const result = await clinics(db).updateOne({ _id: id }, { $set: update });
    if (!result.matchedCount) return fail('Clínica não encontrada.', 404);
    if (update.name) await states(db).updateOne({ _id: id, data: { $exists: true } }, { $set: { 'data.settings.clinicName': update.name } });
    return NextResponse.json({ saved: true }, { headers: noStore });
  } catch {
    return fail('Não foi possível salvar a clínica.', 503);
  }
}

// Apaga a clínica e tudo dela: dados, equipe (vínculos e logins), fotos e histórico. Exige o nome digitado.
export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin().catch(() => fail('Não foi possível verificar o acesso agora.', 503));
  if (admin instanceof NextResponse) return admin;
  const body = await readJson(request);
  const id = String(body?.id || '');
  try {
    const db = await getDatabase();
    const clinic = await clinics(db).findOne({ _id: id });
    if (!clinic) return fail('Clínica não encontrada.', 404);
    if (String(body?.confirm || '').trim() !== clinic.name.trim()) return fail('Digite o nome da clínica exatamente como aparece para confirmar.', 400);
    const team = await members(db).find({ clinicId: id }, { projection: { _id: 1 } }).toArray();
    for (const member of team) await removeLogin(member._id).catch(() => {});
    await members(db).deleteMany({ clinicId: id });
    // Fotos antigas, de antes do multi-clínica, não têm clinicId e pertencem à "main".
    const bucket = new GridFSBucket(db, { bucketName: 'patient_images' });
    const filter = id === 'main' ? { $or: [{ 'metadata.clinicId': 'main' }, { 'metadata.clinicId': { $exists: false } }] } : { 'metadata.clinicId': id };
    for (const file of await bucket.find(filter, { projection: { _id: 1 } }).toArray()) await bucket.delete(file._id).catch(() => {});
    await states(db).deleteOne({ _id: id });
    await audits(db).deleteMany({ clinicId: id });
    await clinics(db).deleteOne({ _id: id });
    return NextResponse.json({ deleted: true }, { headers: noStore });
  } catch {
    return fail('Não foi possível apagar a clínica.', 503);
  }
}
