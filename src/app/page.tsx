'use client';

import { useEffect, useRef, useState } from 'react';
import { Agenda } from '@/components/clinic/Agenda';
import { AppointmentModal, quickPatient } from '@/components/clinic/AppointmentModal';
import { Daily } from '@/components/clinic/Daily';
import { Finance } from '@/components/clinic/Finance';
import { Login, type AccessState } from '@/components/clinic/Login';
import { Overview } from '@/components/clinic/Overview';
import { PatientModal } from '@/components/clinic/PatientModal';
import { Patients } from '@/components/clinic/Patients';
import { Record } from '@/components/clinic/Record';
import { Settings } from '@/components/clinic/Settings';
import { Shell } from '@/components/clinic/Shell';
import { Team } from '@/components/clinic/Team';
import { canView, type ClinicView } from '@/components/clinic/types';
import { Toast } from '@/components/ui/Toast';
import { applyBrand } from '@/lib/clinic/brand';
import { blankUnreadable, canWrite, STORE_KEYS, type Access, type Brand } from '@/lib/clinic/permissions';
import { cleanLocalStore, dayKey, initial, KEY, monthKey, readImageBlob, type Appointment, type Patient, type Store } from '@/lib/clinic/store';

type AppointmentDraft = { appointment?: Appointment; date: string; patientId?: string };
type Snapshot = Partial<Record<keyof Store, string>>;

// Só as partes que mudaram desde o último salvamento e que o usuário pode gravar.
function changedParts(data: Store, saved: Snapshot, access: Access) {
  const parts: Partial<Record<keyof Store, unknown>> = {};
  const json: Snapshot = {};
  for (const key of STORE_KEYS) {
    if (!canWrite(key, access.modules)) continue;
    const value = JSON.stringify(data[key]);
    if (value !== saved[key]) { parts[key] = data[key]; json[key] = value; }
  }
  return { parts, json };
}

const snapshotOf = (data: Store): Snapshot => Object.fromEntries(STORE_KEYS.map(key => [key, JSON.stringify(data[key])]));

export default function Home() {
  const [data, setData] = useState<Store>(initial);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<Access | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [state, setState] = useState<AccessState | 'authenticated'>('checking');
  const [accessError, setAccessError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [notice, setNotice] = useState('');
  const [view, setView] = useState<ClinicView>('Visão geral');
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()));
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft | null>(null);
  const [patientDraft, setPatientDraft] = useState<{ patient?: Patient } | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveVersion = useRef(0);
  const saved = useRef<Snapshot>({});

  // Admin sem clínica aberta vai para a área de administração; os demais abrem o painel da própria clínica.
  function route(next: Access) {
    if (next.role === 'admin' && !next.clinicId) { window.location.replace('/admin'); return; }
    setState('loading');
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth', { cache: 'no-store' }).then(async response => {
      const auth = await response.json();
      if (cancelled) return;
      if (!response.ok) throw new Error(auth.error);
      if (!auth.configured) { setState('setup'); return; }
      if (auth.authenticated && auth.access) route(auth.access); else setState('login');
    }).catch(() => { if (!cancelled) { setAccessError('Não foi possível verificar o acesso. Confira sua conexão e tente novamente.'); setState('error'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state !== 'loading') return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/clinic', { cache: 'no-store' });
        const body = await response.json();
        if (body.needsClinic) { window.location.replace('/admin'); return; }
        if (!response.ok) throw new Error(body.error || 'A conexão com a clínica falhou.');
        const who = body.access as Access;
        const remote = body.data as Partial<Store> | null;
        let next = cleanLocalStore(remote || initial);
        if (!remote) {
          // Primeira abertura: migra o que estiver salvo neste navegador (versões antigas guardavam localmente).
          try { const backup = localStorage.getItem(KEY); if (backup) next = cleanLocalStore(JSON.parse(backup) as Partial<Store>); } catch {}
          for (const item of [...next.media]) {
            try {
              const blob = await readImageBlob(item.storageKey);
              if (!blob) continue;
              const form = new FormData();
              form.append('image', blob, `${item.storageKey}.image`);
              form.append('metadata', JSON.stringify(item));
              const uploaded = await fetch('/api/media', { method: 'POST', body: form });
              if (!uploaded.ok) throw new Error('Uma fotografia antiga não pôde ser migrada.');
              const stored = await uploaded.json();
              next = { ...next, media: next.media.map(image => image.id === item.id ? { ...image, storageKey: stored.id } : image) };
            } catch {
              next = { ...next, media: next.media.filter(image => image.id !== item.id) };
            }
          }
          const { parts } = changedParts(next, {}, who);
          const init = await fetch('/api/clinic', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: parts }) });
          if (!init.ok) throw new Error((await init.json()).error || 'Não foi possível inicializar o armazenamento da clínica.');
        }
        if (cancelled) return;
        next = blankUnreadable(next, who.modules);
        saved.current = snapshotOf(next);
        setData(next);
        setAccess(who);
        setBrand(body.brand);
        applyBrand(body.brand?.color);
        try { localStorage.removeItem(KEY); } catch {}
        setReady(true);
        setState('authenticated');
      } catch (error) {
        if (!cancelled) { setAccessError(error instanceof Error ? error.message : 'Não foi possível carregar os dados da clínica.'); setState('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, [state]);

  // Salva no servidor 500 ms depois da última alteração, só o que mudou; só a versão mais recente atualiza o aviso de erro.
  useEffect(() => {
    if (!ready || !access) return;
    const version = ++saveVersion.current;
    const timer = setTimeout(() => {
      const { parts, json } = changedParts(data, saved.current, access);
      if (!Object.keys(parts).length) { if (version === saveVersion.current) setSaveError(''); return; }
      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        const response = await fetch('/api/clinic', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: parts }) });
        if (!response.ok) throw new Error((await response.json()).error || 'Falha ao salvar.');
        saved.current = { ...saved.current, ...json };
        if (version === saveVersion.current) setSaveError('');
      }).catch(error => {
        if (version === saveVersion.current) setSaveError(error instanceof Error ? error.message : 'Falha ao salvar.');
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [data, ready, access]);

  if (state !== 'authenticated' || !ready || !access) {
    return <Login state={state === 'authenticated' ? 'loading' : state} error={accessError} onAuthenticated={route} />;
  }

  const can = (module: Access['modules'][number]) => access.modules.includes(module);
  const current = canView(view, access) ? view : 'Visão geral';
  const scheduledCount = data.appointments.filter(item => item.status === 'Agendada' && item.date.startsWith(monthKey(new Date()))).length;
  const openAppointment = can('agenda') ? (appointment: Appointment) => setAppointmentDraft({ appointment, date: appointment.date }) : undefined;
  const newAppointment = (date = selectedDate, patientId?: string) => setAppointmentDraft({ date, patientId });
  const createPatient = (name: string) => {
    const patient = quickPatient(name);
    setData(current => ({ ...current, patients: [patient, ...current.patients] }));
    return patient.id;
  };
  const savePatient = (patient: Patient) => {
    setData(current => ({ ...current, patients: current.patients.some(item => item.id === patient.id) ? current.patients.map(item => item.id === patient.id ? patient : item) : [patient, ...current.patients] }));
    setPatientDraft(null);
  };
  const deletePatient = (id: string) => {
    setData(current => ({
      ...current,
      patients: current.patients.filter(item => item.id !== id),
      appointments: current.appointments.filter(item => item.patientId !== id),
      notes: current.notes.filter(item => item.patientId !== id),
    }));
    if (selectedPatientId === id) setSelectedPatientId('');
    setPatientDraft(null);
  };
  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
    window.location.reload();
  }
  async function exitClinic() {
    await fetch('/api/admin/enter', { method: 'DELETE' }).catch(() => {});
    window.location.assign('/admin');
  }

  return (
    <>
      <Shell view={current} onNavigate={setView} settings={data.settings} brand={brand} access={access} scheduledCount={can('agenda') ? scheduledCount : 0} onLogout={logout} onExitClinic={access.role === 'admin' ? exitClinic : undefined}>
        {current === 'Visão geral' && <Overview data={data} access={access} month={month} onMonthChange={setMonth} onNew={can('agenda') ? () => newAppointment(dayKey(new Date())) : undefined} onOpen={openAppointment} onNavigate={setView} />}
        {current === 'Agenda' && <Agenda showMoney={can('financeiro')} data={data} month={month} onMonthChange={setMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} onNew={date => newAppointment(date)} onOpen={appointment => setAppointmentDraft({ appointment, date: appointment.date })} />}
        {current === 'Pacientes' && <Patients data={data} onNew={() => setPatientDraft({})} onEdit={patient => setPatientDraft({ patient })} onOpenRecord={can('prontuario') ? id => { setSelectedPatientId(id); setView('Prontuário'); } : undefined} />}
        {current === 'Prontuário' && <Record data={data} setData={setData} patientId={selectedPatientId} onSelectPatient={setSelectedPatientId} onEditPatient={can('pacientes') ? patient => setPatientDraft({ patient }) : undefined} onNewAppointment={can('agenda') ? id => newAppointment(dayKey(new Date()), id) : undefined} onError={setNotice} />}
        {current === 'Financeiro' && <Finance data={data} setData={setData} month={month} onMonthChange={setMonth} />}
        {current === 'Equipe' && access.clinicId && <Team access={access} clinicId={access.clinicId} />}
        {current === 'Todos os dias' && <Daily />}
        {current === 'Configurações' && <Settings data={data} setData={setData} />}
      </Shell>

      {appointmentDraft && (
        <AppointmentModal
          showMoney={can('financeiro')}
          data={data}
          appointment={appointmentDraft.appointment}
          initialDate={appointmentDraft.date}
          initialPatientId={appointmentDraft.patientId}
          onCreatePatient={createPatient}
          onClose={() => setAppointmentDraft(null)}
          onSave={appointment => {
            setData(current => ({ ...current, appointments: current.appointments.some(item => item.id === appointment.id) ? current.appointments.map(item => item.id === appointment.id ? appointment : item) : [...current.appointments, appointment] }));
            setSelectedDate(appointment.date);
            setMonth(appointment.date.slice(0, 7));
            setAppointmentDraft(null);
          }}
          onDelete={id => { setData(current => ({ ...current, appointments: current.appointments.filter(item => item.id !== id) })); setAppointmentDraft(null); }}
        />
      )}
      {patientDraft && <PatientModal patient={patientDraft.patient} onSave={savePatient} onDelete={can('pacientes') ? deletePatient : undefined} onClose={() => setPatientDraft(null)} />}
      {saveError && <Toast tone="danger" message={`Alterações não salvas: ${saveError}`} action={<button type="button" className="z-btn secondary sm" onClick={() => setData(current => ({ ...current }))}>Tentar de novo</button>} />}
      {notice && !saveError && <Toast tone="danger" message={notice} onClose={() => setNotice('')} />}
    </>
  );
}
