// iFood events for one shop: /api/v1/integrations/ifood/webhook/<shop id>.
import { forShopInPath } from '#lib/server/platform/webhooks.ts';
import { POST as receive } from '../+server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) =>
	forShopInPath(event.params.shop, async () => receive(event as never));
