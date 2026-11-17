// S5.9: whether someone has a verified authenticator comes from the auth schema, and the shop's
// "require two-step for administrators" switch is stored and audited.
import { afterAll, describe, expect, it } from 'vitest';
import { SYSTEM } from '#lib/server/audit.ts';
import { closeDb, db, platformDb } from '#lib/server/db.ts';
import { adminMfaRequired, hasVerifiedFactor, setAdminMfaRequired } from '#lib/server/auth/mfa.ts';
import { loadStaff, staffActor } from '#lib/server/auth/staff.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { makeStaff } from './helpers.ts';

afterAll(async () => {
	await setAdminMfaRequired(false, SYSTEM);
	await stopBoss();
	await closeDb();
});

describe('two-step sign-in', () => {
	it('counts only verified factors', async () => {
		const s = await makeStaff('admin');
		expect(await hasVerifiedFactor(s.id!)).toBe(false);
		await platformDb()`insert into auth.mfa_factors (user_id, status) values (${s.id!}, 'unverified')`;
		expect(await hasVerifiedFactor(s.id!)).toBe(false);
		await platformDb()`update auth.mfa_factors set status = 'verified' where user_id = ${s.id!}`;
		expect(await hasVerifiedFactor(s.id!)).toBe(true);
	});

	it('stores the shop switch', async () => {
		const s = (await loadStaff((await makeStaff('admin')).id!, null))!;
		expect(await adminMfaRequired()).toBe(false);
		await setAdminMfaRequired(true, staffActor(s));
		expect(await adminMfaRequired()).toBe(true);
		const [a] = await db()<{ n: number }[]>`
			select count(*)::int as n from audit_log where action = 'security.admin_mfa'`;
		expect(a.n).toBeGreaterThan(0);
		await setAdminMfaRequired(false, staffActor(s));
		expect(await adminMfaRequired()).toBe(false);
	});
});
