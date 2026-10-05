import type { Metadata } from 'next';
import './design-system.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZAINDU | Gestão clínica',
  description: 'Plataforma de gestão clínica personalizável para profissionais da saúde.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
