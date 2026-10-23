<script lang="ts">
	// An editor form that asks before leaving with unsaved edits (guardUnsaved). Posts with
	// use:enhance, keeps the fields after a save unless `reset`, and passes other attributes on.
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { enhance, type ActionResult, type SubmitFunction } from '$app/forms';
	import { guardUnsaved } from '#lib/client/unsaved.svelte.ts';
	import { useTexts } from '#lib/texts/context.ts';

	type EnhanceInput = Parameters<SubmitFunction>[0];

	let {
		action,
		reset = false,
		before,
		after,
		state: editorState,
		children,
		...rest
	}: Omit<HTMLFormAttributes, 'action' | 'method' | 'children'> & {
		action: string;
		/** Clear the fields after a save (an "add" form). */
		reset?: boolean;
		/** Runs before posting; return false to stop (after calling input.cancel()). */
		before?: (input: EnhanceInput) => boolean | void;
		/** Runs once the result is in. */
		after?: (result: ActionResult) => void;
		/** Editor state kept in script rather than named fields, compared as well. */
		state?: () => unknown;
		children: Snippet;
	} = $props();

	const t = useTexts();
	let formEl = $state<HTMLFormElement>();
	const guard = guardUnsaved(
		() => formEl,
		() => t('unsaved.confirm'),
		() => editorState?.()
	);
</script>

<form
	method="POST"
	{action}
	bind:this={formEl}
	use:enhance={(input) => {
		if (before?.(input) === false) return;
		return guard.submit({ reset, after })(input);
	}}
	{...rest}
>
	{@render children()}
</form>
