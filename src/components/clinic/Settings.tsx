'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BadgeCheck, ChevronRight, Building2, ClipboardList, Eye, History, ImagePlus, ListChecks, Palette, Plus, RotateCcw, Stethoscope, Trash2, UserRound, Users, X } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { applyBrand, isLightColor } from '@/lib/clinic/brand';
import { formatDate } from '@/lib/clinic/format';
import { canManageTeam, canRead, type Access, type Brand, type Professional } from '@/lib/clinic/permissions';
import { makeId, servicePrice, type ClinicSettings } from '@/lib/clinic/store';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { brl } from '@/lib/clinic/format';
import { ANAMNESIS_GROUPS, FIELD_TYPES, fieldGroup, groupFields, recordFromTemplate, TEMPLATES, type FieldType, type RecordConfig, type RecordSection, type TemplateField } from '@/lib/clinic/templates';
import { TemplateInput } from './Record';
import { documentHtml, LETTERHEADS, type LetterheadId } from '@/lib/clinic/documentHtml';
import { AtSign, Globe, Mail, MapPin, Phone, Printer } from 'lucide-react';
import { PageHeader } from './Shell';
import { Team } from './Team';
import type { ClinicProps } from './types';
import { Select } from '@/components/ui/Select';
import { MessageSettings } from './MessageSettings';

type Tab = 'clinica' | 'prontuario' | 'mensagens' | 'equipe' | 'historico';
type Props = ClinicProps & { access?: Access; brand?: Brand | null; onBrandChange?: (brand: Brand) => void; professionals?: Professional[] };

const MAX_LOGO_BYTES = 300 * 1024;

export function Settings({ data, setData, access, brand = null, onBrandChange, professionals = [] }: Props) {
  const [tab, setTab] = useState<Tab>('clinica');
  const manager = access ? canManageTeam(access) : false;
  const set = (patch: Partial<ClinicSettings>) => setData(current => ({ ...current, settings: { ...current.settings, ...patch } }));
  const tabs: [Tab, string, typeof Building2][] = [
    ['clinica', 'Clínica', Building2],
    ['prontuario', 'Prontuário', ClipboardList],
    ['mensagens', 'Mensagens', Mail],
    ...(manager ? [['equipe', 'Equipe e acessos', Users], ['historico', 'Histórico', History]] as [Tab, string, typeof Building2][] : []),
  ];
  return (
    <>
      <PageHeader title="Configurações" subtitle="Ajuste a identidade, o prontuário, as mensagens e a equipe da clínica." />
      <div className="z-tabs" role="tablist" aria-label="Seções das configurações">
        {tabs.map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}><Icon aria-hidden="true" />{label}</button>)}
      </div>
      {tab === 'clinica' && <>
        {manager && brand && onBrandChange && <Identity brand={brand} onChange={onBrandChange} />}
        <Letterhead data={data} setData={setData} brand={brand} />
        <section className="z-card white z-section">
          <header className="z-section-head"><div><h2 className="t-h1">Profissional responsável</h2><p className="t-body t-muted">Aparece no menu, na agenda e assina os documentos quando ninguém da equipe é escolhido.</p></div></header>
          <div className="z-form-grid three">
            <Field label="Nome" icon={UserRound} htmlFor="s-pro"><input id="s-pro" className="z-input" value={data.settings.professionalName} onChange={event => set({ professionalName: event.target.value })} /></Field>
            <Field label="Especialidade" icon={Stethoscope} htmlFor="s-spec"><input id="s-spec" className="z-input" value={data.settings.specialty} onChange={event => set({ specialty: event.target.value })} /></Field>
            <Field label="Registro profissional" icon={BadgeCheck} htmlFor="s-reg" hint="Ex.: CRM/SP 123456"><input id="s-reg" className="z-input" value={data.settings.professionalRegistry || ''} onChange={event => set({ professionalRegistry: event.target.value })} /></Field>
          </div>
        </section>
        <section className="z-card white z-section">
          <header className="z-section-head"><div><h2 className="t-h1">Visão geral</h2><p className="t-body t-muted">O que aparece na tela inicial de toda a equipe.</p></div></header>
          <label className="z-switch z-module">
            <input type="checkbox" checked={data.settings.showDailyVerse !== false} onChange={event => set({ showDailyVerse: event.target.checked })} />
            <span className="track" aria-hidden="true" />
            <span><strong>Palavra do dia</strong><small className="t-muted">Versículo e reflexão diária no card da visão geral</small></span>
          </label>
        </section>
        {access?.modules.includes('financeiro') !== false && <ServiceTypes data={data} setData={setData} />}
        <EditableList title="Checklist clínico" hint="Achados marcáveis em cada evolução do prontuário." values={data.settings.trichoscopyFindings} onChange={values => set({ trichoscopyFindings: values })} />
      </>}
      {tab === 'prontuario' && <RecordEditor record={data.settings.record} findings={data.settings.trichoscopyFindings} onChange={record => set({ record })} />}
      {tab === 'mensagens' && <MessageSettings settings={data.settings} patients={data.patients} canChoosePatients={!access || canRead('patients', access.modules)} professionals={professionals} previewOnly={!access} onChange={messages => set({ messages })} />}
      {tab === 'equipe' && access?.clinicId && <Team access={access} clinicId={access.clinicId} embedded />}
      {tab === 'historico' && access?.clinicId && <AuditLog clinicId={access.clinicId} />}
    </>
  );
}

// Nome, cor e logo: salvos na hora e aplicados ao painel de todos da clínica.
function Identity({ brand, onChange }: { brand: Brand; onChange: (brand: Brand) => void }) {
  const [name, setName] = useState(brand.name);
  const [color, setColor] = useState(brand.color);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function save(patch: Partial<Pick<Brand, 'name' | 'color' | 'logo'>>) {
    setError('');
    try {
      const response = await fetch('/api/clinic/brand', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onChange(result.brand);
      applyBrand(result.brand.color);
      setNotice('Identidade salva.');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Não foi possível salvar.');
    }
  }
  function pickLogo(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > MAX_LOGO_BYTES) { setError('Use PNG, JPG, WEBP ou SVG de até 300 KB.'); return; }
    const reader = new FileReader();
    reader.onload = () => save({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  }
  return (
    <section className="z-card white z-section">
      <header className="z-section-head"><div><h2 className="t-h1">Identidade da clínica</h2><p className="t-body t-muted">Nome, cor e logo aparecem para toda a equipe, nos documentos e no menu.</p></div></header>
      <div className="z-identity">
        <div className="z-identity-logo">
          {brand.logo ? <img src={brand.logo} alt="Logo da clínica" /> : <span className="z-brand-swatch lg" aria-hidden="true">{brand.name.slice(0, 1).toUpperCase()}</span>}
          <label className="z-btn secondary sm"><ImagePlus />{brand.logo ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={event => pickLogo(event.target.files?.[0])} /></label>
          {brand.logo && <button type="button" className="z-btn ghost sm" onClick={() => save({ logo: '' })}>Remover</button>}
        </div>
        <div className="z-form-grid">
          <Field label="Nome da clínica" icon={Building2} htmlFor="s-name"><input id="s-name" className="z-input" value={name} onChange={event => setName(event.target.value)} onBlur={() => name.trim() && name !== brand.name && save({ name })} /></Field>
          <Field label="Cor da marca" icon={Palette} htmlFor="s-color" hint={isLightColor(color) ? 'Cor clara: vira o fundo do painel, botões ficam no tom escuro do DS SC.' : 'Usada em botões, menu ativo e destaques.'}>
            <div className="z-color-row">
              <input id="s-color" type="color" className="z-color" value={color} onChange={event => { setColor(event.target.value); applyBrand(event.target.value); }} onBlur={() => color !== brand.color && save({ color })} />
              <span className="num t-muted">{color.toUpperCase()}</span>
              {color !== brand.color && <button type="button" className="z-btn brand sm" onClick={() => save({ color })}>Aplicar cor</button>}
            </div>
          </Field>
        </div>
      </div>
      {error && <p className="z-callout danger" role="alert">{error}</p>}
      {notice && <Toast tone="success" message={notice} onClose={() => setNotice('')} />}
    </section>
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

const newField = (): TemplateField => ({ key: `c_${makeId().replace(/-/g, '').slice(0, 10)}`, label: 'Nova pergunta', type: 'textarea' });
const move = <T,>(list: T[], index: number, delta: number) => {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return list;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

// Editor completo do prontuário: anamnese e etapas da evolução, perguntas do modelo inclusive.
// Respostas já gravadas ficam guardadas mesmo se a pergunta for removida (a chave do campo não muda ao renomear).
function RecordEditor({ record, findings, onChange }: { record: RecordConfig; findings: string[]; onChange: (record: RecordConfig) => void }) {
  const [preview, setPreview] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const save = (patch: Partial<RecordConfig>) => onChange({ template: record.template, anamnesis: record.anamnesis, sections: record.sections, ...patch, edited: true });
  const setAnamnesis = (anamnesis: TemplateField[]) => save({ anamnesis });
  const setSections = (sections: RecordSection[]) => save({ sections });
  const categories = groupFields(record.anamnesis);

  // Move a pergunta para cima/baixo dentro da própria categoria (a ordem geral da anamnese é preservada).
  const moveInGroup = (key: string, delta: number) => {
    const field = record.anamnesis.find(item => item.key === key);
    if (!field) return;
    const siblings = record.anamnesis.map((item, index) => ({ item, index })).filter(entry => fieldGroup(entry.item) === fieldGroup(field));
    const at = siblings.findIndex(entry => entry.item.key === key);
    const target = siblings[at + delta];
    if (!target) return;
    const next = [...record.anamnesis];
    [next[siblings[at].index], next[target.index]] = [next[target.index], next[siblings[at].index]];
    setAnamnesis(next);
  };
  const patchAnamnesis = (key: string, patch: Partial<TemplateField>) => setAnamnesis(record.anamnesis.map(item => item.key === key ? { ...item, ...patch } : item));
  const renameCategory = (from: string, to: string) => setAnamnesis(record.anamnesis.map(item => fieldGroup(item) === from ? { ...item, group: to } : item));
  const patchSection = (id: string, patch: Partial<RecordSection>) => setSections(record.sections.map(section => section.id === id ? { ...section, ...patch } : section));

  return (
    <>
      <section className="z-card white z-section">
        <header className="z-section-head">
          <div>
            <h2 className="t-h1"><ClipboardList aria-hidden="true" className="z-inline-icon" />Perguntas do prontuário</h2>
            <p className="t-body t-muted">Modelo base: {TEMPLATES[record.template].name}{record.edited ? ', personalizado pela clínica' : ''}. Abra uma categoria ou etapa e clique numa pergunta para editar.</p>
          </div>
          <div className="z-row-actions">
            <button type="button" className="z-btn secondary" onClick={() => setPreview(true)}><Eye />Ver como fica</button>
            {record.edited && (confirmReset
              ? <button type="button" className="z-btn danger sm" onClick={() => { onChange(recordFromTemplate(record.template)); setConfirmReset(false); }}>Confirmar restauração</button>
              : <button type="button" className="z-btn ghost" onClick={() => setConfirmReset(true)}><RotateCcw />Restaurar modelo</button>)}
          </div>
        </header>

        <datalist id="anamnesis-groups">{ANAMNESIS_GROUPS.map(item => <option key={item} value={item} />)}</datalist>
        <div className="z-qblock">
          <div className="z-qblock-head">
            <div><h3 className="t-h2">Anamnese</h3><p className="t-body t-muted">Preenchida uma vez e atualizada ao longo do acompanhamento. {record.anamnesis.length} perguntas em {categories.length} categorias.</p></div>
            <button type="button" className="z-btn ghost sm" onClick={() => setAnamnesis([...record.anamnesis, { ...newField(), group: 'Nova categoria' }])}><Plus />Nova categoria</button>
          </div>
          {categories.map(category => (
            <details key={category.title} className="z-qgroup">
              <summary>
                <ChevronRight className="z-chevron" aria-hidden="true" />
                <strong>{category.title}</strong>
                <span className="z-badge sm num">{category.fields.length}</span>
              </summary>
              <div className="z-qgroup-body">
                <div className="z-qgroup-tools">
                  <input className="z-input" defaultValue={category.title} aria-label="Nome da categoria" onBlur={event => event.target.value.trim() && event.target.value !== category.title && renameCategory(category.title, event.target.value.trim())} />
                  <button type="button" className="z-btn ghost sm" onClick={() => setAnamnesis([...record.anamnesis, { ...newField(), group: category.title }])}><Plus />Adicionar pergunta</button>
                </div>
                <ol className="z-qlist">
                  {category.fields.map((field, index) => (
                    <QuestionRow key={field.key} field={field} index={index} total={category.fields.length} canRemove={record.anamnesis.length > 1}
                      onPatch={patch => patchAnamnesis(field.key, patch)} onMove={delta => moveInGroup(field.key, delta)}
                      onRemove={() => setAnamnesis(record.anamnesis.filter(item => item.key !== field.key))} categoryInput />
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>

        <div className="z-qblock">
          <div className="z-qblock-head">
            <div><h3 className="t-h2">Evolução</h3><p className="t-body t-muted">Etapas preenchidas a cada consulta, na ordem abaixo.</p></div>
            <button type="button" className="z-btn ghost sm" onClick={() => setSections([...record.sections, { id: `etapa-${makeId().slice(0, 8)}`, title: 'Nova etapa', custom: true, fields: [newField()] }])}><Plus />Nova etapa</button>
          </div>
          {record.sections.map((section, sectionIndex) => (
            <details key={section.id} className="z-qgroup">
              <summary>
                <ChevronRight className="z-chevron" aria-hidden="true" />
                <strong>{section.title || 'Etapa sem nome'}</strong>
                <span className="z-badge sm num">{section.fields.length}</span>
              </summary>
              <div className="z-qgroup-body">
                <div className="z-qgroup-tools">
                  <input className="z-input" value={section.title} aria-label="Nome da etapa" onChange={event => patchSection(section.id, { title: event.target.value })} />
                  <div className="z-row-actions">
                    <button type="button" className="z-close" disabled={sectionIndex === 0} onClick={() => setSections(move(record.sections, sectionIndex, -1))} aria-label="Subir etapa" title="Subir etapa"><ArrowUp /></button>
                    <button type="button" className="z-close" disabled={sectionIndex === record.sections.length - 1} onClick={() => setSections(move(record.sections, sectionIndex, 1))} aria-label="Descer etapa" title="Descer etapa"><ArrowDown /></button>
                    <button type="button" className="z-btn ghost sm" onClick={() => patchSection(section.id, { fields: [...section.fields, newField()] })}><Plus />Pergunta</button>
                    <button type="button" className="z-btn danger-ghost sm" onClick={() => setSections(record.sections.filter(item => item.id !== section.id))}><Trash2 />Remover etapa</button>
                  </div>
                </div>
                <ol className="z-qlist">
                  {section.fields.map((field, index) => (
                    <QuestionRow key={field.key} field={field} index={index} total={section.fields.length} canRemove={section.fields.length > 1}
                      onPatch={patch => patchSection(section.id, { fields: section.fields.map(item => item.key === field.key ? { ...item, ...patch } : item) })}
                      onMove={delta => patchSection(section.id, { fields: move(section.fields, index, delta) })}
                      onRemove={() => patchSection(section.id, { fields: section.fields.filter(item => item.key !== field.key) })} />
                  ))}
                </ol>
              </div>
            </details>
          ))}
        </div>
      </section>
      {preview && (
        <Modal size="lg" variant="drawer" title="Como fica o prontuário" description="Pré-visualização com as perguntas atuais. Nada é salvo aqui." onClose={() => setPreview(false)}>
          <nav className="z-drawer-nav" aria-label="Seções do prontuário">
            <a href="#prev-anamnese">Anamnese</a>
            {record.sections.map(section => <a key={section.id} href={`#prev-${section.id}`}>{section.title}</a>)}
            {findings.length > 0 && <a href="#prev-checklist">Checklist</a>}
          </nav>
          <section id="prev-anamnese" className="z-preview-block">
            <h3 className="t-h1">Anamnese</h3>
            {groupFields(record.anamnesis).map(group => (
              <fieldset key={group.title} className="z-fieldset">
                <legend>{group.title}</legend>
                <div className="z-form-grid">{group.fields.map(field => <TemplateInput key={field.key} field={field} prefix="p-anamnese" value="" />)}</div>
              </fieldset>
            ))}
          </section>
          <section className="z-preview-block">
            <h3 className="t-h1">Evolução</h3>
            {record.sections.map(group => (
              <fieldset key={group.id} id={`prev-${group.id}`} className="z-fieldset">
                <legend>{group.title}</legend>
                <div className="z-form-grid">{group.fields.map(field => <TemplateInput key={field.key} field={field} prefix={`p-${group.id}`} value="" />)}</div>
              </fieldset>
            ))}
            {findings.length > 0 && (
              <fieldset id="prev-checklist" className="z-fieldset">
                <legend>Checklist de achados</legend>
                <div className="z-checkgrid">{findings.map(item => <label key={item} className="z-check"><input type="checkbox" /><span>{item}</span></label>)}</div>
              </fieldset>
            )}
          </section>
        </Modal>
      )}
    </>
  );
}

type AuditEntry = { id: string; name: string; email: string; at: string; firstAt: string; count: number; lines: string[] };

// Quem mudou o quê e quando (últimas 200 alterações).
function AuditLog({ clinicId }: { clinicId: string }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/audit?clinicId=${encodeURIComponent(clinicId)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Não foi possível carregar o histórico.');
    }
  }, [clinicId]);
  useEffect(() => { load(); }, [load]);
  return (
    <section className="z-card white z-section">
      <header className="z-section-head"><div><h2 className="t-h1"><History aria-hidden="true" className="z-inline-icon" />Histórico de alterações</h2><p className="t-body t-muted">Registro automático de quem alterou cadastro, agenda, prontuário, financeiro e equipe.</p></div></header>
      {error && <p className="z-callout danger" role="alert">{error}</p>}
      {entries === null ? <span className="z-loader" aria-hidden="true" /> : entries.length ? (
        <ol className="z-audit">
          {entries.map(item => (
            <li key={item.id}>
              <span className="z-avatar sm">{item.name.slice(0, 1).toUpperCase()}</span>
              <div>
                <p><strong>{item.name}</strong> <span className="t-muted">{formatDate(item.at.slice(0, 10), { day: '2-digit', month: 'short' })} às {new Date(item.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}{item.count > 1 ? ` · ${item.count} salvamentos` : ''}</span></p>
                <ul>{item.lines.map(line => <li key={line}>{line}</li>)}</ul>
              </div>
            </li>
          ))}
        </ol>
      ) : <div className="z-empty"><span>Nenhuma alteração registrada ainda.</span></div>}
    </section>
  );
}

const DURATIONS = [15, 30, 45, 60, 90, 120];

// Tipos de atendimento (os mesmos do Financeiro): nome, duração e preço. Insumos e custos ficam no Financeiro.
function ServiceTypes({ data, setData }: ClinicProps) {
  const patch = (id: string, change: Partial<ClinicProps['data']['services'][number]>) => setData(current => ({ ...current, services: current.services.map(item => item.id === id ? { ...item, ...change } : item) }));
  const add = () => setData(current => ({ ...current, services: [...current.services, { id: makeId(), name: '', knowledgeCost: current.knowledgeCost, items: [], duration: 30, price: 0 }] }));
  return (
    <section className="z-card white z-section">
      <header className="z-section-head">
        <div><h2 className="t-h1"><ListChecks aria-hidden="true" className="z-inline-icon" />Tipos de atendimento</h2><p className="t-body t-muted">Aparecem ao agendar e já preenchem duração e valor. Insumos e custos de cada um ficam em Financeiro → Atendimentos.</p></div>
        <button type="button" className="z-btn secondary" onClick={add}><Plus />Novo tipo</button>
      </header>
      {data.services.length ? (
        <div className="z-table-wrap">
          <table className="z-table z-types-table">
            <thead><tr><th>Nome</th><th>Duração</th><th>Preço</th><th aria-label="Ações" /></tr></thead>
            <tbody>
              {data.services.map(service => (
                <tr key={service.id}>
                  <td data-label="Nome"><input className="z-input" value={service.name} placeholder="Ex.: Consulta inicial" onChange={event => patch(service.id, { name: event.target.value })} aria-label="Nome do atendimento" /></td>
                  <td data-label="Duração"><Select size="sm" value={String(service.duration || 30)} ariaLabel="Duração" onChange={value => patch(service.id, { duration: Number(value) })} options={DURATIONS.map(minutes => ({ value: String(minutes), label: `${minutes} min` }))} /></td>
                  <td data-label="Preço"><MoneyInput ariaLabel="Preço" value={service.price || 0} onChange={value => patch(service.id, { price: value })} placeholder={brl(servicePrice({ ...service, price: 0 }, data.supplies, data.targetMargin))} /></td>
                  <td><button type="button" className="z-close" onClick={() => setData(current => ({ ...current, services: current.services.filter(item => item.id !== service.id) }))} aria-label={`Remover ${service.name}`} title="Remover"><Trash2 /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className="z-empty"><span>Nenhum tipo cadastrado. Crie, por exemplo, “Consulta” e “Retorno”.</span></div>}
    </section>
  );
}

// Papel timbrado: modelos que sempre usam a cor e o logo da clínica, com pré-visualização ao vivo e contatos do rodapé.
function Letterhead({ data, setData, brand }: ClinicProps & { brand: Brand | null }) {
  const set = (patch: Partial<ClinicSettings>) => setData(current => ({ ...current, settings: { ...current.settings, ...patch } }));
  const chosen = (LETTERHEADS.some(item => item.id === data.settings.letterhead) ? data.settings.letterhead : 'classico') as LetterheadId;
  const sample = { id: 'exemplo', patientId: 'exemplo', kind: 'receita' as const, title: 'Receituário', body: 'Uso oral\n\n1. Medicamento de exemplo 10 mg ———— 30 comprimidos\n   Tomar 1 comprimido ao dia, pela manhã.\n\nUso tópico\n\n1. Loção de exemplo ———— 1 frasco\n   Aplicar à noite.', date: new Date().toISOString().slice(0, 10), professionalId: '', createdAt: '' };
  const patient = { id: 'exemplo', name: 'Paciente Exemplo' } as Parameters<typeof documentHtml>[1];
  const html = (layout: LetterheadId) => documentHtml(sample, patient, data.settings, brand, undefined, false, layout);
  function testPrint() {
    const view = window.open('', '_blank', 'width=900,height=1000');
    if (!view) return;
    view.document.open();
    view.document.write(documentHtml(sample, patient, data.settings, brand, undefined, true, chosen));
    view.document.close();
  }
  const contact = (key: 'clinicPhone' | 'clinicEmail' | 'clinicInstagram' | 'clinicWebsite' | 'clinicAddress', label: string, Icon: typeof Phone, placeholder: string, full?: boolean) => (
    <Field label={label} icon={Icon} htmlFor={`lh-${key}`} full={full}><input id={`lh-${key}`} className="z-input" value={data.settings[key] || ''} placeholder={placeholder} onChange={event => set({ [key]: event.target.value })} /></Field>
  );
  return (
    <section className="z-card white z-section">
      <header className="z-section-head">
        <div><h2 className="t-h1">Papel timbrado</h2><p className="t-body t-muted">Modelo usado em receitas, atestados e demais documentos. Todos seguem a cor e o logo da clínica.</p></div>
        <button type="button" className="z-btn secondary" onClick={testPrint}><Printer />Imprimir teste</button>
      </header>
      <div className="z-letterheads" role="radiogroup" aria-label="Modelo de papel timbrado">
        {LETTERHEADS.map(item => (
          <button key={item.id} type="button" role="radio" aria-checked={chosen === item.id} className="z-letterhead" onClick={() => set({ letterhead: item.id })}>
            <Paper title={`Modelo ${item.name}`} html={html(item.id)} />
            <strong>{item.name}</strong>
            <small>{item.hint}</small>
          </button>
        ))}
      </div>
      <label className="z-switch z-module">
        <input type="checkbox" checked={data.settings.letterheadWatermark !== false} onChange={event => set({ letterheadWatermark: event.target.checked })} />
        <span className="track" aria-hidden="true" />
        <span><strong>Marca d’água com o logo</strong><small className="t-muted">Logo bem claro ao fundo do documento</small></span>
      </label>
      <div className="z-form-grid">
        {contact('clinicPhone', 'Telefone / WhatsApp', Phone, '(11) 99999-0000')}
        {contact('clinicEmail', 'E-mail', Mail, 'contato@clinica.com.br')}
        {contact('clinicInstagram', 'Instagram', AtSign, '@clinica')}
        {contact('clinicWebsite', 'Site', Globe, 'clinica.com.br')}
        {contact('clinicAddress', 'Endereço', MapPin, 'Rua, número – bairro, cidade – UF', true)}
      </div>
    </section>
  );
}

// Miniatura de uma página A4 (794 × 1123 px) encolhida para a largura do cartão.
function Paper({ title, html }: { title: string; html: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 794));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <span ref={ref} className="z-letterhead-paper"><iframe title={title} srcDoc={html} tabIndex={-1} aria-hidden="true" style={{ transform: `scale(${scale})` }} /></span>;
}

// Uma pergunta: linha resumida (nome e tipo); ao clicar, abre os campos de edição.
function QuestionRow({ field, index, total, canRemove, onPatch, onMove, onRemove, categoryInput }: {
  field: TemplateField; index: number; total: number; canRemove: boolean; categoryInput?: boolean;
  onPatch: (patch: Partial<TemplateField>) => void; onMove: (delta: number) => void; onRemove: () => void;
}) {
  const withOptions = field.type === 'select' || field.type === 'checklist';
  return (
    <li>
      <details className="z-question">
        <summary>
          <span className="z-question-n num">{index + 1}</span>
          <span className="z-question-label">{field.label || 'Pergunta sem nome'}</span>
          <span className="z-badge sm">{FIELD_TYPES[field.type]}</span>
          <span className="z-row-actions" onClick={event => event.preventDefault()}>
            <button type="button" className="z-close" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Subir pergunta" title="Subir"><ArrowUp /></button>
            <button type="button" className="z-close" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Descer pergunta" title="Descer"><ArrowDown /></button>
          </span>
        </summary>
        <div className="z-question-body">
          <Field label="Pergunta" full htmlFor={`q-${field.key}`}><input id={`q-${field.key}`} className="z-input" value={field.label} onChange={event => onPatch({ label: event.target.value })} /></Field>
          <Field label="Tipo de resposta"><Select value={field.type} ariaLabel="Tipo de resposta" onChange={value => onPatch({ type: value as FieldType })} options={(Object.keys(FIELD_TYPES) as FieldType[]).map(type => ({ value: type, label: FIELD_TYPES[type] }))} /></Field>
          {categoryInput && <Field label="Categoria" htmlFor={`g-${field.key}`}><input id={`g-${field.key}`} className="z-input" list="anamnesis-groups" defaultValue={fieldGroup(field)} onBlur={event => event.target.value.trim() && event.target.value !== fieldGroup(field) && onPatch({ group: event.target.value.trim() })} /></Field>}
          {withOptions
            ? <Field label="Opções" full hint="Separe por vírgula." htmlFor={`o-${field.key}`}><input id={`o-${field.key}`} className="z-input" value={(field.options || []).join(', ')} onChange={event => onPatch({ options: event.target.value.split(',').map(item => item.trimStart()) })} onBlur={event => onPatch({ options: event.target.value.split(',').map(item => item.trim()).filter(Boolean) })} /></Field>
            : <Field label="Texto de ajuda" full hint="Aparece dentro do campo, em cinza." htmlFor={`h-${field.key}`}><input id={`h-${field.key}`} className="z-input" value={field.placeholder || ''} onChange={event => onPatch({ placeholder: event.target.value })} /></Field>}
          <div className="z-question-foot">
            <button type="button" className="z-btn danger-ghost sm" disabled={!canRemove} onClick={onRemove}><Trash2 />Remover pergunta</button>
          </div>
        </div>
      </details>
    </li>
  );
}
