// Self sign-up: a shop owner creates a shop on the hosted platform and can sell the same day.
// Platform code: writes shops, domains and members with the main pool.
import { createClient } from '@supabase/supabase-js';
import { slugProblem, type BusinessType, BUSINESS_TYPES } from '#lib/domain/signup.ts';
import { LEGAL_VERSION } from '#lib/platform/legal/index.ts';
import { audit } from '../audit';
import { config, supabaseServerUrl } from '../config';
import { platformDb, withShop } from '../db';
import { DomainError } from '../errors';
import { applyBusinessType } from '../presets/business-types';
import { getShop, invalidateShopCache } from './shops';

export interface SignupInput {
	ownerName: string;
	email: string;
	password: string;
	shopName: string;
	slug: string;
	businessType: BusinessType;
	city: string;
	acceptTerms: boolean;
	ip: string | null;
}

export interface CreatedShop {
	shopId: string;
	slug: string;
	host: string;
	userId: string;
}

/** Creates the sign-in account; returns its id. Replaced in tests. */
export type CreateAuthUser = (email: string, password: string, name: string) => Promise<string>;
export type DeleteAuthUser = (id: string) => Promise<void>;

function adminClient() {
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	const url = supabaseServerUrl();
	if (!key || !url)
		throw new DomainError('err.staff.noAdminKey', { code: 'no_admin_key', status: 501 });
	return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const supabaseCreateUser: CreateAuthUser = async (email, password, name) => {
	const { data, error } = await adminClient().auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { name }
	});
	if (error || !data.user) {
		if (error && /already|registered|exists/i.test(error.message)) {
			throw new DomainError('err.signup.emailTaken', { code: 'email_taken', status: 409 });
		}
		throw new DomainError('err.signup.failed', { vars: { detail: error?.message ?? '' } });
	}
	return data.user.id;
};

export const supabaseDeleteUser: DeleteAuthUser = async (id) => {
	await adminClient().auth.admin.deleteUser(id);
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function slugAvailable(slug: string): Promise<boolean> {
	if (slugProblem(slug)) return false;
	const domain = config().PLATFORM_DOMAIN ?? '';
	const [taken] = await platformDb()`
		select 1 from shops where slug = ${slug}
		union all select 1 from shop_domains where host = ${`${slug}.${domain}`}`;
	return !taken;
}

export function validateSignup(input: SignupInput) {
	if (input.ownerName.trim().length < 2) throw new DomainError('err.signup.ownerName');
	if (!EMAIL.test(input.email.trim())) throw new DomainError('err.signup.email');
	if (input.password.length < 10) throw new DomainError('err.staff.password');
	const name = input.shopName.trim();
	if (name.length < 2 || name.length > 80) throw new DomainError('err.signup.shopName');
	const problem = slugProblem(input.slug);
	if (problem) {
		throw new DomainError(
			problem === 'reserved' ? 'err.signup.slugReserved' : 'err.signup.slugFormat'
		);
	}
	if (!BUSINESS_TYPES.includes(input.businessType))
		throw new DomainError('err.signup.businessType');
	if (!input.acceptTerms) throw new DomainError('err.signup.terms');
}

const TRIAL_DAYS = 30;

/**
 * Creates the shop, its address, settings, owner and accepted terms in one transaction. The
 * sign-in account is made first (the member row needs its id); if the shop cannot be saved,
 * the account is removed again so the owner can simply try once more.
 */
export async function createShop(
	input: SignupInput,
	auth: { create: CreateAuthUser; remove: DeleteAuthUser } = {
		create: supabaseCreateUser,
		remove: supabaseDeleteUser
	}
): Promise<CreatedShop> {
	const c = config();
	if (c.TENANCY !== 'multi' || !c.PLATFORM_DOMAIN) {
		throw new DomainError('err.signup.closed', { code: 'closed', status: 404 });
	}
	validateSignup(input);
	const slug = input.slug;
	const host = `${slug}.${c.PLATFORM_DOMAIN}`;
	if (!(await slugAvailable(slug))) {
		throw new DomainError('err.signup.slugTaken', { code: 'slug_taken', status: 409 });
	}
	const email = input.email.trim().toLowerCase();
	const userId = await auth.create(email, input.password, input.ownerName.trim());
	try {
		const shopId = await platformDb().begin(async (tx) => {
			const [shop] = await tx<{ id: string }[]>`
				insert into shops (slug, name, business_type, status, trial_ends_at, city)
				values (${slug}, ${input.shopName.trim()}, ${input.businessType}, 'trial',
					now() + make_interval(days => ${TRIAL_DAYS}), ${input.city.trim() || null})
				returning id`;
			await tx`insert into shop_domains (host, shop_id, kind) values (${host}, ${shop.id}, 'platform')`;
			await tx`select init_shop_rows(${shop.id})`;
			await tx`update store_profile set display_name = ${input.shopName.trim()},
				city = ${input.city.trim() || null} where shop_id = ${shop.id}`;
			await tx`
				insert into staff_users (id, display_name, role) values (${userId}, ${input.ownerName.trim()}, 'admin')
				on conflict (id) do update set display_name = excluded.display_name`;
			await tx`
				insert into shop_members (shop_id, user_id, role, display_name)
				values (${shop.id}, ${userId}, 'admin', ${input.ownerName.trim()})`;
			for (const document of ['terms', 'privacy', 'dpa'] as const) {
				await tx`
					insert into terms_acceptances (shop_id, user_id, document, version, ip)
					values (${shop.id}, ${userId}, ${document}, ${LEGAL_VERSION}, ${input.ip})`;
			}
			return shop.id;
		});
		await getShop(shopId);
		// Starting menu, texts and modes for the business type, as the new shop.
		await withShop(shopId, async (sql) => {
			await applyBusinessType(input.businessType, sql);
			await audit(sql, { type: 'staff', id: userId }, 'shop.created', 'shop', shopId, {
				slug,
				business_type: input.businessType
			});
		});
		invalidateShopCache();
		return { shopId, slug, host, userId };
	} catch (err) {
		// A half-made shop is closed and lets go of its address, so the owner can try again.
		await platformDb()`
			with closed as (
				update shops set status = 'closed', slug = left(slug, 30) || '-x' || substr(md5(id::text), 1, 6)
				where slug = ${slug} returning id
			)
			delete from shop_domains where shop_id in (select id from closed)`.catch(() => {});
		await auth.remove(userId).catch(() => {});
		if (err instanceof DomainError) throw err;
		console.error(JSON.stringify({ msg: 'shop sign-up failed', slug, err: String(err) }));
		throw new DomainError('err.signup.failed', { vars: { detail: '' } });
	}
}
