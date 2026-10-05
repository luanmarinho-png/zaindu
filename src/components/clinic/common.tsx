'use client';

import { useId, useMemo, useState } from 'react';
import { CalendarClock, CircleCheck, CircleX, Search, Sparkles, UserPlus, type LucideIcon } from 'lucide-react';
import { RAPPORT_FIELDS, type Appointment, type Patient } from '@/lib/clinic/store';

const STATUS: Record<Appointment['status'], { tone: string; Icon: LucideIcon }> = {
  Agendada: { tone: 'info', Icon: CalendarClock },
  Realizada: { tone: 'success', Icon: CircleCheck },
  Cancelada: { tone: 'danger', Icon: CircleX },
};

export function StatusBadge({ status, small, iconOnly }: { status: Appointment['status']; small?: boolean; iconOnly?: boolean }) {
  const { tone, Icon } = STATUS[status];
  if (iconOnly) return <span className={`z-badge ${tone} sm icon-only`} title={status} aria-label={status}><Icon aria-hidden="true" /></span>;
  return <span className={`z-badge ${tone} ${small ? 'sm' : ''}`}><Icon aria-hidden="true" />{status}</span>;
}

export function StatusSegment({ value, onChange }: { value: Appointment['status']; onChange: (status: Appointment['status']) => void }) {
  return (
    <div className="z-segment" role="group" aria-label="Status da consulta">
      {(Object.keys(STATUS) as Appointment['status'][]).map(status => {
        const { tone, Icon } = STATUS[status];
        return (
          <button key={status} type="button" className={`tone-${tone}`} aria-pressed={value === status} onClick={() => onChange(status)}>
            <Icon aria-hidden="true" />{status}
          </button>
        );
      })}
    </div>
  );
}

export function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: LucideIcon; tone?: 'positive' | 'negative' }) {
  return (
    <article className="z-card z-metric">
      <div className="z-metric-top">
        <span className="t-body-strong t-muted">{label}</span>
        <span className="z-metric-icon"><Icon aria-hidden="true" /></span>
      </div>
      <strong className={`z-metric-value num ${tone ? `tone-${tone}` : ''}`}>{value}</strong>
      <span className="t-body t-muted">{note}</span>
    </article>
  );
}

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

// Busca de paciente por nome ou telefone, com cadastro rápido quando o nome não existe.
export function PatientPicker({ patients, value, onChange, onQuickCreate, invalid }: {
  patients: Patient[];
  value: string;
  onChange: (patientId: string) => void;
  onQuickCreate?: (name: string) => string;
  invalid?: boolean;
}) {
  const selected = patients.find(patient => patient.id === value);
  const [query, setQuery] = useState(selected?.name || '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const matches = useMemo(() => {
    const term = normalize(query.trim());
    const digits = query.replace(/\D/g, '');
    return patients
      .filter(patient => !term || normalize(patient.name).includes(term) || (digits.length > 2 && patient.phone.replace(/\D/g, '').includes(digits)))
      .slice(0, 8);
  }, [patients, query]);
  const canCreate = Boolean(onQuickCreate) && query.trim().length > 1 && !patients.some(patient => normalize(patient.name) === normalize(query.trim()));
  const options = [...matches.map(patient => ({ kind: 'patient' as const, patient })), ...(canCreate ? [{ kind: 'create' as const }] : [])];

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (option.kind === 'patient') { onChange(option.patient.id); setQuery(option.patient.name); }
    else if (onQuickCreate) { const id = onQuickCreate(query.trim()); onChange(id); }
    setOpen(false);
  };

  return (
    <div className="z-combobox">
      <div className="z-inputwrap" aria-invalid={invalid || undefined}>
        <Search aria-hidden="true" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Buscar por nome ou telefone"
          value={query}
          onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); if (value) onChange(''); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, options.length - 1)); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
            else if (event.key === 'Enter' && open && options.length) { event.preventDefault(); choose(active); }
            else if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); }
          }}
        />
      </div>
      {open && options.length > 0 && (
        <ul className="z-combobox-list" id={listId} role="listbox">
          {options.map((option, index) => option.kind === 'patient' ? (
            <li key={option.patient.id} role="option" aria-selected={index === active} onMouseDown={event => { event.preventDefault(); choose(index); }} onMouseEnter={() => setActive(index)}>
              <span className="z-avatar xs">{option.patient.name.slice(0, 1).toUpperCase()}</span>
              <span className="z-combobox-text"><strong>{option.patient.name}</strong>{option.patient.phone && <small>{option.patient.phone}</small>}</span>
            </li>
          ) : (
            <li key="create" role="option" aria-selected={index === active} className="create" onMouseDown={event => { event.preventDefault(); choose(index); }} onMouseEnter={() => setActive(index)}>
              <UserPlus aria-hidden="true" />
              <span className="z-combobox-text"><strong>Cadastrar “{query.trim()}”</strong><small>Complete os dados depois em Pacientes</small></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "Para lembrar": o que a equipe registrou em Conhecer o paciente, mostrado antes e durante a consulta.
export function Remember({ patient, compact }: { patient: Patient; compact?: boolean }) {
  const filled = RAPPORT_FIELDS.filter(field => patient.rapport?.[field.key]?.trim());
  if (!filled.length) return null;
  return (
    <section className="z-remember" aria-label="Para lembrar na consulta">
      <h3><Sparkles aria-hidden="true" />Para lembrar com {(patient.socialName || patient.name).split(' ')[0]}</h3>
      <dl>
        {(compact ? filled.slice(0, 4) : filled).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{patient.rapport?.[field.key]}</dd></div>)}
      </dl>
    </section>
  );
}
