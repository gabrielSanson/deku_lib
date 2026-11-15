// The idempotency key sent with an order. It stays the same while the request stays the same,
// so a double tap or a retry after a timeout cannot create two orders. Any change to the cart,
// fulfillment, address or customer details gets a fresh key, so the server never mistakes a
// changed order for the one before it (it refuses a reused key with a different request).

export class OrderKey {
	private fingerprint: string | null = null;
	private key: string;

	constructor(private readonly make: () => string = () => crypto.randomUUID()) {
		this.key = make();
	}

	/** The key for this request body (everything sent except the key itself). */
	for(request: string): string {
		if (this.fingerprint !== null && this.fingerprint !== request) this.key = this.make();
		this.fingerprint = request;
		return this.key;
	}

	/** Start over, e.g. after an order went through or the cart was emptied. */
	reset(): void {
		this.fingerprint = null;
		this.key = this.make();
	}
}
