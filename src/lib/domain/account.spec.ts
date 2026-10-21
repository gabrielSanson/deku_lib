import { describe, expect, it } from 'vitest';
import { loginInput, phoneFromInput, profileInput, safeAccountNext, signupInput } from './account';

describe('customer account rules', () => {
	it('requires a password of 8 to 72 characters at sign-up only', () => {
		const base = { name: 'Ana Lima', phone: '', email: 'ana@example.com' };
		expect(signupInput.safeParse({ ...base, password: '1234567' }).success).toBe(false);
		expect(signupInput.safeParse({ ...base, password: '12345678' }).success).toBe(true);
		expect(signupInput.safeParse({ ...base, password: 'x'.repeat(73) }).success).toBe(false);
		// Sign-in accepts any length so older or shorter passwords still work.
		expect(loginInput.safeParse({ email: 'ana@example.com', password: 'abc' }).success).toBe(true);
	});

	it('lower-cases and trims the e-mail', () => {
		const r = loginInput.parse({ email: '  Ana@Example.COM ', password: 'x' });
		expect(r.email).toBe('ana@example.com');
	});

	it('treats an empty phone as no phone and normalizes a real one', () => {
		expect(phoneFromInput('')).toEqual({ ok: true, phoneE164: null });
		expect(phoneFromInput('(11) 91234-5678')).toEqual({ ok: true, phoneE164: '+5511912345678' });
		expect(phoneFromInput('123')).toEqual({ ok: false });
	});

	it('needs a name of at least two letters on the profile', () => {
		expect(profileInput.safeParse({ name: 'A', phone: '' }).success).toBe(false);
		expect(profileInput.safeParse({ name: 'Ana', phone: '' }).success).toBe(true);
	});
});

describe('safe redirect after sign-in', () => {
	it('keeps same-site paths and falls back to the account page', () => {
		expect(safeAccountNext('/checkout')).toBe('/checkout');
		expect(safeAccountNext('//evil.example')).toBe('/conta');
		expect(safeAccountNext('/\\evil.example')).toBe('/conta');
		expect(safeAccountNext('https://evil.example')).toBe('/conta');
		expect(safeAccountNext(null)).toBe('/conta');
	});
});
