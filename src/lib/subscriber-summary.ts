export function reportPeriod(start: unknown, end: unknown) {
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
  if (typeof start !== 'string' || typeof end !== 'string' || !iso.test(start) || !iso.test(end)) throw new Error('INVALID_REPORT_PERIOD');
  for (const value of [start, end]) {
    const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10));
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error('INVALID_REPORT_PERIOD');
  }
  const a = new Date(start), b = new Date(end);
  if (!Number.isFinite(+a) || !Number.isFinite(+b) || +a >= +b || +b - +a > 31 * 86400000) throw new Error('INVALID_REPORT_PERIOD');
  return { start: a.toISOString(), end: b.toISOString(), timezone: 'Europe/Istanbul', bounds: '[start,end)' };
}
export function accountSummary(appId: string, period: ReturnType<typeof reportPeriod>, total: number | null, fresh: number | null) {
  for (const value of [total, fresh]) if (value !== null && (!Number.isSafeInteger(value) || value < 0)) throw new Error('INVALID_REPORT_COUNT');
  if (total !== null && fresh !== null && fresh > total) throw new Error('INVALID_REPORT_COUNT');
  return { schemaVersion: 1, kind: 'subscriber-summary', appId, period,
    registeredAccounts: { unit: 'account', total, new: fresh, status: total === null ? 'unavailable' : 'measured' },
    paidSubscribers: { unit: 'subscription', total: null, active: null, new: null, status: 'unavailable', reason: 'Plan, active/trialing durumu veya tarihsel ödeme tek başına ücretli abonelik kanıtı değildir.' },
    usage: { status: 'unavailable', authenticatedAccounts: null, anonymousVisitors: null, sessions: null, totalMinutes: null, averageMinutes: null, reason: 'Yetkili oturum olay kaynağı bu endpoint kapsamına bağlı değil.' } };
}
