<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import type { NavGroup } from '#lib/staff/nav.ts';

	// The staff menu, used by the wide sidebar and by the phone drawer.
	// `footer` sits under the links (mascot, sign-out).
	let {
		groups,
		current,
		footer
	}: { groups: NavGroup[]; current: string | null; footer?: Snippet } = $props();
</script>

<nav class="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Principal">
	{#each groups as g (g.label)}
		<div>
			<p class="px-3 pb-1.5 text-[13px] font-medium text-stone-400">
				{g.label}
			</p>
			<ul class="space-y-1">
				{#each g.links as item (item.href)}
					<li>
						<a
							href={item.href}
							class="flex min-h-11 items-center gap-3 rounded-(--radius-control) px-3 text-[15px] font-medium transition-colors {current ===
							item.href
								? 'bg-brand-500 font-semibold text-black'
								: 'text-stone-200 hover:bg-night-2 hover:text-white'}"
							aria-current={current === item.href ? 'page' : undefined}
						>
							<Icon name={item.icon} class="size-5 shrink-0" />
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</nav>
{@render footer?.()}
