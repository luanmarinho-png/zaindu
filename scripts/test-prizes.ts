import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { getCatalog } from '../src/lib/prizes/catalog';
import { CAMPAIGN, claimPrize, expiration, hash, listPrizes, participant, readPrize, updatePrize } from '../src/lib/prizes/store';

// Use an isolated, disposable MongoDB only. No application env file is loaded here.
async function main() {
  const uri = process.env.PRIZE_TEST_MONGODB_URI;
  if (!uri || !/^mongodb:\/\/(127\.0\.0\.1|localhost):/.test(uri)) throw new Error('Use PRIZE_TEST_MONGODB_URI com MongoDB local descartável.');
  delete process.env.ZAINDU_PRIZE_CATALOG;
  assert.throws(getCatalog, /não configurada/);
  process.env.ZAINDU_PRIZE_CATALOG = '[]';
  assert.throws(getCatalog, /inválida/);
  const fixture = Array.from({ length: 18 }, (_, i) => ({ card: i + 1, tokenHash: hash(`test-only-${i}`), prize: i === 0 ? 'free' : 'discount' }));
  process.env.ZAINDU_PRIZE_CATALOG = JSON.stringify(fixture.map(item => ({ ...item, prize: 'free' })));
  assert.throws(getCatalog, /inválida/);
  process.env.ZAINDU_PRIZE_CATALOG = JSON.stringify(fixture);
  const catalog = getCatalog();
  const client = await new MongoClient(uri).connect();
  const db = client.db(`prize_test_${randomUUID().replaceAll('-', '')}`);
  const input = (n: number) => ({ name: `Participante Teste ${n}`, email: `teste${n}@example.com`, phone: `119${String(n).padStart(8, '0')}`, consent: true, website: '', receipt: randomUUID() });
  try {
    assert.equal(catalog.length, 18); assert.equal(new Set(catalog.map(c => c.tokenHash)).size, 18);
    assert.equal(catalog.filter(c => c.prize === 'free').length, 1);
    assert.equal(catalog.filter(c => c.prize === 'discount').length, 17);
    assert.deepEqual(await readPrize(db, catalog[0]), { state: 'available' });
    assert.equal(await db.collection('prize_campaigns').countDocuments(), 0, 'GET must never consume or initialize');
    const first = input(1);
    const duplicates = await Promise.all(Array.from({ length: 12 }, () => claimPrize(db, catalog[0], first)));
    assert(duplicates.every(result => result.state === 'claimed'));
    const stored = await db.collection('prize_campaigns').findOne({ _id: CAMPAIGN as never });
    assert.equal(stored?.claims.length, 1, 'idempotent retries cannot create more than one claim');
    assert.deepEqual(await readPrize(db, catalog[0]), { state: 'used' });
    const publicResult = await readPrize(db, catalog[0], first.receipt);
    assert.equal(publicResult.state, 'claimed'); assert(!JSON.stringify(publicResult).includes('@'));
    assert(!JSON.stringify(publicResult).includes('receiptHash'));
    const race = await Promise.allSettled([claimPrize(db, catalog[1], input(2)), claimPrize(db, catalog[1], input(3))]);
    assert.equal(race.filter(r => r.status === 'fulfilled').length, 1, 'one winner for competing claims');
    await assert.rejects(claimPrize(db, catalog[2], { ...input(4), email: first.email.toUpperCase() }), /outro cartão/);
    await assert.rejects(claimPrize(db, catalog[2], { ...input(4), phone: '+55 (11) 90000-0001' }), /outro cartão/);
    const shared = input(5);
    const sameContact = await Promise.allSettled([claimPrize(db, catalog[3], shared), claimPrize(db, catalog[4], { ...shared, receipt: randomUUID() })]);
    assert.equal(sameContact.filter(r => r.status === 'fulfilled').length, 1, 'contact uniqueness is atomic across QR codes');
    assert.throws(() => participant({ ...input(6), consent: false }));
    assert.throws(() => participant({ ...input(6), email: '<script>@x.com' }));
    assert.throws(() => participant({ ...input(6), phone: '123' }));
    assert.throws(() => participant({ ...input(6), website: 'bot.example' }));
    assert.throws(() => participant({ ...input(6), receipt: 'guess' }));
    await updatePrize(db, 1, 'contact', 'qa-admin@example.com');
    let row = (await listPrizes(db))[0];
    assert.equal(row.status, 'contacted'); assert.equal(row.activatedAt, null); assert.equal(row.expiresAt, null);
    await updatePrize(db, 1, 'activate', 'qa-admin@example.com');
    row = (await listPrizes(db))[0];
    assert.equal(row.status, 'activated'); assert(row.activatedAt && row.expiresAt);
    assert.equal(expiration(new Date(row.activatedAt!)).toISOString(), row.expiresAt);
    await assert.rejects(updatePrize(db, 1, 'activate', 'qa-admin@example.com'), /já foi atualizado/);
    await assert.rejects(updatePrize(db, 1, 'contact', 'qa-admin@example.com'), /já foi atualizado/);
    assert.equal((await listPrizes(db))[0].expiresAt, row.expiresAt, 'repeated activation cannot extend benefit');
    assert.equal(expiration(new Date('2028-02-29T12:30:00Z')).toISOString(), '2029-02-28T12:30:00.000Z');
    const finalDoc = await db.collection('prize_campaigns').findOne({ _id: CAMPAIGN as never });
    assert.equal(finalDoc?.claims[0].history.length, 2);
    assert.equal(finalDoc?.claims[0].consentVersion, 'prizes-contact-v1');
    console.log('PASS: inventory, GET purity, concurrency, retry, unique contacts, privacy, validation, activation, expiry and audit.');
  } finally { await db.dropDatabase(); await client.close(); }
}
void main();
