// Creates the Directus collections the app reads (menu + editorial pages), a
// read-only "storefront" user whose static token the app uses, and a Flow that
// tells the app to drop its menu cache when an editor publishes a change.
// Safe to run again: anything that already exists is left alone.
//
//   DIRECTUS_URL=… DIRECTUS_ADMIN_EMAIL=… DIRECTUS_ADMIN_PASSWORD=… \
//   APP_URL=https://loja.example CMS_WEBHOOK_SECRET=… pnpm cms:bootstrap [--seed]
//
// --seed copies the demo menu into an empty Directus (useful for a first look).
import { randomBytes } from 'node:crypto';
import { fixtureCatalog } from '#lib/server/catalog/fixture.ts';

const base = required('DIRECTUS_URL');
const seed = process.argv.includes('--seed');

function required(name: string) {
	const v = process.env[name];
	if (!v) throw new Error(`${name} is required`);
	return v;
}

let token = process.env.DIRECTUS_ADMIN_TOKEN ?? '';

async function api<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
	const res = await fetch(new URL(path, base), {
		method,
		headers: {
			'content-type': 'application/json',
			...(token ? { authorization: `Bearer ${token}` } : {})
		},
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
	return (text ? (JSON.parse(text) as { data: T }).data : undefined) as T;
}

async function exists(path: string) {
	const res = await fetch(new URL(path, base), { headers: { authorization: `Bearer ${token}` } });
	return res.ok;
}

const id = {
	field: 'id',
	type: 'integer',
	meta: { hidden: true, readonly: true },
	schema: { is_primary_key: true, has_auto_increment: true }
};
const status = {
	field: 'status',
	type: 'string',
	schema: { default_value: 'draft', is_nullable: false },
	meta: {
		interface: 'select-dropdown',
		display: 'labels',
		width: 'half',
		options: {
			choices: [
				{ text: 'Publicado', value: 'published' },
				{ text: 'Rascunho', value: 'draft' },
				{ text: 'Arquivado', value: 'archived' }
			]
		}
	}
};
const sort = { field: 'sort', type: 'integer', meta: { interface: 'input', hidden: true } };
const text = (field: string, note?: string, extra: Record<string, unknown> = {}) => ({
	field,
	type: 'string',
	schema: { is_nullable: false, ...extra },
	meta: { interface: 'input', required: true, note, width: 'half' }
});
const cents = (field: string, note: string) => ({
	field,
	type: 'integer',
	schema: { is_nullable: false, default_value: 0 },
	meta: { interface: 'input', required: true, note, width: 'half', options: { min: 0 } }
});

async function collection(
	name: string,
	note: string,
	fields: unknown[],
	extraMeta: Record<string, unknown> = {}
) {
	if (await exists(`/collections/${name}`)) return console.log(`= ${name}`);
	await api('POST', '/collections', {
		collection: name,
		meta: {
			note,
			sort_field: 'sort',
			archive_field: 'status',
			archive_value: 'archived',
			unarchive_value: 'draft',
			...extraMeta
		},
		schema: {},
		fields
	});
	console.log(`+ ${name}`);
}

async function field(collectionName: string, def: { field: string } & Record<string, unknown>) {
	if (await exists(`/fields/${collectionName}/${def.field}`)) return;
	await api('POST', `/fields/${collectionName}`, def);
}

async function relation(def: { collection: string; field: string } & Record<string, unknown>) {
	if (await exists(`/relations/${def.collection}/${def.field}`)) return;
	await api('POST', '/relations', def);
}

async function schema() {
	await collection('menu_categories', 'Categorias do cardápio', [
		id,
		status,
		sort,
		text('name', 'Nome exibido'),
		text('slug', 'Usado na URL', { is_unique: true })
	]);
	await collection(
		'menu_modifier_groups',
		'Grupos de opções (ex.: ponto, adicionais)',
		[
			id,
			text('key', 'Identificador estável usado pelos pedidos', { is_unique: true }),
			text('name', 'Nome exibido'),
			{
				field: 'min_selections',
				type: 'integer',
				schema: { default_value: 0 },
				meta: { interface: 'input', width: 'half', note: '0 = opcional' }
			},
			{
				field: 'max_selections',
				type: 'integer',
				schema: { default_value: 1 },
				meta: { interface: 'input', width: 'half' }
			}
		],
		{ sort_field: null, archive_field: null, archive_value: null, unarchive_value: null }
	);
	await collection('menu_modifier_options', 'Opções dentro de um grupo', [
		id,
		status,
		sort,
		text('sku', 'Código interno (único)', { is_unique: true }),
		text('name', 'Nome exibido'),
		cents('price_cents', 'Preço adicional em centavos (500 = R$ 5,00)'),
		{
			field: 'max_quantity',
			type: 'integer',
			schema: { default_value: 1 },
			meta: { interface: 'input', width: 'half' }
		},
		{
			field: 'group',
			type: 'integer',
			meta: {
				interface: 'select-dropdown-m2o',
				special: ['m2o'],
				required: true,
				options: { template: '{{name}}' }
			}
		}
	]);
	await relation({
		collection: 'menu_modifier_options',
		field: 'group',
		related_collection: 'menu_modifier_groups',
		meta: { one_field: 'options', sort_field: 'sort' },
		schema: { on_delete: 'CASCADE' }
	});
	await field('menu_modifier_groups', {
		field: 'options',
		type: 'alias',
		meta: {
			interface: 'list-o2m',
			special: ['o2m'],
			options: { template: '{{name}} ({{price_cents}})' }
		}
	});

	await collection(
		'menu_products',
		'Produtos do cardápio (o preço vale para caixa, site e iFood manual)',
		[
			id,
			status,
			sort,
			text('sku', 'Código interno (único). Use o mesmo como "código externo" no iFood.', {
				is_unique: true
			}),
			text('slug', 'Usado na URL', { is_unique: true }),
			text('name', 'Nome exibido'),
			{ field: 'description', type: 'text', meta: { interface: 'input-multiline' } },
			{ field: 'image', type: 'uuid', meta: { interface: 'file-image', special: ['file'] } },
			{
				field: 'category',
				type: 'integer',
				meta: {
					interface: 'select-dropdown-m2o',
					special: ['m2o'],
					required: true,
					options: { template: '{{name}}' }
				}
			},
			cents('price_cents', 'Preço em centavos (2890 = R$ 28,90)'),
			{
				field: 'prep_station',
				type: 'string',
				schema: { default_value: 'grill' },
				meta: {
					interface: 'select-dropdown',
					width: 'half',
					options: {
						choices: [
							{ text: 'Chapa', value: 'grill' },
							{ text: 'Fritadeira', value: 'fryer' },
							{ text: 'Bebidas', value: 'drinks' },
							{ text: 'Montagem', value: 'assembly' }
						]
					}
				}
			},
			{
				field: 'channels',
				type: 'json',
				schema: {},
				meta: {
					interface: 'select-multiple-checkbox',
					special: ['cast-json'],
					options: {
						choices: [
							{ text: 'Caixa', value: 'counter' },
							{ text: 'Site', value: 'web' },
							{ text: 'iFood', value: 'ifood' }
						]
					}
				}
			},
			{ field: 'allergens', type: 'json', meta: { interface: 'tags', special: ['cast-json'] } }
		]
	);
	await relation({
		collection: 'menu_products',
		field: 'category',
		related_collection: 'menu_categories'
	});
	await relation({
		collection: 'menu_products',
		field: 'image',
		related_collection: 'directus_files'
	});

	await collection(
		'menu_products_modifier_groups',
		'Ligação produto ↔ grupo de opções',
		[
			id,
			{ field: 'menu_products_id', type: 'integer', meta: { hidden: true } },
			{ field: 'menu_modifier_groups_id', type: 'integer', meta: { hidden: true } },
			sort
		],
		{ hidden: true, archive_field: null, archive_value: null, unarchive_value: null }
	);
	await relation({
		collection: 'menu_products_modifier_groups',
		field: 'menu_products_id',
		related_collection: 'menu_products',
		meta: {
			one_field: 'modifier_groups',
			junction_field: 'menu_modifier_groups_id',
			sort_field: 'sort'
		},
		schema: { on_delete: 'CASCADE' }
	});
	await relation({
		collection: 'menu_products_modifier_groups',
		field: 'menu_modifier_groups_id',
		related_collection: 'menu_modifier_groups',
		meta: { one_field: null, junction_field: 'menu_products_id' },
		schema: { on_delete: 'CASCADE' }
	});
	await field('menu_products', {
		field: 'modifier_groups',
		type: 'alias',
		meta: {
			interface: 'list-m2m',
			special: ['m2m'],
			options: { template: '{{menu_modifier_groups_id.name}}' }
		}
	});

	await collection(
		'pages',
		'Páginas do site (sobre, alergênicos, privacidade, entrega)',
		[
			id,
			status,
			text('slug', 'sobre, alergenicos, privacidade ou entrega', { is_unique: true }),
			text('title', 'Título'),
			{
				field: 'blocks',
				type: 'json',
				meta: {
					interface: 'list',
					special: ['cast-json'],
					options: {
						fields: [
							{
								field: 'type',
								name: 'Tipo',
								type: 'string',
								meta: {
									interface: 'select-dropdown',
									options: {
										choices: [
											{ text: 'Título', value: 'heading' },
											{ text: 'Parágrafo', value: 'paragraph' }
										]
									}
								}
							},
							{ field: 'text', name: 'Texto', type: 'text', meta: { interface: 'input-multiline' } }
						]
					}
				}
			}
		],
		{ sort_field: null }
	);
}

const READ_COLLECTIONS = [
	'menu_categories',
	'menu_products',
	'menu_modifier_groups',
	'menu_modifier_options',
	'menu_products_modifier_groups',
	'pages',
	'directus_files'
];

async function storefrontUser() {
	const email = process.env.DIRECTUS_STOREFRONT_EMAIL ?? 'storefront@example.com';
	const [existing] = await api<{ id: string }[]>(
		'GET',
		`/users?filter[email][_eq]=${encodeURIComponent(email)}&limit=1`
	);
	if (existing) {
		console.log(`= storefront user ${email} (token unchanged; reset it in Directus if lost)`);
		return null;
	}
	const policyName = 'Storefront (leitura)';
	const [found] = await api<{ id: string }[]>(
		'GET',
		`/policies?filter[name][_eq]=${encodeURIComponent(policyName)}&limit=1`
	);
	const policy =
		found ??
		(await api<{ id: string }>('POST', '/policies', {
			name: policyName,
			icon: 'storefront',
			admin_access: false,
			app_access: false,
			description: 'Usado pelo app para ler o cardápio publicado.'
		}));
	const granted = await api<{ collection: string }[]>(
		'GET',
		`/permissions?filter[policy][_eq]=${policy.id}&limit=-1&fields=collection`
	);
	for (const c of READ_COLLECTIONS) {
		if (granted.some((g) => g.collection === c)) continue;
		const hasStatus = [
			'menu_categories',
			'menu_products',
			'menu_modifier_options',
			'pages'
		].includes(c);
		await api('POST', '/permissions', {
			policy: policy.id,
			collection: c,
			action: 'read',
			fields: ['*'],
			permissions: hasStatus ? { status: { _eq: 'published' } } : {}
		});
	}
	const staticToken = randomBytes(24).toString('hex');
	const user = await api<{ id: string }>('POST', '/users', {
		email,
		first_name: 'Storefront',
		token: staticToken,
		status: 'active'
	});
	await api('POST', '/access', { user: user.id, policy: policy.id });
	console.log(`+ storefront user ${email}`);
	return staticToken;
}

async function revalidateFlow() {
	const appUrl = process.env.APP_URL;
	const secret = process.env.CMS_WEBHOOK_SECRET;
	if (!appUrl || !secret)
		return console.log('- skipped cache flow (set APP_URL and CMS_WEBHOOK_SECRET)');
	const name = 'Atualizar cardápio no app';
	const [existing] = await api<{ id: string }[]>(
		'GET',
		`/flows?filter[name][_eq]=${encodeURIComponent(name)}&limit=1`
	);
	if (existing) return console.log('= cache flow');
	const flow = await api<{ id: string }>('POST', '/flows', {
		name,
		icon: 'sync',
		status: 'active',
		trigger: 'event',
		accountability: 'all',
		options: {
			type: 'action',
			scope: ['items.create', 'items.update', 'items.delete'],
			collections: [
				'menu_categories',
				'menu_products',
				'menu_modifier_groups',
				'menu_modifier_options',
				'menu_products_modifier_groups'
			]
		}
	});
	const op = await api<{ id: string }>('POST', '/operations', {
		flow: flow.id,
		name: 'Avisar o app',
		key: 'notify_app',
		type: 'request',
		position_x: 19,
		position_y: 1,
		options: {
			method: 'POST',
			url: new URL('/api/v1/cms/revalidate', appUrl).toString(),
			headers: [{ header: 'x-cms-secret', value: secret }],
			body: '{"collection":"{{$trigger.collection}}"}'
		}
	});
	await api('PATCH', `/flows/${flow.id}`, { operation: op.id });
	console.log('+ cache flow');
}

async function seedMenu() {
	const current = await api<unknown[]>('GET', '/items/menu_products?limit=1');
	if (current.length) return console.log('= menu already has products, not seeding');
	const catIds = new Map<string, number>();
	for (const c of fixtureCatalog.categories) {
		const row = await api<{ id: number }>('POST', '/items/menu_categories', {
			name: c.name,
			slug: c.slug,
			sort: c.position,
			status: 'published'
		});
		catIds.set(c.id, row.id);
	}
	const groupIds = new Map<string, number>();
	for (const p of fixtureCatalog.products) {
		for (const g of p.modifierGroups) {
			if (groupIds.has(g.id)) continue;
			const row = await api<{ id: number }>('POST', '/items/menu_modifier_groups', {
				key: g.id,
				name: g.name,
				min_selections: g.minSelections,
				max_selections: g.maxSelections,
				options: g.options.map((o, i) => ({
					sku: o.sku,
					name: o.name,
					price_cents: o.priceCents,
					max_quantity: o.maxQuantity,
					sort: i,
					status: 'published'
				}))
			});
			groupIds.set(g.id, row.id);
		}
	}
	for (const [i, p] of fixtureCatalog.products.entries()) {
		await api('POST', '/items/menu_products', {
			sku: p.sku,
			slug: p.slug,
			name: p.name,
			description: p.description,
			category: catIds.get(p.categoryId),
			price_cents: p.priceCents,
			prep_station: p.prepStation,
			channels: p.channels,
			allergens: p.allergens,
			sort: i,
			status: 'published',
			modifier_groups: p.modifierGroups.map((g, s) => ({
				menu_modifier_groups_id: groupIds.get(g.id),
				sort: s
			}))
		});
	}
	console.log(`+ seeded ${fixtureCatalog.products.length} products`);
}

if (!token) {
	const login = await api<{ access_token: string }>('POST', '/auth/login', {
		email: required('DIRECTUS_ADMIN_EMAIL'),
		password: required('DIRECTUS_ADMIN_PASSWORD')
	});
	token = login.access_token;
}
await schema();
const storefrontToken = await storefrontUser();
await revalidateFlow();
if (seed) await seedMenu();
if (storefrontToken) {
	console.log('\nSet this on the web app and worker (shown once):');
	console.log(`DIRECTUS_TOKEN=${storefrontToken}`);
}
