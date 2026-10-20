<script lang="ts">
	// The settings pages are reached from the "Loja" and "Gestão" groups of the side menu.
	let { data, children } = $props();
</script>

<div class="mx-auto max-w-4xl p-4">
	{#if data.staff.role !== 'owner' && data.staff.role !== 'manager'}
		<p class="alert-error">Apenas gerente ou dono.</p>
	{:else}
		{@render children()}
	{/if}
</div>
