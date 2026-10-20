<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import { activeHref, navFor } from '#lib/staff/nav.ts';

	let { data, children } = $props();
	const groups = $derived(navFor(data.staff.role));
	const current = $derived(activeHref(groups, page.url.pathname));
	let drawerOpen = $state(false);
	afterNavigate(() => (drawerOpen = false));
</script>

{#snippet brand()}
	<a href="/staff" class="flex shrink-0 items-center gap-2" aria-label="{data.shopName}, início">
		<img src={data.branding.images.logo} alt="" class="h-8 w-auto" />
		<img src={data.branding.images.wordmark} alt={data.shopName} class="h-5 w-auto" />
	</a>
{/snippet}

{#snippet status()}
	{#if data.settings.acceptingOrders}
		<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
			>Aberto</span
		>
	{:else}
		<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
			>Pausado</span
		>
	{/if}
{/snippet}

{#snippet navigation()}
	<nav class="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Principal">
		{#each groups as g (g.label)}
			<div>
				<p class="px-3 pb-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
					{g.label}
				</p>
				<ul class="space-y-0.5">
					{#each g.links as item (item.href)}
						<li>
							<a
								href={item.href}
								class="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium {current ===
								item.href
									? 'bg-brand-500 font-semibold text-black'
									: 'text-stone-300 hover:bg-night-2 hover:text-white'}"
								aria-current={current === item.href ? 'page' : undefined}
							>
								<Icon name={item.icon} class="size-4.5 shrink-0" />
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>
	<form method="POST" action="/staff/logout" class="border-t border-night-line p-3">
		<button
			class="flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-stone-300 hover:bg-night-2 hover:text-white"
			title={data.staff.email ?? ''}
		>
			<Icon name="logout" class="size-4.5 shrink-0" />
			<span class="flex-1 truncate">{data.staff.displayName}</span>
			<span class="text-xs">Sair</span>
		</button>
	</form>
{/snippet}

<div class="min-h-dvh lg:flex">
	<!-- Wide screens: fixed sidebar. -->
	<aside
		class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-night-line bg-night text-white lg:flex"
	>
		<div class="flex items-center justify-between gap-2 px-4 pt-4">
			{@render brand()}
			{@render status()}
		</div>
		{@render navigation()}
	</aside>

	<!-- Phones and tablets: top bar with a menu drawer. -->
	<header
		class="sticky top-0 z-20 flex items-center gap-3 border-b border-night-line bg-night px-3 py-2 text-white lg:hidden"
	>
		<button
			class="btn min-h-10 px-2 text-stone-300 hover:bg-night-2 hover:text-white"
			aria-label="Abrir menu"
			aria-expanded={drawerOpen}
			aria-controls="staff-drawer"
			onclick={() => (drawerOpen = true)}
		>
			<Icon name="menu" />
		</button>
		{@render brand()}
		<span class="flex-1"></span>
		{@render status()}
	</header>
	{#if drawerOpen}
		<div class="fixed inset-0 z-40 lg:hidden">
			<button
				class="absolute inset-0 bg-black/50"
				aria-label="Fechar menu"
				onclick={() => (drawerOpen = false)}
			></button>
			<aside
				id="staff-drawer"
				class="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-night text-white shadow-xl"
			>
				<div class="flex items-center justify-between gap-2 px-4 pt-3">
					{@render brand()}
					<button
						class="btn min-h-10 px-2 text-stone-300 hover:bg-night-2 hover:text-white"
						aria-label="Fechar menu"
						onclick={() => (drawerOpen = false)}
					>
						<Icon name="close" />
					</button>
				</div>
				{@render navigation()}
			</aside>
		</div>
	{/if}

	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (drawerOpen = false)} />
