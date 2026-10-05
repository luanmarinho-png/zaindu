import type { Db } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { brandOf, clinics, getAccess, states } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { canWrite, readableStore, STORE_KEYS, type Module } from '@/lib/clinic/permissions';
import type { Store } from '@/lib/clinic/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };
const ARRAY_KEYS = new Set<keyof Store>(['patients', 'appointments', 'notes', 'media', 'services', 'supplies']);
const NUMBER_KEYS = new Set<keyof Store>(['knowledgeCost', 'targetMargin']);

function cleanStore(value: Record<string, unknown>) {
  const patients = Array.isArray(value.patients)
    ? value.patients.filter((patient): patient is Record<string, unknown> => Boolean(patient) && typeof patient === 'object' && !/^(paciente demonstração|paciente teste|teste|demo patient)\b/i.test(String((patient as Record<string, unknown>).name || '').trim()))
    : [];
  const patientIds = new Set(patients.map(patient => String(patient.id || '')));
  const keepPatients = (items: unknown) => Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && patientIds.has(String((item as Record<string, unknown>).patientId || ''))) : [];
  const profiles = value.profiles && typeof value.profiles === 'object' ? value.profiles as Record<string, unknown> : {};
  return {
    ...value,
    patients,
    appointments: keepPatients(value.appointments),
    notes: keepPatients(value.notes),
    media: keepPatients(value.media),
    profiles: Object.fromEntries(Object.entries(profiles).filter(([patientId]) => patientIds.has(patientId))),
  };
}

const idOf = (item: unknown) => String((item as Record<string, unknown> | null)?.id || '');

// Pela agenda só se cadastra paciente novo; editar e excluir exige o módulo Pacientes.
// Excluir paciente apaga o prontuário dele, então quem não tem Prontuário não exclui quem já tem registro clínico.
async function guardPatients(database: Db, clinicId: string, modules: Module[], next: Record<string, unknown>[]): Promise<unknown[] | string> {
  const current = ((await states(database).findOne({ _id: clinicId }, { projection: { 'data.patients': 1, 'data.notes': 1, 'data.profiles': 1, 'data.media': 1 } }))?.data || {}) as Record<string, unknown>;
  const existing = Array.isArray(current.patients) ? current.patients as Record<string, unknown>[] : [];
  const existingIds = new Set(existing.map(idOf));
  const list = modules.includes('pacientes') ? next : [...existing, ...next.filter(item => !existingIds.has(idOf(item)))];
  if (modules.includes('prontuario')) return list;
  const kept = new Set(list.map(idOf));
  const clinical = new Set([
    ...[current.notes, current.media].flatMap(items => Array.isArray(items) ? items.map(item => String((item as Record<string, unknown>)?.patientId || '')) : []),
    ...Object.keys((current.profiles as Record<string, unknown>) || {}),
  ]);
  const blocked = existing.filter(patient => !kept.has(idOf(patient)) && clinical.has(idOf(patient)));
  return blocked.length ? 'Este paciente tem prontuário. Só quem tem acesso ao prontuário pode excluí-lo.' : list;
}

const validFor = (key: keyof Store, value: unknown) =>
  ARRAY_KEYS.has(key) ? Array.isArray(value) : NUMBER_KEYS.has(key) ? typeof value === 'number' && Number.isFinite(value) : Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export async function GET() {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401, headers: noStore });
    if (!access.clinicId) return NextResponse.json({ error: 'Escolha uma clínica.', needsClinic: true }, { status: 409, headers: noStore });
    const database = await getDatabase();
    const clinic = await clinics(database).findOne({ _id: access.clinicId });
    if (!clinic) return NextResponse.json({ error: 'Clínica não encontrada.' }, { status: 404, headers: noStore });
    const document = await states(database).findOne({ _id: access.clinicId });
    let data: Record<string, unknown> | null = null;
    if (document?.data) {
      const clean = cleanStore(document.data);
      data = clean;
      // Grava de volta só as partes que a limpeza mudou, para não sobrescrever o que outra pessoa salvou ao mesmo tempo.
      const changed = Object.keys(clean).filter(key => JSON.stringify(clean[key as keyof typeof clean]) !== JSON.stringify(document.data[key]));
      if (changed.length) await states(database).updateOne({ _id: access.clinicId }, { $set: { ...Object.fromEntries(changed.map(key => [`data.${key}`, clean[key as keyof typeof clean]])), updatedAt: new Date() } });
    }
    // Quem não tem o módulo nem recebe aquela parte dos dados.
    return NextResponse.json({ data: data && readableStore(data, access.modules), brand: brandOf(clinic), access }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: 'Não foi possível conectar ao MongoDB. Confira MONGODB_URI e MONGODB_DB na Vercel.' }, { status: 503, headers: noStore });
  }
}

// Grava só as partes enviadas que o usuário pode alterar; o resto do registro fica intacto.
export async function PUT(request: NextRequest) {
  try {
    const access = await getAccess();
    if (!access) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    if (!access.clinicId) return NextResponse.json({ error: 'Escolha uma clínica.', needsClinic: true }, { status: 409 });
    const payload = await request.json().catch(() => null);
    if (!payload?.data || typeof payload.data !== 'object') return NextResponse.json({ error: 'Os dados da clínica estão incompletos.' }, { status: 400 });
    const incoming = { ...(payload.data as Record<string, unknown>) };
    const sent = STORE_KEYS.filter(key => key in incoming);
    const denied = sent.filter(key => !canWrite(key, access.modules));
    if (denied.length) return NextResponse.json({ error: 'Seu usuário não pode alterar esta parte da clínica.' }, { status: 403 });
    const invalid = sent.filter(key => !validFor(key, incoming[key]));
    if (invalid.length) return NextResponse.json({ error: 'Os dados da clínica estão incompletos.' }, { status: 400 });
    if (!sent.length) return NextResponse.json({ saved: true }, { headers: noStore });
    const database = await getDatabase();
    if (sent.includes('patients')) {
      const guarded = await guardPatients(database, access.clinicId, access.modules, incoming.patients as Record<string, unknown>[]);
      if (typeof guarded === 'string') return NextResponse.json({ error: guarded }, { status: 403 });
      incoming.patients = guarded;
    }
    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of sent) update[`data.${key}`] = incoming[key];
    await states(database).updateOne({ _id: access.clinicId }, { $set: update }, { upsert: true });
    return NextResponse.json({ saved: true }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar no MongoDB. Verifique a conexão e tente novamente.' }, { status: 503 });
  }
}
