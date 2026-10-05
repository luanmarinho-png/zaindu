'use client';

import { CalendarCheck, Package, Percent, Plus, Receipt, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { DecimalInput } from '@/components/ui/DecimalInput';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { brl } from '@/lib/clinic/format';
import { makeId, serviceCost, type Service, type Supply } from '@/lib/clinic/store';
import { Metric } from './common';
import { MonthNav } from './MonthNav';
import { PageHeader } from './Shell';
import type { ClinicProps } from './types';

type Props = ClinicProps & { month: string; onMonthChange: (month: string) => void };

export function Finance({ data, setData, month, onMonthChange }: Props) {
  const monthItems = data.appointments.filter(item => item.date.startsWith(month));
  const done = monthItems.filter(item => item.status === 'Realizada');
  const revenue = done.reduce((sum, item) => sum + item.price, 0);
  const expected = monthItems.filter(item => item.status === 'Agendada').reduce((sum, item) => sum + item.price, 0);
  const costs = data.monthlyCosts[month] || { fixedCosts: 0, investments: 0 };
  const result = revenue - costs.fixedCosts - costs.investments;

  const setCosts = (patch: Partial<typeof costs>) => setData(current => ({ ...current, monthlyCosts: { ...current.monthlyCosts, [month]: { ...costs, ...patch } } }));
  const patchService = (id: string, patch: Partial<Service>) => setData(current => ({ ...current, services: current.services.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const patchSupply = (id: string, patch: Partial<Supply>) => setData(current => ({ ...current, supplies: current.supplies.map(item => item.id === id ? { ...item, ...patch } : item) }));
  const removeSupply = (id: string) => setData(current => ({
    ...current,
    supplies: current.supplies.filter(item => item.id !== id),
    services: current.services.map(service => ({ ...service, items: service.items.filter(item => item.supplyId !== id) })),
  }));
  const addService = () => setData(current => ({ ...current, services: [...current.services, { id: makeId(), name: 'Novo atendimento', knowledgeCost: current.knowledgeCost, items: [] }] }));
  const addSupply = () => setData(current => ({ ...current, supplies: [...current.supplies, { id: makeId(), name: 'Novo insumo', category: 'Personalizado', unit: 'unidade', unitCost: 0, defaultQty: 1 }] }));

  return (
    <>
      <PageHeader title="Financeiro" subtitle="Receita, custos do mês e quanto custa cada atendimento." actions={<MonthNav month={month} onChange={onMonthChange} />} />
      <div className="z-metrics">
        <Metric label="Receita realizada" value={brl(revenue)} note={`${done.length} consulta(s) realizada(s)`} icon={TrendingUp} tone="positive" />
        <Metric label="A receber" value={brl(expected)} note="Consultas ainda agendadas" icon={CalendarCheck} />
        <Metric label="Custos do mês" value={brl(costs.fixedCosts + costs.investments)} note="Fixos + parcelas" icon={TrendingDown} />
        <Metric label="Resultado" value={brl(result)} note="Receita − custos" icon={Wallet} tone={result >= 0 ? 'positive' : 'negative'} />
      </div>

      <section className="z-card white z-section">
        <header className="z-section-head"><div><h2 className="t-h1">Custos do mês</h2><p className="t-body t-muted">Valores de {month.split('-').reverse().join('/')}. Mudam o resultado acima.</p></div></header>
        <div className="z-form-grid">
          <div className="z-field"><label className="z-label" htmlFor="fixed">Custos fixos</label><MoneyInput id="fixed" value={costs.fixedCosts} onChange={value => setCosts({ fixedCosts: value })} /><span className="z-hint">Aluguel, equipe, sistemas, contador</span></div>
          <div className="z-field"><label className="z-label" htmlFor="invest">Parcelas e investimentos</label><MoneyInput id="invest" value={costs.investments} onChange={value => setCosts({ investments: value })} /><span className="z-hint">Equipamentos, cursos, financiamentos</span></div>
        </div>
      </section>

      <section className="z-card white z-section">
        <header className="z-section-head">
          <div><h2 className="t-h1">Custos por atendimento</h2><p className="t-body t-muted">Monte cada atendimento com os insumos usados. O preço sugerido aparece ao agendar.</p></div>
          <div className="z-field z-margin">
            <label className="z-label" htmlFor="margin"><Percent aria-hidden="true" />Margem alvo</label>
            <div className="z-inputwrap"><input id="margin" className="num" inputMode="numeric" value={data.targetMargin} onChange={event => setData(current => ({ ...current, targetMargin: Math.max(0, Math.min(1000, Number(event.target.value.replace(/\D/g, '')) || 0)) }))} /><span className="z-prefix">%</span></div>
          </div>
        </header>
        <div className="z-services">
          {data.services.map(service => {
            const total = serviceCost(service, data.supplies);
            return (
              <article key={service.id} className="z-card z-service">
                <header className="z-service-head">
                  <input className="z-input z-title-input" aria-label="Nome do atendimento" value={service.name} onChange={event => patchService(service.id, { name: event.target.value })} />
                  <button type="button" className="z-close" onClick={() => setData(current => ({ ...current, services: current.services.filter(item => item.id !== service.id) }))} aria-label={`Remover ${service.name}`} title="Remover atendimento"><Trash2 /></button>
                </header>
                <div className="z-service-items">
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
                <footer className="z-service-total">
                  <div><span className="t-body t-muted">Custo</span><strong className="num">{brl(total)}</strong></div>
                  <div><span className="t-body t-muted">Preço sugerido</span><strong className="num tone-brand">{brl(total * (1 + data.targetMargin / 100))}</strong></div>
                </footer>
              </article>
            );
          })}
          <button type="button" className="z-card flat z-add-card" onClick={addService}><Receipt aria-hidden="true" /><span>Adicionar atendimento</span></button>
        </div>
      </section>

      <section className="z-card white z-section">
        <header className="z-section-head">
          <div><h2 className="t-h1">Insumos</h2><p className="t-body t-muted">Tudo editável. Mudar um custo atualiza os atendimentos que usam o insumo.</p></div>
          <button type="button" className="z-btn secondary" onClick={addSupply}><Plus />Adicionar insumo</button>
        </header>
        {data.supplies.length ? (
          <div className="z-table-wrap">
            <table className="z-table">
              <thead><tr><th>Insumo</th><th>Categoria</th><th>Unidade</th><th>Custo unitário</th><th>Qtd. padrão</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {data.supplies.map(item => (
                  <tr key={item.id}>
                    <td data-label="Insumo"><input className="z-input" aria-label="Nome do insumo" value={item.name} onChange={event => patchSupply(item.id, { name: event.target.value })} /></td>
                    <td data-label="Categoria"><input className="z-input" aria-label="Categoria" value={item.category} onChange={event => patchSupply(item.id, { category: event.target.value })} /></td>
                    <td data-label="Unidade"><input className="z-input" aria-label="Unidade" value={item.unit} onChange={event => patchSupply(item.id, { unit: event.target.value })} /></td>
                    <td data-label="Custo unitário"><MoneyInput ariaLabel="Custo unitário" value={item.unitCost} onChange={value => patchSupply(item.id, { unitCost: value })} /></td>
                    <td data-label="Qtd. padrão"><DecimalInput ariaLabel="Quantidade padrão" value={item.defaultQty} onChange={defaultQty => patchSupply(item.id, { defaultQty })} /></td>
                    <td><button type="button" className="z-close" onClick={() => removeSupply(item.id)} aria-label={`Remover ${item.name}`} title="Remover"><Trash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="z-empty"><Package aria-hidden="true" /><span>Nenhum insumo cadastrado.</span></div>
        )}
      </section>
    </>
  );
}
