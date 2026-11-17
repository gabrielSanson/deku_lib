// Peak-hour load test (S5.12) for k6 (https://k6.io, AGPL: run it, never add it as a dependency).
// Run only against a local docker stack, never production. See docs/load-test.md.
//
//   k6 run -e BASE_URLS=http://localhost:3000 -e ORDERS_PER_HOUR=200 -e DURATION=30m \
//          -e STAFF_COOKIE="sb-...=..." tests/load/peak.js
//
// BASE_URLS: one URL per shop, comma separated (multi-shop: each shop's own host).
// ORDERS_PER_HOUR is per shop. STAFF_COOKIE (optional) is a signed-in staff session cookie; with
// it, three staff screens per shop poll the order board every 5 s.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import exec from 'k6/execution';

const BASES = (__ENV.BASE_URLS || 'http://localhost:3000').split(',').map((s) => s.trim());
const PER_HOUR = Number(__ENV.ORDERS_PER_HOUR || 200);
const DURATION = __ENV.DURATION || '30m';
const STAFF_COOKIE = __ENV.STAFF_COOKIE || '';
const SKUS = (__ENV.SKUS || 'BRG-DUPLO,ACP-FRITAS,ACP-ONION,BEB-SUCO').split(',');

const checkoutMs = new Trend('checkout_ms', true);
const checkoutFailed = new Rate('checkout_failed');

const scenarios = {
	customers: {
		executor: 'constant-arrival-rate',
		rate: Math.max(1, Math.round((PER_HOUR * BASES.length) / 60)),
		timeUnit: '1m',
		duration: DURATION,
		preAllocatedVUs: 10,
		maxVUs: 50,
		exec: 'customer'
	}
};
if (STAFF_COOKIE) {
	scenarios.staff = {
		executor: 'constant-vus',
		vus: 3 * BASES.length,
		duration: DURATION,
		exec: 'staff'
	};
}

export const options = {
	scenarios,
	thresholds: {
		checkout_ms: ['p(95)<800'],
		checkout_failed: ['rate<0.005'],
		http_req_failed: ['rate<0.005']
	}
};

function uuid() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}

// Each simulated customer gets its own address so the per-address checkout limit applies per
// customer, as in real life (the server must run with ADDRESS_HEADER=x-forwarded-for).
function fakeIp() {
	const n = exec.scenario.iterationInTest;
	return `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;
}

export function customer() {
	const base = BASES[exec.scenario.iterationInTest % BASES.length];
	const sku = SKUS[Math.floor(Math.random() * SKUS.length)];
	const payload = {
		lines: [{ sku, quantity: 1 + Math.floor(Math.random() * 2), options: [] }],
		fulfillmentType: 'pickup',
		name: 'Teste Carga',
		phone: `1199${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`,
		payment: 'pix_key',
		idempotencyKey: uuid()
	};
	const headers = {
		origin: base,
		'x-forwarded-for': fakeIp(),
		'x-sveltekit-action': 'true',
		accept: 'application/json'
	};
	// The menu first, as a customer would.
	http.get(`${base}/`, { headers: { 'x-forwarded-for': headers['x-forwarded-for'] } });
	const res = http.post(
		`${base}/checkout?/place`,
		{ payload: JSON.stringify(payload) },
		{ headers, tags: { name: 'checkout' }, redirects: 0 }
	);
	checkoutMs.add(res.timings.duration);
	// SvelteKit answers an action with JSON: {type: "redirect"} once the order exists.
	const ok = check(res, {
		'order placed': (r) => r.status === 200 && String(r.body).includes('"type":"redirect"')
	});
	checkoutFailed.add(!ok);
}

export function staff() {
	const base = BASES[(exec.vu.idInTest - 1) % BASES.length];
	const res = http.get(`${base}/staff/orders/__data.json`, {
		headers: { cookie: STAFF_COOKIE },
		tags: { name: 'staff_board' }
	});
	check(res, {
		'board loads': (r) => r.status === 200 && String(r.body).startsWith('{"type":"data"')
	});
	sleep(5);
}
