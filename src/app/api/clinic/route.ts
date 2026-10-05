import { NextRequest, NextResponse } from 'next/server';
import { hasClinicSession } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  if (!hasClinicSession(request)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const database = await getDatabase();
    const collection = database.collection<{ _id: string; data: Record<string, unknown>; updatedAt?: Date }>('clinic_state');
    const document = await collection.findOne({ _id: 'main' });
    if (!document?.data) return NextResponse.json({ data: null }, { headers: { 'Cache-Control': 'no-store' } });
    const clean = cleanStore(document.data as Record<string, unknown>);
    if (JSON.stringify(clean) !== JSON.stringify(document.data)) await collection.updateOne({ _id: 'main' }, { $set: { data: clean, updatedAt: new Date() } });
    return NextResponse.json({ data: clean }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível conectar ao MongoDB. Confira MONGODB_URI e MONGODB_DB na Vercel.' }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  if (!hasClinicSession(request)) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  try {
    const payload = await request.json();
    if (!payload?.data || typeof payload.data !== 'object') return NextResponse.json({ error: 'Os dados da clínica estão incompletos.' }, { status: 400 });
    const database = await getDatabase();
    const data = cleanStore(payload.data as Record<string, unknown>);
    await database.collection<{ _id: string; data: Record<string, unknown>; updatedAt?: Date }>('clinic_state').updateOne(
      { _id: 'main' },
      { $set: { data, updatedAt: new Date() } },
      { upsert: true },
    );
    return NextResponse.json({ saved: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Não foi possível salvar no MongoDB. Verifique a conexão e tente novamente.' }, { status: 503 });
  }
}
