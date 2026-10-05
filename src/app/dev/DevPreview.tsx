'use client';

// Pré-visualização local do painel com dados fictícios, sem login e sem salvar. Não existe em produção.
import { useState } from 'react';
import { Agenda } from '@/components/clinic/Agenda';
import { AppointmentModal, quickPatient } from '@/components/clinic/AppointmentModal';
import { Finance } from '@/components/clinic/Finance';
import { Overview } from '@/components/clinic/Overview';
import { PatientModal } from '@/components/clinic/PatientModal';
import { Patients } from '@/components/clinic/Patients';
import { Record } from '@/components/clinic/Record';
import { Settings } from '@/components/clinic/Settings';
import { Daily } from '@/components/clinic/Daily';
import { Shell } from '@/components/clinic/Shell';
import { Team } from '@/components/clinic/Team';
import { canView, type ClinicView } from '@/components/clinic/types';
import { ALL_MODULES, blankUnreadable, type Access } from '@/lib/clinic/permissions';
import { TEMPLATES, isTemplateId, recordFromTemplate } from '@/lib/clinic/templates';
import { cleanLocalStore, dayKey, initial, monthKey, normalizePatient, type Appointment, type Patient, type Store } from '@/lib/clinic/store';

function fixture(): Store {
  const today = new Date();
  const day = (offset: number) => { const d = new Date(today); d.setDate(d.getDate() + offset); return dayKey(d); };
  const patients = [
    normalizePatient({ id: 'p1', name: 'Mariana Alves Costa', phone: '(11) 98765-4321', birthDate: '1990-04-12', insuranceType: 'Convênio', insuranceName: 'Unimed' }),
    normalizePatient({ id: 'p2', name: 'Roberto Lima', phone: '(11) 91234-5678', birthDate: '1978-09-03' }),
    normalizePatient({ id: 'p3', name: 'Ana Beatriz Souza', socialName: 'Bia', phone: '(21) 99876-1122' }),
  ];
  const appointments: Appointment[] = [
    { id: 'a1', patientId: 'p1', date: day(0), time: '09:00', duration: 30, type: 'Consulta', status: 'Agendada', price: 450, notes: '' },
    { id: 'a2', patientId: 'p2', date: day(0), time: '10:30', duration: 60, type: 'Procedimento', status: 'Agendada', price: 900, notes: '' },
    { id: 'a3', patientId: 'p3', date: day(-2), time: '14:00', duration: 30, type: 'Retorno', status: 'Realizada', price: 250, notes: '' },
    { id: 'a4', patientId: 'p1', date: day(3), time: '16:00', duration: 45, type: 'Consulta', status: 'Agendada', price: 450, notes: '' },
    { id: 'a5', patientId: 'p2', date: day(-5), time: '11:00', duration: 30, type: 'Consulta', status: 'Cancelada', price: 450, notes: '' },
  ];
  return cleanLocalStore({ ...initial, patients, appointments, settings: { ...initial.settings, clinicName: 'Clínica Teste', professionalName: 'Dra. Teste Silva', specialty: 'Tricologia' } });
}

// ?papel=secretaria mostra o painel de quem só tem agenda e pacientes; ?modelo=dermatologia|geral troca o prontuário.
function devAccess(papel?: string): Access {
  return papel === 'secretaria'
    ? { email: 'sec@zaindu.app', name: 'Secretária Teste', role: 'member', clinicId: 'dev', modules: ['agenda', 'pacientes'] }
    : { email: 'gestora@zaindu.app', name: 'Gestora', role: 'manager', clinicId: 'dev', modules: ALL_MODULES };
}

function devFixture(access: Access, template?: string): Store {
  const base = fixture();
  if (isTemplateId(template)) base.settings = { ...base.settings, specialty: TEMPLATES[template].specialty, trichoscopyFindings: TEMPLATES[template].findings, record: recordFromTemplate(template) };
  return blankUnreadable(base, access.modules);
}

export function DevPreview({ papel, modelo }: { papel?: string; modelo?: string }) {
  const [access] = useState<Access>(() => devAccess(papel));
  const [data, setData] = useState<Store>(() => devFixture(access, modelo));
  const [view, setView] = useState<ClinicView>('Visão geral');
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dayKey(new Date()));
  const [patientId, setPatientId] = useState('p1');
  const [appt, setAppt] = useState<{ appointment?: Appointment; date: string } | null>(null);
  const [patientDraft, setPatientDraft] = useState<{ patient?: Patient } | null>(null);
  return (
    <>
      <Shell view={canView(view, access) ? view : 'Visão geral'} onNavigate={setView} settings={data.settings} access={access} scheduledCount={3} onLogout={() => {}}>
        {view === 'Visão geral' && <Overview data={data} access={access} month={month} onMonthChange={setMonth} onNew={() => setAppt({ date: dayKey(new Date()) })} onOpen={a => setAppt({ appointment: a, date: a.date })} onNavigate={setView} />}
        {view === 'Agenda' && <Agenda data={data} month={month} onMonthChange={setMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} onNew={date => setAppt({ date })} onOpen={a => setAppt({ appointment: a, date: a.date })} />}
        {view === 'Pacientes' && <Patients data={data} onNew={() => setPatientDraft({})} onEdit={patient => setPatientDraft({ patient })} onOpenRecord={id => { setPatientId(id); setView('Prontuário'); }} />}
        {view === 'Prontuário' && <Record data={data} setData={setData} patientId={patientId} onSelectPatient={setPatientId} onEditPatient={patient => setPatientDraft({ patient })} onNewAppointment={() => setAppt({ date: dayKey(new Date()) })} onError={() => {}} />}
        {view === 'Financeiro' && <Finance data={data} setData={setData} month={month} onMonthChange={setMonth} />}
        {view === 'Todos os dias' && <Daily />}
        {view === 'Configurações' && <Settings data={data} setData={setData} />}
        {view === 'Equipe' && <Team access={access} clinicId="dev" />}
      </Shell>
      {appt && <AppointmentModal data={data} appointment={appt.appointment} initialDate={appt.date} onCreatePatient={name => { const p = quickPatient(name); setData(d => ({ ...d, patients: [p, ...d.patients] })); return p.id; }} onClose={() => setAppt(null)} onSave={a => { setData(d => ({ ...d, appointments: [...d.appointments.filter(x => x.id !== a.id), a] })); setAppt(null); }} onDelete={id => { setData(d => ({ ...d, appointments: d.appointments.filter(x => x.id !== id) })); setAppt(null); }} />}
      {patientDraft && <PatientModal patient={patientDraft.patient} onSave={p => { setData(d => ({ ...d, patients: [...d.patients.filter(x => x.id !== p.id), p] })); setPatientDraft(null); }} onClose={() => setPatientDraft(null)} />}
    </>
  );
}
