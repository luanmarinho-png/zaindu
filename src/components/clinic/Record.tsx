'use client';

import { useState } from 'react';
import { Camera, CalendarPlus, ClipboardList, FilePlus2, HeartPulse, ImagePlus, MessageCircleHeart, Pill, Trash2, TriangleAlert, UserPen } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { ageFrom, formatDate } from '@/lib/clinic/format';
import { communicationStyles, emptyProfile, makeId, noteGroups, profileFields, type Appointment, type ClinicalNote, type MediaAttachment, type Patient, type PatientProfile, type Store } from '@/lib/clinic/store';
import { PatientPicker, StatusBadge } from './common';
import { PageHeader } from './Shell';
import type { ClinicProps } from './types';

const MEDIA_KIND: Record<MediaAttachment['kind'], string> = { patient: 'Paciente', before: 'Antes', after: 'Depois', trichoscopy: 'Tricoscopia' };

type Props = ClinicProps & {
  patientId: string;
  onSelectPatient: (id: string) => void;
  onEditPatient: (patient: Patient) => void;
  onNewAppointment: (patientId: string) => void;
  onError: (message: string) => void;
};

export function Record({ data, setData, patientId, onSelectPatient, onEditPatient, onNewAppointment, onError }: Props) {
  const [noteModal, setNoteModal] = useState<{ note?: ClinicalNote; appointmentId: string } | null>(null);
  const [profileModal, setProfileModal] = useState(false);
  const [mediaModal, setMediaModal] = useState(false);
  const patient = data.patients.find(item => item.id === patientId);
  const profile = data.profiles[patientId] || emptyProfile;
  const notes = data.notes.filter(note => note.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date));
  const media = data.media.filter(item => item.patientId === patientId).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  const appointments = data.appointments.filter(item => item.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  const portrait = media.find(item => item.kind === 'patient');
  const age = patient ? ageFrom(patient.birthDate || profile.birthDate) : null;

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
              <button type="button" className="z-btn secondary sm" onClick={() => onEditPatient(patient)}><UserPen />Cadastro</button>
              <button type="button" className="z-btn secondary sm" onClick={() => onNewAppointment(patient.id)}><CalendarPlus />Agendar</button>
            </div>
          </div>
        )}
      </section>

      {patient && <>
        <div className="z-alerts">
          <Alert icon={TriangleAlert} label="Alergias" value={profile.allergies} empty="Não informado, confirmar" warn={Boolean(profile.allergies)} />
          <Alert icon={HeartPulse} label="Comorbidades" value={profile.comorbidities} empty="Não informado" />
          <Alert icon={Pill} label="Medicamentos em uso" value={profile.medications} empty="Não informado" />
          <Alert icon={MessageCircleHeart} label="Como prefere conversar" value={profile.communicationStyle} empty="Não informado" />
        </div>

        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Anamnese</h2><p className="t-body t-muted">Histórico de saúde, editável ao longo do acompanhamento.</p></div>
            <button type="button" className="z-btn secondary" onClick={() => setProfileModal(true)}>Editar anamnese</button>
          </header>
          {profileFields.some(([key]) => profile[key]) ? (
            <dl className="z-deflist">
              {profileFields.filter(([key]) => profile[key]).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{key === 'birthDate' ? formatDate(profile[key]) : profile[key]}</dd></div>)}
            </dl>
          ) : <div className="z-empty"><span>Anamnese ainda não preenchida.</span></div>}
        </section>

        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Fotografias</h2><p className="t-body t-muted">Referência, antes e depois, ligadas à data e à consulta.</p></div>
            <button type="button" className="z-btn secondary" onClick={() => setMediaModal(true)}><ImagePlus />Anexar imagem</button>
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
                      <p className="t-body t-muted">{note ? note.assessment || note.report || note.reason || 'Evolução registrada' : 'Sem evolução registrada'}</p>
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
                {noteGroups.map(group => {
                  const fields = group.fields.filter(([key]) => note[key]);
                  return fields.length ? (
                    <div key={group.title} className="z-note-group">
                      <h4 className="t-body-strong t-muted">{group.title}</h4>
                      <dl className="z-deflist">{fields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{note[key]}</dd></div>)}</dl>
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
        <ProfileModal profile={profile} onClose={() => setProfileModal(false)} onSave={next => { setData(current => ({ ...current, profiles: { ...current.profiles, [patient.id]: next } })); setProfileModal(false); }} />
      )}
      {mediaModal && patient && (
        <MediaModal appointments={appointments} patientId={patient.id} onClose={() => setMediaModal(false)} onError={onError} onSaved={item => { setData(current => ({ ...current, media: [item, ...current.media] })); setMediaModal(false); }} />
      )}
    </>
  );
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
    const values = Object.fromEntries(noteGroups.flatMap(group => group.fields).map(([key]) => [key, String(form.get(key) || '').trim()]));
    onSave({
      ...(values as Omit<ClinicalNote, 'id' | 'patientId' | 'appointmentId' | 'date' | 'selectedFindings'>),
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
      {noteGroups.map(group => (
        <fieldset key={group.title} className="z-fieldset">
          <legend>{group.title}</legend>
          <div className="z-form-grid">
            {group.fields.map(([key, label, placeholder]) => (
              <Field key={key} label={label} htmlFor={`n-${key}`} full={key === 'exam' || key === 'trichoMetrics'}>
                <textarea id={`n-${key}`} name={key} className="z-textarea" rows={key === 'exam' || key === 'trichoMetrics' ? 4 : 2} placeholder={placeholder} defaultValue={note?.[key] || ''} />
              </Field>
            ))}
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

function ProfileModal({ profile, onClose, onSave }: { profile: PatientProfile; onClose: () => void; onSave: (profile: PatientProfile) => void }) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave(Object.fromEntries(profileFields.map(([key]) => [key, String(form.get(key) || '').trim()])) as PatientProfile);
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
        {profileFields.map(([key, label, kind]) => (
          <Field key={key} label={label} htmlFor={`a-${key}`} full={kind === 'textarea'}>
            {kind === 'date' ? <input id={`a-${key}`} name={key} className="z-input" type="date" defaultValue={profile[key]} />
              : kind === 'textarea' ? <textarea id={`a-${key}`} name={key} className="z-textarea" rows={2} defaultValue={profile[key]} />
              : kind === 'select' ? <select id={`a-${key}`} name={key} className="z-select" defaultValue={profile[key]}><option value="">Não informado</option>{communicationStyles.map(style => <option key={style}>{style}</option>)}</select>
              : <input id={`a-${key}`} name={key} className="z-input" defaultValue={profile[key]} />}
          </Field>
        ))}
      </div>
    </Modal>
  );
}

function MediaModal({ appointments, patientId, onClose, onSaved, onError }: { appointments: Appointment[]; patientId: string; onClose: () => void; onSaved: (item: MediaAttachment) => void; onError: (message: string) => void }) {
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
        <Field label="Imagem" required full htmlFor="m-file"><input id="m-file" type="file" name="image" accept="image/*" required className="z-file" /></Field>
        <Field label="Categoria" htmlFor="m-kind"><select id="m-kind" name="kind" className="z-select" defaultValue="trichoscopy">{(Object.keys(MEDIA_KIND) as MediaAttachment['kind'][]).map(kind => <option key={kind} value={kind}>{MEDIA_KIND[kind]}</option>)}</select></Field>
        <Field label="Data da imagem" htmlFor="m-date"><input id="m-date" name="capturedAt" type="date" className="z-input" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Legenda" full htmlFor="m-caption"><input id="m-caption" name="caption" className="z-input" placeholder="Ex.: frontal, vértex, lado direito" /></Field>
        <Field label="Consulta" full htmlFor="m-appt"><select id="m-appt" name="appointmentId" className="z-select" defaultValue=""><option value="">Sem vínculo</option>{appointments.map(item => <option key={item.id} value={item.id}>{formatDate(item.date)} · {item.type}</option>)}</select></Field>
      </div>
    </Modal>
  );
}
