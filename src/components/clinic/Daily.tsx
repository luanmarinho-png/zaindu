import { BookOpen } from 'lucide-react';
import { verseForToday } from '@/lib/clinic/store';
import { PageHeader } from './Shell';

export function Daily() {
  const verse = verseForToday();
  const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return (
    <>
      <PageHeader title="Todos os dias" subtitle={`Uma palavra para hoje, ${date}.`} />
      <section className="z-card z-daily">
        <span className="z-badge brand sm"><BookOpen aria-hidden="true" />{verse.theme}</span>
        <h2 className="t-display">{verse.reference}</h2>
        <p className="t-body-xl">{verse.reflection}</p>
        <p className="t-body t-muted">Amanhã, uma nova leitura estará esperando por você.</p>
      </section>
    </>
  );
}
