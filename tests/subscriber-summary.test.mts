import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
const start = '2026-10-14T04:00:00.000Z', end = '2026-10-15T04:00:00.000Z';
const request = (a = start, b = end) => new Request(`https://example.test/api/admin/subscriber-summary?${new URLSearchParams({ start: a, end: b })}`);
const created = ['2026-10-14T03:59:59.999Z', start, '2026-10-15T03:59:59.999Z', end];
let calls = 0, failed = false;
const count = async (q?: { where?: { createdAt?: { gte: Date; lt: Date } } }) => {
  calls++; if (failed) throw new Error('private database detail');
  const r = q?.where?.createdAt;
  return r ? created.filter(d => +new Date(d) >= +r.gte && +new Date(d) < +r.lt).length : created.length;
};
const db = { user: { count }, business: { count }, organization: { count }, $transaction: async (f: (tx: unknown) => unknown) => f(db) };

let role: string | null = null;
mock.module('@/lib/db', { namedExports: { prisma: { ...db, authSession: { findUnique: async () => role ? ({ expiresAt: new Date(Date.now() + 60000), user: { role } }) : null } } } });
mock.module('next/headers', { namedExports: { cookies: async () => ({ get: () => ({ value: 'synthetic-session' }) }) } });
const { GET } = await import('../src/app/api/admin/subscriber-summary/route.ts');
test('real session/admin guard rejects anonymous and member before aggregation', async () => {
 for (role of [null, 'USER']) { const res = await GET(request()); assert.equal(res.status, 403); }
 assert.equal(calls, 0);
});
test('admin receives only aggregate counts with inclusive/exclusive boundaries', async () => {
 role = 'ADMIN'; const res = await GET(request()); const value = await res.json();
 assert.equal(res.status, 200); assert.match(res.headers.get('cache-control')!, /no-store/);
 assert.deepEqual(value.registeredAccounts, { unit:'account', total:4, new:2, status:'measured' });
 assert.equal(value.paidSubscribers.active, null); assert.equal(value.usage.totalMinutes, null);
 assert.equal(JSON.stringify(value).includes('synthetic-session'), false);
});
test('invalid or absent timezone and failed source cannot yield zero', async () => {
 const before = calls;
 for (const [a,b] of [['2026-02-30T00:00:00Z',end], ['2026-10-14T04:00:00',end], [end,start], ['2026-01-01T00:00:00Z',end]]) assert.equal((await GET(request(a,b))).status, 400);
 assert.equal(calls,before); failed=true; const res=await GET(request()); assert.equal(res.status,503); assert.deepEqual(await res.json(),{error:'REPORT_SOURCE_UNAVAILABLE'});
});
