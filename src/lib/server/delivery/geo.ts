// Coordinates for delivery fees by distance (S5.4). Addresses are geocoded with OpenStreetMap's
// Nominatim (open data; usage policy: at most 1 request per second, an identifying User-Agent,
// results cached), and CEPs are looked up with ViaCEP for the checkout autofill.
// [UNVERIFIED] TODO(verify): ViaCEP availability terms and Nominatim's fair-use limits for a
// production shop; a self-hosted Nominatim or a paid geocoder can replace `geocode` later.
import { distanceMeters, type Point } from '#lib/domain/geo.ts';
import { matchDeliveryRule, normalizeCep, type DeliveryRule } from '#lib/domain/pricing.ts';
import { db, type Db } from '../db';
import { listDeliveryRules } from '../settings/service';

const USER_AGENT = 'burger-shop-platform/1.0 (delivery fee by distance)';
const TIMEOUT_MS = 4000;
let lastNominatim = 0;

export interface AddressForGeo {
	cep: string;
	street?: string;
	number?: string;
	neighborhood: string;
	city?: string;
	state?: string;
}

export function geoQuery(a: AddressForGeo) {
	return [
		`${a.street ?? ''} ${a.number ?? ''}`.trim(),
		a.neighborhood,
		a.city,
		a.state,
		normalizeCep(a.cep)
	]
		.map((p) => (p ?? '').trim())
		.filter(Boolean)
		.join(', ')
		.toLowerCase()
		.slice(0, 300);
}

type Fetcher = typeof fetch;

/** The coordinates of an address (cached; null when not found or the service is down). */
export async function geocode(
	a: AddressForGeo,
	sql: Db = db(),
	fetcher: Fetcher = fetch
): Promise<Point | null> {
	const query = geoQuery(a);
	if (!query) return null;
	const [hit] = await sql<{ lat: number | null; lng: number | null }[]>`
		select lat, lng from geocode_cache where query = ${query}`;
	if (hit) return hit.lat != null && hit.lng != null ? { lat: hit.lat, lng: hit.lng } : null;
	// One request per second across this server, as Nominatim's policy asks.
	const wait = lastNominatim + 1000 - Date.now();
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
	lastNominatim = Date.now();
	let point: Point | null = null;
	try {
		const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
		const res = await fetcher(url, {
			headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
		if (!res.ok) return null; // not cached: try again next time
		const [first] = (await res.json()) as { lat?: string; lon?: string }[];
		const lat = Number(first?.lat);
		const lng = Number(first?.lon);
		if (Number.isFinite(lat) && Number.isFinite(lng)) point = { lat, lng };
	} catch {
		return null;
	}
	// "Not found" is cached too, so a bad address doesn't call the service on every quote.
	await sql`insert into geocode_cache (query, lat, lng) values (${query}, ${point?.lat ?? null}, ${point?.lng ?? null})
		on conflict (query) do nothing`;
	return point;
}

export async function shopPoint(sql: Db = db()): Promise<Point | null> {
	const [p] = await sql<{ lat: number | null; lng: number | null }[]>`
		select lat, lng from store_profile where shop_id = current_shop_id()`;
	return p?.lat != null && p?.lng != null ? { lat: p.lat, lng: p.lng } : null;
}

export async function saveShopPoint(point: Point | null, sql: Db = db()) {
	await sql`update store_profile set lat = ${point?.lat ?? null}, lng = ${point?.lng ?? null}
		where shop_id = current_shop_id()`;
}

/**
 * The delivery rule for an address. Geocodes only when the shop has radius rules and its own
 * coordinates; if that fails, neighbourhood and CEP rules still apply (never a silent block).
 */
export async function deliveryRuleFor(
	address: AddressForGeo,
	sql: Db = db(),
	fetcher: Fetcher = fetch
): Promise<{ rule: DeliveryRule | null; distanceM: number | null }> {
	const rules = await listDeliveryRules(sql);
	let distanceM: number | null = null;
	if (rules.some((r) => r.enabled && r.matchKind === 'radius_km')) {
		const shop = await shopPoint(sql);
		const here = shop ? await geocode(address, sql, fetcher) : null;
		if (shop && here) distanceM = distanceMeters(shop, here);
	}
	return { rule: matchDeliveryRule(rules, { ...address, distanceM }), distanceM };
}

export interface CepAddress {
	street: string;
	neighborhood: string;
	city: string;
	state: string;
}

/** ViaCEP lookup for the checkout autofill; null when unknown or unavailable. */
export async function lookupCep(cep: string, fetcher: Fetcher = fetch): Promise<CepAddress | null> {
	const digits = normalizeCep(cep);
	if (digits.length !== 8) return null;
	try {
		const res = await fetcher(`https://viacep.com.br/ws/${digits}/json/`, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(3000)
		});
		if (!res.ok) return null;
		const j = (await res.json()) as {
			erro?: boolean | string;
			logradouro?: string;
			bairro?: string;
			localidade?: string;
			uf?: string;
		};
		if (j.erro) return null;
		return {
			street: j.logradouro ?? '',
			neighborhood: j.bairro ?? '',
			city: j.localidade ?? '',
			state: j.uf ?? ''
		};
	} catch {
		return null;
	}
}
