'use client';

import { useState } from 'react';
import { Eye, Mail, RotateCcw } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { DEFAULT_MESSAGES, MESSAGE_KINDS, MESSAGE_LABELS, hasMessageEmail, messageRecipients, normalizeAudience, normalizeMessages, renderMessage, unknownMessageTokens, type ClinicMessages, type MessageKind } from '@/lib/clinic/messages';
import { MAIN_PROFESSIONAL, type Professional } from '@/lib/clinic/permissions';
import type { ClinicSettings, Patient } from '@/lib/clinic/store';
import { WelcomeModal } from './WelcomeModal';
import { MessageEditor } from './MessageEditor';

export function MessageSettings({ settings, patients = [], canChoosePatients = true, professionals = [], onChange, previewOnly = false }: { settings: ClinicSettings; patients?: Patient[]; canChoosePatients?: boolean; professionals?: Professional[]; onChange: (messages: ClinicMessages) => void; previewOnly?: boolean }) {
  const [kind, setKind] = useState<MessageKind>('welcome');
  const [showWelcome, setShowWelcome] = useState(false);
  const [query, setQuery] = useState('');
  const messages = normalizeMessages(settings.messages);
  const template = messages[kind];
  const audience = normalizeAudience(template.audience);
  const recipients = messageRecipients(patients, audience);
  const term = query.trim().toLocaleLowerCase('pt-BR');
  const filteredPatients = patients.filter(patient => `${patient.name} ${patient.socialName} ${patient.email}`.toLocaleLowerCase('pt-BR').includes(term));
  const team = [{ id: MAIN_PROFESSIONAL, name: settings.professionalName }, ...professionals.filter(person => person.id !== MAIN_PROFESSIONAL)];
  const professional = team.find(person => person.id === template.signature)?.name || settings.professionalName;
  const signature = template.signature === 'clinic' ? `Equipe ${settings.clinicName}` : professional;
  const values = { name: kind === 'welcome' ? 'Ana' : 'Mariana', clinic: settings.clinicName, professional, signature };
  const subject = renderMessage(template.subject, values);
  const body = renderMessage(template.body, values);
  const unknown = unknownMessageTokens(`${template.subject}\n${template.body}`);
  const patch = (value: Partial<typeof template>) => onChange({ ...messages, [kind]: { ...template, ...value } });
  return (
    <>
      <div className="z-message-editor">
        <section className="z-card white z-section">
          <header className="z-section-head"><div><h2 className="t-h1">Mensagens da clínica</h2><p className="t-body t-muted">Personalize os textos usados pela equipe.</p></div></header>
          <div className="z-form-grid">
            <Field label="Tipo de mensagem" htmlFor="message-kind" full>
              <Select id="message-kind" ariaLabel="Tipo de mensagem" value={kind} onChange={value => setKind(value as MessageKind)} options={MESSAGE_KINDS.map(value => ({ value, label: MESSAGE_LABELS[value] }))} />
            </Field>
            <Field label={kind === 'welcome' ? 'Título do modal' : 'Assunto do e-mail'} htmlFor="message-subject" full>
              <MessageEditor key={`${kind}-subject`} id="message-subject" label={kind === 'welcome' ? 'Título do modal' : 'Assunto do e-mail'} value={template.subject} onChange={subject => patch({ subject })} maxLength={160} />
            </Field>
            <Field label="Mensagem" htmlFor="message-body" full hint="Use Inserir personalização para incluir nomes e assinatura. A prévia mostra como a pessoa vai receber." error={unknown.length ? 'Há uma personalização inválida. Remova o trecho e escolha uma opção em Inserir personalização.' : !template.body.trim() || !template.subject.trim() ? 'Preencha o título ou assunto e a mensagem.' : undefined}>
              <MessageEditor key={`${kind}-body`} id="message-body" label="Mensagem" value={template.body} onChange={body => patch({ body })} maxLength={3000} multiline />
            </Field>
            {kind !== 'welcome' && <Field label="Assinatura" htmlFor="message-signature" full hint="Escolha a equipe ou uma profissional cadastrada nesta clínica.">
              <Select id="message-signature" ariaLabel="Assinatura" value={template.signature} onChange={value => patch({ signature: value })} options={[{ value: 'clinic', label: 'Equipe da clínica' }, ...team.map(person => ({ value: person.id, label: person.name }))]} />
            </Field>}
            {kind !== 'welcome' && <Field label="Quem vai receber o e-mail?" htmlFor="message-audience" full hint={canChoosePatients ? 'Somente pacientes desta clínica com e-mail válido entram na seleção.' : 'Para editar o público, seu usuário precisa de acesso à Agenda ou aos Pacientes.'}>
              <Select id="message-audience" ariaLabel="Quem vai receber o e-mail?" value={audience.mode} disabled={!canChoosePatients} onChange={mode => patch({ audience: { ...audience, mode: mode as 'all' | 'selected' } })} options={[{ value: 'all', label: 'Todos os pacientes com e-mail' }, { value: 'selected', label: 'Pacientes selecionados' }]} />
            </Field>}
            {kind !== 'welcome' && canChoosePatients && audience.mode === 'selected' && <div className="z-field full">
              <label className="z-label" htmlFor="message-patient-search">Buscar pacientes</label>
              <input id="message-patient-search" className="z-input" type="search" placeholder="Nome ou e-mail" value={query} onChange={event => setQuery(event.target.value)} />
              <div className="z-message-patients" role="group" aria-label="Pacientes destinatários">
                {filteredPatients.map(patient => <label key={patient.id} className="z-message-patient">
                  <input type="checkbox" aria-label={`Selecionar ${patient.name}`} disabled={!hasMessageEmail(patient)} checked={audience.patientIds.includes(patient.id)} onChange={event => patch({ audience: { ...audience, patientIds: event.target.checked ? [...audience.patientIds, patient.id] : audience.patientIds.filter(id => id !== patient.id) } })} />
                  <span><strong>{patient.name}</strong><small>{hasMessageEmail(patient) ? patient.email : 'Sem e-mail válido'}</small></span>
                </label>)}
                {!filteredPatients.length && <p className="z-hint">{patients.length ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado nesta clínica.'}</p>}
              </div>
              {audience.patientIds.length > 0 && <button type="button" className="z-btn ghost sm" onClick={() => patch({ audience: { ...audience, patientIds: [] } })}>Limpar seleção</button>}
            </div>}
          </div>
          <div className="z-message-actions">
            <button type="button" className="z-btn secondary" onClick={() => onChange({ ...messages, [kind]: { ...DEFAULT_MESSAGES[kind], audience } })}><RotateCcw aria-hidden="true" />Restaurar modelo</button>
            {kind === 'welcome' && <button type="button" className="z-btn brand" onClick={() => setShowWelcome(true)} disabled={Boolean(unknown.length) || !template.subject.trim() || !template.body.trim()}><Eye aria-hidden="true" />Ver boas-vindas</button>}
          </div>
          <p className="z-hint">{previewOnly ? 'Prévia local: as alterações ficam nesta sessão e são descartadas ao recarregar.' : 'As alterações são salvas automaticamente para esta clínica.'}</p>
        </section>
        <section className="z-card white z-section">
          <header className="z-section-head"><div><h2 className="t-h1"><Mail className="z-inline-icon" aria-hidden="true" />Prévia da mensagem</h2><p className="t-body t-muted">Exemplo com o nome {values.name}.</p></div></header>
          <div className="z-message-preview">
            <h3 className="t-h2">{subject}</h3>
            <p>{body}</p>
          </div>
          <div className="z-message-audience" aria-live="polite">
            <strong>{kind === 'welcome' ? 'Quem vê esta mensagem' : 'Público escolhido'}</strong>
            <p>{kind === 'welcome' ? 'Cada pessoa cadastrada na equipe, no primeiro acesso à clínica. Esta mensagem aparece no modal e não é enviada por e-mail.' : canChoosePatients ? `${audience.mode === 'all' ? 'Todos os pacientes com e-mail' : 'Pacientes selecionados'}: ${recipients.length} ${recipients.length === 1 ? 'paciente' : 'pacientes'}.` : audience.mode === 'all' ? 'Todos os pacientes com e-mail nesta clínica.' : 'Pacientes selecionados para esta mensagem.'}</p>
            {kind === 'birthday' && <p>No envio de aniversário, só recebe quem fizer aniversário no dia e estiver no público escolhido.</p>}
            {kind !== 'welcome' && canChoosePatients && !recipients.length && <p className="z-hint">Ninguém receberá este e-mail com a seleção atual.</p>}
          </div>
          <p className="z-hint">{kind === 'welcome' ? 'Aparece no primeiro acesso de cada pessoa à clínica.' : kind === 'birthday' ? 'Modelo preparado para o aniversário. O envio automático ainda não está ativado.' : 'Revise a ocasião, o público e as condições antes de enviar. Editar o modelo não dispara mensagens.'}</p>
        </section>
      </div>
      {showWelcome && <WelcomeModal name="Ana" clinicName={settings.clinicName} professionalName={settings.professionalName} message={messages.welcome} onDismiss={async () => setShowWelcome(false)} />}
    </>
  );
}
