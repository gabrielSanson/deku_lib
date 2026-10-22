<script lang="ts">
	// A KPI tile: yellow icon square, label, big value and an optional change
	// against an earlier period ("+12% vs. ontem").
	import Icon, { type IconName } from '#lib/components/atoms/Icon.svelte';

	let {
		icon,
		label,
		value,
		hint,
		delta,
		deltaLabel = 'vs. ontem',
		/** Set when a rise is bad news, e.g. average prep time. */
		lowerIsBetter = false
	}: {
		icon: IconName;
		label: string;
		value: string;
		hint?: string;
		/** Relative change, 0.12 = +12%. Null hides the line. */
		delta?: number | null;
		deltaLabel?: string;
		lowerIsBetter?: boolean;
	} = $props();

	const good = $derived(delta == null ? null : lowerIsBetter ? delta <= 0 : delta >= 0);
	const pct = $derived(
		delta == null
			? ''
			: `${delta >= 0 ? '+' : '−'}${Math.abs(delta * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`
	);
</script>

<div class="flex items-start gap-3 card p-4">
	<span
		class="grid size-11 shrink-0 place-items-center rounded-(--radius-control) bg-brand-500 text-black"
	>
		<Icon name={icon} class="size-5.5" />
	</span>
	<div class="min-w-0 flex-1">
		<p class="text-sm font-medium text-muted">{label}</p>
		<p
			class="font-display text-2xl leading-tight [overflow-wrap:anywhere] tabular-nums sm:text-3xl"
		>
			{value}
		</p>
		{#if hint}<p class="text-xs text-muted">{hint}</p>{/if}
		{#if delta != null}
			<p
				class="mt-0.5 flex items-center gap-1 text-xs font-semibold {good ? 'text-ok' : 'text-bad'}"
			>
				<Icon name={delta >= 0 ? 'trendUp' : 'trendDown'} class="size-3.5" />
				{pct} <span class="font-normal text-muted">{deltaLabel}</span>
			</p>
		{/if}
	</div>
</div>
