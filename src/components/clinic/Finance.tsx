'use client';

import { useState } from 'react';
import { BarChart3, CalendarCheck, ChevronDown, Clock, Package, Percent, PiggyBank, Plus, Receipt, Tag, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { BarList, ColumnChart, SERIES } from '@/components/ui/Charts';
import { DecimalInput } from '@/components/ui/DecimalInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { brl, brlCompact, formatDate, percent } from '@/lib/clinic/format';
import { MAIN_PROFESSIONAL, type Professional } from '@/lib/clinic/permissions';
import { makeId, monthKey, serviceCost, servicePrice, type Service, type Supply } from '@/lib/clinic/store';
import { Metric } from './common';
import { MonthNav } from './MonthNav';
import { PageHeader } from './Shell';
import type { ClinicProps } from './types';

type Props = ClinicProps & { month: string; onMonthChange: (month: string) => void; professionals?: Professional[] };
type Tab = 'painel' | 'custos' | 'atendimentos' | 'insumos';

const DURATIONS = [15, 30, 45, 60, 90, 120];
const shiftMonth = (month: string, delta: number) => { const [y, m] = month.split('-').map(Number); return monthKey(new Date(y, m - 1 + delta, 1)); };

export function Finance({ data, setData, month, onMonthChange, professionals = [] }: Props) {
  const [tab, setTab] = useState<Tab>('painel');
  const costs = data.monthlyCosts[month] || { fixedCosts: 0, investments: 0 };
  const setCosts = (patch: Partial<typeof costs>) => setData(current => ({ ...current, monthlyCosts: { ...current.monthlyCosts, [month]: { ...costs, ...patch } } }));

  const tabs: [Tab, string, typeof Wallet][] = [['painel', 'Painel', BarChart3], ['custos', 'Custos do mês', PiggyBank], ['atendimentos', 'Atendimentos e preços', Receipt], ['insumos', 'Insumos', Package]];
  return (
    <>
      <PageHeader title="Financeiro" subtitle="Receita, custos e quanto cada atendimento custa e rende." actions={<MonthNav month={month} onChange={onMonthChange} />} />
      <div className="z-tabs" role="tablist" aria-label="Seções do financeiro">
        {tabs.map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}><Icon aria-hidden="true" />{label}</button>)}
      </div>
      {tab === 'painel' && <Dashboard data={data} month={month} professionals={professionals} />}
      {tab === 'custos' && (
        <section className="z-card white z-section">
          <header className="z-section-head"><div><h2 className="t-h1">Custos de {formatDate(`${month}-01`, { month: 'long', year: 'numeric' })}</h2><p className="t-body t-muted">Entram no resultado do mês. Troque o mês no topo para lançar outro período.</p></div></header>
          <div className="z-form-grid">
            <div className="z-field"><label className="z-label" htmlFor="fixed">Custos fixos</label><MoneyInput id="fixed" value={costs.fixedCosts} onChange={value => setCosts({ fixedCosts: value })} /><span className="z-hint">Aluguel, equipe, sistemas, contador</span></div>
            <div className="z-field"><label className="z-label" htmlFor="invest">Parcelas e investimentos</label><MoneyInput id="invest" value={costs.investments} onChange={value => setCosts({ investments: value })} /><span className="z-hint">Equipamentos, cursos, financiamentos</span></div>
          </div>
        </section>
      )}
      {tab === 'atendimentos' && <Services data={data} setData={setData} />}
      {tab === 'insumos' && <Supplies data={data} setData={setData} />}
    </>
  );
}

// Painel: números do mês, receita x custos nos últimos 6 meses e de onde vem a receita.
function Dashboard({ data, month, professionals }: Pick<Props, 'data' | 'month'> & { professionals: Professional[] }) {
  const monthItems = data.appointments.filter(item => item.date.startsWith(month));
  const done = monthItems.filter(item => item.status === 'Realizada');
  const revenue = done.reduce((sum, item) => sum + item.price, 0);
  const expected = monthItems.filter(item => item.status === 'Agendada').reduce((sum, item) => sum + item.price, 0);
  const costs = data.monthlyCosts[month] || { fixedCosts: 0, investments: 0 };
  const totalCosts = costs.fixedCosts + costs.investments;
  const result = revenue - totalCosts;
  const ticket = done.length ? revenue / done.length : 0;

  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5));
  const history = months.map(key => {
    const income = data.appointments.filter(item => item.date.startsWith(key) && item.status === 'Realizada').reduce((sum, item) => sum + item.price, 0);
    const spent = (data.monthlyCosts[key]?.fixedCosts || 0) + (data.monthlyCosts[key]?.investments || 0);
    return { label: formatDate(`${key}-01`, { month: 'short' }).replace('.', ''), tooltip: formatDate(`${key}-01`, { month: 'long', year: 'numeric' }), values: [income, spent] };
  });
  const byType = [...done.reduce((map, item) => map.set(item.type, { value: (map.get(item.type)?.value || 0) + item.price, count: (map.get(item.type)?.count || 0) + 1 }), new Map<string, { value: number; count: number }>())]
    .map(([label, entry]) => ({ label, value: entry.value, note: `${entry.count} atendimento(s)` }))
    .sort((a, b) => b.value - a.value);
  const byProfessional = professionals.length > 1
    ? professionals.map(pro => {
      const mine = done.filter(item => (item.professionalId || MAIN_PROFESSIONAL) === pro.id);
      return { label: pro.name, value: mine.reduce((sum, item) => sum + item.price, 0), note: `${mine.length} atendimento(s)` };
    }).filter(item => item.value > 0).sort((a, b) => b.value - a.value)
    : [];

  return (
    <>
      <div className="z-metrics">
        <Metric label="Receita realizada" value={brl(revenue)} note={`${done.length} consulta(s) realizada(s)`} icon={TrendingUp} tone="positive" />
        <Metric label="A receber" value={brl(expected)} note="Consultas ainda agendadas" icon={CalendarCheck} />
        <Metric label="Custos do mês" value={brl(totalCosts)} note="Fixos + parcelas" icon={TrendingDown} />
        <Metric label="Resultado" value={brl(result)} note={revenue ? `Margem de ${percent(result / revenue)}` : 'Receita − custos'} icon={Wallet} tone={result >= 0 ? 'positive' : 'negative'} />
        <Metric label="Ticket médio" value={brl(ticket)} note="Por consulta realizada" icon={Tag} />
      </div>
      <section className="z-card white z-section">
        <header className="z-section-head"><div><h2 className="t-h1">Receita e custos</h2><p className="t-body t-muted">Últimos 6 meses. Passe o mouse para ver os valores.</p></div></header>
        <ColumnChart points={history} series={[{ name: 'Receita realizada', color: SERIES.first }, { name: 'Custos', color: SERIES.second }]} format={brlCompact} ariaLabel="Receita realizada e custos nos últimos 6 meses" height={220} />
      </section>
      <div className="z-overview">
        <section className="z-card white z-section">
          <header className="z-section-head"><div><h2 className="t-h1">Receita por atendimento</h2><p className="t-body t-muted">{formatDate(`${month}-01`, { month: 'long', year: 'numeric' })}, só consultas realizadas.</p></div></header>
          {byType.length ? <BarList items={byType} format={brl} ariaLabel="Receita por tipo de atendimento" /> : <div className="z-empty"><span>Sem consultas realizadas neste mês.</span></div>}
        </section>
        {byProfessional.length > 0 ? (
          <section className="z-card white z-section">
            <header className="z-section-head"><div><h2 className="t-h1">Receita por profissional</h2><p className="t-body t-muted">Mesmo período.</p></div></header>
            <BarList items={byProfessional} format={brl} ariaLabel="Receita por profissional" />
          </section>
        ) : (
          <section className="z-card white z-section">
            <header className="z-section-head"><div><h2 className="t-h1">Status do mês</h2><p className="t-body t-muted">Consultas por situação.</p></div></header>
            <BarList
              items={(['Realizada', 'Agendada', 'Cancelada'] as const).map(status => ({ label: status, value: monthItems.filter(item => item.status === status).length }))}
              format={value => String(value)}
              ariaLabel="Consultas do mês por status"
            />
          </section>
        )}
      </div>
    </>
  );
}

// Atendimentos: nome, duração, preço de venda e os insumos usados; custo e margem calculados.
function Services({ data, setData }: Pick<Props, 'data' | 'setData'>) {
  const patchService = (id: string, patch: Partial<Service>) => setData(current => ({ ...current, services: current.services.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const addService = () => setData(current => ({ ...current, services: [...current.services, { id: makeId(), name: 'Novo atendimento', knowledgeCost: current.knowledgeCost, items: [], duration: 30, price: 0 }] }));
  return (
    <section className="z-card white z-section">
      <header className="z-section-head">
        <div><h2 className="t-h1">Atendimentos e preços</h2><p className="t-body t-muted">São os tipos que aparecem ao agendar: escolher um já preenche duração e valor.</p></div>
        <div className="z-field z-margin">
          <label className="z-label" htmlFor="margin"><Percent aria-hidden="true" />Margem alvo</label>
          <div className="z-inputwrap"><input id="margin" className="num" inputMode="numeric" value={data.targetMargin} onChange={event => setData(current => ({ ...current, targetMargin: Math.max(0, Math.min(1000, Number(event.target.value.replace(/\D/g, '')) || 0)) }))} /><span className="z-prefix">%</span></div>
        </div>
      </header>
      <div className="z-services">
        {data.services.map(service => {
          const cost = serviceCost(service, data.supplies);
          const suggested = cost * (1 + data.targetMargin / 100);
          const price = servicePrice(service, data.supplies, data.targetMargin);
          const margin = price ? (price - cost) / price : 0;
          return (
            <article key={service.id} className="z-card z-service">
              <header className="z-service-head">
                <input className="z-input z-title-input" aria-label="Nome do atendimento" value={service.name} onChange={event => patchService(service.id, { name: event.target.value })} />
                <button type="button" className="z-close" onClick={() => setData(current => ({ ...current, services: current.services.filter(item => item.id !== service.id) }))} aria-label={`Remover ${service.name}`} title="Remover atendimento"><Trash2 /></button>
              </header>
              <div className="z-form-grid">
                <div className="z-field">
                  <label className="z-label" htmlFor={`dur-${service.id}`}><Clock aria-hidden="true" />Duração</label>
                  <select id={`dur-${service.id}`} className="z-select" value={service.duration || 30} onChange={event => patchService(service.id, { duration: Number(event.target.value) })}>
                    {DURATIONS.map(minutes => <option key={minutes} value={minutes}>{minutes} min</option>)}
                  </select>
                </div>
                <div className="z-field">
                  <label className="z-label" htmlFor={`price-${service.id}`}><Tag aria-hidden="true" />Preço de venda</label>
                  <MoneyInput id={`price-${service.id}`} value={service.price || 0} onChange={value => patchService(service.id, { price: value })} />
                  <span className="z-hint">{service.price ? <button type="button" className="z-link" onClick={() => patchService(service.id, { price: 0 })}>Usar o sugerido ({brl(suggested)})</button> : `Em branco usa o sugerido: ${brl(suggested)}`}</span>
                </div>
              </div>
              <div className="z-service-items">
                <span className="z-label">Insumos e produtos usados</span>
                {service.items.map((item, index) => {
                  const supply = data.supplies.find(entry => entry.id === item.supplyId);
                  return (
                    <div key={`${item.supplyId}-${index}`} className="z-service-item">
                      <select className="z-select" aria-label="Insumo" value={item.supplyId} onChange={event => patchService(service.id, { items: service.items.map((entry, i) => i === index ? { ...entry, supplyId: event.target.value } : entry) })}>
                        {data.supplies.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
                      </select>
                      <DecimalInput className="z-qty" ariaLabel="Quantidade" suffix={supply?.unit || 'un'} value={item.qty} onChange={qty => patchService(service.id, { items: service.items.map((entry, i) => i === index ? { ...entry, qty } : entry) })} />
                      <span className="z-service-sub num">{brl((supply?.unitCost || 0) * item.qty)}</span>
                      <button type="button" className="z-close" onClick={() => patchService(service.id, { items: service.items.filter((_, i) => i !== index) })} aria-label="Remover insumo"><Trash2 /></button>
                    </div>
                  );
                })}
                {data.supplies.length > 0 && <button type="button" className="z-chip" onClick={() => patchService(service.id, { items: [...service.items, { supplyId: data.supplies[0].id, qty: data.supplies[0].defaultQty }] })}><Plus />Adicionar insumo</button>}
              </div>
              <div className="z-service-knowledge">
                <label className="z-label" htmlFor={`k-${service.id}`}>Conhecimento profissional</label>
                <MoneyInput id={`k-${service.id}`} value={service.knowledgeCost} onChange={value => patchService(service.id, { knowledgeCost: value })} />
              </div>
              <footer className="z-service-total three">
                <div><span className="t-body t-muted">Custo</span><strong className="num">{brl(cost)}</strong></div>
                <div><span className="t-body t-muted">Preço</span><strong className="num">{brl(price)}</strong></div>
                <div><span className="t-body t-muted">Margem</span><strong className={`num ${margin >= 0 ? 'tone-positive' : 'tone-negative'}`}>{percent(margin)}</strong></div>
              </footer>
            </article>
          );
        })}
        <button type="button" className="z-card flat z-add-card" onClick={addService}><Receipt aria-hidden="true" /><span>Adicionar atendimento</span></button>
      </div>
    </section>
  );
}

// Insumos agrupados por categoria, cada grupo recolhível.
function Supplies({ data, setData }: Pick<Props, 'data' | 'setData'>) {
  const patchSupply = (id: string, patch: Partial<Supply>) => setData(current => ({ ...current, supplies: current.supplies.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const removeSupply = (id: string) => setData(current => ({
    ...current,
    supplies: current.supplies.filter(item => item.id !== id),
    services: current.services.map(service => ({ ...service, items: service.items.filter(item => item.supplyId !== id) })),
  }));
  const addSupply = (category: string) => setData(current => ({ ...current, supplies: [...current.supplies, { id: makeId(), name: 'Novo insumo', category, unit: 'unidade', unitCost: 0, defaultQty: 1 }] }));
  const categories = [...new Set(data.supplies.map(item => item.category.trim() || 'Sem categoria'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const usage = (id: string) => data.services.filter(service => service.items.some(item => item.supplyId === id)).length;
  return (
    <section className="z-card white z-section">
      <header className="z-section-head">
        <div><h2 className="t-h1">Insumos</h2><p className="t-body t-muted">{data.supplies.length} item(ns) em {categories.length} categoria(s). Mudar um custo atualiza os atendimentos que usam o insumo.</p></div>
        <button type="button" className="z-btn secondary" onClick={() => addSupply('Nova categoria')}><Plus />Nova categoria</button>
      </header>
      {categories.length ? categories.map(category => {
        const items = data.supplies.filter(item => (item.category.trim() || 'Sem categoria') === category);
        return (
          <details key={category} className="z-group">
            <summary>
              <ChevronDown className="z-chevron" aria-hidden="true" />
              <strong>{category}</strong>
              <span className="t-muted num">{items.length} item(ns)</span>
            </summary>
            <div className="z-table-wrap">
              <table className="z-table">
                <thead><tr><th>Insumo</th><th>Categoria</th><th>Unidade</th><th>Custo unitário</th><th>Qtd. padrão</th><th>Usado em</th><th aria-label="Ações" /></tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td data-label="Insumo"><input className="z-input" aria-label="Nome do insumo" value={item.name} onChange={event => patchSupply(item.id, { name: event.target.value })} /></td>
                      <td data-label="Categoria"><input className="z-input" aria-label="Categoria" defaultValue={item.category} onBlur={event => event.target.value !== item.category && patchSupply(item.id, { category: event.target.value.trim() })} /></td>
                      <td data-label="Unidade"><input className="z-input" aria-label="Unidade" value={item.unit} onChange={event => patchSupply(item.id, { unit: event.target.value })} /></td>
                      <td data-label="Custo unitário"><MoneyInput ariaLabel="Custo unitário" value={item.unitCost} onChange={value => patchSupply(item.id, { unitCost: value })} /></td>
                      <td data-label="Qtd. padrão"><DecimalInput ariaLabel="Quantidade padrão" value={item.defaultQty} onChange={defaultQty => patchSupply(item.id, { defaultQty })} /></td>
                      <td data-label="Usado em" className="t-muted num">{usage(item.id)} atend.</td>
                      <td><button type="button" className="z-close" onClick={() => removeSupply(item.id)} aria-label={`Remover ${item.name}`} title="Remover"><Trash2 /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="z-btn ghost sm" onClick={() => addSupply(category === 'Sem categoria' ? '' : category)}><Plus />Adicionar em {category}</button>
          </details>
        );
      }) : <div className="z-empty"><Package aria-hidden="true" /><span>Nenhum insumo cadastrado.</span><button type="button" className="z-btn brand" onClick={() => addSupply('Geral')}><Plus />Adicionar insumo</button></div>}
    </section>
  );
}
