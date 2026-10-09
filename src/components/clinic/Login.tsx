'use client';

import { useState } from 'react';
import { ArrowUpRight, Eye, EyeOff, LogIn, RotateCw } from 'lucide-react';
import type { Access } from '@/lib/clinic/permissions';

export type AccessState = 'checking' | 'setup' | 'login' | 'loading' | 'error';

export function Login({ state, error, onAuthenticated }: { state: AccessState; error: string; onAuthenticated: (access: Access) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: username, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível entrar.');
      setPassword('');
      onAuthenticated(result.access);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  const busy = state === 'checking' || state === 'loading';
  return (
    <main className="z-access" aria-busy={busy}>
      <aside className="z-access-aside">
        <div className="z-access-brand"><img src="/zaindu-mark.svg" alt="" /><span>ZAINDU</span></div>
        <figure className="z-access-entry">
          <p className="z-access-word">zaindu</p>
          <figcaption>do basco: cuidar, proteger, guardar.</figcaption>
        </figure>
        <p className="z-access-foot">Agenda, pacientes e prontuários da sua clínica, num só lugar.</p>
      </aside>
      <section className="z-access-panel">
        <div className="z-access-body">
          {busy ? <>
            <h1 className="t-display">Abrindo sua clínica</h1>
            <p className="t-body-lg t-muted">Carregando pacientes, agenda e prontuários.</p>
            <span className="z-loader" aria-hidden="true" />
          </> : state === 'setup' ? <>
            <h1 className="t-display">Login ainda não configurado</h1>
            <p className="t-body-lg t-muted">Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> no ambiente e publique de novo.</p>
          </> : state === 'error' ? <>
            <h1 className="t-display">Não foi possível abrir a clínica</h1>
            <p className="t-body-lg t-muted">{error}</p>
            <button type="button" className="z-btn brand lg block" onClick={() => window.location.reload()}><RotateCw />Tentar de novo</button>
          </> : <>
            <h1 className="t-display">Entrar na clínica</h1>
            <p className="t-body-lg t-muted">Use o usuário e a senha cadastrados para você.</p>
            <form className="z-access-form" onSubmit={submit}>
              <div className="z-field">
                <label className="z-label" htmlFor="login-user">Usuário ou e-mail</label>
                <input id="login-user" className="z-input" autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={event => setUsername(event.target.value)} aria-invalid={Boolean(formError)} />
              </div>
              <div className="z-field">
                <label className="z-label" htmlFor="login-pass">Senha</label>
                <div className="z-inputwrap" aria-invalid={Boolean(formError) || undefined}>
                  <input id="login-pass" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} />
                  <button type="button" className="z-close" onClick={() => setShow(value => !value)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={show}>{show ? <EyeOff /> : <Eye />}</button>
                </div>
              </div>
              {formError && <p className="z-callout danger" role="alert">{formError}</p>}
              <button type="submit" className="z-btn brand lg block" disabled={submitting}><LogIn />{submitting ? 'Entrando…' : 'Entrar'}</button>
              <a className="z-btn ghost block" href="https://lp.zaindu.app" target="_blank" rel="noopener noreferrer">Conheça o ZAINDU<ArrowUpRight aria-hidden="true" /></a>
            </form>
          </>}
        </div>
      </section>
    </main>
  );
}
