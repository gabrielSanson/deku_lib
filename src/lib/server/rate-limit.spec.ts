import { describe, expect, it, vi } from 'vitest';
import { clientKey, isPrivateAddress, rateLimit } from './rate-limit.ts';

describe('isPrivateAddress', () => {
	it('knows proxy and container addresses', () => {
		for (const a of [
			'10.0.0.5',
			'172.18.0.4',
			'192.168.1.9',
			'127.0.0.1',
			'::1',
			'::ffff:172.20.0.3',
			'fd00::1'
		])
			expect(isPrivateAddress(a), a).toBe(true);
	});
	it('treats customer addresses as public', () => {
		for (const a of ['187.10.2.3', '172.32.0.1', '2804:14c::1', '8.8.8.8'])
			expect(isPrivateAddress(a), a).toBe(false);
	});
});

describe('clientKey', () => {
	it('returns the address adapter-node resolved from the header', () => {
		expect(clientKey({ getClientAddress: () => '187.10.2.3' }, true)).toBe('187.10.2.3');
	});
	it('warns once in production when it only sees the proxy', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		clientKey({ getClientAddress: () => '172.18.0.4' }, true);
		clientKey({ getClientAddress: () => '172.18.0.4' }, true);
		expect(warn).toHaveBeenCalledTimes(1);
		warn.mockRestore();
	});
	it('limits two customers separately', () => {
		const a = clientKey({ getClientAddress: () => '187.10.2.3' }, false);
		const b = clientKey({ getClientAddress: () => '187.10.2.4' }, false);
		for (let i = 0; i < 10; i++) expect(rateLimit(`t:${a}`, 10, 60_000)).toBe(true);
		expect(rateLimit(`t:${a}`, 10, 60_000)).toBe(false);
		expect(rateLimit(`t:${b}`, 10, 60_000)).toBe(true);
	});
});
