'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, ImagePlus, LogIn, LogOut, Palette, Pencil, Plus, Stethoscope, UserRound, Users } from 'lucide-react';
import { Team } from '@/components/clinic/Team';
import { Field } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { accentOf, applyBrand, isLightColor } from '@/lib/clinic/brand';
import type { Access, Brand } from '@/lib/clinic/permissions';
import { TEMPLATE_IDS, TEMPLATES, type TemplateId } from '@/lib/clinic/templates';

type ClinicRow = Brand & { template: TemplateId; templateName: string; members: { email: string; name: string; role: string }[] };

const MAX_LOGO_BYTES = 300 * 1024;
const readLogo = (file: File) => new Promise<string>((resolve, reject) => {
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) { reject(new Error('Use PNG, JPG, WEBP ou SVG.')); return; }
  if (file.size > MAX_LOGO_BYTES) { reject(new Error('O logo deve ter até 300 KB.')); return; }
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
  reader.readAsDataURL(file);
});

// Área do administrador da plataforma: cria clínicas, define identidade visual e modelo de prontuário, e monta a equipe.
export default function AdminPage() {
  const [access, setAccess] = useState<Access | null>(null);
  const [clinics, setClinics] = useState<ClinicRow[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<ClinicRow | 'new' | null>(null);
  const [open, setOpen] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/clinics', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível carregar as clínicas.');
    setClinics(result.clinics);
  }, []);

  useEffect(() => {
    applyBrand(undefined);
    fetch('/api/auth', { cache: 'no-store' }).then(response => response.json()).then(async auth => {
      if (!auth.authenticated || auth.access?.role !== 'admin') { window.location.replace('/'); return; }
      setAccess(auth.access);
      await load();
    }).catch(err => setError(err instanceof Error ? err.message : 'Não foi possível abrir a administração.'));
  }, [load]);

  async function enter(id: string) {
    const response = await fetch('/api/admin/enter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clinicId: id }) });
    if (!response.ok) { setError((await response.json()).error || 'Não foi possível abrir a clínica.'); return; }
    window.location.assign('/');
  }
  async function logout() {
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
    window.location.replace('/');
  }

  if (!access) return <main className="z-admin"><span className="z-loader" aria-hidden="true" />{error && <p className="z-callout danger" role="alert">{error}</p>}</main>;

  return (
    <main className="z-admin">
      <header className="z-admin-bar">
        <div className="z-brand"><img src="/zaindu-mark.svg" alt="" /><span className="z-brand-name">ZAINDU · Administração</span></div>
        <button type="button" className="z-btn ghost sm" onClick={logout}><LogOut />Sair</button>
      </header>
      <header className="z-pagehead">
        <div>
          <h1 className="t-display">Clínicas</h1>
          <p className="t-body-lg t-muted">Cada clínica tem identidade visual, modelo de prontuário e equipe próprios.</p>
        </div>
        <div className="z-pagehead-actions"><button type="button" className="z-btn brand" onClick={() => setEditing('new')}><Plus />Nova clínica</button></div>
      </header>
      {error && <p className="z-callout danger" role="alert">{error}</p>}
      {clinics === null ? <span className="z-loader" aria-hidden="true" /> : (
        <ul className="z-clinic-list">
          {clinics.map(clinic => {
            const manager = clinic.members.find(item => item.role === 'manager');
            return (
              <li key={clinic.id} className="z-card white z-clinic-card" style={{ '--clinic': clinic.color, '--clinic-ink': isLightColor(clinic.color) ? accentOf(clinic.color) : '#fff' } as React.CSSProperties}>
                <div className="z-clinic-row">
                  {clinic.logo ? <img className="z-clinic-logo" src={clinic.logo} alt="" /> : <span className="z-clinic-logo swatch" aria-hidden="true">{clinic.name.slice(0, 1).toUpperCase()}</span>}
                  <div className="z-clinic-main">
                    <strong className="t-h2">{clinic.name}</strong>
                    <small className="t-muted">{[clinic.templateName, manager ? `Gestora: ${manager.name}` : 'Sem gestora', `${clinic.members.length} pessoa(s)`].join(' · ')}</small>
                  </div>
                  <div className="z-row-actions">
                    <button type="button" className="z-close" onClick={() => setEditing(clinic)} aria-label={`Editar ${clinic.name}`} title="Editar"><Pencil /></button>
                    <button type="button" className="z-btn secondary sm" aria-expanded={open === clinic.id} onClick={() => setOpen(current => current === clinic.id ? '' : clinic.id)}><Users />Equipe<ChevronDown className="z-chevron" /></button>
                    <button type="button" className="z-btn brand sm" onClick={() => enter(clinic.id)}><LogIn />Abrir painel</button>
                  </div>
                </div>
                {open === clinic.id && <Team access={access} clinicId={clinic.id} embedded />}
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <ClinicModal
          clinic={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={async (message, createdId) => {
            setEditing(null);
            setNotice(message);
            await load().catch(() => {});
            if (createdId) setOpen(createdId);
          }}
        />
      )}
      {notice && <Toast tone="success" message={notice} onClose={() => setNotice('')} />}
    </main>
  );
}

function ClinicModal({ clinic, onClose, onSaved }: { clinic?: ClinicRow; onClose: () => void; onSaved: (message: string, createdId?: string) => void }) {
  const [name, setName] = useState(clinic?.name || '');
  const [professionalName, setProfessionalName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [template, setTemplate] = useState<TemplateId>(clinic?.template || 'geral');
  const [color, setColor] = useState(clinic?.color || '#647055');
  const [logo, setLogo] = useState(clinic?.logo || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pickLogo(file: File | undefined) {
    if (!file) return;
    try { setLogo(await readLogo(file)); setError(''); } catch (err) { setError(err instanceof Error ? err.message : 'Logo inválido.'); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/clinics', {
        method: clinic ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clinic ? { id: clinic.id, name, color, logo } : { name, professionalName, specialty, template, color, logo }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar.');
      onSaved(clinic ? 'Clínica atualizada.' : 'Clínica criada. Agora adicione a gestora na equipe.', result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      size="lg"
      title={clinic ? `Editar ${clinic.name}` : 'Nova clínica'}
      description={clinic ? `Modelo de prontuário: ${clinic.templateName}` : 'Só a cor e o logo mudam por clínica; o restante segue o padrão ZAINDU.'}
      onClose={onClose}
      onSubmit={submit}
      footer={<><span className="spacer" /><button type="button" className="z-btn secondary" onClick={onClose}>Cancelar</button><button type="submit" className="z-btn brand" disabled={busy}>{busy ? 'Salvando…' : clinic ? 'Salvar' : 'Criar clínica'}</button></>}
    >
      <div className="z-form-grid">
        <Field label="Nome da clínica" required icon={Building2} htmlFor="c-name" full={Boolean(clinic)}><input id="c-name" className="z-input" required value={name} onChange={event => setName(event.target.value)} /></Field>
        {!clinic && <>
          <Field label="Profissional responsável" icon={UserRound} htmlFor="c-pro"><input id="c-pro" className="z-input" value={professionalName} onChange={event => setProfessionalName(event.target.value)} placeholder="Ex.: Dra. Ana Souza" /></Field>
          <Field label="Especialidade exibida" icon={Stethoscope} htmlFor="c-spec" hint="Em branco usa o nome do modelo."><input id="c-spec" className="z-input" value={specialty} onChange={event => setSpecialty(event.target.value)} placeholder={TEMPLATES[template].specialty} /></Field>
          <div className="z-field full">
            <span className="z-label">Modelo de prontuário</span>
            <div className="z-template-pick" role="radiogroup" aria-label="Modelo de prontuário">
              {TEMPLATE_IDS.map(id => (
                <button key={id} type="button" role="radio" aria-checked={template === id} className="z-template" onClick={() => setTemplate(id)}>
                  <strong>{TEMPLATES[id].name}</strong>
                  <small>{TEMPLATES[id].record.sections.map(section => section.title).join(' · ')}</small>
                </button>
              ))}
            </div>
            <span className="z-hint">A clínica pode acrescentar etapas próprias depois, em Configurações.</span>
          </div>
        </>}
        <Field label="Cor da marca" icon={Palette} htmlFor="c-color" hint={isLightColor(color) ? 'Cor clara: vira o fundo do painel, e os botões ficam no tom escuro do DS SC.' : 'Usada em botões, menu ativo e destaques.'}>
          <div className="z-color-row">
            <input id="c-color" type="color" className="z-color" value={color} onChange={event => setColor(event.target.value)} />
            <span className="num t-muted">{color.toUpperCase()}</span>
            <span className="z-color-preview" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${accentOf(color)} 88%, #000), color-mix(in srgb, ${accentOf(color)} 82%, #fff))`, boxShadow: `0 0 0 6px ${isLightColor(color) ? color : 'transparent'}` }}>Botão</span>
          </div>
        </Field>
        <Field label="Logo" icon={ImagePlus} htmlFor="c-logo" hint="PNG, JPG, WEBP ou SVG, até 300 KB. Quadrado fica melhor.">
          <div className="z-color-row">
            {logo ? <img className="z-clinic-logo" src={logo} alt="Logo atual" /> : <span className="z-clinic-logo swatch" style={{ '--clinic': color, '--clinic-ink': isLightColor(color) ? accentOf(color) : '#fff' } as React.CSSProperties} aria-hidden="true">{(name || 'C').slice(0, 1).toUpperCase()}</span>}
            <input id="c-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="z-file" onChange={event => pickLogo(event.target.files?.[0])} />
            {logo && <button type="button" className="z-btn ghost sm" onClick={() => setLogo('')}>Remover</button>}
          </div>
        </Field>
        {error && <p className="z-callout danger full" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
