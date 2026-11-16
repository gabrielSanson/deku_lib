// Webhooks name their shop in the path (/…/[shop]), because providers call one platform URL.
// The old paths without a shop keep working for the default shop.
import { withShop } from '../db';
import { getShop } from './shops';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Runs `fn` for the shop in the path, or answers 404 when there is no such open shop. */
export async function forShopInPath(
	shopId: string,
	fn: () => Promise<Response>
): Promise<Response> {
	if (!UUID.test(shopId)) return new Response(null, { status: 404 });
	const shop = await getShop(shopId);
	if (!shop || shop.status === 'closed') return new Response(null, { status: 404 });
	return withShop(shop.id, fn);
}
