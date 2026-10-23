// The shop's own details (name, contact, Pix key) and the setup wizard's state.
import { normalizePixKey, pixText } from '#lib/domain/pix.ts';
import { audit, type Actor } from '../audit';
import { config } from '../config';
import { db, type Db } from '../db';
import { DomainError } from '../errors';
import { preset } from '../presets';

export interface StoreProfile {
	displayName: string;
	phone: string | null;
	addressLine: string | null;
	city: string | null;
	pix: {
		enabled: boolean;
		key: string | null;
		merchantName: string | null;
		merchantCity: string | null;
	};
	setupCompletedAt: Date | null;
}

const TTL_MS = 10_000;
let cache: { value: StoreProfile; at: number } | undefined;

export async function getStoreProfile(
	sql: Db = db(),
	{ fresh = false } = {}
): Promise<StoreProfile> {
	if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.value;
	const [r] = await sql<
		{
			display_name: string | null;
			phone: string | null;
			address_line: string | null;
			city: string | null;
			pix_enabled: boolean;
			pix_key: string | null;
			pix_merchant_name: string | null;
			pix_merchant_city: string | null;
			setup_completed_at: Date | null;
		}[]
	>`select * from store_profile where id = 1`;
	const value: StoreProfile = {
		displayName: r.display_name ?? config().SHOP_NAME ?? preset().shopName,
		phone: r.phone,
		addressLine: r.address_line,
		city: r.city,
		pix: {
			enabled: r.pix_enabled,
			key: r.pix_key,
			merchantName: r.pix_merchant_name,
			merchantCity: r.pix_merchant_city
		},
		setupCompletedAt: r.setup_completed_at
	};
	cache = { value, at: Date.now() };
	return value;
}

export async function shopName() {
	return (await getStoreProfile()).displayName;
}

export async function saveStoreInfo(
	input: { displayName: string; phone: string; addressLine: string; city: string },
	actor: Actor
) {
	const displayName = input.displayName.trim();
	if (!displayName || displayName.length > 80) throw new DomainError('err.settings.shopName');
	await db().begin(async (tx) => {
		await tx`update store_profile set display_name = ${displayName}, phone = ${input.phone.trim() || null},
			address_line = ${input.addressLine.trim() || null}, city = ${input.city.trim() || null},
			updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, 'store.profile_updated', 'store_profile', '1', { displayName });
	});
	cache = undefined;
}

export async function savePixSettings(
	input: { enabled: boolean; key: string; merchantName: string; merchantCity: string },
	actor: Actor
) {
	let key: string | null = null;
	let merchantName: string | null = null;
	let merchantCity: string | null = null;
	if (input.key.trim() || input.enabled) {
		const k = normalizePixKey(input.key);
		if (!k) throw new DomainError('err.settings.pixKey', { code: 'pix_key' });
		key = k.key;
		merchantName = pixText(input.merchantName, 25);
		merchantCity = pixText(input.merchantCity, 15);
		if (!merchantName) throw new DomainError('err.settings.pixName');
		if (!merchantCity) throw new DomainError('err.settings.pixCity');
	}
	await db().begin(async (tx) => {
		await tx`update store_profile set pix_enabled = ${input.enabled}, pix_key = ${key},
			pix_merchant_name = ${merchantName}, pix_merchant_city = ${merchantCity},
			updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, 'store.pix_updated', 'store_profile', '1', {
			enabled: input.enabled,
			keyType: key ? normalizePixKey(key)?.type : null
		});
	});
	cache = undefined;
}

export async function completeSetup(actor: Actor) {
	await db().begin(async (tx) => {
		await tx`update store_profile set setup_completed_at = coalesce(setup_completed_at, now()),
			updated_by = ${actor.id}, updated_at = now() where id = 1`;
		await audit(tx, actor, 'store.setup_completed', 'store_profile', '1');
	});
	cache = undefined;
}
