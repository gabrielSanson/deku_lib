// Our menu on iFood: pushing items, prices and availability, and reading iFood's menu back.
//
// UNVERIFIED: iFood's Catalog API v2 shapes below follow our reading of the public docs and have
// not been run against homologation. Every path and field is in this file so fixes land here.
import type { ChannelMenu, SyncReport } from '../channel';
import type { IfoodClient } from './api';

export const IFOOD_CATALOG_PATHS = {
	// TODO(verify) all three.
	item: '/catalog/v2.0/merchants/{merchantId}/items',
	itemStatus: '/catalog/v2.0/merchants/{merchantId}/items/status',
	categories: '/catalog/v2.0/merchants/{merchantId}/catalogs/default/categories?includeItems=true'
} as const;

const reais = (cents: number) => Math.round(cents) / 100;

/** One of our products as an iFood catalog item (TODO(verify) field names). */
export function toIfoodItem(item: ChannelMenu['items'][number]) {
	const groups = new Map<string, { id: string; name: string; options: unknown[] }>();
	for (const o of item.options) {
		const g = groups.get(o.groupId) ?? { id: o.groupId, name: o.groupName, options: [] };
		g.options.push({ externalCode: o.sku, name: o.name, price: { value: reais(o.priceCents) } });
		groups.set(o.groupId, g);
	}
	return {
		item: {
			externalCode: item.sku,
			categoryId: item.categoryId,
			status: item.available ? 'AVAILABLE' : 'UNAVAILABLE',
			price: { value: reais(item.priceCents) }
		},
		product: {
			externalCode: item.sku,
			name: item.name,
			description: item.description,
			image: item.imageUrl ?? undefined
		},
		optionGroups: [...groups.values()]
	};
}

export async function pushIfoodMenu(
	client: IfoodClient,
	menu: ChannelMenu,
	known: (sku: string) => boolean
): Promise<SyncReport & { synced: string[] }> {
	const report: SyncReport & { synced: string[] } = {
		created: 0,
		updated: 0,
		failed: [],
		synced: []
	};
	for (const item of menu.items) {
		try {
			await client.request('PUT', IFOOD_CATALOG_PATHS.item, toIfoodItem(item));
			if (known(item.sku)) report.updated++;
			else report.created++;
			report.synced.push(item.sku);
		} catch (err) {
			report.failed.push({ sku: item.sku, reason: String(err).slice(0, 300) });
		}
	}
	return report;
}

export async function setIfoodItemStatus(
	client: IfoodClient,
	items: { externalId: string; available: boolean }[]
) {
	if (!items.length) return;
	await client.request(
		'PATCH',
		IFOOD_CATALOG_PATHS.itemStatus,
		items.map((i) => ({
			externalCode: i.externalId,
			status: i.available ? 'AVAILABLE' : 'UNAVAILABLE'
		}))
	);
}

interface IfoodCatalogCategory {
	name?: string;
	items?: {
		externalCode?: string;
		name?: string;
		description?: string;
		price?: { value?: number };
		optionGroups?: { name?: string; options?: { name?: string; price?: { value?: number } }[] }[];
	}[];
}

/** iFood's menu as rows of our spreadsheet import (categoria;nome;descricao;preco;adicionais). */
export async function readIfoodMenuAsCsv(client: IfoodClient): Promise<string> {
	const categories = ((await client.request('GET', IFOOD_CATALOG_PATHS.categories)) ??
		[]) as IfoodCatalogCategory[];
	const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
	const money = (v: number | undefined) => (v ?? 0).toFixed(2).replace('.', ',');
	const rows = ['categoria;nome;descricao;preco;adicionais'];
	for (const c of categories) {
		for (const i of c.items ?? []) {
			const extras = (i.optionGroups ?? [])
				.flatMap((g) => g.options ?? [])
				.map((o) => (o.price?.value ? `${o.name} +${money(o.price.value)}` : (o.name ?? '')))
				.filter(Boolean)
				.join(' | ');
			rows.push(
				[c.name ?? 'iFood', i.name ?? '', i.description ?? '', money(i.price?.value), extras]
					.map((v) => cell(String(v)))
					.join(';')
			);
		}
	}
	return rows.join('\n') + '\n';
}
