// Live store operations. Owned by the app (not the CMS) so staff can pause
// ordering or change fees mid-shift. Every change is audited.
import type { DeliveryRule } from '#lib/domain/pricing.ts';
import { audit, type Actor } from '../audit';
import { db, type Db } from '../db';
import { DomainError } from '../errors';

export interface StoreSettings {
	acceptingOrders: boolean;
	pauseReason: string | null;
	pickupEnabled: boolean;
	deliveryEnabled: boolean;
	webOrderingEnabled: boolean;
	prepTimeMinutes: number;
	maxOpenOrders: number | null;
	updatedAt: Date;
	version: number;
}

export async function getStoreSettings(sql: Db = db()): Promise<StoreSettings> {
	const [r] = await sql<
		{
			accepting_orders: boolean;
			pause_reason: string | null;
			pickup_enabled: boolean;
			delivery_enabled: boolean;
			web_ordering_enabled: boolean;
			prep_time_minutes: number;
			max_open_orders: number | null;
			updated_at: Date;
			version: number;
		}[]
	>`select * from store_runtime_settings where id = 1`;
	return {
		acceptingOrders: r.accepting_orders,
		pauseReason: r.pause_reason,
		pickupEnabled: r.pickup_enabled,
		deliveryEnabled: r.delivery_enabled,
		webOrderingEnabled: r.web_ordering_enabled,
		prepTimeMinutes: r.prep_time_minutes,
		maxOpenOrders: r.max_open_orders,
		updatedAt: r.updated_at,
		version: r.version
	};
}

export type StoreSettingsPatch = Partial<Omit<StoreSettings, 'updatedAt' | 'version'>>;

export async function updateStoreSettings(patch: StoreSettingsPatch, actor: Actor, expectedVersion?: number) {
	return db().begin(async (tx) => {
		const current = await getStoreSettings(tx);
		if (expectedVersion !== undefined && expectedVersion !== current.version) {
			throw new DomainError('As configurações mudaram. Recarregue a página.', 'stale', 409);
		}
		const next = { ...current, ...patch };
		if (!next.acceptingOrders && !next.pauseReason) next.pauseReason = 'Pausado pela equipe';
		if (next.acceptingOrders) next.pauseReason = null;
		await tx`
			update store_runtime_settings set
				accepting_orders = ${next.acceptingOrders}, pause_reason = ${next.pauseReason},
				pickup_enabled = ${next.pickupEnabled}, delivery_enabled = ${next.deliveryEnabled},
				web_ordering_enabled = ${next.webOrderingEnabled}, prep_time_minutes = ${next.prepTimeMinutes},
				max_open_orders = ${next.maxOpenOrders}, updated_by = ${actor.id}, updated_at = now(),
				version = version + 1
			where id = 1`;
		await audit(tx, actor, 'store.settings_updated', 'store_runtime_settings', '1', {
			before: { ...current, updatedAt: undefined },
			after: { ...next, updatedAt: undefined }
		});
		return getStoreSettings(tx);
	});
}

export async function listDeliveryRules(sql: Db = db()): Promise<DeliveryRule[]> {
	const rows = await sql<
		{
			id: string;
			name: string;
			match_kind: 'cep_prefix' | 'neighborhood';
			match_value: string;
			fee_cents: number;
			min_order_cents: number;
			enabled: boolean;
			priority: number;
		}[]
	>`select * from delivery_rules order by priority, name`;
	return rows.map((r) => ({
		id: r.id,
		name: r.name,
		matchKind: r.match_kind,
		matchValue: r.match_value,
		feeCents: r.fee_cents,
		minOrderCents: r.min_order_cents,
		enabled: r.enabled,
		priority: r.priority
	}));
}

export async function saveDeliveryRule(rule: Omit<DeliveryRule, 'id'> & { id?: string }, actor: Actor) {
	return db().begin(async (tx) => {
		const [row] = rule.id
			? await tx<{ id: string }[]>`
				update delivery_rules set name = ${rule.name}, match_kind = ${rule.matchKind},
					match_value = ${rule.matchValue}, fee_cents = ${rule.feeCents},
					min_order_cents = ${rule.minOrderCents}, enabled = ${rule.enabled},
					priority = ${rule.priority}, updated_by = ${actor.id}
				where id = ${rule.id} returning id`
			: await tx<{ id: string }[]>`
				insert into delivery_rules (name, match_kind, match_value, fee_cents, min_order_cents, enabled, priority, updated_by)
				values (${rule.name}, ${rule.matchKind}, ${rule.matchValue}, ${rule.feeCents},
					${rule.minOrderCents}, ${rule.enabled}, ${rule.priority}, ${actor.id})
				returning id`;
		if (!row) throw new DomainError('Regra não encontrada.', 'not_found', 404);
		await audit(tx, actor, rule.id ? 'delivery_rule.updated' : 'delivery_rule.created', 'delivery_rule', row.id, rule);
		return row.id;
	});
}

export async function deleteDeliveryRule(id: string, actor: Actor) {
	await db().begin(async (tx) => {
		await tx`delete from delivery_rules where id = ${id}`;
		await audit(tx, actor, 'delivery_rule.deleted', 'delivery_rule', id);
	});
}

export async function setSoldOut(sku: string, soldOut: boolean, actor: Actor, reason?: string) {
	await db().begin(async (tx) => {
		if (soldOut) {
			await tx`
				insert into product_availability_overrides (sku, channel, sold_out, reason, updated_by)
				values (${sku}, 'all', true, ${reason ?? null}, ${actor.id})
				on conflict (sku, channel) do update set sold_out = true, reason = excluded.reason,
					updated_by = excluded.updated_by, updated_at = now()`;
		} else {
			await tx`delete from product_availability_overrides where sku = ${sku} and channel = 'all'`;
		}
		await audit(tx, actor, soldOut ? 'product.sold_out' : 'product.back_in_stock', 'product', sku, { reason });
	});
}
