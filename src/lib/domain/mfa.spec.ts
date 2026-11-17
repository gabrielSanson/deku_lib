import { describe, expect, it } from 'vitest';
import { defaultPermissions } from './permissions';
import { mfaGate, safeNext } from './mfa';

const admin = defaultPermissions('admin');
const clerk = defaultPermissions('attendant');
const base = { permissions: admin, aal: 'aal1', hasFactor: true, required: false };

describe('mfaGate', () => {
	it('asks admins with a factor for the second step on sensitive screens only', () => {
		expect(mfaGate({ ...base, path: '/staff/settings/payments' })).toBe('verify');
		expect(mfaGate({ ...base, path: '/staff/menu/products/X-1' })).toBe('verify');
		expect(mfaGate({ ...base, path: '/staff/orders' })).toBe('ok');
		expect(mfaGate({ ...base, path: '/staff/settings/payments', aal: 'aal2' })).toBe('ok');
	});

	it('leaves people without a factor alone unless the shop requires it', () => {
		const none = { ...base, hasFactor: false };
		expect(mfaGate({ ...none, path: '/staff/settings/fiscal' })).toBe('ok');
		expect(mfaGate({ ...none, path: '/staff', required: true })).toBe('enrol');
		expect(mfaGate({ ...none, path: '/staff/seguranca', required: true })).toBe('ok');
	});

	it('never asks attendants', () => {
		expect(
			mfaGate({ ...base, permissions: clerk, required: true, hasFactor: false, path: '/staff' })
		).toBe('ok');
	});
});

describe('safeNext', () => {
	it('only returns into the staff area', () => {
		expect(safeNext('/staff/settings/payments')).toBe('/staff/settings/payments');
		expect(safeNext('https://evil.example')).toBe('/staff');
		expect(safeNext('//evil.example/staff')).toBe('/staff');
		expect(safeNext(null)).toBe('/staff');
	});
});
