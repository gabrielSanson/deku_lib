// S5.4: delivery fee by distance. Radius rules use the shop's coordinates and the customer's
// geocoded address (cached); when geocoding fails, neighbourhood and CEP rules still apply.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import {
	deliveryRuleFor,
	geocode,
	geoQuery,
	lookupCep,
	saveShopPoint
} from '#lib/server/delivery/geo.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { deleteDeliveryRule, saveDeliveryRule } from '#lib/server/settings/service.ts';
import { makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const ruleIds: string[] = [];
const MASP = { lat: -23.5614, lng: -46.6559 };
const near = {
	cep: '01310-200',
	street: 'Av. Paulista',
	number: '2000',
	neighborhood: 'Bela Vista',
	city: 'São Paulo',
	state: 'SP'
};
const far = { ...near, cep: '01001-000', street: 'Praça da Sé', number: '1', neighborhood: 'Sé' };

const json = (body: unknown, ok = true) =>
	(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
const broken = (async () => {
	throw new Error('offline');
}) as unknown as typeof fetch;

beforeAll(async () => {
	manager = await makeStaff('admin');
	await db()`delete from delivery_rules`;
	await db()`delete from geocode_cache`;
	await saveShopPoint(MASP);
	for (const r of [
		{ name: 'Até 1 km', matchValue: '1', radiusM: 1000, feeCents: 400 },
		{ name: 'Até 5 km', matchValue: '5', radiusM: 5000, feeCents: 900 }
	])
		ruleIds.push(
			await saveDeliveryRule(
				{ ...r, matchKind: 'radius_km', minOrderCents: 0, enabled: true, priority: 100 },
				manager
			)
		);
});

afterAll(async () => {
	for (const id of ruleIds) await deleteDeliveryRule(id, manager);
	await saveShopPoint(null);
	await stopBoss();
	await closeDb();
});

describe('fee by distance', () => {
	it('geocodes once and caches the answer, found or not', async () => {
		let calls = 0;
		const counting = (async () => {
			calls++;
			return { ok: true, json: async () => [{ lat: '-23.5596', lon: '-46.6580' }] };
		}) as unknown as typeof fetch;
		expect(await geocode(near, db(), counting)).toEqual({ lat: -23.5596, lng: -46.658 });
		expect(await geocode(near, db(), counting)).toEqual({ lat: -23.5596, lng: -46.658 });
		expect(calls).toBe(1);
		expect(await geocode({ ...near, number: '9' }, db(), json([]))).toBeNull();
		const [miss] = await db()<{ lat: number | null }[]>`
			select lat from geocode_cache where query = ${geoQuery({ ...near, number: '9' })}`;
		expect(miss).toEqual({ lat: null });
		// A service error is not cached: it is tried again next time.
		expect(await geocode({ ...near, number: '7' }, db(), json(null, false))).toBeNull();
		const [none] =
			await db()`select 1 from geocode_cache where query = ${geoQuery({ ...near, number: '7' })}`;
		expect(none).toBeUndefined();
	});

	it('picks the smallest radius that covers the address', async () => {
		const a = await deliveryRuleFor(near);
		expect(a.distanceM).toBeLessThan(1000);
		expect(a.rule?.feeCents).toBe(400);
		await db()`insert into geocode_cache (query, lat, lng) values (${geoQuery(far)}, -23.5503, -46.6339)`;
		const b = await deliveryRuleFor(far);
		expect(b.distanceM).toBeGreaterThan(2000);
		expect(b.rule?.feeCents).toBe(900);
	});

	it('falls back to neighbourhood rules when the address cannot be found', async () => {
		const lost = { ...near, number: '3', neighborhood: 'Consolação' };
		expect((await deliveryRuleFor(lost, db(), broken)).rule).toBeNull();
		ruleIds.push(
			await saveDeliveryRule(
				{
					name: 'Consolação',
					matchKind: 'neighborhood',
					matchValue: 'Consolação',
					feeCents: 700,
					minOrderCents: 0,
					enabled: true,
					priority: 100
				},
				manager
			)
		);
		const r = await deliveryRuleFor(lost, db(), broken);
		expect(r.distanceM).toBeNull();
		expect(r.rule?.feeCents).toBe(700);
	});

	it('does not geocode without a shop location', async () => {
		await saveShopPoint(null);
		const r = await deliveryRuleFor({ ...near, number: '5' }, db(), broken);
		expect(r).toEqual({ rule: null, distanceM: null });
		await saveShopPoint(MASP);
	});

	it('reads ViaCEP answers', async () => {
		expect(
			await lookupCep(
				'01310-100',
				json({
					logradouro: 'Avenida Paulista',
					bairro: 'Bela Vista',
					localidade: 'São Paulo',
					uf: 'SP'
				})
			)
		).toEqual({
			street: 'Avenida Paulista',
			neighborhood: 'Bela Vista',
			city: 'São Paulo',
			state: 'SP'
		});
		expect(await lookupCep('00000000', json({ erro: 'true' }))).toBeNull();
		expect(await lookupCep('123', json({}))).toBeNull();
		expect(await lookupCep('01310100', broken)).toBeNull();
	});
});
