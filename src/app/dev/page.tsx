import { notFound } from 'next/navigation';
import { DevPreview } from './DevPreview';

// Só existe fora de produção: pré-visualização do painel com dados fictícios.
export default async function DevPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') notFound();
  const params = await searchParams;
  return <DevPreview papel={params.papel} modelo={params.modelo} />;
}
