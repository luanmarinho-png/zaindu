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
import type { ClinicView } from '@/components/clinic/types';
import { Toast } from '@/components/ui/Toast';
import { cleanLocalStore, dayKey, initial, KEY, monthKey, readImageBlob, type Appointment, type Patient, type Store } from '@/lib/clinic/store';

type AppointmentDraft = { appointment?: Appointment; date: string; patientId?: string };

export default function Home() {
  const [data, setData] = useState<Store>(initial);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState<AccessState | 'authenticated'>('checking');
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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth', { cache: 'no-store' }).then(response => response.json()).then(auth => {
      if (cancelled) return;
      if (!auth.configured) { setAccess('setup'); return; }
      setAccess(auth.authenticated ? 'loading' : 'login');
    }).catch(() => { if (!cancelled) { setAccessError('Não foi possível verificar o acesso. Confira sua conexão e tente novamente.'); setAccess('error'); } });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (access !== 'loading') return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/clinic', { cache: 'no-store' });
        if (!response.ok) throw new Error((await response.json()).error || 'A conexão com a clínica falhou.');
        const remote = (await response.json()).data as Partial<Store> | null;
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
          const saved = await fetch('/api/clinic', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: next }) });
          if (!saved.ok) throw new Error((await saved.json()).error || 'Não foi possível inicializar o armazenamento da clínica.');
        }
        if (cancelled) return;
        setData(next);
        try { localStorage.removeItem(KEY); } catch {}
        setReady(true);
        setAccess('authenticated');
      } catch (error) {
        if (!cancelled) { setAccessError(error instanceof Error ? error.message : 'Não foi possível carregar os dados da clínica.'); setAccess('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, [access]);

  // Salva no servidor 500 ms depois da última alteração; só a versão mais recente atualiza o aviso de erro.
  useEffect(() => {
    if (!ready) return;
    const version = ++saveVersion.current;
    const timer = setTimeout(() => {
      const snapshot = JSON.stringify(data);
      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        const response = await fetch('/api/clinic', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: JSON.parse(snapshot) }) });
        if (!response.ok) throw new Error((await response.json()).error || 'Falha ao salvar.');
        if (version === saveVersion.current) setSaveError('');
      }).catch(error => {
        if (version === saveVersion.current) setSaveError(error instanceof Error ? error.message : 'Falha ao salvar.');
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [data, ready]);

  if (access !== 'authenticated' || !ready) {
    return <Login state={access === 'authenticated' ? 'loading' : access} error={accessError} onAuthenticated={() => setAccess('loading')} />;
  }

  const scheduledCount = data.appointments.filter(item => item.status === 'Agendada' && item.date.startsWith(monthKey(new Date()))).length;
  const openAppointment = (appointment: Appointment) => setAppointmentDraft({ appointment, date: appointment.date });
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

  return (
    <>
      <Shell view={view} onNavigate={setView} settings={data.settings} scheduledCount={scheduledCount} onLogout={logout}>
        {view === 'Visão geral' && <Overview data={data} month={month} onMonthChange={setMonth} onNew={() => newAppointment(dayKey(new Date()))} onOpen={openAppointment} onNavigate={setView} />}
        {view === 'Agenda' && <Agenda data={data} month={month} onMonthChange={setMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} onNew={date => newAppointment(date)} onOpen={openAppointment} />}
        {view === 'Pacientes' && <Patients data={data} onNew={() => setPatientDraft({})} onEdit={patient => setPatientDraft({ patient })} onOpenRecord={id => { setSelectedPatientId(id); setView('Prontuário'); }} />}
        {view === 'Prontuário' && <Record data={data} setData={setData} patientId={selectedPatientId} onSelectPatient={setSelectedPatientId} onEditPatient={patient => setPatientDraft({ patient })} onNewAppointment={id => newAppointment(dayKey(new Date()), id)} onError={setNotice} />}
        {view === 'Financeiro' && <Finance data={data} setData={setData} month={month} onMonthChange={setMonth} />}
        {view === 'Todos os dias' && <Daily />}
        {view === 'Configurações' && <Settings data={data} setData={setData} />}
      </Shell>

      {appointmentDraft && (
        <AppointmentModal
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
      {patientDraft && <PatientModal patient={patientDraft.patient} onSave={savePatient} onDelete={deletePatient} onClose={() => setPatientDraft(null)} />}
      {saveError && <Toast tone="danger" message={`Alterações não salvas: ${saveError}`} action={<button type="button" className="z-btn secondary sm" onClick={() => setData(current => ({ ...current }))}>Tentar de novo</button>} />}
      {notice && !saveError && <Toast tone="danger" message={notice} onClose={() => setNotice('')} />}
    </>
  );
}
