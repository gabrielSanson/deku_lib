<script lang="ts">
	import { useTexts } from '#lib/texts/context.ts';
	// Two lines for one day: sales and orders per hour, 08h to 22h (mockup 04).
	// Each line is scaled to its own peak, so the legend shows the peak values.
	import { formatBRL } from '#lib/domain/money.ts';

	export interface HourPoint {
		hour: number;
		orders: number;
		grossCents: number;
	}
	let { points, from = 8, to = 22 }: { points: HourPoint[]; from?: number; to?: number } = $props();

	const W = 600;
	const H = 180;
	const hours = $derived(Array.from({ length: to - from + 1 }, (_, i) => from + i));
	const byHour = $derived(new Map(points.map((p) => [p.hour, p])));
	const peakSales = $derived(Math.max(1, ...hours.map((h) => byHour.get(h)?.grossCents ?? 0)));
	const peakOrders = $derived(Math.max(1, ...hours.map((h) => byHour.get(h)?.orders ?? 0)));
	const x = (i: number) => (hours.length === 1 ? W / 2 : (i / (hours.length - 1)) * W);
	const y = (v: number, peak: number) => H - (v / peak) * (H - 12) - 6;
	const line = (pick: (h: number) => number, peak: number) =>
		hours.map((h, i) => `${x(i).toFixed(1)},${y(pick(h), peak).toFixed(1)}`).join(' ');
	const salesLine = $derived(line((h) => byHour.get(h)?.grossCents ?? 0, peakSales));
	const ordersLine = $derived(line((h) => byHour.get(h)?.orders ?? 0, peakOrders));
	const t = useTexts();
</script>

<figure class="space-y-2">
	<div class="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-muted">
		<span class="flex items-center gap-1.5"
			><span class="h-0.5 w-4 bg-brand-500"></span>{t('chart.salesPeak', {
				value: formatBRL(peakSales)
			})}</span
		>
		<span class="flex items-center gap-1.5"
			><span class="h-0.5 w-4 bg-ink"></span>{t('chart.ordersPeak', { value: peakOrders })}</span
		>
	</div>
	<svg
		viewBox="0 0 {W} {H}"
		class="h-44 w-full overflow-visible"
		role="img"
		aria-label={t('chart.hourly')}
	>
		<line x1="0" y1={H} x2={W} y2={H} class="stroke-line" stroke-width="1" />
		<polyline
			points={salesLine}
			fill="none"
			class="stroke-brand-500"
			stroke-width="3"
			stroke-linejoin="round"
		/>
		<polyline
			points={ordersLine}
			fill="none"
			class="stroke-ink"
			stroke-width="2"
			stroke-dasharray="6 4"
			stroke-linejoin="round"
		/>
	</svg>
	<div class="flex justify-between text-[11px] text-muted tabular-nums">
		{#each hours as h (h)}<span>{String(h).padStart(2, '0')}h</span>{/each}
	</div>
</figure>
