// One-tap opt-out from marketing, linked from every marketing message.
import { optOut } from '#lib/server/campaigns/messages.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => ({ ok: await optOut(params.token) });
