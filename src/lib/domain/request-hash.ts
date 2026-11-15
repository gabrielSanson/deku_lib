// A fingerprint of what an order request asked for. Used with the idempotency key: the same key
// with the same request returns the earlier order; the same key with a different request is refused.
// Server only (uses node:crypto).
import { createHash } from 'node:crypto';

export interface OrderRequestShape {
	channel: string;
	sourceMode: string;
	lines: unknown[];
	fulfillmentType: string;
	address?: unknown;
	couponCode?: string | null;
	customer?: { phoneE164?: string | null; email?: string | null } | null;
}

/** JSON with object keys sorted, so the same request always gives the same text. */
export function stableJson(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
	if (Array.isArray(value))
		return `[${value.map((v) => stableJson(v === undefined ? null : v)).join(',')}]`;
	const entries = Object.keys(value as Record<string, unknown>)
		.filter((k) => (value as Record<string, unknown>)[k] !== undefined)
		.sort()
		.map((k) => `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`);
	return `{${entries.join(',')}}`;
}

export function orderRequestHash(req: OrderRequestShape): string {
	const shape = {
		channel: req.channel,
		sourceMode: req.sourceMode,
		lines: req.lines,
		fulfillmentType: req.fulfillmentType,
		address: req.address ?? null,
		couponCode: req.couponCode?.trim().toUpperCase() || null,
		phone: req.customer?.phoneE164 || null,
		email: req.customer?.email?.trim().toLowerCase() || null
	};
	return createHash('sha256').update(stableJson(shape)).digest('hex');
}
