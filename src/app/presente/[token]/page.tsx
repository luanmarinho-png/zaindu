import type { Metadata } from 'next';
import { Tenor_Sans, Nunito_Sans } from 'next/font/google';
import { PrizeExperience } from '@/components/prizes/PrizeExperience';

const titleFont = Tenor_Sans({ weight: '400', subsets: ['latin'], variable: '--prize-title', display: 'swap' });
const bodyFont = Nunito_Sans({ subsets: ['latin'], variable: '--prize-body', display: 'swap' });
export const metadata: Metadata = {
  title: 'Seu presente | ZAINDU', description: 'Um presente para o próximo capítulo do seu consultório.',
  robots: { index: false, follow: false }, referrer: 'no-referrer',
};
export default async function PrizePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <div className={`${titleFont.variable} ${bodyFont.variable}`}><PrizeExperience token={token} /></div>;
}
