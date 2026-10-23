<script lang="ts">
	// Coupon code entry with Apply/Remove, used by the web checkout and the POS. `code` is the
	// applied code (empty while typing); the parent re-quotes when it changes.
	let {
		label,
		code = $bindable(''),
		applyLabel,
		removeLabel,
		hideLabel = false,
		placeholder,
		problem,
		blocks = false,
		errorClass = 'text-sm text-bad',
		id
	}: {
		label: string;
		code?: string;
		applyLabel: string;
		removeLabel: string;
		hideLabel?: boolean;
		placeholder?: string;
		/** Why the applied code does not work (from the quote). */
		problem?: string | null;
		/** The problem stops the order, so it shows as an error. */
		blocks?: boolean;
		/** How a blocking problem looks (the checkout uses alert-error). */
		errorClass?: string;
		id?: string;
	} = $props();

	const uid = $props.id();
	const fieldId = $derived(id ?? uid);
	let typed = $state(code);

	function apply() {
		code = typed.trim();
	}
	function remove() {
		code = '';
		typed = '';
	}
</script>

<div>
	<label class={hideLabel ? 'sr-only' : 'label'} for={fieldId}>{label}</label>
	<div class="flex gap-2">
		<input
			id={fieldId}
			class="field uppercase"
			maxlength={24}
			autocomplete="off"
			autocapitalize="characters"
			{placeholder}
			bind:value={typed}
			readonly={!!code}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					apply();
				}
			}}
		/>
		{#if code}
			<button type="button" class="btn-secondary" onclick={remove}>{removeLabel}</button>
		{:else}
			<button type="button" class="btn-secondary" disabled={!typed.trim()} onclick={apply}
				>{applyLabel}</button
			>
		{/if}
	</div>
	{#if code && problem}
		<p class="mt-2 {blocks ? errorClass : 'text-sm text-muted'}" role="status">{problem}</p>
	{/if}
</div>
