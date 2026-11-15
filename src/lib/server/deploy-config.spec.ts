// The compose files are part of the product: guard the settings the app relies on.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(new URL(`../../../${p}`, import.meta.url), 'utf8');

describe('deploy settings', () => {
	it('tells adapter-node where the customer address is behind Caddy', () => {
		const shop = read('deploy/compose.shop.yml');
		expect(shop).toMatch(/ADDRESS_HEADER: \$\{ADDRESS_HEADER:-X-Forwarded-For\}/);
		expect(shop).toMatch(/XFF_DEPTH: \$\{XFF_DEPTH:-1\}/);
	});
	it('uses Cloudflare’s header behind the tunnel', () => {
		expect(read('deploy/compose.tunnel.yml')).toMatch(/ADDRESS_HEADER: CF-Connecting-IP/);
	});
});
