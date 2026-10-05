'use client';

import { useState } from 'react';
import { Building2, ListChecks, Plus, Stethoscope, UserRound, X } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import type { ClinicSettings } from '@/lib/clinic/store';
import { PageHeader } from './Shell';
import type { ClinicProps } from './types';

type ListKey = 'appointmentTypes' | 'trichoscopyFindings';

export function Settings({ data, setData }: ClinicProps) {
  const set = (patch: Partial<ClinicSettings>) => setData(current => ({ ...current, settings: { ...current.settings, ...patch } }));
  return (
    <>
      <PageHeader title="Configurações" subtitle="Identidade da clínica e listas usadas na agenda e no prontuário." />
      <section className="z-card white z-section">
        <header className="z-section-head"><div><h2 className="t-h1">Clínica</h2></div></header>
        <div className="z-form-grid three">
          <Field label="Nome da clínica" icon={Building2} htmlFor="s-name"><input id="s-name" className="z-input" value={data.settings.clinicName} onChange={event => set({ clinicName: event.target.value })} /></Field>
          <Field label="Profissional responsável" icon={UserRound} htmlFor="s-pro"><input id="s-pro" className="z-input" value={data.settings.professionalName} onChange={event => set({ professionalName: event.target.value })} /></Field>
          <Field label="Especialidade" icon={Stethoscope} htmlFor="s-spec"><input id="s-spec" className="z-input" value={data.settings.specialty} onChange={event => set({ specialty: event.target.value })} /></Field>
        </div>
      </section>
      <div className="z-settings-lists">
        <EditableList title="Tipos de atendimento" hint="Aparecem ao agendar. Use o mesmo nome do atendimento no Financeiro para ver o preço sugerido." values={data.settings.appointmentTypes} onChange={values => set({ appointmentTypes: values })} />
        <EditableList title="Checklist clínico" hint="Achados marcáveis na evolução do prontuário." values={data.settings.trichoscopyFindings} onChange={values => set({ trichoscopyFindings: values })} />
      </div>
    </>
  );
}

function EditableList({ title, hint, values, onChange }: { title: string; hint: string; values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const clean = draft.trim();
    if (!clean || values.includes(clean)) return;
    onChange([...values, clean]);
    setDraft('');
  };
  return (
    <section className="z-card white z-section">
      <header className="z-section-head"><div><h2 className="t-h1"><ListChecks aria-hidden="true" className="z-inline-icon" />{title}</h2><p className="t-body t-muted">{hint}</p></div></header>
      <form className="z-inline-form" onSubmit={event => { event.preventDefault(); add(); }}>
        <input className="z-input" placeholder="Adicionar opção" value={draft} onChange={event => setDraft(event.target.value)} aria-label={`Nova opção em ${title}`} />
        <button type="submit" className="z-btn secondary" disabled={!draft.trim()}><Plus />Adicionar</button>
      </form>
      <ul className="z-taglist">
        {values.map(item => (
          <li key={item} className="z-badge">
            {item}
            <button type="button" onClick={() => onChange(values.filter(value => value !== item))} aria-label={`Remover ${item}`}><X /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
