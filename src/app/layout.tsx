import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './design-system.css';
import './clinic.css';
import './clinic-mobile.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'ZAINDU | Gestão clínica',
  description: 'Plataforma de gestão clínica personalizável para profissionais da saúde.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        {/* Switzer (títulos do DS SC) vem da Fontshare, que não está no Google Fonts. */}
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
