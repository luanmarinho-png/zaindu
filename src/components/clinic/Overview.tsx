'use client';

import { ArrowRight, BookOpen, Cake, CalendarDays, CalendarPlus, Lightbulb, Plus, TrendingDown, TrendingUp, UserRoundX, Users, Wallet, XCircle, type LucideIcon } from 'lucide-react';
import { ColumnChart } from '@/components/ui/Charts';
import { brl, formatDate, percent } from '@/lib/clinic/format';
import { MAIN_PROFESSIONAL, type Access, type Professional } from '@/lib/clinic/permissions';
import { dayKey, monthKey, verseForToday, type Appointment, type Store } from '@/lib/clinic/store';
import { Metric, StatusBadge } from './common';
import { MonthNav } from './MonthNav';
import { PageHeader } from './Shell';
import type { ClinicView } from './types';

type Props = {
  data: Store;
  access: Access;
  professionals?: Professional[];
  month: string;
  onMonthChange: (month: string) => void;
  onNew?: () => void;
  onOpen?: (appointment: Appointment) => void;
  onNavigate: (view: ClinicView) => void;
};

type Insight = { icon: LucideIcon; text: string; tone?: 'positive' | 'negative' };

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
};
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
// Primeiro nome sem o título (Dr., Dra.).
const firstName = (name: string) => name.trim().split(/\s+/).find(part => !/^(dra?\.?|dr\.)$/i.test(part)) || '';
const previousMonth = (month: string) => { const [y, m] = month.split('-').map(Number); return monthKey(new Date(y, m - 2, 1)); };

// Leituras rápidas do mês, só quando há dado suficiente para dizer algo útil.
function insightsFor(data: Store, items: Appointment[], month: string, finance: boolean): Insight[] {
  const list: Insight[] = [];
  const valid = (item: Appointment) => item.status !== 'Cancelada';
  const monthItems = items.filter(item => item.date.startsWith(month));
  const today = dayKey(new Date());
  const isCurrent = month === monthKey(new Date());
  // Compara com o mesmo trecho do mês anterior, para não comparar mês pela metade com mês inteiro.
  const cut = isCurrent ? today.slice(8) : '31';
  const prev = previousMonth(month);
  const now = monthItems.filter(item => valid(item) && item.date.slice(8) <= cut).length;
  const before = items.filter(item => item.date.startsWith(prev) && valid(item) && item.date.slice(8) <= cut).length;
  const prevName = formatDate(`${prev}-01`, { month: 'long' });
  if (before > 0) {
    const change = (now - before) / before;
    if (Math.abs(change) >= 0.05) list.push({ icon: change > 0 ? TrendingUp : TrendingDown, tone: change > 0 ? 'positive' : 'negative', text: `${change > 0 ? '+' : ''}${percent(change)} de consultas em relação ao mesmo período de ${prevName}.` });
  }
  const cancelled = monthItems.filter(item => item.status === 'Cancelada').length;
  if (monthItems.length >= 5 && cancelled / monthItems.length >= 0.1) list.push({ icon: XCircle, tone: 'negative', text: `${percent(cancelled / monthItems.length)} das consultas do mês foram canceladas. Um lembrete na véspera costuma reduzir isso.` });
  const recent = items.filter(item => valid(item) && item.date >= dayKey(new Date(Date.now() - 90 * 864e5)) && item.date <= today);
  if (recent.length >= 8) {
    const counts = WEEKDAYS.map((_, day) => recent.filter(item => new Date(`${item.date}T12:00:00`).getDay() === day).length);
    const best = counts.indexOf(Math.max(...counts));
    list.push({ icon: CalendarDays, text: `${WEEKDAYS[best].charAt(0).toUpperCase()}${WEEKDAYS[best].slice(1)} é o dia mais movimentado dos últimos 3 meses (${counts[best]} consultas).` });
  }
  const limit = dayKey(new Date(Date.now() - 90 * 864e5));
  const lost = data.patients.filter(patient => {
    const mine = items.filter(item => item.patientId === patient.id);
    const last = mine.filter(item => item.status === 'Realizada').map(item => item.date).sort().pop();
    return last && last < limit && !mine.some(item => item.status === 'Agendada' && item.date >= today);
  });
  if (lost.length) list.push({ icon: UserRoundX, text: `${lost.length} paciente(s) sem retorno há mais de 3 meses e sem consulta marcada: ${lost.slice(0, 3).map(item => firstName(item.socialName || item.name)).join(', ')}${lost.length > 3 ? '…' : ''}` });
  const week = Array.from({ length: 7 }, (_, offset) => dayKey(new Date(Date.now() + offset * 864e5)).slice(5));
  const birthdays = data.patients.filter(patient => patient.birthDate && week.includes(patient.birthDate.slice(5)));
  if (birthdays.length) list.push({ icon: Cake, tone: 'positive', text: `Aniversário nesta semana: ${birthdays.slice(0, 4).map(item => `${firstName(item.socialName || item.name)} (${formatDate(item.birthDate, { day: '2-digit', month: '2-digit' })})`).join(', ')}.` });
  if (finance) {
    const done = monthItems.filter(item => item.status === 'Realizada');
    if (done.length >= 3) {
      const byType = new Map<string, number>();
      for (const item of done) byType.set(item.type, (byType.get(item.type) || 0) + item.price);
      const [topType, topValue] = [...byType.entries()].sort((a, b) => b[1] - a[1])[0];
      const total = done.reduce((sum, item) => sum + item.price, 0);
      list.push({ icon: Wallet, text: `Ticket médio de ${brl(total / done.length)}. ${topType} trouxe ${total ? percent(topValue / total) : '0%'} da receita do mês.` });
    }
  }
  return list.slice(0, 4);
}

export function Overview({ data, access, professionals = [], month, onMonthChange, onNew, onOpen, onNavigate }: Props) {
  const finance = access.modules.includes('financeiro');
  const agenda = access.modules.includes('agenda');
  const today = dayKey(new Date());
  // Quem atende vê a própria agenda; gestora, secretária e admin veem a clínica toda.
  const mine = access.professional && professionals.length > 1;
  const items = mine ? data.appointments.filter(item => (item.professionalId || MAIN_PROFESSIONAL) === access.email) : data.appointments;
  const monthItems = items.filter(item => item.date.startsWith(month));
  const scheduled = monthItems.filter(item => item.status === 'Agendada').length;
  const revenue = monthItems.filter(item => item.status === 'Realizada').reduce((sum, item) => sum + item.price, 0);
  const costs = data.monthlyCosts[month] || { fixedCosts: 0, investments: 0 };
  const result = revenue - costs.fixedCosts - costs.investments;
  const upcoming = items
    .filter(item => item.status === 'Agendada' && item.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 6);
  const todayCount = items.filter(item => item.date === today && item.status !== 'Cancelada').length;
  const patientName = (id: string) => data.patients.find(patient => patient.id === id)?.name || 'Paciente removido';
  const verse = verseForToday();
  // Saudação pelo nome de quem entrou (não pelo profissional da clínica).
  const name = firstName(access.name);

  const [year, monthIndex] = month.split('-').map(Number);
  const days = new Date(year, monthIndex, 0).getDate();
  const perDay = Array.from({ length: days }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const count = monthItems.filter(item => item.date === date && item.status !== 'Cancelada').length;
    return { label: String(index + 1), tooltip: `${formatDate(date, { weekday: 'short', day: '2-digit', month: 'short' })} · ${count} consulta(s)`, values: [count] };
  });
  const insights = insightsFor(data, items, month, finance);

  return (
    <>
      <PageHeader
        title={`${greeting()}${name ? `, ${name}` : ''}`}
        subtitle={todayCount ? `Você tem ${todayCount} consulta(s) hoje.` : 'Nenhuma consulta hoje.'}
        actions={<>
          <MonthNav month={month} onChange={onMonthChange} />
          {onNew && <button type="button" className="z-btn brand" onClick={onNew}><Plus />Nova consulta</button>}
        </>}
      />
      <div className="z-metrics">
        <Metric label="Consultas no mês" value={String(monthItems.length)} note={`${scheduled} aguardando atendimento`} icon={CalendarDays} />
        <Metric label="Pacientes" value={String(data.patients.length)} note="Na sua base" icon={Users} />
        {finance && <>
          <Metric label="Receita realizada" value={brl(revenue)} note="Consultas concluídas" icon={TrendingUp} tone="positive" />
          <Metric label="Resultado" value={brl(result)} note="Receita − custos do mês" icon={Wallet} tone={result >= 0 ? 'positive' : 'negative'} />
        </>}
      </div>

      <div className="z-overview">
        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Consultas por dia</h2><p className="t-body t-muted">{formatDate(`${month}-01`, { month: 'long', year: 'numeric' })}, sem as canceladas.</p></div>
          </header>
          <ColumnChart points={perDay} series={[{ name: 'Consultas', color: 'var(--sc-brand)' }]} format={value => String(Math.round(value))} ariaLabel={`Consultas por dia em ${formatDate(`${month}-01`, { month: 'long' })}`} labelEvery={5} height={200} integer emptyText="Nenhuma consulta neste mês ainda." />
        </section>
        <section className="z-card white z-section z-insights">
          <header className="z-section-head"><div><h2 className="t-h1"><Lightbulb aria-hidden="true" className="z-inline-icon" />Insights</h2><p className="t-body t-muted">Leituras do mês com base na agenda.</p></div></header>
          {insights.length ? (
            <ul>
              {insights.map(item => <li key={item.text} className={item.tone ? `tone-${item.tone}-icon` : ''}><item.icon aria-hidden="true" /><span>{item.text}</span></li>)}
            </ul>
          ) : <div className="z-empty"><span>Os insights aparecem conforme a agenda ganha histórico.</span></div>}
        </section>
      </div>

      <div className="z-overview">
        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Próximos atendimentos</h2><p className="t-body t-muted">A partir de hoje{mine ? ', na sua agenda' : ''}.</p></div>
            {agenda && <button type="button" className="z-btn ghost sm" onClick={() => onNavigate('Agenda')}>Agenda<ArrowRight /></button>}
          </header>
          {upcoming.length ? (
            <ul className="z-daylist">
              {upcoming.map(item => (
                <li key={item.id}>
                  <button type="button" className="z-dayitem" onClick={() => onOpen?.(item)} disabled={!onOpen}>
                    <span className="z-dayitem-date num"><b>{formatDate(item.date, { day: '2-digit' })}</b><small>{formatDate(item.date, { month: 'short' }).replace('.', '')}</small></span>
                    <span className="z-dayitem-main"><strong>{patientName(item.patientId)}</strong><small className="num">{item.time} · {item.type}{finance && item.price ? ` · ${brl(item.price)}` : ''}</small></span>
                    <StatusBadge status={item.status} small />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="z-empty">
              <CalendarPlus aria-hidden="true" />
              <strong>Agenda livre</strong>
              <span>Nenhuma consulta agendada daqui pra frente.</span>
              {onNew && <button type="button" className="z-btn brand" onClick={onNew}><Plus />Nova consulta</button>}
            </div>
          )}
        </section>
        {data.settings.showDailyVerse !== false && <section className="z-card white z-section z-verse">
          <span className="z-badge brand sm"><BookOpen aria-hidden="true" />Palavra do dia</span>
          <h2 className="t-h1">{verse.reference}</h2>
          <p className="t-body-lg-strong">{verse.theme}</p>
          <p className="t-body-lg t-muted">{verse.reflection}</p>
          <button type="button" className="z-btn ghost sm" onClick={() => onNavigate('Todos os dias')}>Ler mensagem<ArrowRight /></button>
        </section>}
      </div>
    </>
  );
}
