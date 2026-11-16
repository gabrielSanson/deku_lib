// Keeping a delivery app's menu in step with ours: a full sync (manual, or two minutes after
// the menu changes) and an immediate availability update when something sells out.
import { priceOnChannel } from '#lib/domain/pricing.ts';
import { getCatalog, soldOutSkus } from '../catalog/service';
import { db, type Db } from '../db';
import { enqueue, QUEUES } from '../jobs';
import type { ChannelAdapter, ChannelMenu } from './channel';
import { ifoodSettings } from './ifood/settings';

const MENU_SYNC_DELAY_S = 120;

/** Our published menu as the channel should show it: its prices, photos and what is sold out. */
export async function buildChannelMenu(channel: 'ifood'): Promise<ChannelMenu> {
	const catalog = await getCatalog({ fresh: true });
	const soldOut = await soldOutSkus(db(), channel);
	const categoryName = new Map(catalog.categories.map((c) => [c.id, c.name]));
	return {
		categories: catalog.categories.map((c) => ({ id: c.id, name: c.name, position: c.position })),
		items: catalog.products
			.filter((p) => p.channels.includes(channel))
			.map((p) => ({
				sku: p.sku,
				name: p.name,
				description: p.description,
				categoryId: p.categoryId,
				categoryName: categoryName.get(p.categoryId) ?? '',
				priceCents: priceOnChannel(catalog, p, channel),
				imageUrl: p.imageUrl,
				available: !soldOut.has(p.sku),
				options: p.modifierGroups.flatMap((g) =>
					g.options.map((o) => ({
						groupId: g.id,
						groupName: g.name,
						sku: o.sku,
						name: o.name,
						priceCents: priceOnChannel(catalog, o, channel)
					}))
				)
			}))
	};
}

/** After a menu change: sync iFood once, two minutes later (changes in between join it). */
export async function scheduleMenuSync(tx: Db, { now = false } = {}) {
	if (!(await ifoodSettings()).enabled) return;
	await enqueue(
		tx,
		QUEUES.ifoodMenuSync,
		{},
		{ singletonKey: 'ifood-menu-sync', startAfter: now ? 0 : MENU_SYNC_DELAY_S }
	);
}

/** Sold out or back: tell the app right away. */
export async function scheduleAvailability(tx: Db, skus: string[], available: boolean) {
	if (!skus.length || !(await ifoodSettings()).enabled) return;
	await enqueue(tx, QUEUES.channelAvailability, { channel: 'ifood', skus, available });
}

export async function runMenuSync(adapter: ChannelAdapter) {
	if (!adapter.syncMenu || adapter.channel !== 'ifood') return null;
	const sql = db();
	const [report] = await sql<{ id: string }[]>`
		insert into channel_sync_reports (channel, kind) values (${adapter.channel}, 'menu') returning id`;
	try {
		const menu = await buildChannelMenu('ifood');
		const mapped = new Set(
			(
				await sql<{ internal_sku: string }[]>`
					select internal_sku from integration_mappings
					where channel = ${adapter.channel} and entity_type = 'product'`
			).map((r) => r.internal_sku)
		);
		const r = await adapter.syncMenu(menu, (sku) => mapped.has(sku));
		for (const sku of r.synced) {
			await sql`
				insert into integration_mappings (channel, entity_type, internal_sku, external_id, external_code, last_synced_at)
				values (${adapter.channel}, 'product', ${sku}, ${sku}, ${sku}, now())
				on conflict (shop_id, channel, entity_type, internal_sku) do update set last_synced_at = now()`;
		}
		await sql`update channel_sync_reports set finished_at = now(), created = ${r.created},
			updated = ${r.updated}, failed = ${sql.json(r.failed)} where id = ${report.id}`;
		return r;
	} catch (err) {
		await sql`update channel_sync_reports set finished_at = now(), error = ${String(err).slice(0, 500)}
			where id = ${report.id}`;
		throw err;
	}
}

export async function runAvailability(
	adapter: ChannelAdapter,
	data: { skus: string[]; available: boolean }
) {
	if (!adapter.setAvailability || !(await adapter.enabled())) return 'skipped';
	const sql = db();
	const [report] = await sql<{ id: string }[]>`
		insert into channel_sync_reports (channel, kind) values (${adapter.channel}, 'availability') returning id`;
	try {
		await adapter.setAvailability(
			data.skus.map((sku) => ({ externalId: sku, available: data.available }))
		);
		await sql`update channel_sync_reports set finished_at = now(), updated = ${data.skus.length}
			where id = ${report.id}`;
		return 'sent';
	} catch (err) {
		await sql`update channel_sync_reports set finished_at = now(), error = ${String(err).slice(0, 500)},
			failed = ${sql.json(data.skus.map((sku) => ({ sku, reason: String(err).slice(0, 200) })))}
			where id = ${report.id}`;
		throw err;
	}
}

export async function recentSyncReports(channel: string, limit = 5) {
	return db()<
		{
			id: string;
			kind: string;
			started_at: Date;
			finished_at: Date | null;
			created: number;
			updated: number;
			failed: { sku: string; reason: string }[];
			error: string | null;
		}[]
	>`select id, kind, started_at, finished_at, created, updated, failed, error from channel_sync_reports
		where channel = ${channel} order by started_at desc limit ${limit}`;
}
