<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import StaffNav from '#lib/components/organisms/StaffNav.svelte';
	import { activeHref, navFor } from '#lib/staff/nav.ts';

	let { data, children } = $props();
	const groups = $derived(navFor(data.staff.role));
	const current = $derived(activeHref(groups, page.url.pathname));
	let drawerOpen = $state(false);
	afterNavigate(() => (drawerOpen = false));
</script>

{#snippet brand(mark = true)}
	<a href="/staff" class="flex shrink-0 items-center gap-2" aria-label="{data.shopName}, início">
		{#if mark}<img src={data.branding.images.logo} alt="" class="h-9 w-auto" />{/if}
		<img src={data.branding.images.wordmark} alt={data.shopName} class="h-6 w-auto" />
	</a>
{/snippet}

{#snippet status()}
	{#if data.settings.acceptingOrders && !data.inHours}
		<a
			href="/staff/settings/hours"
			class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
			>Fora do horário</a
		>
	{:else if data.settings.acceptingOrders}
		<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800"
			>Aberto</span
		>
	{:else}
		<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800"
			>Pausado</span
		>
	{/if}
{/snippet}

{#snippet navigation(mascot = false)}
	<StaffNav {groups} {current}>
		{#snippet footer()}
			{#if mascot}
				<img
					src={data.branding.images.logo}
					alt=""
					class="mx-auto mb-3 hidden h-24 w-auto [@media(min-height:860px)]:block"
				/>
			{/if}
			<form method="POST" action="/staff/logout" class="border-t border-night-line p-3">
				<button
					class="flex min-h-11 w-full items-center gap-3 rounded-(--radius-control) px-3 text-left text-sm text-stone-300 hover:bg-night-2 hover:text-white"
					title={data.staff.email ?? ''}
				>
					<Icon name="logout" class="size-4.5 shrink-0" />
					<span class="flex-1 truncate">{data.staff.displayName}</span>
					<span class="text-xs">Sair</span>
				</button>
			</form>
		{/snippet}
	</StaffNav>
{/snippet}

<div class="min-h-dvh lg:flex">
	<!-- Wide screens: fixed sidebar. -->
	<aside
		class="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-night-line bg-night text-white lg:flex"
	>
		<div class="flex items-center justify-between gap-2 px-5 pt-5">
			<!-- The mascot sits at the foot of the sidebar instead. -->
			{@render brand(false)}
			{@render status()}
		</div>
		{@render navigation(true)}
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
