// Two-step sign-in for the people who manage the shop (S5.9). Pure rules, so the hook stays thin.
import type { Permission } from './permissions';

/** Payment, fiscal, team and price screens: a second step is asked here when the person has one. */
const SENSITIVE = [
	/^\/staff\/settings\/(payments|fiscal|staff|permissoes)(\/|$)/,
	/^\/staff\/menu\/(edit|products|groups)(\/|$)/
];
/** Always reachable: where the second step is set up or typed, and signing out. */
const EXEMPT = /^\/staff\/(seguranca|logout|login|lojas)(\/|$)/;

export const isSensitivePath = (path: string) => SENSITIVE.some((r) => r.test(path));

/** Only people who can change settings or the team are asked for a second step. */
export const mfaApplies = (permissions: readonly Permission[]) =>
	permissions.includes('settings.edit') || permissions.includes('staff.manage');

export type MfaGate = 'ok' | 'verify' | 'enrol';

export function mfaGate(i: {
	path: string;
	permissions: readonly Permission[];
	/** The session's assurance level from the verified JWT ("aal1" or "aal2"). */
	aal: string | null;
	hasFactor: boolean;
	/** The shop requires a second step for administrators. */
	required: boolean;
}): MfaGate {
	if (EXEMPT.test(i.path) || !mfaApplies(i.permissions)) return 'ok';
	if (!i.hasFactor) return i.required ? 'enrol' : 'ok';
	if (i.aal !== 'aal2' && isSensitivePath(i.path)) return 'verify';
	return 'ok';
}

/** Where to go after the second step: only back into the staff area. */
export function safeNext(next: string | null): string {
	return next && /^\/staff(\/|$|\?)/.test(next) && !next.startsWith('//') ? next : '/staff';
}
