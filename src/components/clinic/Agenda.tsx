'use client';

import { useMemo } from 'react';
import { CalendarPlus, Clock, Plus } from 'lucide-react';
import { brl, capitalize, formatDate } from '@/lib/clinic/format';
import { dayKey, monthKey, type Appointment, type Store } from '@/lib/clinic/store';
import { StatusBadge } from './common';
import { MonthNav } from './MonthNav';
import { PageHeader } from './Shell';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

type Props = {
  data: Store;
  month: string;
  onMonthChange: (month: string) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNew: (date: string) => void;
  onOpen: (appointment: Appointment) => void;
};

export function Agenda({ data, month, onMonthChange, selectedDate, onSelectDate, onNew, onOpen }: Props) {
  const today = dayKey(new Date());
  const cells = useMemo(() => {
    const [year, monthIndex] = month.split('-').map(Number);
    const first = new Date(year, monthIndex - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(year, monthIndex, 0).getDate();
    const total = Math.ceil((offset + count) / 7) * 7;
    return Array.from({ length: total }, (_, index) => new Date(year, monthIndex - 1, index - offset + 1));
  }, [month]);
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const item of data.appointments) map.set(item.date, [...(map.get(item.date) || []), item]);
    for (const list of map.values()) list.sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [data.appointments]);
  const patientName = (id: string) => data.patients.find(patient => patient.id === id)?.name || 'Paciente removido';
  const dayList = byDay.get(selectedDate) || [];
  const dayRevenue = dayList.filter(item => item.status !== 'Cancelada').reduce((sum, item) => sum + item.price, 0);

  const changeMonth = (next: string) => {
    onMonthChange(next);
    onSelectDate(next === monthKey(new Date()) ? today : `${next}-01`);
  };

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Toque num dia para ver os horários. Use + para agendar."
        actions={<>
          <MonthNav month={month} onChange={changeMonth} />
          <button type="button" className="z-btn brand" onClick={() => onNew(selectedDate)}><Plus />Nova consulta</button>
        </>}
      />
      <div className="z-agenda">
        <section className="z-card z-calendar" aria-label="Calendário do mês">
          <div className="z-cal-weekdays" aria-hidden="true">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
          <div className="z-cal-grid" role="grid">
            {cells.map(day => {
              const key = dayKey(day);
              const entries = byDay.get(key) || [];
              const active = entries.filter(item => item.status !== 'Cancelada');
              const outside = monthKey(day) !== month;
              return (
                <div
                  key={key}
                  role="gridcell"
                  tabIndex={0}
                  aria-selected={key === selectedDate}
                  aria-label={`${formatDate(key, { day: 'numeric', month: 'long' })}, ${active.length} consulta(s)`}
                  className={`z-cal-day ${outside ? 'outside' : ''} ${key === today ? 'today' : ''}`}
                  onClick={() => onSelectDate(key)}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectDate(key); } }}
                >
                  <div className="z-cal-dayhead">
                    <span className="z-cal-num num">{day.getDate()}</span>
                    <button type="button" className="z-cal-add" onClick={event => { event.stopPropagation(); onNew(key); }} aria-label={`Agendar em ${formatDate(key)}`}><Plus /></button>
                  </div>
                  <div className="z-cal-events">
                    {entries.slice(0, 3).map(item => (
                      <button key={item.id} type="button" className={`z-cal-event status-${item.status.toLowerCase()}`} onClick={event => { event.stopPropagation(); onOpen(item); }} title={`${item.time} · ${patientName(item.patientId)} · ${item.type}`}>
                        <b className="num">{item.time}</b> {patientName(item.patientId).split(' ')[0]}
                      </button>
                    ))}
                    {entries.length > 3 && <span className="z-cal-more">+{entries.length - 3}</span>}
                  </div>
                  {active.length > 0 && <span className="z-cal-dots" aria-hidden="true">{active.slice(0, 4).map(item => <i key={item.id} className={`status-${item.status.toLowerCase()}`} />)}</span>}
                </div>
              );
            })}
          </div>
          <div className="z-cal-legend">
            <StatusBadge status="Agendada" small /><StatusBadge status="Realizada" small /><StatusBadge status="Cancelada" small />
          </div>
        </section>

        <aside className="z-card z-dayview" aria-live="polite">
          <header className="z-dayview-head">
            <div>
              <h2 className="t-h1">{capitalize(formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
              <p className="t-body t-muted">{dayList.length ? `${dayList.length} consulta(s) · ${brl(dayRevenue)} previstos` : 'Nenhuma consulta neste dia'}</p>
            </div>
          </header>
          {dayList.length ? (
            <ul className="z-daylist">
              {dayList.map(item => (
                <li key={item.id}>
                  <button type="button" className="z-dayitem" onClick={() => onOpen(item)}>
                    <span className="z-dayitem-time num"><Clock aria-hidden="true" />{item.time}<small>{item.duration || 30} min</small></span>
                    <span className="z-dayitem-main"><strong>{patientName(item.patientId)}</strong><small>{item.type}{item.price ? ` · ${brl(item.price)}` : ''}</small></span>
                    <StatusBadge status={item.status} small iconOnly />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="z-empty"><CalendarPlus aria-hidden="true" /><span>Dia livre.</span></div>
          )}
          <button type="button" className="z-btn secondary block" onClick={() => onNew(selectedDate)}><Plus />Agendar neste dia</button>
        </aside>
      </div>
    </>
  );
}
