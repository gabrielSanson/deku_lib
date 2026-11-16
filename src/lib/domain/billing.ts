// The platform's monthly fee: periods, due dates and when a late shop is warned or suspended.
// Dates are São Paulo calendar days (YYYY-MM-DD).

export const DUE_DAY = 10;
/** Days after the grace period before a late shop is suspended. */
export const SUSPEND_AFTER_DAYS = 14;

export type ShopBillingStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'closed';

/** The month a run on `day` bills: from the 1st of that month to the 1st of the next. */
export function billingPeriod(day: string): { start: string; end: string } {
	const [y, m] = day.split('-').map(Number);
	const start = `${y}-${String(m).padStart(2, '0')}-01`;
	const ny = m === 12 ? y + 1 : y;
	const nm = m === 12 ? 1 : m + 1;
	return { start, end: `${ny}-${String(nm).padStart(2, '0')}-01` };
}

/** Due on the 10th of the period's month, end of day in São Paulo (UTC−3). */
export function dueAt(periodStart: string): Date {
	return new Date(`${periodStart.slice(0, 8)}${String(DUE_DAY).padStart(2, '0')}T23:59:59-03:00`);
}

const DAY_MS = 86_400_000;

/**
 * What a shop's status should be, given its oldest unpaid invoice. Shops that pay go back to
 * active; trial and closed shops are left alone.
 */
export function statusForUnpaid(
	current: ShopBillingStatus,
	oldestUnpaidDue: Date | null,
	graceDays: number,
	now: Date
): ShopBillingStatus {
	if (current === 'closed' || current === 'trial') return current;
	if (!oldestUnpaidDue) return 'active';
	const late = now.getTime() - oldestUnpaidDue.getTime();
	if (late > (graceDays + SUSPEND_AFTER_DAYS) * DAY_MS) return 'suspended';
	if (late > graceDays * DAY_MS) return 'past_due';
	return 'active';
}

/** Pix reference (txid) for an invoice: its id without hyphens, 25 characters. */
export function invoiceReference(invoiceId: string): string {
	return invoiceId.replace(/-/g, '').slice(0, 25);
}
