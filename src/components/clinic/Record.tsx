'use client';

import { useState } from 'react';
import { Camera, CalendarPlus, ClipboardList, Columns2, FilePlus2, FileText, HeartPulse, ImagePlus, MessageCircleHeart, Pill, Printer, Trash2, TriangleAlert, UserPen } from 'lucide-react';
import { MAIN_PROFESSIONAL, type Access, type Brand, type Professional } from '@/lib/clinic/permissions';
import { DocumentModal, printDocument } from './Documents';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { ageFrom, formatDate } from '@/lib/clinic/format';
import { emptyProfile, makeId, type Appointment, type ClinicalDocument, type ClinicalNote, type MediaAttachment, type Patient, type PatientProfile, type Store } from '@/lib/clinic/store';
import { allNoteFields, type TemplateField, type TemplateId } from '@/lib/clinic/templates';
import { PatientPicker, Remember, StatusBadge } from './common';
import { PageHeader } from './Shell';
import type { ClinicProps } from './types';

// A categoria "trichoscopy" guarda o exame com aumento de cada especialidade.
const SCOPE_LABEL: Record<TemplateId, string> = { tricologia: 'Tricoscopia', dermatologia: 'Dermatoscopia', geral: 'Exame' };
const mediaKinds = (template: TemplateId): Record<MediaAttachment['kind'], string> => ({ patient: 'Paciente', before: 'Antes', after: 'Depois', trichoscopy: SCOPE_LABEL[template] });

type Props = ClinicProps & {
  access?: Access;
  brand?: Brand | null;
  professionals?: Professional[];
  patientId: string;
  onSelectPatient: (id: string) => void;
  onEditPatient?: (patient: Patient) => void;
  onNewAppointment?: (patientId: string) => void;
  onError: (message: string) => void;
};

export function Record({ data, setData, patientId, onSelectPatient, onEditPatient, onNewAppointment, onError, access, brand = null, professionals = [] }: Props) {
  const [noteModal, setNoteModal] = useState<{ note?: ClinicalNote; appointmentId: string } | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [mediaModal, setMediaModal] = useState(false);
  const [documentModal, setDocumentModal] = useState<{ document?: ClinicalDocument } | null>(null);
  const [compare, setCompare] = useState(false);
  const patient = data.patients.find(item => item.id === patientId);
  const profile = data.profiles[patientId] || emptyProfile;
  const notes = data.notes.filter(note => note.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date));
  const media = data.media.filter(item => item.patientId === patientId).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const appointments = data.appointments.filter(item => item.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  const portrait = media.find(item => item.kind === 'patient');
  const age = patient ? ageFrom(patient.birthDate || profile.birthDate || '') : null;
  const record = data.settings.record;
  const anamnesis = record.anamnesis.filter(field => hasValue(profile[field.key]));
  const MEDIA_KIND = mediaKinds(record.template);
  const documents = (data.documents || []).filter(item => item.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const proName = (id: string) => professionals.find(item => item.id === (id || MAIN_PROFESSIONAL))?.name || data.settings.professionalName;
  const print = (item: ClinicalDocument) => {
    if (!patient) return;
    const ok = printDocument(item, patient, data.settings, brand, professionals.find(entry => entry.id === (item.professionalId || MAIN_PROFESSIONAL)));
    if (!ok) onError('O navegador bloqueou a janela de impressão. Libere pop-ups para este site e tente de novo.');
  };

  async function removeMedia(item: MediaAttachment) {
    try {
      const response = await fetch(`/api/media/${encodeURIComponent(item.storageKey)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível excluir a imagem.');
      setData(current => ({ ...current, media: current.media.filter(entry => entry.id !== item.id) }));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível remover a imagem.');
    }
  }

  return (
    <>
      <PageHeader
        title="Prontuário"
        subtitle={patient ? `${patient.name}${age !== null ? `, ${age} anos` : ''}` : 'Escolha um paciente para ver o histórico.'}
        actions={patient && <button type="button" className="z-btn brand" onClick={() => setNoteModal({ appointmentId: '' })}><FilePlus2 />Nova evolução</button>}
      />
      <section className="z-card white z-section">
        {data.patients.length ? (
          <div className="z-record-picker">
            <PatientPicker key={patientId} patients={data.patients} value={patientId} onChange={id => id && onSelectPatient(id)} />
          </div>
        ) : (
          <div className="z-empty"><ClipboardList aria-hidden="true" /><strong>Nenhum paciente</strong><span>Cadastre um paciente em Pacientes para abrir o prontuário.</span></div>
        )}
        {patient && (
          <div className="z-record-summary">
            {portrait ? <img className="z-portrait" src={`/api/media/${encodeURIComponent(portrait.storageKey)}`} alt={`Foto de ${patient.name}`} /> : <span className="z-avatar lg">{patient.name.slice(0, 1).toUpperCase()}</span>}
            <div className="z-record-id">
              <strong className="t-h1">{patient.socialName || patient.name}</strong>
              <span className="t-body t-muted num">{appointments.length} atendimento(s) · {notes.length} evolução(ões) · {media.length} imagem(ns)</span>
            </div>
            <div className="z-row-actions">
              {onEditPatient && <button type="button" className="z-btn secondary sm" onClick={() => onEditPatient(patient)}><UserPen />Cadastro</button>}
              {onNewAppointment && <button type="button" className="z-btn secondary sm" onClick={() => onNewAppointment(patient.id)}><CalendarPlus />Agendar</button>}
            </div>
          </div>
        )}
      </section>

      {patient && <>
        <Remember patient={patient} />
        <div className="z-alerts">
          <Alert icon={TriangleAlert} label="Alergias" value={profile.allergies || ''} empty="Não informado, confirmar" warn={Boolean(profile.allergies)} />
          <Alert icon={HeartPulse} label="Comorbidades" value={profile.comorbidities || ''} empty="Não informado" />
          <Alert icon={Pill} label="Medicamentos em uso" value={profile.medications || ''} empty="Não informado" />
          <Alert icon={MessageCircleHeart} label="Como prefere conversar" value={profile.communicationStyle || ''} empty="Não informado" />
        </div>

        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Anamnese</h2><p className="t-body t-muted">Histórico de saúde, editável ao longo do acompanhamento.</p></div>
            <button type="button" className="z-btn secondary" onClick={() => setProfileModal(true)}>Editar anamnese</button>
          </header>
          {anamnesis.length ? (
            <dl className="z-deflist">
              {anamnesis.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field, profile[field.key])}</dd></div>)}
            </dl>
          ) : <div className="z-empty"><span>Anamnese ainda não preenchida.</span></div>}
        </section>

        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Fotografias</h2><p className="t-body t-muted">Referência, antes e depois, ligadas à data e à consulta.</p></div>
            <div className="z-row-actions">
              {media.length > 1 && <button type="button" className="z-btn secondary" onClick={() => setCompare(true)}><Columns2 />Comparar</button>}
              <button type="button" className="z-btn secondary" onClick={() => setMediaModal(true)}><ImagePlus />Anexar imagem</button>
            </div>
          </header>
          {media.length ? (
            <div className="z-media-grid">
              {media.map(item => (
                <figure key={item.id} className="z-media">
                  <img src={`/api/media/${encodeURIComponent(item.storageKey)}`} alt={item.caption || MEDIA_KIND[item.kind]} loading="lazy" />
                  <figcaption>
                    <span className="z-badge sm">{MEDIA_KIND[item.kind]}</span>
                    <strong>{item.caption || 'Sem legenda'}</strong>
                    <small className="t-muted">{formatDate(item.capturedAt)}</small>
                  </figcaption>
                  <button type="button" className="z-close z-media-remove" onClick={() => removeMedia(item)} aria-label="Remover imagem"><Trash2 /></button>
                </figure>
              ))}
            </div>
          ) : <div className="z-empty"><Camera aria-hidden="true" /><span>Nenhuma imagem anexada.</span></div>}
        </section>

        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Documentos</h2><p className="t-body t-muted">Receitas, atestados e solicitações com o timbre da clínica.</p></div>
            <button type="button" className="z-btn secondary" onClick={() => setDocumentModal({})}><FileText />Emitir documento</button>
          </header>
          {documents.length ? (
            <ul className="z-doclist">
              {documents.map(item => (
                <li key={item.id}>
                  <FileText aria-hidden="true" />
                  <div><strong>{item.title}</strong><small className="t-muted">{formatDate(item.date)} · {proName(item.professionalId)}</small></div>
                  <div className="z-row-actions">
                    <button type="button" className="z-btn ghost sm" onClick={() => setDocumentModal({ document: item })}>Editar</button>
                    <button type="button" className="z-btn secondary sm" onClick={() => print(item)}><Printer />Imprimir</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : <div className="z-empty"><span>Nenhum documento emitido.</span></div>}
        </section>

        <section className="z-card white z-section">
          <header className="z-section-head"><div><h2 className="t-h1">Consultas e evolução</h2><p className="t-body t-muted">Cada consulta pode ter uma evolução registrada.</p></div></header>
          {appointments.length ? (
            <ul className="z-timeline">
              {appointments.map(item => {
                const note = notes.find(entry => entry.appointmentId === item.id);
                return (
                  <li key={item.id}>
                    <div className="z-timeline-date num"><b>{formatDate(item.date, { day: '2-digit', month: 'short', year: 'numeric' })}</b><small>{item.time} · {item.type}</small></div>
                    <div className="z-timeline-body">
                      <StatusBadge status={item.status} small />
                      <p className="t-body t-muted">{note ? noteSummary(note, record.sections.flatMap(section => section.fields)) : 'Sem evolução registrada'}</p>
                    </div>
                    <button type="button" className="z-btn ghost sm" onClick={() => setNoteModal({ note, appointmentId: item.id })}>{note ? 'Abrir evolução' : 'Registrar evolução'}</button>
                  </li>
                );
              })}
            </ul>
          ) : <div className="z-empty"><span>Nenhuma consulta para este paciente.</span></div>}
        </section>

        {notes.length > 0 && (
          <section className="z-notes">
            {notes.map(note => (
              <article key={note.id} className="z-card white z-note">
                <header className="z-section-head">
                  <div>
                    <h3 className="t-h2">{formatDate(note.date, { day: '2-digit', month: 'long', year: 'numeric' })}</h3>
                    <p className="t-body t-muted">{note.appointmentId ? data.appointments.find(item => item.id === note.appointmentId)?.type || 'Atendimento' : 'Anotação geral'}</p>
                  </div>
                  <button type="button" className="z-btn ghost sm" onClick={() => setNoteModal({ note, appointmentId: note.appointmentId })}>Editar</button>
                </header>
                {record.sections.map(section => {
                  const fields = section.fields.filter(field => hasValue(note[field.key]));
                  return fields.length ? (
                    <div key={section.id} className="z-note-group">
                      <h4 className="t-body-strong t-muted">{section.title}</h4>
                      <dl className="z-deflist">{fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field, note[field.key])}</dd></div>)}</dl>
                    </div>
                  ) : null;
                })}
                {note.selectedFindings?.length > 0 && <div className="z-taglist">{note.selectedFindings.map(item => <span key={item} className="z-badge sm">{item}</span>)}</div>}
              </article>
            ))}
          </section>
        )}
      </>}

      {noteModal && patient && (
        <NoteModal
          data={data}
          patient={patient}
          note={noteModal.note}
          appointmentId={noteModal.appointmentId}
          onClose={() => setNoteModal(null)}
          onSave={note => { setData(current => ({ ...current, notes: current.notes.some(item => item.id === note.id) ? current.notes.map(item => item.id === note.id ? note : item) : [note, ...current.notes] })); setNoteModal(null); }}
          onDelete={id => { setData(current => ({ ...current, notes: current.notes.filter(item => item.id !== id) })); setNoteModal(null); }}
        />
      )}
      {profileModal && patient && (
        <ProfileModal fields={record.anamnesis} profile={profile} onClose={() => setProfileModal(false)} onSave={next => { setData(current => ({ ...current, profiles: { ...current.profiles, [patient.id]: next } })); setProfileModal(false); }} />
      )}
      {documentModal && patient && (
        <DocumentModal
          patient={patient}
          professionals={professionals}
          defaultProfessional={access?.professional ? access.email : MAIN_PROFESSIONAL}
          document={documentModal.document}
          onClose={() => setDocumentModal(null)}
          onDelete={id => { setData(current => ({ ...current, documents: current.documents.filter(item => item.id !== id) })); setDocumentModal(null); }}
          onSave={(next, andPrint) => {
            setData(current => ({ ...current, documents: current.documents.some(item => item.id === next.id) ? current.documents.map(item => item.id === next.id ? next : item) : [next, ...current.documents] }));
            setDocumentModal(null);
            if (andPrint) print(next);
          }}
        />
      )}
      {compare && patient && <CompareModal media={media} kinds={MEDIA_KIND} onClose={() => setCompare(false)} />}
      {mediaModal && patient && (
        <MediaModal kinds={MEDIA_KIND} appointments={appointments} patientId={patient.id} onClose={() => setMediaModal(false)} onError={onError} onSaved={item => { setData(current => ({ ...current, media: [item, ...current.media] })); setMediaModal(false); }} />
      )}
    </>
  );
}

const hasValue = (value: unknown) => Array.isArray(value) ? value.length > 0 : Boolean(value);

function display(field: TemplateField, value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  return field.type === 'date' ? formatDate(String(value)) : String(value ?? '');
}

// Resumo da evolução na linha do tempo: a avaliação, se houver; senão o primeiro texto preenchido.
function noteSummary(note: ClinicalNote, fields: TemplateField[]): string {
  const preferred = ['assessment', 'report', 'reason'].map(key => note[key]).find(value => typeof value === 'string' && value);
  const first = fields.map(field => note[field.key]).find(value => typeof value === 'string' && value);
  return String(preferred || first || 'Evolução registrada');
}

// Um campo do modelo de prontuário. Checklist grava lista; os demais gravam texto.
export function TemplateInput({ field, prefix, value }: { field: TemplateField; prefix: string; value: unknown }) {
  const id = `${prefix}-${field.key}`;
  const text = Array.isArray(value) ? value.join(', ') : String(value ?? '');
  if (field.type === 'checklist') {
    const checked = Array.isArray(value) ? value : [];
    return (
      <fieldset className="z-field full z-checkfield">
        <legend className="z-label">{field.label}</legend>
        <div className="z-checkgrid">
          {(field.options || []).map(option => <label key={option} className="z-check"><input type="checkbox" name={field.key} value={option} defaultChecked={checked.includes(option)} /><span>{option}</span></label>)}
        </div>
      </fieldset>
    );
  }
  return (
    <Field label={field.label || 'Campo sem nome'} htmlFor={id} full={field.wide || (field.type === 'textarea' && prefix === 'a')}>
      {field.type === 'date' ? <input id={id} name={field.key} className="z-input" type="date" defaultValue={text} />
        : field.type === 'select' ? <select id={id} name={field.key} className="z-select" defaultValue={text}><option value="">Não informado</option>{(field.options || []).map(option => <option key={option}>{option}</option>)}</select>
        : field.type === 'text' ? <input id={id} name={field.key} className="z-input" placeholder={field.placeholder} defaultValue={text} />
        : <textarea id={id} name={field.key} className="z-textarea" rows={field.wide ? 4 : 2} placeholder={field.placeholder} defaultValue={text} />}
    </Field>
  );
}

function readFields(form: FormData, fields: TemplateField[]) {
  return Object.fromEntries(fields.map(field => [field.key, field.type === 'checklist' ? form.getAll(field.key).map(String) : String(form.get(field.key) || '').trim()]));
}

function Alert({ icon: Icon, label, value, empty, warn }: { icon: typeof Pill; label: string; value: string; empty: string; warn?: boolean }) {
  return (
    <div className={`z-card z-alert ${warn ? 'warn' : ''}`}>
      <span className="t-body-strong t-muted"><Icon aria-hidden="true" />{label}</span>
      <p className={value ? '' : 't-muted'}>{value || empty}</p>
    </div>
  );
}

function NoteModal({ data, patient, note, appointmentId, onClose, onSave, onDelete }: {
  data: Store; patient: Patient; note?: ClinicalNote; appointmentId: string;
  onClose: () => void; onSave: (note: ClinicalNote) => void; onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const appointmentsOfPatient = data.appointments.filter(item => item.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      ...note,
      ...readFields(form, allNoteFields(data.settings.record)),
      id: note?.id || makeId(),
      patientId: patient.id,
      appointmentId: String(form.get('appointmentId') || ''),
      date: String(form.get('date')),
      selectedFindings: form.getAll('selectedFindings').map(String),
    });
  };
  return (
    <Modal
      size="lg"
      title={note ? 'Editar evolução' : 'Nova evolução'}
      description={patient.name}
      onClose={onClose}
      onSubmit={submit}
      footer={<>
        {note && (confirmDelete
          ? <button type="button" className="z-btn danger" onClick={() => onDelete(note.id)}><Trash2 />Confirmar exclusão</button>
          : <button type="button" className="z-btn danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 />Excluir</button>)}
        <span className="spacer" />
        <button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="z-btn brand">{note ? 'Salvar alterações' : 'Salvar evolução'}</button>
      </>}
    >
      <div className="z-form-grid" style={{ marginBottom: 24 }}>
        <Field label="Data" htmlFor="n-date"><input id="n-date" name="date" className="z-input" type="date" required defaultValue={note?.date || new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Consulta" htmlFor="n-appt">
          <select id="n-appt" name="appointmentId" className="z-select" defaultValue={note?.appointmentId || appointmentId}>
            <option value="">Anotação geral</option>
            {appointmentsOfPatient.map(item => <option key={item.id} value={item.id}>{formatDate(item.date)} · {item.type}</option>)}
          </select>
        </Field>
      </div>
      {data.settings.record.sections.map(section => (
        <fieldset key={section.id} className="z-fieldset">
          <legend>{section.title}</legend>
          <div className="z-form-grid">
            {section.fields.map(field => <TemplateInput key={field.key} field={field} prefix="n" value={note?.[field.key]} />)}
          </div>
        </fieldset>
      ))}
      {data.settings.trichoscopyFindings.length > 0 && (
        <fieldset className="z-fieldset">
          <legend>Checklist de achados</legend>
          <div className="z-checkgrid">
            {data.settings.trichoscopyFindings.map(item => (
              <label key={item} className="z-check"><input type="checkbox" name="selectedFindings" value={item} defaultChecked={note?.selectedFindings?.includes(item)} /><span>{item}</span></label>
            ))}
          </div>
        </fieldset>
      )}
    </Modal>
  );
}

function ProfileModal({ fields, profile, onClose, onSave }: { fields: TemplateField[]; profile: PatientProfile; onClose: () => void; onSave: (profile: PatientProfile) => void }) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Mantém respostas de campos que não estão no modelo atual (ex.: modelo trocado depois).
    onSave({ ...profile, ...readFields(form, fields) } as PatientProfile);
  };
  return (
    <Modal
      size="lg"
      title="Anamnese"
      description="Registre o que for pertinente, com contexto e consentimento."
      onClose={onClose}
      onSubmit={submit}
      footer={<><span className="spacer" /><button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="z-btn brand">Salvar anamnese</button></>}
    >
      <div className="z-form-grid">
        {fields.map(field => <TemplateInput key={field.key} field={field} prefix="a" value={profile[field.key]} />)}
      </div>
    </Modal>
  );
}

function MediaModal({ kinds: MEDIA_KIND, appointments, patientId, onClose, onSaved, onError }: { kinds: Record<MediaAttachment['kind'], string>; appointments: Appointment[]; patientId: string; onClose: () => void; onSaved: (item: MediaAttachment) => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('image');
    if (!(file instanceof File) || !file.size) return;
    if (file.size > 12 * 1024 * 1024) { onError('Escolha uma imagem de até 12 MB.'); return; }
    const id = makeId();
    const item: MediaAttachment = { id, patientId, appointmentId: String(form.get('appointmentId') || ''), kind: String(form.get('kind')) as MediaAttachment['kind'], caption: String(form.get('caption') || ''), capturedAt: String(form.get('capturedAt') || new Date().toISOString().slice(0, 10)), mimeType: file.type, sizeBytes: file.size, storageKey: id, createdAt: new Date().toISOString() };
    setBusy(true);
    try {
      const upload = new FormData();
      upload.append('image', file, file.name);
      upload.append('metadata', JSON.stringify(item));
      const response = await fetch('/api/media', { method: 'POST', body: upload });
      if (!response.ok) throw new Error((await response.json()).error || 'Falha ao enviar a imagem.');
      const stored = await response.json();
      onSaved({ ...item, storageKey: stored.id });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Não foi possível salvar a imagem.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Anexar imagem"
      description="Imagem de até 12 MB, guardada em armazenamento privado."
      onClose={onClose}
      onSubmit={submit}
      footer={<><span className="spacer" /><button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="z-btn brand" disabled={busy}>{busy ? 'Enviando…' : 'Salvar imagem'}</button></>}
    >
      <div className="z-form-grid">
        <Field label="Imagem" required full htmlFor="m-file"><input id="m-file" type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" required className="z-file" /></Field>
        <Field label="Categoria" htmlFor="m-kind"><select id="m-kind" name="kind" className="z-select" defaultValue="trichoscopy">{(Object.keys(MEDIA_KIND) as MediaAttachment['kind'][]).map(kind => <option key={kind} value={kind}>{MEDIA_KIND[kind]}</option>)}</select></Field>
        <Field label="Data da imagem" htmlFor="m-date"><input id="m-date" name="capturedAt" type="date" className="z-input" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Legenda" full htmlFor="m-caption"><input id="m-caption" name="caption" className="z-input" placeholder="Ex.: frontal, vértex, lado direito" /></Field>
        <Field label="Consulta" full htmlFor="m-appt"><select id="m-appt" name="appointmentId" className="z-select" defaultValue=""><option value="">Sem vínculo</option>{appointments.map(item => <option key={item.id} value={item.id}>{formatDate(item.date)} · {item.type}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

// Duas imagens lado a lado (antes e depois), com data e legenda de cada uma.
function CompareModal({ media, kinds, onClose }: { media: MediaAttachment[]; kinds: Record<MediaAttachment['kind'], string>; onClose: () => void }) {
  const chronological = [...media].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const firstBefore = chronological.find(item => item.kind === 'before') || chronological[0];
  const lastAfter = [...chronological].reverse().find(item => item.kind === 'after' && item.id !== firstBefore.id) || chronological[chronological.length - 1];
  const [left, setLeft] = useState(firstBefore.id);
  const [right, setRight] = useState(lastAfter.id);
  const label = (item: MediaAttachment) => `${formatDate(item.capturedAt)} · ${kinds[item.kind]}${item.caption ? ` · ${item.caption}` : ''}`;
  const side = (id: string, onChange: (id: string) => void, name: string) => {
    const item = media.find(entry => entry.id === id);
    return (
      <figure className="z-compare-side">
        <select className="z-select" aria-label={name} value={id} onChange={event => onChange(event.target.value)}>
          {chronological.map(entry => <option key={entry.id} value={entry.id}>{label(entry)}</option>)}
        </select>
        {item && <img src={`/api/media/${encodeURIComponent(item.storageKey)}`} alt={label(item)} />}
        {item && <figcaption><span className="z-badge sm">{kinds[item.kind]}</span>{formatDate(item.capturedAt, { day: '2-digit', month: 'long', year: 'numeric' })}</figcaption>}
      </figure>
    );
  };
  const days = (() => {
    const a = media.find(entry => entry.id === left);
    const b = media.find(entry => entry.id === right);
    if (!a || !b) return null;
    return Math.round(Math.abs(new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()) / 864e5);
  })();
  return (
    <Modal size="lg" title="Comparar imagens" description={days ? `${days} dia(s) entre as duas imagens.` : 'Escolha as duas imagens.'} onClose={onClose}>
      <div className="z-compare">{side(left, setLeft, 'Imagem da esquerda')}{side(right, setRight, 'Imagem da direita')}</div>
    </Modal>
  );
}
