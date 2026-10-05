import type { Metadata } from 'next';
import './design-system.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Raiz Viva | Gestão da clínica',
  description: 'Organização mensal de pacientes, consultas e financeiro da clínica.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
