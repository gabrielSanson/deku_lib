<script lang="ts">
	// The pickup code staff call out: the last 3 digits large, the full order number small
	// beside it, so two orders that share the last digits can still be told apart.
	import { pickupCode } from '#lib/domain/pickup.ts';

	let {
		number,
		class: klass = '',
		fullClass = 'text-[0.35em] font-bold opacity-70',
		testid
	}: {
		number: number;
		/** Size and colour of the large code, e.g. "text-7xl text-yellow-300". */
		class?: string;
		/** Style of the small full number. */
		fullClass?: string;
		/** Put on the full number, for tests that read it. */
		testid?: string;
	} = $props();
</script>

<span class="inline-flex items-baseline gap-[0.25em] font-black tabular-nums {klass}">
	<span>{pickupCode(number)}</span>
	<span class={fullClass} data-testid={testid}>#{number}</span>
</span>
