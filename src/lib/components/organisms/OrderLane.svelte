<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';

	// One column of the orders board: a tinted panel with a title, a hint and the order count.
	let {
		id,
		title,
		hint,
		icon,
		tone,
		count,
		children
	}: {
		id: string;
		title: string;
		hint: string;
		icon: IconName;
		tone: string;
		count: number;
		children: Snippet;
	} = $props();
</script>

<section class="rounded-(--radius-card) p-3 {tone}" aria-labelledby="lane-{id}">
	<header class="mb-3 flex items-center justify-between gap-2 px-1">
		<div class="flex items-start gap-2">
			<Icon name={icon} class="mt-1 size-5 text-ink" />
			<div>
				<h2 id="lane-{id}" class="font-display text-xl font-extrabold">{title}</h2>
				<p class="text-sm text-muted">{hint}</p>
			</div>
		</div>
		<span class="count">{count}</span>
	</header>
	<ul class="space-y-3">
		{@render children()}
	</ul>
</section>
