<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from '#lib/components/atoms/Icon.svelte';

	// A password input with a lock icon and a show/hide button. Shared by the customer and
	// staff sign-in screens. `children` goes under the field (a hint or "forgot password").
	let {
		label,
		name = 'password',
		id = name,
		showLabel,
		hideLabel,
		class: klass = '',
		children,
		...rest
	}: Omit<HTMLInputAttributes, 'type' | 'children'> & {
		label: string;
		name?: string;
		id?: string;
		/** Words on the eye button while the password is hidden / shown. */
		showLabel: string;
		hideLabel: string;
		children?: Snippet;
	} = $props();

	let shown = $state(false);
</script>

<div class={klass}>
	<label class="label" for={id}>{label}</label>
	<div class="relative">
		<Icon
			name="lock"
			class="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-400"
		/>
		<input {id} {name} type={shown ? 'text' : 'password'} class="field pr-12 pl-10" {...rest} />
		<button
			type="button"
			class="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-(--radius-control) text-stone-500 hover:text-ink"
			aria-label={shown ? hideLabel : showLabel}
			aria-pressed={shown}
			onclick={() => (shown = !shown)}
		>
			<Icon name={shown ? 'eyeOff' : 'eye'} class="size-5" />
		</button>
	</div>
	{@render children?.()}
</div>
