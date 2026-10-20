<script lang="ts">
	import { STATUS_LABEL_PT, type OrderStatus } from '#lib/domain/order-status.ts';

	let { status }: { status: OrderStatus } = $props();

	const tone: Record<OrderStatus, string> = {
		new: 'bg-amber-100 text-amber-900 ring-amber-300',
		confirmed: 'bg-sky-100 text-sky-900 ring-sky-300',
		preparing: 'bg-orange-100 text-orange-900 ring-orange-300',
		ready: 'bg-green-100 text-green-900 ring-green-300',
		completed: 'bg-stone-100 text-stone-700 ring-stone-300',
		cancelled: 'bg-red-100 text-red-900 ring-red-300',
		rejected: 'bg-red-100 text-red-900 ring-red-300'
	};
</script>

<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 {tone[status]}">
	{STATUS_LABEL_PT[status]}
</span>
