// The shop's plan with the platform: status, the open invoice (Pix code) and past invoices.
import QRCode from 'qrcode';
import { requirePermission } from '#lib/server/auth/permissions.ts';
import { config } from '#lib/server/config.ts';
import { currentShopId, DEFAULT_SHOP_ID, platformDb } from '#lib/server/db.ts';
import { invoicesOfShop } from '#lib/server/platform/billing.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requirePermission(event, 'finance.edit');
	const shopId = currentShopId();
	const hosted = config().TENANCY === 'multi' && shopId !== DEFAULT_SHOP_ID;
	if (!hosted) return { hosted: false as const };
	const [plan] = await platformDb()<{ name: string; price_cents: number }[]>`
		select p.name, p.price_cents from shops s join plans p on p.code = s.plan where s.id = ${shopId}`;
	const invoices = await invoicesOfShop(shopId);
	const open = invoices.find((i) => i.status === 'open') ?? null;
	return {
		hosted: true as const,
		status: event.locals.shop?.status ?? 'active',
		trialEndsAt: event.locals.shop?.trialEndsAt ?? null,
		plan: plan ? { name: plan.name, priceCents: plan.price_cents } : null,
		open: open
			? {
					...open,
					pixSvg: open.pixPayload
						? await QRCode.toString(open.pixPayload, { type: 'svg', margin: 1, width: 220 })
						: null
				}
			: null,
		history: invoices
	};
};
