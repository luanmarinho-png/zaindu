'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Gift, Check, ArrowUpRight, LockKeyhole } from 'lucide-react';
import type { PrizeResult } from '@/lib/prizes/types';
import styles from './prize.module.css';

const date = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export function PrizeExperience({ token }: { token: string }) {
  const [result, setResult] = useState<PrizeResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const receipt = useRef('');
  const heading = useRef<HTMLHeadingElement>(null);
  const endpoint = `/api/presentes/${encodeURIComponent(token)}`;
  const load = useCallback(async () => {
    setChecking(true); setError('');
    try {
      const key = `zaindu-prize-receipt:${token}`;
      // Only an opaque recovery key is stored, never participant contact details.
      if (!receipt.current) {
        try { receipt.current = localStorage.getItem(key) || ''; } catch {}
        if (!receipt.current) receipt.current = crypto.randomUUID();
        try { localStorage.setItem(key, receipt.current); } catch {}
      }
      const response = await fetch(endpoint, { cache: 'no-store', headers: { 'X-Prize-Receipt': receipt.current } });
      const data = await response.json();
      if (!response.ok && response.status !== 404) throw new Error(data.error || 'Não foi possível carregar seu presente.');
      setResult(data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Confira sua conexão e tente novamente.'); }
    finally { setChecking(false); }
  }, [endpoint, token]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        name: data.get('name'), email: data.get('email'), phone: data.get('phone'), consent: data.get('consent') === 'on', website: data.get('website'), receipt: receipt.current,
      }) });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || 'Não foi possível registrar seu presente.');
      setResult(next);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (err) { setError(err instanceof Error ? err.message : 'Confira sua conexão e tente novamente.'); }
    finally { setBusy(false); }
  }

  return <main className={styles.page}>
    <header className={styles.brand}><img src="/zaindu-mark.svg" alt="" width="36" height="36" /><span>ZAINDU</span></header>
    <section className={styles.card} aria-busy={busy || checking}>
      <div className={styles.icon} aria-hidden="true">{result?.state === 'claimed' ? <Check size={32} /> : <Gift size={32} />}</div>
      {checking ? <><h1>Seu presente está aqui.</h1><p role="status">Conferindo seu cartão…</p></> : result?.state === 'available' ? <>
        <h1>Um presente para<br />o seu consultório.</h1>
        <p className={styles.intro}>Preencha seus dados e descubra o que a ZAINDU preparou para você.</p>
        <form onSubmit={submit} className={styles.form}>
          <label htmlFor="prize-name">Nome completo<input id="prize-name" name="name" autoComplete="name" required minLength={3} maxLength={100} placeholder="Como podemos chamar você?" /></label>
          <label htmlFor="prize-phone">WhatsApp com DDD<input id="prize-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required maxLength={20} placeholder="(11) 99999-9999" /></label>
          <label htmlFor="prize-email">E-mail<input id="prize-email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="voce@exemplo.com" /></label>
          <div className={styles.trap} aria-hidden="true"><label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className={styles.consent}><input name="consent" type="checkbox" required /><span>Concordo com o uso do meu nome, WhatsApp e e-mail pela ZAINDU para registrar o prêmio e entrar em contato sobre sua ativação.</span></label>
          <button className={styles.button} disabled={busy} type="submit">{busy ? 'Registrando seu presente…' : 'Descobrir meu presente'}<Gift size={18} aria-hidden="true" /></button>
        </form>
        <p className={styles.fine}><LockKeyhole size={13} aria-hidden="true" /> Um resgate por cartão e por contato cadastrado.</p>
        <details className={styles.terms}><summary>Como funciona o presente</summary><p>São 18 cartões: 17 concedem 20% de desconto nos primeiros 12 meses de acesso e 1 concede acesso integral grátis por 12 meses. O prêmio já está vinculado ao cartão. O prazo começa na ativação, registrada pela equipe após disponibilizar o acesso. Os dados ficam acessíveis apenas à administração da ZAINDU para organizar o resgate e o contato. Para corrigir seus dados ou tirar dúvidas, fale com a equipe pelo site.</p></details>
      </> : result?.state === 'claimed' ? <>
        <p className={styles.eyebrow}>Seu presente ZAINDU</p>
        <h1 ref={heading} tabIndex={-1}>Parabéns!</h1>
        <p className={styles.reward}>{result.prize === 'free' ? <>Você ganhou<strong>1 ano grátis</strong>de acesso integral ao ZAINDU.</> : <>Você ganhou<strong>20% de desconto</strong>nos primeiros 12 meses de acesso ao ZAINDU.</>}</p>
        <div className={styles.confirmation}><Check size={17} aria-hidden="true" /><span>{result.activatedAt ? <>Seu acesso já foi ativado.<br />Aproveite seu presente ZAINDU.</> : <>Seu prêmio está registrado.<br />Nossa equipe entrará em contato para ativar seu acesso.</>}</span></div>
        {result.activatedAt && result.expiresAt ? <p className={styles.dates}>Benefício ativado em {date(result.activatedAt)}.<br />Válido até {date(result.expiresAt)}.</p> : <p className={styles.dates}>Os 12 meses começam na ativação.<br />Escanear o cartão não inicia o prazo.</p>}
        <a className={styles.button} href="https://lp.zaindu.app/">Conhecer a ZAINDU<ArrowUpRight size={18} aria-hidden="true" /></a>
        <p className={styles.fine}>Cartão {String(result.card).padStart(2, '0')} · Guarde este cartão e reabra neste navegador para consultar seu benefício.</p>
      </> : result?.state === 'used' ? <>
        <h1>Presente já registrado.</h1><p>Este cartão já foi resgatado. Se foi você, reabra no mesmo navegador usado no cadastro. Para receber ajuda, fale com a equipe ZAINDU.</p><a className={styles.button} href="https://lp.zaindu.app/">Falar com a equipe<ArrowUpRight size={18} /></a>
      </> : result?.state === 'invalid' ? <>
        <h1>Não encontramos<br />este cartão.</h1><p>Escaneie novamente o QR code da sua ecobag. Se precisar, a equipe ZAINDU pode ajudar.</p><a className={styles.button} href="https://lp.zaindu.app/">Conhecer a ZAINDU</a>
      </> : <><h1>Vamos tentar novamente?</h1><p>Não foi possível consultar seu cartão agora.</p><button className={styles.button} onClick={() => void load()}>Tentar novamente</button></>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
    <footer className={styles.footer}>Seu cuidado merece uma gestão à altura.</footer>
  </main>;
}
