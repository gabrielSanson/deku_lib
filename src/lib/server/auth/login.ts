// One login for the whole team: the account decides where it lands.
import type { StaffRole } from '#lib/domain/order-status.ts';

/** Kitchen accounts only use the kitchen screen; everyone else starts at the dashboard. */
export function landingFor(role: StaffRole): string {
	return role === 'kitchen' ? '/kitchen' : '/staff';
}

/**
 * Supabase answers a wrong email or password with 400 (or 401). Anything else,
 * including a network failure (status 0 or none), means login is unavailable.
 */
export function isBadCredentials(error: { status?: number }): boolean {
	return error.status === 400 || error.status === 401;
}
