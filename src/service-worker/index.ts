// Caches only the app's static build files and icons. Menus, prices, orders,
// payments and staff screens always come from the network, so nobody ever
// sees a stale price or order. A failed page load shows the offline notice,
// which is cached at install and refreshed now and then so the owner's edits
// to its text reach it.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const CACHE = `static-${version}`;
const ASSETS = [...immutable, ...assets].map((a) => `/${a.path.replace(/^\//, '')}`);
const OFFLINE = '/offline';
const OFFLINE_REFRESH_MS = 10 * 60_000;
let offlineCachedAt = 0;

async function cacheOfflinePage() {
	offlineCachedAt = Date.now();
	const res = await fetch(OFFLINE, { cache: 'no-store' });
	if (res.ok) await (await caches.open(CACHE)).put(OFFLINE, res);
}

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(ASSETS))
			.then(() => cacheOfflinePage().catch(() => {}))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;

	if (ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(request)));
		return;
	}
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request).then(
				(res) => {
					if (Date.now() - offlineCachedAt > OFFLINE_REFRESH_MS)
						event.waitUntil(cacheOfflinePage().catch(() => {}));
					return res;
				},
				async () => (await caches.match(OFFLINE)) ?? Response.error()
			)
		);
	}
});

// "Avisar quando ficar pronto": the server sends { title, body, url, tag } when
// the order is ready and on each "Chamar". Tapping the notification opens the order.
sw.addEventListener('push', (event) => {
	let msg: { title?: string; body?: string; url?: string; tag?: string } = {};
	try {
		msg = event.data?.json() ?? {};
	} catch {
		/* not ours */
	}
	if (!msg.title) return;
	event.waitUntil(
		sw.registration.showNotification(msg.title, {
			body: msg.body,
			tag: msg.tag,
			data: { url: msg.url ?? '/' },
			icon: '/icon-192.png',
			// @ts-expect-error renotify is supported by Chromium; a repeated call must buzz again.
			renotify: true,
			vibrate: [200, 100, 200]
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = new URL(
		(event.notification.data as { url?: string })?.url ?? '/',
		sw.location.origin
	);
	event.waitUntil(
		sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
			const open = wins.find((w) => new URL(w.url).pathname === url.pathname);
			return open ? open.focus() : sw.clients.openWindow(url.href);
		})
	);
});
