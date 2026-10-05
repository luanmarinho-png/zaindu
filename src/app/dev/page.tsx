import { notFound } from 'next/navigation';
import { DevPreview } from './DevPreview';

// Só existe fora de produção: pré-visualização do painel com dados fictícios.
export default function DevPage() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') notFound();
  return <DevPreview />;
}
