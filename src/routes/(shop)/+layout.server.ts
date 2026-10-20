import { getCatalog } from '#lib/server/catalog/service.ts';
import { config } from '#lib/server/config.ts';
import { db } from '#lib/server/db.ts';
import { soldOutSkus } from '#lib/server/catalog/service.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ setHeaders }) => {
	const [catalog, settings, soldOut] = await Promise.all([getCatalog(), getStoreSettings(), soldOutSkus(db(), 'web')]);
	setHeaders({ 'cache-control': 'no-store' });
	return {
		shopName: config().SHOP_NAME,
		catalog: { ...catalog, products: catalog.products.filter((p) => p.channels.includes('web')) },
		soldOut: [...soldOut],
		store: {
			open: settings.acceptingOrders && settings.webOrderingEnabled,
			pauseReason: settings.pauseReason,
			pickup: settings.pickupEnabled,
			delivery: settings.deliveryEnabled,
			payOnFulfillment: settings.payOnFulfillmentEnabled,
			prepTimeMinutes: settings.prepTimeMinutes
		}
	};
};
