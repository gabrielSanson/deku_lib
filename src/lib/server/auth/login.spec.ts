import { describe, expect, it } from 'vitest';
import { isBadCredentials, landingFor } from './login';

describe('staff login', () => {
	it('lands each role on its own screen', () => {
		expect(landingFor('kitchen')).toBe('/kitchen');
		expect(landingFor('admin')).toBe('/staff');
	});

	it('tells a wrong password apart from Supabase being unavailable', () => {
		expect(isBadCredentials({ status: 400 })).toBe(true);
		expect(isBadCredentials({ status: 401 })).toBe(true);
		// AuthRetryableFetchError (network down) and server errors.
		expect(isBadCredentials({ status: 0 })).toBe(false);
		expect(isBadCredentials({})).toBe(false);
		expect(isBadCredentials({ status: 500 })).toBe(false);
		expect(isBadCredentials({ status: 503 })).toBe(false);
	});
});
