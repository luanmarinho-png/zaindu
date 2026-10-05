'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Clock, NotebookPen, Stethoscope, Timer, TriangleAlert, User, Wallet, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { brl, minutesOf, timeOf } from '@/lib/clinic/format';
import { makeId, normalizePatient, serviceCost, type Appointment, type Store } from '@/lib/clinic/store';
import { PatientPicker, StatusSegment } from './common';

const DURATIONS = [30, 45, 60, 90];

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
};

export function AppointmentModal({ data, appointment, initialDate, initialPatientId = '', onSave, onDelete, onCreatePatient, onClose, showMoney = true }: Props) {
  const types = data.settings.appointmentTypes.length ? data.settings.appointmentTypes : ['Consulta'];
  const [patientId, setPatientId] = useState(appointment?.patientId || initialPatientId);
  const [type, setType] = useState(appointment?.type || types[0]);
  const [date, setDate] = useState(appointment?.date || initialDate);
  const [time, setTime] = useState(appointment?.time || '09:00');
  const [duration, setDuration] = useState(appointment?.duration || 30);
  const [price, setPrice] = useState(appointment?.price ?? 0);
  const [priceTouched, setPriceTouched] = useState(Boolean(appointment));
  const [status, setStatus] = useState<Appointment['status']>(appointment?.status || 'Agendada');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Preço sugerido: custo do serviço de mesmo nome + margem alvo, quando existir.
  const suggested = useMemo(() => {
    const service = data.services.find(item => item.name.toLocaleLowerCase('pt-BR') === type.toLocaleLowerCase('pt-BR'));
    return service ? Math.round(serviceCost(service, data.supplies) * (1 + data.targetMargin / 100) * 100) / 100 : null;
  }, [data.services, data.supplies, data.targetMargin, type]);

  const conflicts = useMemo(() => {
    const start = minutesOf(time);
    const end = start + duration;
    return data.appointments.filter(item => item.id !== appointment?.id && item.date === date && item.status !== 'Cancelada'
      && minutesOf(item.time) < end && minutesOf(item.time) + (item.duration || 30) > start);
  }, [data.appointments, appointment?.id, date, time, duration]);

  const effectivePrice = !priceTouched && suggested !== null && !price ? suggested : price;
  const patientName = (id: string) => data.patients.find(patient => patient.id === id)?.name || 'Paciente';

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!patientId || !date || !time) return;
    onSave({ id: appointment?.id || makeId(), patientId, type, date, time, duration, price: effectivePrice, status, notes: notes.trim() });
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
          <select id="appt-type" className="z-select" value={type} onChange={event => setType(event.target.value)}>
            {types.map(item => <option key={item}>{item}</option>)}
            {!types.includes(type) && <option>{type}</option>}
          </select>
        </Field>
        {showMoney && (
          <Field label="Valor" icon={Wallet} htmlFor="appt-price" hint={suggested !== null ? `Sugerido: ${brl(suggested)}` : undefined}>
            <MoneyInput id="appt-price" value={effectivePrice} onChange={value => { setPrice(value); setPriceTouched(true); }} />
          </Field>
        )}
        <Field label="Data" icon={CalendarDays} required htmlFor="appt-date">
          <input id="appt-date" className="z-input" type="date" required value={date} onChange={event => setDate(event.target.value)} />
        </Field>
        <Field label="Horário" icon={Clock} required htmlFor="appt-time" hint={`Termina às ${timeOf(minutesOf(time) + duration)}`}>
          <input id="appt-time" className="z-input" type="time" required step={300} value={time} onChange={event => setTime(event.target.value)} />
        </Field>
        <Field label="Duração" icon={Timer} full>
          <div className="z-segment" role="group" aria-label="Duração">
            {DURATIONS.map(minutes => <button key={minutes} type="button" aria-pressed={duration === minutes} onClick={() => setDuration(minutes)}>{minutes} min</button>)}
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
      </div>
    </Modal>
  );
}

// Cadastro mínimo a partir da busca da consulta; o restante é completado em Pacientes.
export function quickPatient(name: string) {
  return normalizePatient({ id: makeId(), name });
}
