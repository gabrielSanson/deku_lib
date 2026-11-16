// Estoque → Compras: what was bought, at what price. Updates the average cost.
import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { attempt, failText } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import { listStockItems, recentPurchases, recordPurchase } from '#lib/server/stock/service.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	items: await listStockItems(),
	purchases: await recentPurchases()
});

const purchase = z.object({
	supplier: z.string().trim().max(80).optional(),
	purchasedOn: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	lines: z
		.array(
			z.object({
				stockItemId: z.string().uuid(),
				qtyBase: z.number().int().positive(),
				totalCents: z.number().int().min(0)
			})
		)
		.min(1)
		.max(50)
});

export const actions: Actions = {
	default: async (event) => {
		const staff = requireStaff(event, ADMIN);
		let raw: unknown;
		try {
			raw = JSON.parse(String((await event.request.formData()).get('payload') ?? ''));
		} catch {
			return fail(400, {});
		}
		const parsed = purchase.safeParse(raw);
		if (!parsed.success) return failText(400, 'err.stock.noLines');
		return attempt(async () => {
			await recordPurchase(parsed.data, staffActor(staff));
			return { saved: true };
		});
	}
};
