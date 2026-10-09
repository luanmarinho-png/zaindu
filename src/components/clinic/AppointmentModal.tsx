'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, Clock, Mail, NotebookPen, Stethoscope, Timer, TriangleAlert, User, UserRoundCog, Wallet, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { brl, minutesOf, timeOf } from '@/lib/clinic/format';
import { MAIN_PROFESSIONAL, type Professional, type CalendarInvitee } from '@/lib/clinic/permissions';
import { findService, makeId, normalizePatient, servicePrice, type Appointment, type Store } from '@/lib/clinic/store';
import { PatientPicker, Remember, StatusSegment } from './common';
import { Select } from '@/components/ui/Select';
import { calendarGuestEmail, googleCalendarUrl } from '@/lib/clinic/googleCalendar';

const DURATIONS = [15, 30, 45, 60, 90, 120];

type Props = {
  data: Store;
  appointment?: Appointment;
  initialDate: string;
  initialPatientId?: string;
  onSave: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  onCreatePatient: (name: string) => string;
  onClose: () => void;
  showMoney?: boolean;
  professionals?: Professional[];
  calendarInvitees?: CalendarInvitee[];
  // Profissional já escolhido (filtro da agenda ou o próprio usuário, quando ele atende).
  initialProfessionalId?: string;
};

export function AppointmentModal({ data, appointment, initialDate, initialPatientId = '', onSave, onDelete, onCreatePatient, onClose, showMoney = true, professionals = [], calendarInvitees = [], initialProfessionalId = '' }: Props) {
  // Tipos vêm dos atendimentos do Financeiro (com duração e preço); sem eles, da lista antiga das Configurações.
  const types = data.services.length ? data.services.map(item => item.name) : data.settings.appointmentTypes.length ? data.settings.appointmentTypes : ['Consulta'];
  const [patientId, setPatientId] = useState(appointment?.patientId || initialPatientId);
  const [type, setType] = useState(appointment?.type || types[0]);
  const [date, setDate] = useState(appointment?.date || initialDate);
  const [time, setTime] = useState(appointment?.time || '09:00');
  const [duration, setDuration] = useState(appointment?.duration || findService(data.services, appointment?.type || types[0])?.duration || 30);
  const [professionalId, setProfessionalId] = useState(appointment?.professionalId || (initialProfessionalId !== MAIN_PROFESSIONAL ? initialProfessionalId : ''));
  const [price, setPrice] = useState(appointment?.price ?? 0);
  const [priceTouched, setPriceTouched] = useState(Boolean(appointment));
  const [status, setStatus] = useState<Appointment['status']>(appointment?.status || 'Agendada');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [calendarGuestId, setCalendarGuestId] = useState('');
  const calendarGuest = calendarInvitees.find(item => item.id === calendarGuestId)?.email || '';

  // Preço do atendimento de mesmo nome: o definido no Financeiro ou custo + margem.
  const suggested = useMemo(() => {
    const service = findService(data.services, type);
    return service ? servicePrice(service, data.supplies, data.targetMargin) : null;
  }, [data.services, data.supplies, data.targetMargin, type]);
  const chooseType = (next: string) => {
    setType(next);
    const service = findService(data.services, next);
    if (service?.duration) setDuration(service.duration);
  };

  const conflicts = useMemo(() => {
    const start = minutesOf(time);
    const end = start + duration;
    // Só conflita com a agenda do mesmo profissional.
    return data.appointments.filter(item => item.id !== appointment?.id && item.date === date && item.status !== 'Cancelada'
      && (item.professionalId || '') === professionalId
      && minutesOf(item.time) < end && minutesOf(item.time) + (item.duration || 30) > start);
  }, [data.appointments, appointment?.id, date, time, duration, professionalId]);

  const effectivePrice = !priceTouched && suggested !== null && !price ? suggested : price;
  const patientName = (id: string) => data.patients.find(patient => patient.id === id)?.name || 'Paciente';
  const calendarPatient = appointment ? data.patients.find(patient => patient.id === appointment.patientId) : undefined;
  const calendarPatientEmail = calendarPatient && calendarGuestEmail(calendarPatient.email);
  const calendarUrl = appointment ? googleCalendarUrl(appointment, '', calendarPatient) : null;
  const calendarInviteUrl = appointment && (!calendarGuestId || calendarGuestEmail(calendarGuest)) ? googleCalendarUrl(appointment, calendarGuest, calendarPatient) : null;
  const invalidCalendarGuest = Boolean(calendarGuestId && !calendarGuestEmail(calendarGuest));
  const calendarChanged = Boolean(appointment && (patientId !== appointment.patientId || date !== appointment.date || time !== appointment.time || duration !== appointment.duration || status !== appointment.status));

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!patientId || !date || !time) return;
    onSave({ id: appointment?.id || makeId(), patientId, type, date, time, duration, price: effectivePrice, status, notes: notes.trim(), ...(professionalId ? { professionalId } : {}) });
  };

  return (
    <Modal
      title={appointment ? 'Editar consulta' : 'Nova consulta'}
      description={appointment ? `${patientName(appointment.patientId)} · ${type}` : 'Escolha o paciente, o horário e o valor.'}
      onClose={onClose}
      onSubmit={submit}
      footer={<>
        {appointment && (confirmDelete
          ? <button type="button" className="z-btn danger" onClick={() => onDelete(appointment.id)}><Trash2 />Confirmar exclusão</button>
          : <button type="button" className="z-btn danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 />Excluir</button>)}
        <span className="spacer" />
        <button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="z-btn brand">{appointment ? 'Salvar alterações' : 'Agendar consulta'}</button>
      </>}
    >
      <div className="z-form-grid">
        <Field label="Paciente" icon={User} required full error={submitted && !patientId ? 'Escolha ou cadastre o paciente.' : undefined}>
          <PatientPicker patients={data.patients} value={patientId} onChange={setPatientId} onQuickCreate={onCreatePatient} invalid={submitted && !patientId} />
        </Field>
        <Field label="Tipo de atendimento" icon={Stethoscope} htmlFor="appt-type">
          <Select id="appt-type" value={type} ariaLabel="Tipo de atendimento" onChange={chooseType} options={[...types, ...(types.includes(type) ? [] : [type])].map(item => { const service = findService(data.services, item); return { value: item, label: item, hint: service?.duration ? `${service.duration} min` : undefined }; })} />
        </Field>
        {showMoney && (
          <Field label="Valor" icon={Wallet} htmlFor="appt-price" full hint={suggested !== null ? `Sugerido: ${brl(suggested)}` : undefined}>
            <MoneyInput id="appt-price" value={effectivePrice} onChange={value => { setPrice(value); setPriceTouched(true); }} />
          </Field>
        )}
        <Field label="Data" icon={CalendarDays} required htmlFor="appt-date">
          <input id="appt-date" className="z-input" type="date" required value={date} onChange={event => setDate(event.target.value)} />
        </Field>
        <Field label="Horário" icon={Clock} required htmlFor="appt-time" hint={`Termina às ${timeOf(minutesOf(time) + duration)}`}>
          <input id="appt-time" className="z-input" type="time" required step={300} value={time} onChange={event => setTime(event.target.value)} />
        </Field>
        {data.patients.find(item => item.id === patientId) && <div className="full"><Remember patient={data.patients.find(item => item.id === patientId)!} compact /></div>}
        {professionals.length > 1 && (
          <Field label="Profissional" icon={UserRoundCog} htmlFor="appt-pro" full>
            <Select id="appt-pro" value={professionalId || MAIN_PROFESSIONAL} ariaLabel="Profissional" onChange={value => setProfessionalId(value === MAIN_PROFESSIONAL ? '' : value)} options={professionals.map(item => ({ value: item.id, label: item.name, hint: item.specialty || undefined }))} />
          </Field>
        )}
        <Field label="Duração" icon={Timer} full>
          <div className="z-segment" role="group" aria-label="Duração">
            {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map(minutes => <button key={minutes} type="button" aria-pressed={duration === minutes} onClick={() => setDuration(minutes)}>{minutes} min</button>)}
          </div>
        </Field>
        {conflicts.length > 0 && (
          <div className="z-callout warn full" role="status">
            <TriangleAlert aria-hidden="true" />
            <span>Conflita com {conflicts.map(item => `${item.time} · ${patientName(item.patientId)}`).join(', ')}.</span>
          </div>
        )}
        {appointment && (
          <Field label="Status" full>
            <StatusSegment value={status} onChange={setStatus} />
          </Field>
        )}
        <Field label="Observações" icon={NotebookPen} full htmlFor="appt-notes">
          <textarea id="appt-notes" className="z-textarea" rows={3} placeholder="Opcional" value={notes} onChange={event => setNotes(event.target.value)} />
        </Field>
        {calendarUrl && <>
          <div className="z-field full"><span className="z-label">Paciente no Google Agenda</span><p className="z-hint">{calendarPatientEmail ? `Nome no evento: ${calendarPatient?.name}. Convite para ${calendarPatientEmail}.` : `Nome no evento: ${calendarPatient?.name || 'Paciente'}. Cadastre um e-mail válido no paciente para convidá-lo também.`}</p></div>
          <Field label="Convidar alguém da clínica (opcional)" icon={Mail} full htmlFor="appt-calendar-guest" hint="Escolha uma pessoa da equipe desta clínica. O Google envia o convite após você salvar e confirmar." error={invalidCalendarGuest ? 'Cadastre o e-mail do Google Agenda desta pessoa em Equipe.' : undefined}>
            <Select id="appt-calendar-guest" value={calendarGuestId} onChange={setCalendarGuestId} ariaLabel="Convidar alguém da clínica" options={[{ value: '', label: 'Não convidar' }, ...calendarInvitees.map(item => ({ value: item.id, label: item.name, hint: item.email || 'E-mail do Google Agenda não cadastrado' }))]} />
          </Field>
          <div className="z-field full">
            {calendarChanged || !calendarInviteUrl
              ? <button type="button" className="z-btn calendar" disabled><CalendarPlus aria-hidden="true" />Adicionar ao Google Agenda</button>
              : <a className="z-btn calendar" href={calendarInviteUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><CalendarPlus aria-hidden="true" />Adicionar ao Google Agenda</a>}
            <span className="z-hint">{calendarChanged ? 'Salve as alterações e reabra a consulta para adicionar o horário atualizado.' : invalidCalendarGuest ? 'Cadastre o e-mail em Equipe ou selecione “Não convidar”.' : calendarPatientEmail || calendarGuest.trim() ? 'Abre o Google com os convidados preenchidos. Escolha sua conta, salve e confirme o envio dos convites. Alterações posteriores precisam ser feitas no Google também.' : 'Abre em outra aba. Escolha sua conta e salve no Google. Remarcações e cancelamentos precisam ser atualizados lá também.'}</span>
          </div>
        </>}
      </div>
    </Modal>
  );
}

// Cadastro mínimo a partir da busca da consulta; o restante é completado em Pacientes.
export function quickPatient(name: string) {
  return normalizePatient({ id: makeId(), name });
}
