'use client';

import { useState } from 'react';
import { BarChart3, CalendarCheck, ChevronDown, Clock, Copy, Package, Percent, PiggyBank, Plus, Receipt, Repeat, Tag, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { BarList, ColumnChart, SERIES } from '@/components/ui/Charts';
import { DecimalInput } from '@/components/ui/DecimalInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { brl, brlCompact, formatDate, percent } from '@/lib/clinic/format';
import { MAIN_PROFESSIONAL, type Professional } from '@/lib/clinic/permissions';
import { COST_CATEGORIES, costItemsFor, costTotal, makeId, monthCostsFrom, monthKey, serviceCost, servicePrice, type CostCategory, type CostItem, type Service, type Supply } from '@/lib/clinic/store';
import { Select } from '@/components/ui/Select';
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
  const tabs: [Tab, string, typeof Wallet][] = [['painel', 'Painel', BarChart3], ['custos', 'Custos do mês', PiggyBank], ['atendimentos', 'Atendimentos e preços', Receipt], ['insumos', 'Insumos', Package]];
  return (
    <>
      <PageHeader title="Financeiro" subtitle="Receita, custos e quanto cada atendimento custa e rende." actions={<MonthNav month={month} onChange={onMonthChange} />} />
      <div className="z-tabs" role="tablist" aria-label="Seções do financeiro">
        {tabs.map(([id, label, Icon]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}><Icon aria-hidden="true" />{label}</button>)}
      </div>
      {tab === 'painel' && <Dashboard data={data} month={month} professionals={professionals} />}
      {tab === 'custos' && <Costs data={data} setData={setData} month={month} />}
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
  const totalCosts = costTotal(data, month);
  const result = revenue - totalCosts;
  const ticket = done.length ? revenue / done.length : 0;

  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5));
  const history = months.map(key => {
    const income = data.appointments.filter(item => item.date.startsWith(key) && item.status === 'Realizada').reduce((sum, item) => sum + item.price, 0);
    const spent = costTotal(data, key);
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
        <Metric label="Custos do mês" value={brl(totalCosts)} note="Fixos, parcelas, investimentos e extras" icon={TrendingDown} />
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

// Custos do mês em itens por categoria. Itens marcados "repete todo mês" aparecem sozinhos nos meses seguintes.
function Costs({ data, setData, month }: Pick<Props, 'data' | 'setData' | 'month'>) {
  const { items, inherited } = costItemsFor(data, month);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const save = (next: CostItem[]) => setData(current => ({ ...current, monthlyCosts: { ...current.monthlyCosts, [month]: monthCostsFrom(next) } }));
  const patch = (id: string, change: Partial<CostItem>) => save(items.map(item => item.id === id ? { ...item, ...change } : item));
  const add = (category: CostCategory) => save([...items, { id: makeId(), category, name: '', value: 0, recurring: category === 'fixo' || category === 'parcela' }]);
  const previousMonth = (() => { const [y, m] = month.split('-').map(Number); return monthKey(new Date(y, m - 2, 1)); })();
  const previousItems = costItemsFor(data, previousMonth).items;
  return (
    <section className="z-card white z-section">
      <header className="z-section-head">
        <div>
          <h2 className="t-h1">Custos de {formatDate(`${month}-01`, { month: 'long', year: 'numeric' })}</h2>
          <p className="t-body t-muted">Total de <strong className="num">{brl(total)}</strong>. {inherited ? 'Itens recorrentes trazidos do mês anterior: edite para confirmar este mês.' : 'Marque "Repete" no que se repete todo mês.'}</p>
        </div>
        {!items.length && previousItems.length > 0 && <button type="button" className="z-btn secondary" onClick={() => save(previousItems.map(item => ({ ...item, id: makeId() })))}><Copy />Copiar do mês anterior</button>}
      </header>
      {COST_CATEGORIES.map(category => {
        const list = items.filter(item => item.category === category.id);
        const subtotal = list.reduce((sum, item) => sum + item.value, 0);
        return (
          <details key={category.id} className="z-group" open={list.length > 0}>
            <summary>
              <ChevronDown className="z-chevron" aria-hidden="true" />
              <strong>{category.label}</strong>
              <span className="t-muted num">{list.length} item(ns) · {brl(subtotal)}</span>
            </summary>
            <p className="z-hint">{category.hint}</p>
            {list.length > 0 && (
              <div className="z-table-wrap">
                <table className="z-table z-cost-table">
                  <thead><tr><th>Descrição</th><th>Valor</th><th>Repete</th><th aria-label="Ações" /></tr></thead>
                  <tbody>
                    {list.map(item => (
                      <tr key={item.id}>
                        <td data-label="Descrição"><input className="z-input" aria-label="Descrição" value={item.name} placeholder="Ex.: Aluguel" onChange={event => patch(item.id, { name: event.target.value })} /></td>
                        <td data-label="Valor"><MoneyInput ariaLabel="Valor" value={item.value} onChange={value => patch(item.id, { value })} /></td>
                        <td data-label="Repete"><label className="z-switch" title="Repete todo mês"><input type="checkbox" checked={Boolean(item.recurring)} onChange={event => patch(item.id, { recurring: event.target.checked })} /><span className="track" aria-hidden="true" /><Repeat aria-hidden="true" className="z-cost-repeat" /></label></td>
                        <td><button type="button" className="z-close" onClick={() => save(items.filter(entry => entry.id !== item.id))} aria-label="Remover custo" title="Remover"><Trash2 /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" className="z-btn ghost sm" onClick={() => add(category.id)}><Plus />Adicionar em {category.label.toLowerCase()}</button>
          </details>
        );
      })}
    </section>
  );
}

// Atendimentos em tabela: cada linha abre o detalhe (duração, preço, insumos usados e conhecimento).
function Services({ data, setData }: Pick<Props, 'data' | 'setData'>) {
  const patchService = (id: string, patch: Partial<Service>) => setData(current => ({ ...current, services: current.services.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const addService = () => setData(current => ({ ...current, services: [...current.services, { id: makeId(), name: 'Novo atendimento', knowledgeCost: current.knowledgeCost, items: [], duration: 30, price: 0 }] }));
  const supplyOptions = data.supplies.map(entry => ({ value: entry.id, label: entry.name, hint: `${entry.category} · ${brl(entry.unitCost)}/${entry.unit}` }));
  return (
    <section className="z-card white z-section">
      <header className="z-section-head">
        <div><h2 className="t-h1">Atendimentos e preços</h2><p className="t-body t-muted">São os tipos que aparecem ao agendar: escolher um já preenche duração e valor. Clique numa linha para ver os detalhes.</p></div>
        <div className="z-row-actions">
          <div className="z-field z-margin">
            <label className="z-label" htmlFor="margin"><Percent aria-hidden="true" />Margem alvo</label>
            <div className="z-inputwrap"><input id="margin" className="num" inputMode="numeric" value={data.targetMargin} onChange={event => setData(current => ({ ...current, targetMargin: Math.max(0, Math.min(1000, Number(event.target.value.replace(/\D/g, '')) || 0)) }))} /><span className="z-prefix">%</span></div>
          </div>
          <button type="button" className="z-btn brand" onClick={addService}><Plus />Novo atendimento</button>
        </div>
      </header>
      <div className="z-service-table" role="table" aria-label="Atendimentos">
        <div className="z-service-row head" role="row"><span role="columnheader">Atendimento</span><span role="columnheader">Duração</span><span role="columnheader">Custo</span><span role="columnheader">Preço</span><span role="columnheader">Margem</span></div>
        {data.services.map(service => {
          const cost = serviceCost(service, data.supplies);
          const suggested = cost * (1 + data.targetMargin / 100);
          const price = servicePrice(service, data.supplies, data.targetMargin);
          const margin = price ? (price - cost) / price : 0;
          return (
            <details key={service.id} className="z-service-line">
              <summary className="z-service-row" role="row">
                <span role="cell" className="z-service-name"><ChevronDown className="z-chevron" aria-hidden="true" />{service.name || 'Sem nome'}</span>
                <span role="cell" className="num">{service.duration || 30} min</span>
                <span role="cell" className="num">{brl(cost)}</span>
                <span role="cell" className="num"><strong>{brl(price)}</strong>{!service.price && <small className="t-muted"> sugerido</small>}</span>
                <span role="cell" className={`num ${margin >= 0 ? 'tone-positive' : 'tone-negative'}`}>{percent(margin)}</span>
              </summary>
              <div className="z-service-detail">
                <div className="z-form-grid three">
                  <div className="z-field"><label className="z-label" htmlFor={`name-${service.id}`}>Nome</label><input id={`name-${service.id}`} className="z-input" value={service.name} onChange={event => patchService(service.id, { name: event.target.value })} /></div>
                  <div className="z-field">
                    <label className="z-label" htmlFor={`dur-${service.id}`}><Clock aria-hidden="true" />Duração</label>
                    <Select id={`dur-${service.id}`} value={String(service.duration || 30)} options={DURATIONS.map(minutes => ({ value: String(minutes), label: `${minutes} min` }))} onChange={value => patchService(service.id, { duration: Number(value) })} ariaLabel="Duração" />
                  </div>
                  <div className="z-field">
                    <label className="z-label" htmlFor={`price-${service.id}`}><Tag aria-hidden="true" />Preço de venda</label>
                    <MoneyInput id={`price-${service.id}`} value={service.price || 0} onChange={value => patchService(service.id, { price: value })} />
                    <span className="z-hint">{service.price ? <button type="button" className="z-link" onClick={() => patchService(service.id, { price: 0 })}>Usar o sugerido ({brl(suggested)})</button> : `Em branco usa o sugerido: ${brl(suggested)}`}</span>
                  </div>
                </div>
                <div className="z-table-wrap">
                  <table className="z-table z-items-table">
                    <thead><tr><th>Insumo ou produto</th><th className="num-col">Qtd.</th><th>Unidade</th><th className="num-col">Subtotal</th><th aria-label="Ações" /></tr></thead>
                    <tbody>
                      {service.items.map((item, index) => {
                        const supply = data.supplies.find(entry => entry.id === item.supplyId);
                        return (
                          <tr key={`${item.supplyId}-${index}`}>
                            <td data-label="Insumo"><Select size="sm" value={item.supplyId} options={supplyOptions} ariaLabel="Insumo" onChange={value => patchService(service.id, { items: service.items.map((entry, i) => i === index ? { ...entry, supplyId: value } : entry) })} /></td>
                            <td data-label="Qtd." className="num-col"><DecimalInput className="z-qty" ariaLabel="Quantidade" value={item.qty} onChange={qty => patchService(service.id, { items: service.items.map((entry, i) => i === index ? { ...entry, qty } : entry) })} /></td>
                            <td data-label="Unidade" className="t-muted">{supply?.unit || 'un'}</td>
                            <td data-label="Subtotal" className="num-col num">{brl((supply?.unitCost || 0) * item.qty)}</td>
                            <td><button type="button" className="z-close" onClick={() => patchService(service.id, { items: service.items.filter((_, i) => i !== index) })} aria-label="Remover insumo"><Trash2 /></button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="z-service-foot">
                  {data.supplies.length > 0 && <button type="button" className="z-btn ghost sm" onClick={() => patchService(service.id, { items: [...service.items, { supplyId: data.supplies[0].id, qty: data.supplies[0].defaultQty }] })}><Plus />Adicionar insumo</button>}
                  <div className="z-field z-knowledge"><label className="z-label" htmlFor={`k-${service.id}`}>Conhecimento profissional</label><MoneyInput id={`k-${service.id}`} value={service.knowledgeCost} onChange={value => patchService(service.id, { knowledgeCost: value })} /></div>
                  <button type="button" className="z-btn danger-ghost sm" onClick={() => setData(current => ({ ...current, services: current.services.filter(item => item.id !== service.id) }))}><Trash2 />Remover atendimento</button>
                </div>
              </div>
            </details>
          );
        })}
        {!data.services.length && <div className="z-empty"><Receipt aria-hidden="true" /><span>Nenhum atendimento. Crie o primeiro, por exemplo “Consulta”.</span></div>}
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
