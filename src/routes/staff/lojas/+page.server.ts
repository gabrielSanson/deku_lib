// Which shops a signed-in person works at. Each shop has its own address, so the list links there.
import { redirect } from '@sveltejs/kit';
import { shopsOfUser } from '#lib/server/platform/admins.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.authUserId) redirect(303, '/staff/login');
	const shops = await shopsOfUser(locals.authUserId);
	return {
		here: locals.shop?.id ?? null,
		isMemberHere: Boolean(locals.staff),
		protocol: url.protocol,
		shops: shops.map((s) => ({
			id: s.id,
			name: s.name,
			role: s.role,
			host: s.host,
			status: s.status
		}))
	};
};
