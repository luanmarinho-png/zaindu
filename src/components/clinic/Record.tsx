'use client';

import { useState } from 'react';
import { Camera, CalendarPlus, ClipboardList, LayoutGrid, NotebookPen, Columns2, FilePlus2, FileText, HeartPulse, ImagePlus, MessageCircleHeart, Pill, Printer, Trash2, TriangleAlert, UserPen } from 'lucide-react';
import { MAIN_PROFESSIONAL, type Access, type Brand, type Professional } from '@/lib/clinic/permissions';
import { DocumentModal, printDocument } from './Documents';
import { Modal } from '@/components/ui/Modal';
import { upload } from '@vercel/blob/client';
import { Field } from '@/components/ui/Field';
import { ageFrom, formatDate } from '@/lib/clinic/format';
import { emptyProfile, makeId, type Appointment, type ClinicalDocument, type ClinicalNote, type MediaAttachment, type Patient, type PatientProfile, type Store } from '@/lib/clinic/store';
import { allNoteFields, groupFields, type TemplateField, type TemplateId } from '@/lib/clinic/templates';
import { PatientPicker, Remember, StatusBadge } from './common';
import { PageHeader } from './Shell';
import type { ClinicProps } from './types';
import { Select } from '@/components/ui/Select';

// A categoria "trichoscopy" guarda o exame com aumento de cada especialidade.
type RecordTab = 'resumo' | 'anamnese' | 'evolucoes' | 'fotos' | 'documentos';
const RECORD_TABS: [RecordTab, string, typeof Camera][] = [['resumo', 'Resumo', LayoutGrid], ['anamnese', 'Anamnese', ClipboardList], ['evolucoes', 'Evoluções', NotebookPen], ['fotos', 'Fotos', Camera], ['documentos', 'Documentos', FileText]];

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
  const [tab, setTab] = useState<RecordTab>('resumo');
  const [visible, setVisible] = useState(12);
  // No celular a anamnese abre só a primeira categoria; no computador, todas.
  const compact = typeof window !== 'undefined' && window.innerWidth <= 720;
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
  const allFields = record.sections.flatMap(section => section.fields);
  // Consultas e evoluções numa só linha do tempo (evolução sem consulta entra como anotação geral).
  const timeline = [
    ...appointments.map(item => ({ key: item.id, date: item.date, time: item.time, appointment: item, note: notes.find(entry => entry.appointmentId === item.id) })),
    ...notes.filter(note => !note.appointmentId || !appointments.some(item => item.id === note.appointmentId)).map(note => ({ key: note.id, date: note.date, time: '', appointment: undefined, note })),
  ].sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  const today = new Date().toISOString().slice(0, 10);
  const nextVisit = appointments.filter(item => item.status === 'Agendada' && item.date >= today).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  const lastNote = notes[0];
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
        <div className="z-tabs z-record-tabs" role="tablist" aria-label="Partes do prontuário">
          {RECORD_TABS.map(([id, label, Icon]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              <Icon aria-hidden="true" />{label}{id === 'evolucoes' && <small className="num">{timeline.length}</small>}{id === 'fotos' && media.length > 0 && <small className="num">{media.length}</small>}{id === 'documentos' && documents.length > 0 && <small className="num">{documents.length}</small>}
            </button>
          ))}
        </div>

        {tab === 'resumo' && <>
          <div className="z-alerts">
            <Alert icon={TriangleAlert} label="Alergias" value={profile.allergies || ''} empty="Não informado, confirmar" warn={Boolean(profile.allergies)} />
            <Alert icon={HeartPulse} label="Comorbidades" value={profile.comorbidities || ''} empty="Não informado" />
            <Alert icon={Pill} label="Medicamentos" value={profile.medications || ''} empty="Não informado" />
            <Alert icon={MessageCircleHeart} label="Como prefere conversar" value={profile.communicationStyle || ''} empty="Não informado" />
          </div>
          <Remember patient={patient} />
          <div className="z-record-glance">
            <section className="z-card white z-section">
              <header className="z-section-head"><div><h2 className="t-h2">Próxima consulta</h2></div></header>
              {nextVisit ? (
                <p className="z-glance"><b className="num">{formatDate(nextVisit.date, { weekday: 'short', day: '2-digit', month: 'short' })} · {nextVisit.time}</b><span className="t-muted">{nextVisit.type}</span></p>
              ) : <p className="t-body t-muted">Nenhuma consulta marcada.{onNewAppointment && <> <button type="button" className="z-link" onClick={() => onNewAppointment(patient.id)}>Agendar</button></>}</p>}
            </section>
            <section className="z-card white z-section">
              <header className="z-section-head">
                <div><h2 className="t-h2">Última evolução</h2></div>
                {lastNote && <button type="button" className="z-btn ghost sm" onClick={() => setTab('evolucoes')}>Ver todas</button>}
              </header>
              {lastNote ? (
                <p className="z-glance"><b className="num">{formatDate(lastNote.date, { day: '2-digit', month: 'short', year: 'numeric' })}</b><span>{noteSummary(lastNote, allFields)}</span></p>
              ) : <p className="t-body t-muted">Nenhuma evolução registrada.</p>}
            </section>
          </div>
        </>}

        {tab === 'anamnese' && (
          <section className="z-card white z-section">
            <header className="z-section-head">
              <div><h2 className="t-h1">Anamnese</h2><p className="t-body t-muted">Histórico de saúde, editável ao longo do acompanhamento.</p></div>
              <button type="button" className="z-btn secondary" onClick={() => setProfileModal(true)}><UserPen />Editar anamnese</button>
            </header>
            {anamnesis.length ? groupFields(anamnesis).map((group, index) => (
              <details key={group.title} className="z-record-group" open={index === 0 || !compact}>
                <summary><strong>{group.title}</strong><span className="z-badge sm num">{group.fields.length}</span></summary>
                <dl className="z-deflist">{group.fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field, profile[field.key])}</dd></div>)}</dl>
              </details>
            )) : <div className="z-empty"><span>Anamnese ainda não preenchida.</span><button type="button" className="z-btn brand" onClick={() => setProfileModal(true)}>Preencher anamnese</button></div>}
          </section>
        )}

        {tab === 'evolucoes' && (
          <section className="z-card white z-section">
            <header className="z-section-head">
              <div><h2 className="t-h1">Consultas e evoluções</h2><p className="t-body t-muted">Da mais recente para a mais antiga. Toque para ver a evolução completa.</p></div>
              <button type="button" className="z-btn secondary" onClick={() => setNoteModal({ appointmentId: '' })}><FilePlus2 />Nova evolução</button>
            </header>
            {timeline.length ? (
              <ol className="z-visits">
                {timeline.slice(0, visible).map(entry => (
                  <li key={entry.key}>
                    <details className="z-visit" open={false}>
                      <summary>
                        <span className="z-visit-date num"><b>{formatDate(entry.date, { day: '2-digit', month: 'short' }).replace('.', '')}</b><small>{entry.date.slice(0, 4)}</small></span>
                        <span className="z-visit-main">
                          <strong>{entry.appointment ? `${entry.appointment.type} · ${entry.appointment.time}` : 'Anotação geral'}</strong>
                          <small className="t-muted">{entry.note ? noteSummary(entry.note, allFields) : 'Sem evolução registrada'}</small>
                        </span>
                        {entry.appointment && <StatusBadge status={entry.appointment.status} small iconOnly />}
                      </summary>
                      <div className="z-visit-body">
                        {entry.note ? <>
                          {record.sections.map(section => {
                            const fields = section.fields.filter(field => hasValue(entry.note?.[field.key]));
                            return fields.length ? (
                              <div key={section.id} className="z-note-group">
                                <h4 className="t-body-strong t-muted">{section.title}</h4>
                                <dl className="z-deflist">{fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{display(field, entry.note?.[field.key])}</dd></div>)}</dl>
                              </div>
                            ) : null;
                          })}
                          {entry.note.selectedFindings?.length > 0 && <div className="z-taglist">{entry.note.selectedFindings.map(item => <span key={item} className="z-badge sm">{item}</span>)}</div>}
                        </> : <p className="t-body t-muted">Nenhuma evolução para esta consulta.</p>}
                        <button type="button" className="z-btn secondary sm" onClick={() => setNoteModal({ note: entry.note, appointmentId: entry.appointment?.id || entry.note?.appointmentId || '' })}>{entry.note ? 'Editar evolução' : 'Registrar evolução'}</button>
                      </div>
                    </details>
                  </li>
                ))}
              </ol>
            ) : <div className="z-empty"><span>Nenhuma consulta ou evolução para este paciente.</span></div>}
            {timeline.length > visible && <button type="button" className="z-btn ghost block" onClick={() => setVisible(count => count + 12)}>Mostrar mais ({timeline.length - visible})</button>}
          </section>
        )}

        {tab === 'fotos' && (
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
        )}

        {tab === 'documentos' && (
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
        <MediaModal clinicId={access?.clinicId || ''} kinds={MEDIA_KIND} appointments={appointments} patientId={patient.id} onClose={() => setMediaModal(false)} onError={onError} onSaved={item => { setData(current => ({ ...current, media: [item, ...current.media] })); setMediaModal(false); }} />
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
        : field.type === 'select' ? <Select id={id} name={field.key} defaultValue={text} ariaLabel={field.label} options={[{ value: '', label: 'Não informado' }, ...(field.options || []).map(option => ({ value: option, label: option }))]} />
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
      variant="drawer"
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
          <Select id="n-appt" name="appointmentId" defaultValue={note?.appointmentId || appointmentId} ariaLabel="Consulta" options={[{ value: '', label: 'Anotação geral' }, ...appointmentsOfPatient.map(item => ({ value: item.id, label: `${formatDate(item.date)} · ${item.type}` }))]} />
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
      variant="drawer"
      title="Anamnese"
      description="Registre o que for pertinente, com contexto e consentimento."
      onClose={onClose}
      onSubmit={submit}
      footer={<><span className="spacer" /><button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="z-btn brand">Salvar anamnese</button></>}
    >
      <div className="z-form-grid">
        {groupFields(fields).map(group => (
          <fieldset key={group.title} className="z-fieldset full">
            <legend>{group.title}</legend>
            <div className="z-form-grid">{group.fields.map(field => <TemplateInput key={field.key} field={field} prefix="a" value={profile[field.key]} />)}</div>
          </fieldset>
        ))}
      </div>
    </Modal>
  );
}

function MediaModal({ clinicId, kinds: MEDIA_KIND, appointments, patientId, onClose, onSaved, onError }: { clinicId: string; kinds: Record<MediaAttachment['kind'], string>; appointments: Appointment[]; patientId: string; onClose: () => void; onSaved: (item: MediaAttachment) => void; onError: (message: string) => void }) {
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
      // Envio direto ao Vercel Blob privado; o servidor só libera o caminho da própria clínica.
      await upload(`clinicas/${clinicId}/fotos/${id}`, file, { access: 'private', handleUploadUrl: '/api/media/upload', contentType: file.type });
      onSaved(item);
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
        <Field label="Categoria" htmlFor="m-kind"><Select id="m-kind" name="kind" defaultValue="trichoscopy" ariaLabel="Categoria" options={(Object.keys(MEDIA_KIND) as MediaAttachment['kind'][]).map(kind => ({ value: kind, label: MEDIA_KIND[kind] }))} /></Field>
        <Field label="Data da imagem" htmlFor="m-date"><input id="m-date" name="capturedAt" type="date" className="z-input" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Legenda" full htmlFor="m-caption"><input id="m-caption" name="caption" className="z-input" placeholder="Ex.: frontal, vértex, lado direito" /></Field>
        <Field label="Consulta" full htmlFor="m-appt"><Select id="m-appt" name="appointmentId" defaultValue="" ariaLabel="Consulta" options={[{ value: '', label: 'Sem vínculo' }, ...appointments.map(item => ({ value: item.id, label: `${formatDate(item.date)} · ${item.type}` }))]} /></Field>
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
        <Select ariaLabel={name} value={id} onChange={onChange} options={chronological.map(entry => ({ value: entry.id, label: label(entry) }))} />
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
