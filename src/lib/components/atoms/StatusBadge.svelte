<script lang="ts">
	import { useLabels } from '#lib/texts/context.ts';
	import { type OrderStatus } from '#lib/domain/order-status.ts';

	let { status }: { status: OrderStatus } = $props();
	const label = useLabels();

	const tone: Record<OrderStatus, string> = {
		new: 'bg-bad-tint text-bad',
		confirmed: 'bg-info-tint text-info',
		preparing: 'bg-brand-100 text-brand-700',
		ready: 'bg-ok-tint text-ok',
		completed: 'bg-quiet text-muted',
		cancelled: 'bg-quiet text-bad',
		rejected: 'bg-quiet text-bad'
	};
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold {tone[
		status
	]}"
>
	{label.status(status)}
</span>
