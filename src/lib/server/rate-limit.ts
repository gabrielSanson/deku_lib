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
