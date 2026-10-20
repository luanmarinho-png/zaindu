import { NextResponse } from 'next/server';
import { PrizeError } from './store';

export const prizeHeaders = { 'Cache-Control': 'no-store, private', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
export const prizeJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: prizeHeaders });
export const prizeFailure = (error: unknown) => error instanceof PrizeError
  ? prizeJson({ error: error.message }, error.status)
  : prizeJson({ error: 'Não foi possível conectar agora. Seus dados não foram perdidos se o resgate já foi confirmado. Tente novamente.' }, 503);
export async function prizeBody(request: Request): Promise<Record<string, unknown>> {
  // Validate Origin for browser writes and reject oversized bodies before JSON parsing.
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new PrizeError('Origem não autorizada.', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PrizeError('Formato inválido.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new PrizeError('Informe os dados do cadastro.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw new PrizeError('Cadastro muito grande.', 413); }
    chunks.push(value);
  }
  let body: unknown;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new PrizeError('Dados inválidos.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PrizeError('Dados inválidos.');
  return body as Record<string, unknown>;
}
