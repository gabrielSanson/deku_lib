// Prices per channel (Cardápio → Preços por canal): a shop-wide iFood markup with rounding,
// and an own iFood price for any product. Site and counter prices never change here.
import { applyMarkup } from '#lib/domain/pricing.ts';
import { audit, type Actor } from '../audit';
import { db } from '../db';
import { DomainError } from '../errors';
import { scheduleMenuSync } from '../integrations/menu-sync';
import { invalidateCatalog } from './service';

export interface ChannelSettings {
	markupBps: number;
	roundTo: number | null;
}

export async function getChannelSettings(): Promise<ChannelSettings> {
	const [r] = await db()<{ ifood_markup_bps: number; round_to_cents: number | null }[]>`
		select ifood_markup_bps, round_to_cents from channel_settings where shop_id = current_shop_id()`;
	return { markupBps: r?.ifood_markup_bps ?? 0, roundTo: r ? r.round_to_cents : 90 };
}

export async function listIfoodPrices() {
	const [settings, rows] = await Promise.all([
		getChannelSettings(),
		db()<
			{
				sku: string;
				name: string;
				category: string;
				price_cents: number;
				ifood_cents: number | null;
			}[]
		>`
			select p.sku, p.name, c.name as category, p.price_cents, cp.price_cents as ifood_cents
			from menu_products p join menu_categories c on c.id = p.category_id
			left join menu_channel_prices cp on cp.sku = p.sku and cp.channel = 'ifood'
			where p.active and 'ifood' = any(p.channels)
			order by c.position, c.name, p.position, p.name`
	]);
	return {
		settings,
		products: rows.map((r) => ({
			sku: r.sku,
			name: r.name,
			category: r.category,
			priceCents: r.price_cents,
			ifoodCents: r.ifood_cents,
			suggestedCents: applyMarkup(r.price_cents, settings.markupBps, settings.roundTo)
		}))
	};
}

async function menuChanged(actor: Actor, action: string, summary: Record<string, unknown>) {
	await db().begin(async (tx) => {
		await tx`update menu_revision set revision = revision + 1, updated_at = now() where shop_id = current_shop_id()`;
		await audit(tx, actor, action, 'menu', null, summary);
		await scheduleMenuSync(tx);
	});
	invalidateCatalog();
}

export async function saveChannelSettings(input: ChannelSettings, actor: Actor) {
	const { markupBps, roundTo } = input;
	if (!Number.isInteger(markupBps) || markupBps < 0 || markupBps > 10_000)
		throw new DomainError('err.prices.markup');
	if (roundTo !== null && (!Number.isInteger(roundTo) || roundTo < 0 || roundTo > 99))
		throw new DomainError('err.prices.round');
	await db()`
		insert into channel_settings (ifood_markup_bps, round_to_cents) values (${markupBps}, ${roundTo})
		on conflict (shop_id) do update set ifood_markup_bps = excluded.ifood_markup_bps,
			round_to_cents = excluded.round_to_cents, updated_at = now()`;
	await menuChanged(actor, 'channel_prices.markup', { markupBps, roundTo });
}

/** Own iFood prices; null removes one (the markup applies again). */
export async function saveIfoodPrices(
	entries: { sku: string; priceCents: number | null }[],
	actor: Actor
) {
	await db().begin(async (tx) => {
		for (const e of entries) {
			if (e.priceCents === null) {
				await tx`delete from menu_channel_prices where sku = ${e.sku} and channel = 'ifood'`;
			} else {
				if (!Number.isInteger(e.priceCents) || e.priceCents < 0)
					throw new DomainError('err.prices.bad');
				await tx`
					insert into menu_channel_prices (sku, channel, price_cents) values (${e.sku}, 'ifood', ${e.priceCents})
					on conflict (shop_id, sku, channel) do update set price_cents = excluded.price_cents`;
			}
		}
	});
	await menuChanged(actor, 'channel_prices.saved', { count: entries.length });
}
