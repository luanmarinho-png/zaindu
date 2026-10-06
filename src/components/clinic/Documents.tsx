'use client';

import { useState } from 'react';
import { CalendarDays, FileSignature, FileText, Printer, Trash2, UserRoundCog } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { DOCUMENT_KINDS, documentHtml } from '@/lib/clinic/documentHtml';
import { MAIN_PROFESSIONAL, type Brand, type Professional } from '@/lib/clinic/permissions';
import { makeId, type ClinicalDocument, type ClinicSettings, type DocumentKind, type Patient } from '@/lib/clinic/store';
import { Select } from '@/components/ui/Select';

// Abre o documento com o timbre da clínica numa janela própria e chama a impressão (o navegador oferece "Salvar como PDF").
export function printDocument(document: ClinicalDocument, patient: Patient, settings: ClinicSettings, brand: Brand | null, professional: Professional | undefined) {
  const html = documentHtml(document, patient, settings, brand, professional);
  const view = window.open('', '_blank', 'width=900,height=1000');
  if (!view) return false;
  view.document.open();
  view.document.write(html);
  view.document.close();
  return true;
}

export function DocumentModal({ patient, professionals, defaultProfessional, document, onClose, onSave, onDelete }: {
  patient: Patient;
  professionals: Professional[];
  defaultProfessional: string;
  document?: ClinicalDocument;
  onClose: () => void;
  onSave: (document: ClinicalDocument, print: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<DocumentKind>(document?.kind || 'receita');
  const [date, setDate] = useState(document?.date || today);
  const [title, setTitle] = useState(document?.title || DOCUMENT_KINDS.receita.title);
  const [body, setBody] = useState(document?.body || DOCUMENT_KINDS.receita.template(patient, today));
  const [professionalId, setProfessionalId] = useState(document?.professionalId || defaultProfessional || MAIN_PROFESSIONAL);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Trocar o tipo troca o modelo do texto, mas só enquanto o texto ainda é o modelo (não apaga o que foi escrito).
  const chooseKind = (next: DocumentKind) => {
    const untouched = body === DOCUMENT_KINDS[kind].template(patient, date) || !body.trim();
    setKind(next);
    setTitle(DOCUMENT_KINDS[next].title);
    if (untouched) setBody(DOCUMENT_KINDS[next].template(patient, date));
  };
  const build = (): ClinicalDocument => ({ id: document?.id || makeId(), patientId: patient.id, kind, title: title.trim() || DOCUMENT_KINDS[kind].title, body, date, professionalId, createdAt: document?.createdAt || new Date().toISOString() });

  return (
    <Modal
      size="lg"
      title={document ? 'Editar documento' : 'Emitir documento'}
      description={`${patient.name} · sai com o timbre da clínica, pronto para imprimir ou salvar em PDF.`}
      onClose={onClose}
      onSubmit={event => { event.preventDefault(); onSave(build(), true); }}
      footer={<>
        {document && (confirmDelete
          ? <button type="button" className="z-btn danger" onClick={() => onDelete(document.id)}><Trash2 />Confirmar exclusão</button>
          : <button type="button" className="z-btn danger-ghost" onClick={() => setConfirmDelete(true)}><Trash2 />Excluir</button>)}
        <span className="spacer" />
        <button type="button" className="z-btn secondary" onClick={() => onSave(build(), false)}>Salvar sem imprimir</button>
        <button type="submit" className="z-btn brand"><Printer />Salvar e imprimir</button>
      </>}
    >
      <div className="z-form-grid">
        <Field label="Tipo" full>
          <div className="z-segment" role="group" aria-label="Tipo de documento">
            {(Object.keys(DOCUMENT_KINDS) as DocumentKind[]).map(item => <button key={item} type="button" aria-pressed={kind === item} onClick={() => chooseKind(item)}>{DOCUMENT_KINDS[item].title}</button>)}
          </div>
        </Field>
        <Field label="Título" icon={FileText} htmlFor="d-title"><input id="d-title" className="z-input" value={title} onChange={event => setTitle(event.target.value)} /></Field>
        <Field label="Data" icon={CalendarDays} htmlFor="d-date"><input id="d-date" className="z-input" type="date" value={date} onChange={event => setDate(event.target.value)} /></Field>
        {professionals.length > 1 && (
          <Field label="Assina" icon={UserRoundCog} htmlFor="d-pro" full>
            <Select id="d-pro" value={professionalId} ariaLabel="Profissional que assina" onChange={setProfessionalId} options={professionals.map(item => ({ value: item.id, label: item.name, hint: item.registry || undefined }))} />
          </Field>
        )}
        <Field label="Texto" icon={FileSignature} htmlFor="d-body" full hint="Assinatura manual no papel, ou digital ao salvar o PDF num assinador (ex.: gov.br ou certificado ICP-Brasil).">
          <textarea id="d-body" className="z-textarea z-doc-body" rows={12} value={body} onChange={event => setBody(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
