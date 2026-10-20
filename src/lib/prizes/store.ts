import { createHash, timingSafeEqual } from 'node:crypto';
import type { Db } from 'mongodb';
import { getCatalog, type PrizeCard } from './catalog';
import type { Prize, PrizeResult, PrizeRow, PrizeStatus } from './types';

export const CAMPAIGN = 'ecobags-2026-10';
export const CONSENT_VERSION = 'prizes-contact-v1';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const cardForToken = (token: string) => /^[A-Za-z0-9_-]{32}$/.test(token) ? getCatalog().find(card => card.tokenHash === hash(token)) : undefined;
export const validReceipt = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
type Card = PrizeCard;
type Claim = {
  card: number; tokenHash: string; prize: Prize; name: string; email: string; phone: string;
  receiptHash: string; consentVersion: string; claimedAt: Date; status: PrizeStatus;
  contactedAt: Date | null; activatedAt: Date | null; expiresAt: Date | null;
  history: { action: string; at: Date; actor: string }[];
};
type CampaignDoc = { _id: string; claims: Claim[]; createdAt: Date };
const campaigns = (db: Db) => db.collection<CampaignDoc>('prize_campaigns');
export class PrizeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export function participant(body: Record<string, unknown>) {
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  let phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  if (name.length < 3 || name.length > 100 || /[\x00-\x1f<>]/.test(name)) throw new PrizeError('Informe seu nome completo.');
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new PrizeError('Informe um e-mail válido.');
  if (!/^55[1-9]{2}(?:[2-8]\d{7}|9\d{8})$/.test(phone)) throw new PrizeError('Informe um telefone brasileiro com DDD.');
  if (body.consent !== true) throw new PrizeError('Confirme o uso dos dados para resgate e contato.');
  if (body.website) throw new PrizeError('Não foi possível concluir o cadastro.');
  if (!validReceipt(body.receipt)) throw new PrizeError('Reabra a página para continuar.');
  return { name, email, phone, receiptHash: hash(body.receipt), consentVersion: CONSENT_VERSION };
}

const owns = (claim: Claim, receipt: string | undefined) => validReceipt(receipt) && timingSafeEqual(Buffer.from(claim.receiptHash, 'hex'), Buffer.from(hash(receipt), 'hex'));
const resultOf = (claim: Claim): PrizeResult => ({
  state: 'claimed', card: claim.card, prize: claim.prize, status: claim.status,
  claimedAt: claim.claimedAt.toISOString(), activatedAt: claim.activatedAt?.toISOString() || null, expiresAt: claim.expiresAt?.toISOString() || null,
});

export async function readPrize(db: Db, card: Card, receipt?: string): Promise<PrizeResult> {
  const campaign = await campaigns(db).findOne({ _id: CAMPAIGN });
  const claim = campaign?.claims.find(item => item.tokenHash === card.tokenHash);
  return !claim ? { state: 'available' } : owns(claim, receipt) ? resultOf(claim) : { state: 'used' };
}

export async function claimPrize(db: Db, card: Card, body: Record<string, unknown>): Promise<PrizeResult> {
  const input = participant(body);
  const now = new Date();
  // Only a valid POST initializes the campaign. No writes on QR previews/GET.
  await campaigns(db).updateOne({ _id: CAMPAIGN }, { $setOnInsert: { claims: [], createdAt: now } }, { upsert: true }).catch(error => {
    // Concurrent first claims can race on the unique _id upsert; the document now exists.
    if (error?.code !== 11000) throw error;
  });
  const claim: Claim = { ...input, card: card.card, tokenHash: card.tokenHash, prize: card.prize as Prize,
    claimedAt: now, status: 'claimed', contactedAt: null, activatedAt: null, expiresAt: null, history: [] };
  // Single-document atomic write: both the QR and contact uniqueness are checked together.
  const updated = await campaigns(db).updateOne({
    _id: CAMPAIGN,
    claims: { $not: { $elemMatch: { $or: [{ tokenHash: card.tokenHash }, { email: input.email }, { phone: input.phone }] } } },
  }, { $push: { claims: claim } });
  if (updated.modifiedCount === 1) return resultOf(claim);
  const existing = await readPrize(db, card, body.receipt as string);
  if (existing.state === 'claimed') return existing; // Safe retry after a lost response.
  if (existing.state === 'used') throw new PrizeError('Este cartão já foi resgatado. Fale com a equipe ZAINDU.', 409);
  throw new PrizeError('Não foi possível resgatar outro cartão com estes dados. Fale com a equipe ZAINDU.', 409);
}

// Calendar months, clamping leap-day activations to the last day of February.
export function expiration(activation: Date): Date {
  const end = new Date(activation);
  const month = end.getUTCMonth();
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  if (end.getUTCMonth() !== month) end.setUTCDate(0);
  return end;
}

export async function listPrizes(db: Db): Promise<PrizeRow[]> {
  const campaign = await campaigns(db).findOne({ _id: CAMPAIGN });
  return getCatalog().map(card => {
    const claim = campaign?.claims.find(item => item.card === card.card);
    return { card: card.card, prize: claim?.prize || null, status: claim?.status || 'available', name: claim?.name || '',
      email: claim?.email || '', phone: claim?.phone || '', claimedAt: claim?.claimedAt.toISOString() || null,
      contactedAt: claim?.contactedAt?.toISOString() || null, activatedAt: claim?.activatedAt?.toISOString() || null, expiresAt: claim?.expiresAt?.toISOString() || null };
  });
}

export async function updatePrize(db: Db, card: number, action: string, actor: string) {
  if (!Number.isInteger(card) || card < 1 || card > 18 || !['contact', 'activate'].includes(action)) throw new PrizeError('Ação inválida.');
  const now = new Date();
  const filter = action === 'contact' ? { card, status: 'claimed' } : { card, status: { $in: ['claimed', 'contacted'] }, activatedAt: null };
  const changes = action === 'contact'
    ? { 'claims.$.status': 'contacted', 'claims.$.contactedAt': now }
    : { 'claims.$.status': 'activated', 'claims.$.activatedAt': now, 'claims.$.expiresAt': expiration(now) };
  const updated = await campaigns(db).updateOne({ _id: CAMPAIGN, claims: { $elemMatch: filter } }, {
    $set: changes,
    $push: { 'claims.$.history': { action, at: now, actor } },
  });
  if (!updated.modifiedCount) throw new PrizeError('O cartão não pode receber esta ação ou já foi atualizado. Atualize a lista.', 409);
}
