import { ChevronLeft, ChevronRight } from 'lucide-react';
import { capitalize } from '@/lib/clinic/format';
import { monthKey, monthName } from '@/lib/clinic/store';

export function MonthNav({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const shift = (delta: number) => {
    const date = new Date(`${month}-01T12:00:00`);
    date.setMonth(date.getMonth() + delta);
    onChange(monthKey(date));
  };
  const current = monthKey(new Date());
  return (
    <div className="z-monthnav">
      <button type="button" className="z-close" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft /></button>
      <span className="z-monthnav-label">{capitalize(monthName(month))}</span>
      <button type="button" className="z-close" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight /></button>
      {month !== current && <button type="button" className="z-btn secondary sm" onClick={() => onChange(current)}>Hoje</button>}
    </div>
  );
}
