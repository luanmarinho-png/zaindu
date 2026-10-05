import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
import './design-system.css';
import './globals.css';

const display = Newsreader({ subsets: ['latin'], style: ['normal', 'italic'], weight: ['400'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'ZAINDU | Gestão clínica',
  description: 'Plataforma de gestão clínica personalizável para profissionais da saúde.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={display.variable}><body>{children}</body></html>;
}
