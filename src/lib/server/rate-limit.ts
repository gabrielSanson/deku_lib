// Small in-memory limiter for public endpoints (checkout, login, webhooks).
// Per process; good enough for one web instance. Put a shared limiter (or the
// host's WAF) in front if the app is ever scaled out.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now();
	const b = buckets.get(key);
	if (!b || b.resetAt < now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		if (buckets.size > 10_000) {
			for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
		}
		return true;
	}
	b.count += 1;
	return b.count <= limit;
}

/** Loopback, private (RFC 1918), CGNAT, link-local and unique-local addresses. */
export function isPrivateAddress(address: string): boolean {
	const a = address
		.trim()
		.toLowerCase()
		.replace(/^::ffff:/, '');
	if (a === '::1' || a === 'localhost' || a === '') return true;
	const v4 = a.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
	if (v4) {
		const [x, y] = [Number(v4[1]), Number(v4[2])];
		return (
			x === 10 ||
			x === 127 ||
			(x === 172 && y >= 16 && y <= 31) ||
			(x === 192 && y === 168) ||
			(x === 169 && y === 254) ||
			(x === 100 && y >= 64 && y <= 127)
		);
	}
	return /^f[cd]/.test(a) || /^fe[89ab]/.test(a);
}

let warnedPrivate = false;

/**
 * The address to rate-limit by. Behind Caddy or a tunnel the socket address is the proxy's, so
 * adapter-node must be told which header carries the customer's address (ADDRESS_HEADER,
 * XFF_DEPTH). In production a private address here means that setting is missing: every
 * customer would share one bucket, so say so once in the log.
 */
export function clientKey(
	event: { getClientAddress(): string },
	production = process.env.NODE_ENV === 'production'
): string {
	let address: string;
	try {
		address = event.getClientAddress();
	} catch {
		address = 'unknown';
	}
	if (production && !warnedPrivate && isPrivateAddress(address)) {
		warnedPrivate = true;
		console.warn('rate limit sees a private address; set ADDRESS_HEADER');
	}
	return address;
}
