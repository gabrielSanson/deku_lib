// Keeps staff screens current. Supabase Realtime only says "orders changed";
// we then re-run the page's server load, which is the source of truth. If the
// realtime channel drops, we poll every 8 s and show the screen as possibly stale.
import { sessionCookieName } from '#lib/supabase-cookie.ts';
import { createBrowserClient } from '@supabase/ssr';
import { invalidate } from '$app/navigation';
import { onMount } from 'svelte';

export interface LiveState {
	connected: boolean;
	lastRefresh: Date;
}

export function useLiveOrders(
	getConfig: () => { supabaseUrl: string | null; supabaseAnonKey: string | null },
	onChange?: () => void
): LiveState {
	// lastRefresh is replaced, never mutated, so a plain Date is reactive enough.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const state = $state<LiveState>({ connected: false, lastRefresh: new Date() });

	onMount(() => {
		const config = getConfig();
		let poll: ReturnType<typeof setInterval> | undefined;
		let stopped = false;
		const refresh = async () => {
			await invalidate('app:orders');
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			state.lastRefresh = new Date();
			onChange?.();
		};
		const startPolling = () => {
			poll ??= setInterval(refresh, 8_000);
		};
		const stopPolling = () => {
			if (poll) clearInterval(poll);
			poll = undefined;
		};

		if (!config.supabaseUrl || !config.supabaseAnonKey) {
			startPolling();
			return stopPolling;
		}

		const supabase = createBrowserClient(config.supabaseUrl, config.supabaseAnonKey, {
			cookieOptions: { name: sessionCookieName(window.location.pathname) }
		});
		let channel: ReturnType<typeof supabase.channel> | undefined;
		// Join with the staff member's token: RLS hides order changes from anonymous
		// sockets, and an anonymous channel would look "connected" while staying silent.
		void (async () => {
			const { data } = await supabase.auth.getSession();
			if (stopped) return;
			if (!data.session) {
				startPolling();
				return;
			}
			await supabase.realtime.setAuth(data.session.access_token);
			channel = supabase
				.channel('staff-orders')
				.on(
					'postgres_changes',
					{ event: '*', schema: 'public', table: 'orders' },
					() => void refresh()
				)
				.on(
					'postgres_changes',
					{ event: '*', schema: 'public', table: 'store_runtime_settings' },
					() => void invalidate('app:settings')
				)
				.subscribe((status) => {
					if (stopped) return;
					state.connected = status === 'SUBSCRIBED';
					if (state.connected) {
						stopPolling();
						void refresh(); // catch anything missed while disconnected
					} else {
						startPolling();
					}
				});
		})();

		const onVisible = () => document.visibilityState === 'visible' && void refresh();
		const onOnline = () => void refresh();
		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('online', onOnline);
		startPolling();

		return () => {
			stopped = true;
			stopPolling();
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('online', onOnline);
			if (channel) void supabase.removeChannel(channel);
		};
	});

	return state;
}
