'use client';

import { useCallback, useEffect, useState } from 'react';
import { AtSign, Eye, EyeOff, KeyRound, Pencil, Trash2, UserPlus, UserRound, Users } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { DEFAULT_MEMBER_MODULES, MODULES, ROLE_LABEL, type Access, type Module } from '@/lib/clinic/permissions';
import { PageHeader } from './Shell';

export type TeamMember = { email: string; username: string; name: string; role: 'manager' | 'member'; modules: Module[] };
type Draft = { member?: TeamMember };

async function call(method: string, body: Record<string, unknown>) {
  const response = await fetch('/api/team', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível salvar.');
  return result as { message?: string };
}

// Equipe da clínica: a gestora libera módulos para cada pessoa; o admin também cria gestoras.
export function Team({ access, clinicId, embedded }: { access: Access; clinicId: string; embedded?: boolean }) {
  const [list, setList] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [removing, setRemoving] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/team?clinicId=${encodeURIComponent(clinicId)}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setList(result.members);
      setError('');
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Não foi possível carregar a equipe.');
    }
  }, [clinicId]);

  useEffect(() => { load(); }, [load]);

  const isAdmin = access.role === 'admin';
  const editable = (member: TeamMember) => isAdmin || member.role === 'member';

  async function remove(member: TeamMember) {
    try {
      await call('DELETE', { clinicId, email: member.email });
      setRemoving('');
      setNotice(`${member.name} não tem mais acesso à clínica.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover.');
    }
  }

  const add = <button type="button" className="z-btn brand" onClick={() => setDraft({})}><UserPlus />Adicionar pessoa</button>;
  return (
    <>
      {!embedded && <PageHeader title="Equipe" subtitle="Quem acessa a clínica e o que cada pessoa pode ver." actions={add} />}
      <section className={`z-card white ${embedded ? 'z-team-embedded' : 'z-section'}`}>
        {embedded && <header className="z-section-head"><div><h3 className="t-h2">Equipe</h3></div>{add}</header>}
        {error && <p className="z-callout danger" role="alert">{error}</p>}
        {list === null ? <span className="z-loader" aria-hidden="true" /> : list.length ? (
          <ul className="z-patient-list">
            {list.map(member => (
              <li key={member.email} className="z-patient-row">
                <span className="z-avatar">{member.name.slice(0, 1).toUpperCase()}</span>
                <div className="z-patient-main">
                  <strong>{member.name}</strong>
                  <small className="t-muted">{member.username}</small>
                </div>
                <div className="z-taglist z-team-modules">
                  {member.role === 'manager'
                    ? <span className="z-badge brand sm">{ROLE_LABEL.manager} · acesso total</span>
                    : member.modules.length ? member.modules.map(id => <span key={id} className="z-badge sm">{MODULES.find(item => item.id === id)?.label}</span>) : <span className="z-badge warn sm">Sem módulos</span>}
                </div>
                {editable(member) && (
                  <div className="z-row-actions">
                    <button type="button" className="z-close" onClick={() => setDraft({ member })} aria-label={`Editar ${member.name}`} title="Editar"><Pencil /></button>
                    {removing === member.email
                      ? <button type="button" className="z-btn danger sm" onClick={() => remove(member)}><Trash2 />Confirmar</button>
                      : <button type="button" className="z-close" onClick={() => setRemoving(member.email)} aria-label={`Remover ${member.name}`} title="Remover"><Trash2 /></button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="z-empty"><Users aria-hidden="true" /><strong>Ninguém na equipe ainda</strong><span>{isAdmin ? 'Comece pela gestora da clínica.' : 'Adicione a secretária ou outros profissionais.'}</span></div>
        )}
      </section>
      {draft && <MemberModal clinicId={clinicId} member={draft.member} isAdmin={isAdmin} firstMember={!list?.length} onClose={() => setDraft(null)} onSaved={message => { setDraft(null); setNotice(message); load(); }} />}
      {notice && <Toast tone="success" message={notice} onClose={() => setNotice('')} />}
    </>
  );
}

function MemberModal({ clinicId, member, isAdmin, firstMember, onClose, onSaved }: {
  clinicId: string; member?: TeamMember; isAdmin: boolean; firstMember: boolean; onClose: () => void; onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(member?.name || '');
  const [username, setUsername] = useState(member?.username || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<TeamMember['role']>(member?.role || (isAdmin && firstMember ? 'manager' : 'member'));
  const [modules, setModules] = useState<Module[]>(member?.modules || DEFAULT_MEMBER_MODULES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id: Module) => setModules(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = member
        ? await call('PATCH', { clinicId, email: member.email, name, modules, ...(isAdmin ? { role } : {}), ...(password ? { password } : {}) })
        : await call('POST', { clinicId, name, username, password, role, modules });
      onSaved(result.message || 'Alterações salvas.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={member ? `Editar ${member.name}` : 'Adicionar pessoa'}
      description={member ? member.username : 'O login é criado na hora, já confirmado.'}
      onClose={onClose}
      onSubmit={submit}
      footer={<><span className="spacer" /><button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="z-btn brand" disabled={busy}>{busy ? 'Salvando…' : member ? 'Salvar alterações' : 'Adicionar'}</button></>}
    >
      <div className="z-form-grid">
        <Field label="Nome" required icon={UserRound} htmlFor="t-name"><input id="t-name" className="z-input" required value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Ana Souza" /></Field>
        <Field label="Usuário" required icon={AtSign} htmlFor="t-user" hint={member ? 'O usuário não muda.' : 'É o que a pessoa digita para entrar.'}>
          <input id="t-user" className="z-input" required disabled={Boolean(member)} autoCapitalize="none" spellCheck={false} value={username} onChange={event => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="ana.souza" />
        </Field>
        <Field label={member ? 'Nova senha' : 'Senha'} required={!member} icon={KeyRound} htmlFor="t-pass" hint={member ? 'Deixe em branco para manter a atual.' : 'Mínimo de 8 caracteres.'} full>
          <div className="z-inputwrap">
            <input id="t-pass" type={show ? 'text' : 'password'} autoComplete="new-password" required={!member} minLength={8} value={password} onChange={event => setPassword(event.target.value)} />
            <button type="button" className="z-close" onClick={() => setShow(value => !value)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={show}>{show ? <EyeOff /> : <Eye />}</button>
          </div>
        </Field>
        {isAdmin && (
          <div className="z-field full">
            <span className="z-label">Papel</span>
            <div className="z-segment" role="group" aria-label="Papel">
              {(['manager', 'member'] as const).map(item => <button key={item} type="button" aria-pressed={role === item} onClick={() => setRole(item)}>{ROLE_LABEL[item]}</button>)}
            </div>
            <span className="z-hint">{role === 'manager' ? 'Vê tudo da clínica e gerencia a equipe.' : 'Vê só os módulos liberados abaixo.'}</span>
          </div>
        )}
        {role === 'member' && (
          <fieldset className="z-fieldset full z-module-list">
            <legend>O que pode acessar</legend>
            {MODULES.map(item => (
              <label key={item.id} className="z-switch z-module">
                <input type="checkbox" checked={modules.includes(item.id)} onChange={() => toggle(item.id)} />
                <span className="track" aria-hidden="true" />
                <span><strong>{item.label}</strong><small className="t-muted">{item.hint}</small></span>
              </label>
            ))}
          </fieldset>
        )}
        {error && <p className="z-callout danger full" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
