import { parseBRL } from '#lib/domain/money.ts';
import { matchDeliveryRule } from '#lib/domain/pricing.ts';
import { attempt, failText, formString } from '#lib/server/actions.ts';
import { ADMIN, requireStaff, staffActor } from '#lib/server/auth/staff.ts';
import {
	deleteDeliveryRule,
	listDeliveryRules,
	saveDeliveryRule
} from '#lib/server/settings/service.ts';
import { parseRadiusKm } from '#lib/domain/geo.ts';
import { geocode, saveShopPoint, shopPoint } from '#lib/server/delivery/geo.ts';
import { getStoreProfile } from '#lib/server/settings/profile.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	requireStaff(event, ADMIN);
	const rules = await listDeliveryRules();
	const cep = event.url.searchParams.get('cep') ?? '';
	const hood = event.url.searchParams.get('bairro') ?? '';
	const preview =
		cep || hood ? { cep, hood, rule: matchDeliveryRule(rules, { cep, neighborhood: hood }) } : null;
	return { rules, preview, location: await shopPoint() };
};

export const actions: Actions = {
	save: async (event) => {
		const staff = requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const kind = formString(d, 'matchKind');
		if (kind !== 'cep_prefix' && kind !== 'neighborhood' && kind !== 'radius_km')
			return failText(400, 'err.type.invalid');
		const fee = parseBRL(formString(d, 'fee'));
		const min = parseBRL(formString(d, 'minOrder') || '0');
		const value = formString(d, 'matchValue');
		if (fee === null || min === null || !value || !formString(d, 'name')) {
			return failText(400, 'err.delivery.fields');
		}
		const radiusM = kind === 'radius_km' ? parseRadiusKm(value) : null;
		if (kind === 'radius_km' && radiusM === null) return failText(400, 'err.delivery.radius');
		return attempt(async () => {
			await saveDeliveryRule(
				{
					id: formString(d, 'id') || undefined,
					name: formString(d, 'name'),
					matchKind: kind,
					matchValue:
						kind === 'cep_prefix'
							? value.replace(/\D/g, '')
							: kind === 'radius_km'
								? String(radiusM! / 1000).replace('.', ',')
								: value,
					radiusM,
					feeCents: fee,
					minOrderCents: min,
					enabled: d.get('enabled') === 'on',
					priority: Number(formString(d, 'priority') || 100)
				},
				staffActor(staff)
			);
			return { ok: true };
		});
	},
	location: async (event) => {
		requireStaff(event, ADMIN);
		const d = await event.request.formData();
		const num = (k: string) => Number(formString(d, k).replace(',', '.'));
		if (!formString(d, 'lat') && !formString(d, 'lng')) {
			await saveShopPoint(null);
			return { ok: true };
		}
		const lat = num('lat');
		const lng = num('lng');
		if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
			return failText(400, 'err.delivery.location');
		await saveShopPoint({ lat, lng });
		return { ok: true };
	},
	locate: async (event) => {
		requireStaff(event, ADMIN);
		const p = await getStoreProfile();
		const point = p.addressLine
			? await geocode({ cep: '', street: p.addressLine, neighborhood: '', city: p.city ?? '' })
			: null;
		if (!point) return failText(400, 'err.delivery.locateFailed');
		await saveShopPoint(point);
		return { ok: true };
	},
	delete: async (event) => {
		const staff = requireStaff(event, ADMIN);
		await deleteDeliveryRule(formString(await event.request.formData(), 'id'), staffActor(staff));
		return { ok: true };
	}
};
