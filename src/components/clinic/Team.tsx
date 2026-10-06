'use client';

import { useCallback, useEffect, useState } from 'react';
import { AtSign, BadgeCheck, Eye, EyeOff, IdCard, LogOut, Stethoscope, KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserPlus, UserRound, Users } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { DEFAULT_MEMBER_MODULES, MODULES, ROLE_LABEL, type Access, type AccessProfile, type Module } from '@/lib/clinic/permissions';
import { PageHeader } from './Shell';
import { Select } from '@/components/ui/Select';

export type TeamMember = { email: string; username: string; name: string; role: 'manager' | 'member'; profileId: string; modules: Module[]; professional: { specialty: string; registry: string } | null };
type Draft = { member?: TeamMember };

async function call(method: string, body: Record<string, unknown>, path = '/api/team') {
  const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Não foi possível salvar.');
  return result as { message?: string };
}

// Equipe da clínica: a gestora libera módulos para cada pessoa; o admin também cria gestoras.
export function Team({ access, clinicId, embedded }: { access: Access; clinicId: string; embedded?: boolean }) {
  const [list, setList] = useState<TeamMember[] | null>(null);
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [profileDraft, setProfileDraft] = useState<{ profile?: AccessProfile } | null>(null);
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
      setProfiles(result.profiles || []);
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

  async function saveProfiles(next: AccessProfile[], message: string) {
    try {
      await call('PUT', { clinicId, profiles: next }, '/api/team/profiles');
      setProfileDraft(null);
      setNotice(message);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o perfil.');
    }
  }
  const profileName = (id: string) => profiles.find(item => item.id === id)?.name;

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
                  <small className="t-muted">{[member.username, member.professional && [member.professional.specialty, member.professional.registry].filter(Boolean).join(' · ') || (member.professional ? 'profissional' : '')].filter(Boolean).join(' · ')}</small>
                </div>
                <div className="z-taglist z-team-modules">
                  {member.role === 'manager'
                    ? <span className="z-badge brand sm">{ROLE_LABEL.manager} · acesso total</span>
                    : member.profileId && profileName(member.profileId) ? <span className="z-badge brand sm"><ShieldCheck aria-hidden="true" />{profileName(member.profileId)}</span>
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
      <section className={`z-card white ${embedded ? 'z-team-embedded' : 'z-section'}`}>
        <header className="z-section-head">
          <div>
            <h3 className={embedded ? 't-h2' : 't-h1'}><IdCard aria-hidden="true" className="z-inline-icon" />Perfis de acesso</h3>
            <p className="t-body t-muted">Defina uma vez o que cada função vê. Quem recebe o perfil herda os módulos, e mudar o perfil muda o acesso de todos que o usam.</p>
          </div>
          <button type="button" className="z-btn secondary" onClick={() => setProfileDraft({})}><Plus />Novo perfil</button>
        </header>
        {profiles.length ? (
          <ul className="z-profile-grid">
            {profiles.map(profile => {
              const users = (list || []).filter(member => member.profileId === profile.id).length;
              return (
                <li key={profile.id} className="z-profile">
                  <div className="z-profile-head">
                    <strong><ShieldCheck aria-hidden="true" />{profile.name}</strong>
                    <span className="t-muted num">{users} pessoa(s)</span>
                  </div>
                  <div className="z-taglist">{profile.modules.length ? profile.modules.map(id => <span key={id} className="z-badge sm">{MODULES.find(item => item.id === id)?.label}</span>) : <span className="z-badge warn sm">Só visão geral</span>}</div>
                  <div className="z-row-actions">
                    <button type="button" className="z-close" onClick={() => setProfileDraft({ profile })} aria-label={`Editar perfil ${profile.name}`} title="Editar"><Pencil /></button>
                    <button type="button" className="z-close" onClick={() => saveProfiles(profiles.filter(item => item.id !== profile.id), `Perfil ${profile.name} removido. Quem o usava manteve o mesmo acesso, agora como personalizado.`)} aria-label={`Remover perfil ${profile.name}`} title="Remover"><Trash2 /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : <div className="z-empty"><span>Nenhum perfil. Crie um, por exemplo “Secretária”.</span></div>}
      </section>
      {profileDraft && (
        <ProfileModal
          profile={profileDraft.profile}
          onClose={() => setProfileDraft(null)}
          onSave={next => saveProfiles(profileDraft.profile ? profiles.map(item => item.id === next.id ? next : item) : [...profiles, next], `Perfil ${next.name} salvo.`)}
        />
      )}
      {draft && <MemberModal profiles={profiles} clinicId={clinicId} member={draft.member} isAdmin={isAdmin} firstMember={!list?.length} onClose={() => setDraft(null)} onSaved={message => { setDraft(null); setNotice(message); load(); }} />}
      {notice && <Toast tone="success" message={notice} onClose={() => setNotice('')} />}
    </>
  );
}

function MemberModal({ profiles, clinicId, member, isAdmin, firstMember, onClose, onSaved }: {
  profiles: AccessProfile[]; clinicId: string; member?: TeamMember; isAdmin: boolean; firstMember: boolean; onClose: () => void; onSaved: (message: string) => void;
}) {
  const [name, setName] = useState(member?.name || '');
  const [username, setUsername] = useState(member?.username || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<TeamMember['role']>(member?.role || (isAdmin && firstMember ? 'manager' : 'member'));
  const [profileId, setProfileId] = useState(member ? member.profileId : profiles[0]?.id || '');
  const [modules, setModules] = useState<Module[]>(member?.modules || DEFAULT_MEMBER_MODULES);
  const profile = profiles.find(item => item.id === profileId);
  // Profissional: atende, tem agenda própria e assina documentos. Novo membro herda a marcação do perfil.
  const [isProfessional, setIsProfessional] = useState(member ? Boolean(member.professional) : Boolean(profiles[0]?.professional));
  const [specialty, setSpecialty] = useState(member?.professional?.specialty || '');
  const [registry, setRegistry] = useState(member?.professional?.registry || '');
  const [revoking, setRevoking] = useState(false);
  const professional = isProfessional ? { specialty, registry } : null;
  async function revoke() {
    if (!member) return;
    setRevoking(true);
    try { onSaved((await call('PATCH', { clinicId, email: member.email, revoke: true })).message || 'Sessões encerradas.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível desconectar.'); }
    finally { setRevoking(false); }
  }
  const shown = profile ? profile.modules : modules;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id: Module) => !profile && setModules(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = member
        ? await call('PATCH', { clinicId, email: member.email, name, profileId, modules, professional, ...(isAdmin ? { role } : {}), ...(password ? { password } : {}) })
        : await call('POST', { clinicId, name, username, password, role, profileId, modules, professional });
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
            <Field label="Perfil de acesso" icon={IdCard} htmlFor="t-profile" hint={profile ? 'Os módulos seguem o perfil. Escolha “Personalizado” para ajustar só para esta pessoa.' : 'Acesso só desta pessoa.'} full>
              <Select id="t-profile" value={profileId} ariaLabel="Perfil de acesso" onChange={value => { const next = profiles.find(item => item.id === value); if (!value && profile) setModules(profile.modules); setProfileId(next?.id || ''); if (!member && next) setIsProfessional(Boolean(next.professional)); }} options={[...profiles.map(item => ({ value: item.id, label: item.name, hint: item.professional ? 'Profissional de saúde' : undefined })), { value: '', label: 'Personalizado', hint: 'Escolher módulos só para esta pessoa' }]} />
            </Field>
            {MODULES.map(item => (
              <label key={item.id} className={`z-switch z-module ${profile ? 'locked' : ''}`}>
                <input type="checkbox" checked={shown.includes(item.id)} disabled={Boolean(profile)} onChange={() => toggle(item.id)} />
                <span className="track" aria-hidden="true" />
                <span><strong>{item.label}</strong><small className="t-muted">{item.hint}</small></span>
              </label>
            ))}
          </fieldset>
        )}
        <fieldset className="z-fieldset full z-module-list">
          <legend>Atendimento</legend>
          <label className="z-switch z-module">
            <input type="checkbox" checked={isProfessional} onChange={event => setIsProfessional(event.target.checked)} />
            <span className="track" aria-hidden="true" />
            <span><strong>Atende pacientes</strong><small className="t-muted">Tem agenda própria e assina receitas e atestados</small></span>
          </label>
          {isProfessional && (
            <div className="z-form-grid">
              <Field label="Especialidade" icon={Stethoscope} htmlFor="t-spec"><input id="t-spec" className="z-input" value={specialty} onChange={event => setSpecialty(event.target.value)} placeholder="Dermatologia" /></Field>
              <Field label="Registro profissional" icon={BadgeCheck} htmlFor="t-reg"><input id="t-reg" className="z-input" value={registry} onChange={event => setRegistry(event.target.value)} placeholder="CRM/SP 123456" /></Field>
            </div>
          )}
        </fieldset>
        {member && (
          <div className="z-field full">
            <button type="button" className="z-btn secondary sm" onClick={revoke} disabled={revoking}><LogOut />{revoking ? 'Desconectando…' : 'Desconectar de todos os aparelhos'}</button>
            <span className="z-hint">Encerra as sessões abertas. A pessoa entra de novo com a mesma senha. Trocar a senha também encerra.</span>
          </div>
        )}
        {error && <p className="z-callout danger full" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}

function ProfileModal({ profile, onClose, onSave }: { profile?: AccessProfile; onClose: () => void; onSave: (profile: AccessProfile) => void }) {
  const [name, setName] = useState(profile?.name || '');
  const [modules, setModules] = useState<Module[]>(profile?.modules || DEFAULT_MEMBER_MODULES);
  const [professional, setProfessional] = useState(Boolean(profile?.professional));
  const toggle = (id: Module) => setModules(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  return (
    <Modal
      title={profile ? `Editar perfil ${profile.name}` : 'Novo perfil de acesso'}
      description={profile ? 'A mudança vale na hora para todos com este perfil.' : 'Ex.: Secretária, Enfermagem, Financeiro.'}
      onClose={onClose}
      onSubmit={event => { event.preventDefault(); if (name.trim()) onSave({ id: profile?.id || '', name: name.trim(), modules, professional }); }}
      footer={<><span className="spacer" /><button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="z-btn brand">Salvar perfil</button></>}
    >
      <div className="z-form-grid">
        <Field label="Nome do perfil" required icon={IdCard} htmlFor="p-name" full><input id="p-name" className="z-input" required value={name} onChange={event => setName(event.target.value)} placeholder="Secretária" /></Field>
        <fieldset className="z-fieldset full z-module-list">
          <legend>O que este perfil acessa</legend>
          {MODULES.map(item => (
            <label key={item.id} className="z-switch z-module">
              <input type="checkbox" checked={modules.includes(item.id)} onChange={() => toggle(item.id)} />
              <span className="track" aria-hidden="true" />
              <span><strong>{item.label}</strong><small className="t-muted">{item.hint}</small></span>
            </label>
          ))}
          <p className="z-hint">O que ficar desligado some do menu e não é enviado ao navegador dessa pessoa.</p>
          <label className="z-switch z-module">
            <input type="checkbox" checked={professional} onChange={event => setProfessional(event.target.checked)} />
            <span className="track" aria-hidden="true" />
            <span><strong>Perfil de profissional de saúde</strong><small className="t-muted">Ex.: Médico(a). Quem recebe já começa com agenda própria.</small></span>
          </label>
        </fieldset>
      </div>
    </Modal>
  );
}
