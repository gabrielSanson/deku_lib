// Caddy asks before getting a certificate for a host (on-demand TLS, multi-shop installs):
// yes only for hosts that belong to a shop, so nobody can make the server request certificates
// for arbitrary names.
import { config } from '#lib/server/config.ts';
import { platformDb } from '#lib/server/db.ts';
import { normalizeHost } from '#lib/server/platform/shops.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const c = config();
	if (c.TENANCY !== 'multi') return new Response(null, { status: 404 });
	const host = normalizeHost(url.searchParams.get('domain') ?? '');
	if (!host) return new Response(null, { status: 400 });
	if (host === c.PLATFORM_DOMAIN || host === `www.${c.PLATFORM_DOMAIN}`) {
		return new Response(null, { status: 200 });
	}
	const [row] = await platformDb()`
		select 1 from shop_domains d join shops s on s.id = d.shop_id
		where d.host = ${host} and s.status <> 'closed'
			and (d.kind = 'platform' or d.verified_at is not null)`;
	return new Response(null, { status: row ? 200 : 404 });
};
