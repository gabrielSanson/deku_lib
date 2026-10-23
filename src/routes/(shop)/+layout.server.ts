import { unavailableReason } from '#lib/domain/catalog.ts';
import { describeOpening, isOpenAt, nextOpening } from '#lib/domain/hours.ts';
import { isKiosk } from '#lib/server/kiosk.ts';
import { getCatalog, missingIngredients, soldOutSkus } from '#lib/server/catalog/service.ts';
import { listPages } from '#lib/server/catalog/pages.ts';
import { db } from '#lib/server/db.ts';
import { getSchedule } from '#lib/server/settings/hours.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ setHeaders, locals, cookies }) => {
	const [catalog, settings, soldOut, missing, profile, schedule, pages] = await Promise.all([
		getCatalog(),
		getStoreSettings(),
		soldOutSkus(db(), 'web'),
		missingIngredients(db()),
		getStoreProfile(),
		getSchedule(),
		listPages().catch(() => [])
	]);
	const now = new Date();
	const inHours = isOpenAt(schedule, now);
	const next = inHours ? null : nextOpening(schedule, now);
	// Products that cannot be made without a missing ingredient show as sold out.
	for (const p of catalog.products) if (unavailableReason(p, soldOut, missing)) soldOut.add(p.sku);
	setHeaders({ 'cache-control': 'no-store' });
	return {
		shopName: profile.displayName,
		kiosk: isKiosk(cookies),
		customer: locals.customer ? { name: locals.customer.name } : null,
		catalog: { ...catalog, products: catalog.products.filter((p) => p.channels.includes('web')) },
		soldOut: [...soldOut],
		missingIngredients: [...missing],
		/** Footer links: every published page from Páginas do site, by its title. */
		pages: pages.filter((p) => p.published).map((p) => ({ slug: p.slug, title: p.title })),
		store: {
			open: settings.acceptingOrders && settings.webOrderingEnabled && inHours,
			pauseReason: settings.acceptingOrders ? null : settings.pauseReason,
			/** Set when the shop is outside its opening hours: "hoje às 18:00". */
			outOfHours: inHours ? null : next ? describeOpening(next, now) : '',
			dineIn: settings.dineInEnabled,
			pickup: settings.pickupEnabled,
			delivery: settings.deliveryEnabled,
			pixKey: profile.pix.enabled,
			prepTimeMinutes: settings.prepTimeMinutes
		}
	};
};
