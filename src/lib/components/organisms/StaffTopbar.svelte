<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';

	// The phone and tablet top bar: opens the staff menu drawer, shows the shop
	// name and the open/paused status. Hidden on wide screens, where the sidebar is.
	let {
		menuOpen,
		onopen,
		brand,
		status
	}: { menuOpen: boolean; onopen: () => void; brand: Snippet; status: Snippet } = $props();
	const t = useTexts();
</script>

<header
	class="sticky top-0 z-20 flex items-center gap-3 border-b border-night-line bg-night px-3 py-2 text-white lg:hidden"
>
	<button
		class="btn min-h-10 px-2 text-stone-300 hover:bg-night-2 hover:text-white"
		aria-label={t('shell.openMenu')}
		aria-expanded={menuOpen}
		aria-controls="staff-drawer"
		onclick={onopen}
	>
		<Icon name="menu" />
	</button>
	{@render brand()}
	<span class="flex-1"></span>
	{@render status()}
</header>
