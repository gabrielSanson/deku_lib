import { unavailableReason } from '#lib/domain/catalog.ts';
import { getCatalog, missingIngredients, soldOutSkus } from '#lib/server/catalog/service.ts';
import { db } from '#lib/server/db.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
	const [catalog, settings, soldOut, missing, profile] = await Promise.all([
		getCatalog(),
		getStoreSettings(),
		soldOutSkus(db(), 'web'),
		missingIngredients(db()),
		getStoreProfile()
	]);
	// Products that cannot be made without a missing ingredient show as sold out.
	for (const p of catalog.products) if (unavailableReason(p, soldOut, missing)) soldOut.add(p.sku);
	setHeaders({ 'cache-control': 'no-store' });
	return {
		shopName: profile.displayName,
		catalog: { ...catalog, products: catalog.products.filter((p) => p.channels.includes('web')) },
		soldOut: [...soldOut],
		missingIngredients: [...missing],
		store: {
			open: settings.acceptingOrders && settings.webOrderingEnabled,
			pauseReason: settings.pauseReason,
			dineIn: settings.dineInEnabled,
			pickup: settings.pickupEnabled,
			delivery: settings.deliveryEnabled,
			payOnFulfillment: settings.payOnFulfillmentEnabled,
			pixKey: profile.pix.enabled,
			prepTimeMinutes: settings.prepTimeMinutes
		}
	};
};
