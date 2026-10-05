'use client';

import { ArrowRight, BookOpen, CalendarDays, CalendarPlus, Plus, TrendingUp, Users, Wallet } from 'lucide-react';
import { brl, formatDate } from '@/lib/clinic/format';
import { dayKey, verseForToday, type Appointment, type Store } from '@/lib/clinic/store';
import { Metric, StatusBadge } from './common';
import { MonthNav } from './MonthNav';
import { PageHeader } from './Shell';
import type { ClinicView } from './types';

type Props = {
  data: Store;
  month: string;
  onMonthChange: (month: string) => void;
  onNew: () => void;
  onOpen: (appointment: Appointment) => void;
  onNavigate: (view: ClinicView) => void;
};

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
};

export function Overview({ data, month, onMonthChange, onNew, onOpen, onNavigate }: Props) {
  const today = dayKey(new Date());
  const monthItems = data.appointments.filter(item => item.date.startsWith(month));
  const scheduled = monthItems.filter(item => item.status === 'Agendada').length;
  const revenue = monthItems.filter(item => item.status === 'Realizada').reduce((sum, item) => sum + item.price, 0);
  const costs = data.monthlyCosts[month] || { fixedCosts: 0, investments: 0 };
  const result = revenue - costs.fixedCosts - costs.investments;
  const upcoming = data.appointments
    .filter(item => item.status === 'Agendada' && item.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 6);
  const todayCount = data.appointments.filter(item => item.date === today && item.status !== 'Cancelada').length;
  const patientName = (id: string) => data.patients.find(patient => patient.id === id)?.name || 'Paciente removido';
  const verse = verseForToday();
  const firstName = data.settings.professionalName.split(' ').find(part => !/^(dra?\.?|dr\.)$/i.test(part)) || '';

  return (
    <>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        subtitle={todayCount ? `Você tem ${todayCount} consulta(s) hoje.` : 'Nenhuma consulta hoje.'}
        actions={<>
          <MonthNav month={month} onChange={onMonthChange} />
          <button type="button" className="z-btn brand" onClick={onNew}><Plus />Nova consulta</button>
        </>}
      />
      <div className="z-metrics">
        <Metric label="Consultas no mês" value={String(monthItems.length)} note={`${scheduled} aguardando atendimento`} icon={CalendarDays} />
        <Metric label="Pacientes" value={String(data.patients.length)} note="Na sua base" icon={Users} />
        <Metric label="Receita realizada" value={brl(revenue)} note="Consultas concluídas" icon={TrendingUp} tone="positive" />
        <Metric label="Resultado" value={brl(result)} note="Receita − custos do mês" icon={Wallet} tone={result >= 0 ? 'positive' : 'negative'} />
      </div>
      <div className="z-overview">
        <section className="z-card white z-section">
          <header className="z-section-head">
            <div><h2 className="t-h1">Próximos atendimentos</h2><p className="t-body t-muted">A partir de hoje.</p></div>
            <button type="button" className="z-btn ghost sm" onClick={() => onNavigate('Agenda')}>Agenda<ArrowRight /></button>
          </header>
          {upcoming.length ? (
            <ul className="z-daylist">
              {upcoming.map(item => (
                <li key={item.id}>
                  <button type="button" className="z-dayitem" onClick={() => onOpen(item)}>
                    <span className="z-dayitem-date num"><b>{formatDate(item.date, { day: '2-digit' })}</b><small>{formatDate(item.date, { month: 'short' }).replace('.', '')}</small></span>
                    <span className="z-dayitem-main"><strong>{patientName(item.patientId)}</strong><small className="num">{item.time} · {item.type}{item.price ? ` · ${brl(item.price)}` : ''}</small></span>
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
              <button type="button" className="z-btn brand" onClick={onNew}><Plus />Nova consulta</button>
            </div>
          )}
        </section>
        <section className="z-card z-verse">
          <span className="z-badge brand sm"><BookOpen aria-hidden="true" />Palavra do dia</span>
          <h2 className="t-h1">{verse.reference}</h2>
          <p className="t-body-lg-strong">{verse.theme}</p>
          <p className="t-body-lg t-muted">{verse.reflection}</p>
          <button type="button" className="z-btn ghost sm" onClick={() => onNavigate('Todos os dias')}>Ler mensagem<ArrowRight /></button>
        </section>
      </div>
    </>
  );
}
