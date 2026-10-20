/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Caches only the app's static build files and icons. Menus, prices, orders,
// payments and staff screens always come from the network, so nobody ever
// sees a stale price or order. A failed page load shows the offline notice.
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { self as sw } from '$app/service-worker';

const CACHE = `static-${version}`;
const ASSETS = [...immutable, ...assets].map((a) => `/${a.path.replace(/^\//, '')}`);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(ASSETS))
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
			fetch(request).catch(async () => (await caches.match('/offline.html')) ?? Response.error())
		);
	}
});
