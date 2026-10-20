<script lang="ts">
	import { PAYMENT_LABEL_PT, type PaymentStatus } from '#lib/domain/order-status.ts';

	let { status }: { status: PaymentStatus } = $props();
	const tone: Record<PaymentStatus, string> = {
		pending: 'text-amber-800 bg-amber-50 ring-amber-200',
		paid: 'text-green-800 bg-green-50 ring-green-200',
		failed: 'text-red-800 bg-red-50 ring-red-200',
		cancelled: 'text-stone-700 bg-stone-50 ring-stone-200',
		refunded: 'text-purple-800 bg-purple-50 ring-purple-200',
		unknown: 'text-red-800 bg-red-50 ring-red-300'
	};
</script>

<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 {tone[status]}">
	{PAYMENT_LABEL_PT[status]}
</span>
