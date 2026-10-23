<script lang="ts">
	import type { PaymentStatus } from '#lib/domain/order-status.ts';
	import { useLabels } from '#lib/texts/context.ts';

	let { status }: { status: PaymentStatus } = $props();
	const label = useLabels();
	const tone: Record<PaymentStatus, string> = {
		pending: 'text-warn bg-brand-tint',
		paid: 'text-ok bg-ok-tint',
		failed: 'text-bad bg-bad-tint',
		cancelled: 'text-muted bg-quiet',
		refunded: 'text-info bg-info-tint',
		unknown: 'text-bad bg-bad-tint'
	};
</script>

<span
	class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold {tone[status]}"
>
	{label.payment(status)}
</span>
