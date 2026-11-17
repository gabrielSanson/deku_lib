// Offline POS (S5.10): sales made while the counter had no internet are sent here once it is back.
// Each one is created with the key the device generated, so sending twice never makes two orders.
// The price charged offline wins: when today's menu is dearer, the gap becomes a discount; when it is
// cheaper, the order keeps today's price and the gap is written to the audit log.
import { z } from 'zod';
import { cartLineInput, priceCart, PricingError } from '#lib/domain/pricing.ts';
import { audit } from '../audit';
import { shopText } from '../actions';
import { getCatalogForPricing } from '../catalog/service';
import { db } from '../db';
import { DomainError } from '../errors';
import { createOrder, type OrderActor } from '../orders/service';
import { recordManualTender } from '../payments/tenders';
import type { StaffRole } from '#lib/domain/order-status.ts';

export const offlineOrder = z.object({
	key: z.string().uuid(),
	/** The temporary number shown on the ticket, "OFF-12". */
	number: z.string().regex(/^OFF-\d{1,6}$/),
	createdAt: z.string().datetime(),
	catalogVersion: z.string().max(80).nullable(),
	lines: z.array(cartLineInput).min(1).max(60),
	fulfillmentType: z.enum(['dine_in', 'pickup']),
	customerLabel: z.string().trim().max(60).optional(),
	tableLabel: z.string().trim().max(20).optional(),
	notes: z.string().trim().max(300).optional(),
	discountCents: z.number().int().min(0).default(0),
	totalCents: z.number().int().min(0),
	tender: z.object({
		method: z.enum(['cash', 'terminal_card']),
		receivedCents: z.number().int().min(0).optional()
	})
});
export type OfflineOrder = z.infer<typeof offlineOrder>;

export type SyncResult =
	| { key: string; status: 'synced'; orderId: string }
	| { key: string; status: 'conflict'; orderId: string | null; error: string };

async function problem(err: unknown): Promise<string> {
	if (err instanceof DomainError) return err.key ? shopText(err.key, err.vars) : err.message;
	if (err instanceof PricingError) return shopText(err.key, err.vars);
	throw err;
}

export async function syncOfflineOrder(
	o: OfflineOrder,
	actor: OrderActor & { role: StaffRole }
): Promise<SyncResult> {
	let orderId: string | null = null;
	try {
		const catalog = await getCatalogForPricing();
		const today = priceCart(catalog, o.lines, {
			channel: 'counter',
			soldOut: new Set(),
			missingIngredients: new Set()
		});
		const discountCents = Math.max(o.discountCents, today.subtotalCents - o.totalCents);
		const order = await createOrder({
			channel: 'counter',
			sourceMode: 'staff_pos',
			lines: o.lines,
			fulfillmentType: o.fulfillmentType,
			fulfillmentProvider: 'shop',
			customerLabel: o.customerLabel || o.number,
			tableLabel: o.tableLabel || null,
			notes: [`Venda offline ${o.number}`, o.notes].filter(Boolean).join(' · '),
			discountCents: Math.min(discountCents, today.subtotalCents),
			idempotencyKey: o.key,
			initialStatus: 'new',
			actor
		});
		orderId = order.id;
		if (order.created !== false) {
			await audit(db(), actor, 'pos.offline_synced', 'order', order.id, {
				number: o.number,
				created_at: o.createdAt,
				catalog_version: o.catalogVersion,
				catalog_version_now: catalog.version,
				offline_total_cents: o.totalCents,
				today_total_cents: order.totalCents,
				difference_cents: o.totalCents - order.totalCents
			});
		}
		if (order.totalCents > 0) {
			await recordManualTender({
				orderId: order.id,
				method: o.tender.method,
				amountCents: order.totalCents,
				cashReceivedCents:
					o.tender.method === 'cash'
						? Math.max(o.tender.receivedCents ?? o.totalCents, order.totalCents)
						: null,
				providerReference: o.tender.method === 'terminal_card' ? o.number : null,
				idempotencyKey: `offline:${o.key}`,
				actor
			});
		}
		return { key: o.key, status: 'synced', orderId: order.id };
	} catch (err) {
		return { key: o.key, status: 'conflict', orderId, error: await problem(err) };
	}
}

/** Sends the queue in the order it was sold. */
export async function syncOfflineOrders(
	orders: OfflineOrder[],
	actor: OrderActor & { role: StaffRole }
): Promise<SyncResult[]> {
	const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	const out: SyncResult[] = [];
	for (const o of sorted) out.push(await syncOfflineOrder(o, actor));
	return out;
}
