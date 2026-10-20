import { randomBytes, randomInt, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';

// Run ONCE. Keep the private manifest and PDFs outside Git and public/.
const privatePath = process.argv[2];
if (!privatePath || !isAbsolute(privatePath)) throw new Error('Informe o caminho absoluto do manifesto privado, fora do repositório.');
const catalogPath = resolve(dirname(privatePath), 'catalogo-servidor.json');
if (existsSync(catalogPath) || existsSync(privatePath)) throw new Error('Campanha já existe. Não substitua códigos que podem ter sido impressos.');
const winner = randomInt(18);
const cards = Array.from({ length: 18 }, (_, index) => {
  const token = randomBytes(24).toString('base64url');
  return { card: index + 1, token, tokenHash: createHash('sha256').update(token).digest('hex'), prize: index === winner ? 'free' : 'discount', url: `https://lp.zaindu.app/presente/${token}` };
});
mkdirSync(dirname(catalogPath), { recursive: true });
mkdirSync(dirname(privatePath), { recursive: true, mode: 0o700 });
writeFileSync(privatePath, JSON.stringify({ campaign: 'ecobags-2026-10', cards }, null, 2), { flag: 'wx', mode: 0o600 });
writeFileSync(catalogPath, JSON.stringify(cards.map(({ card, tokenHash, prize }) => ({ card, tokenHash, prize }))) + '\n', { flag: 'wx', mode: 0o600 });
console.log('18 códigos criados: 17 descontos + 1 gratuidade. Tokens salvos somente no manifesto privado.');
