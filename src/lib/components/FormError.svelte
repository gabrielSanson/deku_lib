<script lang="ts">
	let { message }: { message?: string | null } = $props();
</script>

{#if message}
	<p class="alert-error" role="alert">{message}</p>
{/if}
