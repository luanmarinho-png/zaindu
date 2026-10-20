'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, MessageCircle, Check, Gift } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { prizeLabel, type PrizeRow } from '@/lib/prizes/types';
import styles from './prizes-admin.module.css';

const labels = { available: 'Aguardando resgate', claimed: 'Resgatado', contacted: 'Contatado', activated: 'Ativado' };
const date = (value: string | null) => value ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—';
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/^[\s]*[=+@-]/, "'$&").replace(/"/g, '""')}"`;

export function PrizesAdmin() {
  const [rows, setRows] = useState<PrizeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [activation, setActivation] = useState<PrizeRow | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/presentes', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível carregar os prêmios.');
      setRows(data.rows);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha de conexão.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function update(row: PrizeRow, action: 'contact' | 'activate') {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/presentes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card: row.card, action, confirmAccessReady: action === 'activate' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível atualizar.');
      setRows(data.rows); setActivation(null);
      setNotice(action === 'activate' ? 'Ativação registrada. O benefício começa hoje e termina em 12 meses.' : 'Contato registrado.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha de conexão.'); }
    finally { setBusy(false); }
  }
  function exportCsv() {
    const header = ['Cartão', 'Nome', 'WhatsApp', 'E-mail', 'Prêmio', 'Situação', 'Resgate', 'Contato', 'Ativação', 'Fim do benefício'];
    const content = [header, ...rows.filter(row => row.status !== 'available').map(row => [String(row.card).padStart(2, '0'), row.name, row.phone, row.email, row.prize ? prizeLabel(row.prize) : '', labels[row.status], date(row.claimedAt), date(row.contactedAt), date(row.activatedAt), date(row.expiresAt)])].map(row => row.map(csvCell).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'zaindu-presentes-ecobags.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const visible = rows.filter(row => (filter === 'all' || row.status === filter) && `${row.card} ${row.name} ${row.email} ${row.phone}`.toLowerCase().includes(search.toLowerCase()));
  return <section className={styles.page}>
    <header className="z-pagehead"><div><h1 className="t-display">Presentes das ecobags</h1><p className="t-body-lg t-muted">18 cartões · 17 descontos de 20% · 1 acesso integral grátis · 12 meses a partir da ativação.</p></div><div className="z-pagehead-actions"><button className="z-btn secondary" onClick={() => void load()} disabled={loading || busy}><RefreshCw />Atualizar</button><button className="z-btn brand" onClick={exportCsv} disabled={!rows.some(row => row.status !== 'available')}><Download />Exportar contatos</button></div></header>
    <div className={styles.summary} aria-label="Resumo da campanha"><span><strong>{rows.filter(r => r.status !== 'available').length}/18</strong> resgatados</span><span><strong>{rows.filter(r => r.status === 'claimed').length}</strong> aguardando contato</span><span><strong>{rows.filter(r => r.status === 'activated').length}</strong> ativados</span></div>
    <p className={styles.help}>O resgate não ativa a assinatura. Disponibilize o acesso e aplique o benefício combinado antes de registrar a ativação aqui. Os dados de contato são informados pela participante.</p>
    <div className={styles.controls}><label>Buscar participante<input className="z-input" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome, e-mail, telefone ou cartão" /></label><div className={styles.filters} aria-label="Filtrar situação">{[['all', 'Todos'], ...Object.entries(labels)].map(([value, label]) => <button key={value} type="button" className={`z-btn ${filter === value ? 'brand' : 'secondary'} sm`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
    {error && <p className="z-callout danger" role="alert">{error}</p>}{notice && <p className="z-callout" role="status">{notice}</p>}
    {loading ? <p role="status">Carregando cartões…</p> : <div className={styles.list}>{visible.map(row => <article className={styles.row} key={row.card}>
      <div className={styles.identity}><span className={styles.number}>{String(row.card).padStart(2, '0')}</span><div><h2>{row.name || 'Cartão ainda não resgatado'}</h2><span className={styles.status}>{labels[row.status]}</span></div></div>
      {row.prize && <p className={styles.prize}><Gift size={16} />{prizeLabel(row.prize)}</p>}
      {row.status !== 'available' && <><div className={styles.details}><a href={`mailto:${row.email}`}>{row.email}</a><span>+{row.phone}</span><span>Resgate: {date(row.claimedAt)}</span>{row.contactedAt && <span>Contato: {date(row.contactedAt)}</span>}{row.activatedAt && <span>Benefício: {date(row.activatedAt)} a {date(row.expiresAt)}</span>}</div><div className={styles.actions}><a className="z-btn secondary sm" href={`https://wa.me/${row.phone}`} target="_blank" rel="noopener noreferrer"><MessageCircle />Abrir WhatsApp</a>{row.status === 'claimed' && <button className="z-btn secondary sm" disabled={busy} onClick={() => void update(row, 'contact')}><Check />Marcar contatado</button>}{row.status !== 'activated' && <button className="z-btn brand sm" disabled={busy} onClick={() => setActivation(row)}>Registrar ativação</button>}</div></>}
    </article>)}{visible.length === 0 && <p>Nenhum cartão encontrado com este filtro.</p>}</div>}
    {activation && <Modal title="Registrar ativação do benefício" onClose={() => { if (!busy) setActivation(null); }} footer={<><button className="z-btn secondary" disabled={busy} onClick={() => setActivation(null)}>Cancelar</button><button className="z-btn brand" disabled={busy} onClick={() => void update(activation, 'activate')}>{busy ? 'Registrando…' : 'Confirmar ativação'}</button></>}>
      <p><strong>{activation.name}</strong> receberá {activation.prize && prizeLabel(activation.prize)}.</p><p>Confirme somente se o acesso já está disponível e o benefício foi aplicado. Os 12 meses começarão agora. Esta ação registra o prazo; não cria conta nem altera cobrança.</p>{error && <p className="z-callout danger" role="alert">{error}</p>}
    </Modal>}
  </section>;
}
