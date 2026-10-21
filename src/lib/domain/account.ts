// Customer account rules shared by the sign-up, sign-in and account pages.
import { z } from 'zod';
import { normalizeBrPhone } from '#lib/domain/phone.ts';

/** Passwords are at least 8 characters; the auth service caps them at 72 bytes. */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

const email = z.string().trim().toLowerCase().email().max(120);
const password = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

export const loginInput = z.object({
	email,
	password: z.string().min(1).max(PASSWORD_MAX)
});

export const signupInput = z.object({
	name: z.string().trim().min(2).max(60),
	phone: z.string().trim().max(25),
	email,
	password
});

export const profileInput = z.object({
	name: z.string().trim().min(2).max(60),
	phone: z.string().trim().max(25)
});

/** An empty phone is allowed; a filled one must be a Brazilian mobile or landline. */
export function phoneFromInput(
	raw: string
): { ok: true; phoneE164: string | null } | { ok: false } {
	if (!raw.trim()) return { ok: true, phoneE164: null };
	const phone = normalizeBrPhone(raw);
	return phone ? { ok: true, phoneE164: phone } : { ok: false };
}

/** Where to go after signing in: only same-site paths, never an external URL. */
export function safeAccountNext(next: string | null | undefined): string {
	return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
		? next
		: '/conta';
}
