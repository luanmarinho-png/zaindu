export type Prize = 'free' | 'discount';
export type PrizeStatus = 'claimed' | 'contacted' | 'activated';
export type PrizeResult = { state: 'available' | 'used' | 'invalid' } | {
  state: 'claimed'; card: number; prize: Prize; status: PrizeStatus;
  claimedAt: string; activatedAt: string | null; expiresAt: string | null;
};
export type PrizeRow = {
  card: number; prize: Prize | null; status: PrizeStatus | 'available'; name: string; email: string; phone: string;
  claimedAt: string | null; contactedAt: string | null; activatedAt: string | null; expiresAt: string | null;
};
export const prizeLabel = (prize: Prize) => prize === 'free' ? '1 ano de acesso integral grátis' : '20% de desconto por 1 ano';
