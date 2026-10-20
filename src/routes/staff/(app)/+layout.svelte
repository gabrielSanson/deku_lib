<script lang="ts">
	import { page } from '$app/state';

	let { data, children } = $props();
	const manager = $derived(data.staff.role === 'owner' || data.staff.role === 'manager');
	const nav = $derived(
		[
			{ href: '/staff', label: 'Início', show: true },
			{ href: '/staff/pos', label: 'Caixa', show: data.staff.role !== 'kitchen' },
			{ href: '/staff/orders', label: 'Pedidos', show: true },
			{ href: '/kitchen', label: 'Cozinha', show: true },
			{ href: '/staff/menu', label: 'Cardápio', show: data.staff.role !== 'kitchen' },
			{ href: '/staff/reconciliation', label: 'Caixa do dia', show: manager },
			{ href: '/staff/analytics', label: 'Relatórios', show: manager },
			{ href: '/staff/settings/store', label: 'Loja', show: manager }
		].filter((n) => n.show)
	);
	const active = (href: string) =>
		href === '/staff' ? page.url.pathname === '/staff' : page.url.pathname.startsWith(href);
</script>

<div class="flex min-h-dvh flex-col">
	<header class="sticky top-0 z-20 border-b border-night-line bg-night text-white">
		<div class="flex items-center gap-3 px-3 py-2">
			<a
				href="/staff"
				class="flex shrink-0 items-center gap-2"
				aria-label="{data.shopName}, início"
			>
				<img src="/brand/deku-mark.png" alt="" class="h-8 w-auto" />
				<img
					src="/brand/deku-wordmark.png"
					alt={data.shopName}
					class="hidden h-5 w-auto sm:block"
				/>
			</a>
			{#if data.settings.acceptingOrders}
				<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
					>Aberto</span
				>
			{:else}
				<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
					>Pausado</span
				>
			{/if}
			<nav class="flex flex-1 gap-1 overflow-x-auto" aria-label="Principal">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap {active(item.href)
							? 'bg-brand-500 font-semibold text-black'
							: 'text-stone-300 hover:bg-night-2 hover:text-white'}"
						aria-current={active(item.href) ? 'page' : undefined}>{item.label}</a
					>
				{/each}
			</nav>
			<form method="POST" action="/staff/logout">
				<button
					class="btn min-h-9 text-sm text-stone-300 hover:bg-night-2 hover:text-white"
					title={data.staff.email ?? ''}
				>
					{data.staff.displayName} · Sair
				</button>
			</form>
		</div>
	</header>
	<div class="flex-1">
		{@render children()}
	</div>
</div>
