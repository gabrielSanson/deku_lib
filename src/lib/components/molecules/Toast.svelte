<script lang="ts">
	// A short message that appears in a polite live region, so screen readers announce it without taking focus.
	import { fade } from 'svelte/transition';

	let { message, tone = 'ok' }: { message: string | null; tone?: 'ok' | 'bad' } = $props();

	const tones = { ok: 'bg-ink text-canvas', bad: 'bg-bad-strong text-white' };
</script>

<div
	role="status"
	aria-live="polite"
	class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center"
>
	{#if message}
		<p
			transition:fade={{ duration: 150 }}
			class="rounded-(--radius-control) px-4 py-3 text-sm font-semibold shadow-lg {tones[tone]}"
		>
			{message}
		</p>
	{/if}
</div>
