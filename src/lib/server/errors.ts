/** An expected business-rule failure whose message is safe to show staff/customers. */
export class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string = 'invalid',
		public readonly status = 400
	) {
		super(message);
	}
}
