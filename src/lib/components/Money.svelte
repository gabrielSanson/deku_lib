<script lang="ts">
	import { formatBRL } from '#lib/domain/money.ts';

	let { cents, class: className = '' }: { cents: number; class?: string } = $props();
</script>

<span class="tabular-nums {className}">{formatBRL(cents)}</span>
