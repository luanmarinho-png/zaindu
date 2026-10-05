'use client';

import { useState } from 'react';
import { Building2, ClipboardList, ListChecks, Plus, Stethoscope, Trash2, UserRound, X } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { makeId, type ClinicSettings } from '@/lib/clinic/store';
import { FIELD_TYPES, TEMPLATES, type FieldType, type RecordSection, type TemplateField } from '@/lib/clinic/templates';
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
      <RecordSteps settings={data.settings} onChange={sections => set({ record: { ...data.settings.record, sections } })} />
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

const newField = (): TemplateField => ({ key: `c_${makeId().replace(/-/g, '').slice(0, 10)}`, label: '', type: 'textarea' });

// Etapas do prontuário: as do modelo da especialidade ficam fixas; a clínica acrescenta as suas.
function RecordSteps({ settings, onChange }: { settings: ClinicSettings; onChange: (sections: RecordSection[]) => void }) {
  const sections = settings.record.sections;
  const patch = (id: string, next: Partial<RecordSection>) => onChange(sections.map(section => section.id === id ? { ...section, ...next } : section));
  const patchField = (section: RecordSection, key: string, next: Partial<TemplateField>) => patch(section.id, { fields: section.fields.map(field => field.key === key ? { ...field, ...next } : field) });
  const add = () => onChange([...sections, { id: `etapa-${makeId().slice(0, 8)}`, title: 'Nova etapa', custom: true, fields: [newField()] }]);
  return (
    <section className="z-card white z-section">
      <header className="z-section-head">
        <div>
          <h2 className="t-h1"><ClipboardList aria-hidden="true" className="z-inline-icon" />Etapas do prontuário</h2>
          <p className="t-body t-muted">Modelo {TEMPLATES[settings.record.template].name}. Acrescente etapas próprias da clínica; elas aparecem em toda nova evolução.</p>
        </div>
        <button type="button" className="z-btn secondary" onClick={add}><Plus />Nova etapa</button>
      </header>
      <ol className="z-steps">
        {sections.map(section => section.custom ? (
          <li key={section.id} className="z-step custom">
            <div className="z-step-head">
              <input className="z-input" value={section.title} onChange={event => patch(section.id, { title: event.target.value })} aria-label="Nome da etapa" placeholder="Nome da etapa" />
              <button type="button" className="z-btn danger-ghost sm" onClick={() => onChange(sections.filter(item => item.id !== section.id))}><Trash2 />Remover etapa</button>
            </div>
            <ul className="z-step-fields">
              {section.fields.map(field => (
                <li key={field.key}>
                  <input className="z-input" value={field.label} onChange={event => patchField(section, field.key, { label: event.target.value })} placeholder="Nome do campo" aria-label="Nome do campo" />
                  <select className="z-select" value={field.type} onChange={event => patchField(section, field.key, { type: event.target.value as FieldType })} aria-label="Tipo do campo">
                    {(Object.keys(FIELD_TYPES) as FieldType[]).map(type => <option key={type} value={type}>{FIELD_TYPES[type]}</option>)}
                  </select>
                  {(field.type === 'select' || field.type === 'checklist') && (
                    <input className="z-input z-step-options" value={(field.options || []).join(', ')} onChange={event => patchField(section, field.key, { options: event.target.value.split(',').map(item => item.trimStart()) })} onBlur={event => patchField(section, field.key, { options: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="Opções separadas por vírgula" aria-label="Opções" />
                  )}
                  <button type="button" className="z-close" onClick={() => patch(section.id, { fields: section.fields.filter(item => item.key !== field.key) })} aria-label="Remover campo" disabled={section.fields.length === 1}><X /></button>
                </li>
              ))}
            </ul>
            <button type="button" className="z-btn ghost sm" onClick={() => patch(section.id, { fields: [...section.fields, newField()] })}><Plus />Adicionar campo</button>
          </li>
        ) : (
          <li key={section.id} className="z-step">
            <div className="z-step-head"><strong>{section.title}</strong><span className="z-badge sm">Padrão do modelo</span></div>
            <p className="t-body t-muted">{section.fields.map(field => field.label).join(' · ')}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
