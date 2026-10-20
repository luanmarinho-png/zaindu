import type { Prize } from './types';

export type PrizeCard = { card: number; tokenHash: string; prize: Prize };

// Server-only configuration: never expose the winning card in the public Git repository.
// Read lazily so builds do not require production secrets.
export function getCatalog(): PrizeCard[] {
  const raw = process.env.ZAINDU_PRIZE_CATALOG;
  if (!raw) throw new Error('Campanha não configurada.');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('Configuração de campanha inválida.'); }
  if (!Array.isArray(value) || value.length !== 18 || value.some(item => !item ||
    !Number.isInteger(item.card) || item.card < 1 || item.card > 18 ||
    typeof item.tokenHash !== 'string' || !/^[0-9a-f]{64}$/.test(item.tokenHash) ||
    !['free', 'discount'].includes(item.prize)) ||
    new Set(value.map(item => item.card)).size !== 18 ||
    new Set(value.map(item => item.tokenHash)).size !== 18 ||
    value.filter(item => item.prize === 'free').length !== 1) throw new Error('Configuração de campanha inválida.');
  return value.map(({ card, tokenHash, prize }) => ({ card, tokenHash, prize })).sort((a, b) => a.card - b.card);
}
