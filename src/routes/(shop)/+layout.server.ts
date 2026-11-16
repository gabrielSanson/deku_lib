import { unavailableReason } from '#lib/domain/catalog.ts';
import { describeOpening, isOpenAt, nextOpening } from '#lib/domain/hours.ts';
import { isKiosk } from '#lib/server/kiosk.ts';
import { getCatalog, missingIngredients, soldOutSkus } from '#lib/server/catalog/service.ts';
import { listPages } from '#lib/server/catalog/pages.ts';
import { db } from '#lib/server/db.ts';
import { getSchedule } from '#lib/server/settings/hours.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import { getStoreSettings } from '#lib/server/settings/service.ts';
import { getTexts } from '#lib/server/settings/texts.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ setHeaders, locals, cookies, url }) => {
	// The menu link sent by the WhatsApp bot: remembered for this visit's checkout.
	const wa = url.searchParams.get('wa');
	if (wa && /^[0-9a-f]{24}$/.test(wa))
		cookies.set('wa_link', wa, { path: '/', maxAge: 86_400, httpOnly: true, sameSite: 'lax' });
	// A friend's referral link: its code is filled in at checkout.
	const ref = url.searchParams.get('ref');
	if (ref && /^[A-Z0-9_-]{3,24}$/i.test(ref))
		cookies.set('ref_code', ref.toUpperCase(), {
			path: '/',
			maxAge: 30 * 86_400,
			httpOnly: true,
			sameSite: 'lax'
		});
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
	// A suspended shop (unpaid plan) shows as closed with a short notice.
	const suspended = locals.shop?.status === 'suspended';
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
			open: !suspended && settings.acceptingOrders && settings.webOrderingEnabled && inHours,
			/** Orders can be placed: open now, or closed for the night with orders for later on. */
			canOrder:
				!suspended &&
				settings.acceptingOrders &&
				settings.webOrderingEnabled &&
				(inHours || (settings.schedulingEnabled && !isKiosk(cookies) && !!next)),
			scheduling: settings.schedulingEnabled && !isKiosk(cookies),
			pauseReason: suspended
				? (await getTexts())['shop.suspended']
				: settings.acceptingOrders
					? null
					: settings.pauseReason,
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
