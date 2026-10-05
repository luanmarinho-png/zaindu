'use client';

import { useMemo, useState } from 'react';
import { ClipboardList, Pencil, Phone, Search, UserPlus, Users } from 'lucide-react';
import { ageFrom, formatDate } from '@/lib/clinic/format';
import type { Patient, Store } from '@/lib/clinic/store';
import { PageHeader } from './Shell';

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

type Props = {
  data: Store;
  onNew: () => void;
  onEdit: (patient: Patient) => void;
  onOpenRecord: (patientId: string) => void;
};

export function Patients({ data, onNew, onEdit, onOpenRecord }: Props) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const term = normalize(query.trim());
    const digits = query.replace(/\D/g, '');
    return data.patients
      .filter(patient => !term || normalize(`${patient.name} ${patient.socialName} ${patient.email}`).includes(term) || (digits.length > 2 && `${patient.phone}${patient.cpf}`.replace(/\D/g, '').includes(digits)))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data.patients, query]);
  const lastVisit = (id: string) => data.appointments.filter(item => item.patientId === id && item.status === 'Realizada').map(item => item.date).sort().pop();

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle={`${data.patients.length} cadastrado(s)`}
        actions={<button type="button" className="z-btn brand" onClick={onNew}><UserPlus />Cadastrar paciente</button>}
      />
      <section className="z-card white z-patients">
        <div className="z-inputwrap z-search">
          <Search aria-hidden="true" />
          <input type="search" placeholder="Buscar por nome, telefone, CPF ou e-mail" value={query} onChange={event => setQuery(event.target.value)} aria-label="Buscar paciente" />
        </div>
        {list.length ? (
          <ul className="z-patient-list">
            {list.map(patient => {
              const age = ageFrom(patient.birthDate);
              const visit = lastVisit(patient.id);
              return (
                <li key={patient.id} className="z-patient-row">
                  <span className="z-avatar">{(patient.socialName || patient.name).slice(0, 1).toUpperCase()}</span>
                  <div className="z-patient-main">
                    <strong>{patient.socialName || patient.name}</strong>
                    <small className="t-muted">
                      {[age !== null ? `${age} anos` : '', patient.phone, visit ? `última consulta ${formatDate(visit)}` : 'sem consulta realizada'].filter(Boolean).join(' · ')}
                    </small>
                  </div>
                  <span className={`z-badge sm ${patient.insuranceType === 'Convênio' ? 'info' : ''}`}>{patient.insuranceType === 'Convênio' ? patient.insuranceName || 'Convênio' : 'Particular'}</span>
                  <div className="z-row-actions">
                    {patient.phone && <a className="z-close" href={`https://wa.me/55${patient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${patient.name}`} title="WhatsApp"><Phone /></a>}
                    <button type="button" className="z-close" onClick={() => onEdit(patient)} aria-label={`Editar ${patient.name}`} title="Editar"><Pencil /></button>
                    <button type="button" className="z-btn secondary sm" onClick={() => onOpenRecord(patient.id)}><ClipboardList />Prontuário</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : data.patients.length ? (
          <div className="z-empty"><Search aria-hidden="true" /><span>Nenhum paciente com “{query}”.</span></div>
        ) : (
          <div className="z-empty">
            <Users aria-hidden="true" />
            <strong>Nenhum paciente ainda</strong>
            <span>Cadastre o primeiro para começar a agendar.</span>
            <button type="button" className="z-btn brand" onClick={onNew}><UserPlus />Cadastrar paciente</button>
          </div>
        )}
      </section>
    </>
  );
}
