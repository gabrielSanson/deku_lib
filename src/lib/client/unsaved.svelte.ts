import type { ActionResult, SubmitFunction } from '$app/forms';
import { beforeNavigate, goto } from '$app/navigation';
import { untrack } from 'svelte';
import { SvelteURLSearchParams } from 'svelte/reactivity';

/**
 * The question shown by UnsavedPrompt (mounted once in the root layout) when someone
 * leaves an editor with unsaved edits. `leave` carries on to where they were going.
 */
export const leavePrompt = $state<{ open: boolean; message: string; leave: () => void }>({
	open: false,
	message: '',
	leave: () => {}
});

/**
 * One guard for every editor form: leaving the page with unsaved edits asks first.
 * Text inputs are compared with the last saved state; file inputs are not compared,
 * so picking a new photo alone does not count as a change.
 * Call from a component's script at the top level, and pass the form element getter.
 * Editors that keep their state in script instead of named fields pass `state`, whose
 * value (as JSON) is compared too.
 */
export function guardUnsaved(
	getForm: () => HTMLFormElement | undefined,
	message: () => string,
	state?: () => unknown
) {
	let baseline = '';
	let saving = false;

	const serialize = (f: HTMLFormElement) =>
		new SvelteURLSearchParams(
			[...new FormData(f)].filter(
				(entry): entry is [string, string] => typeof entry[1] === 'string'
			)
		).toString() + (state ? JSON.stringify(untrack(state)) : '');
	const dirty = () => {
		const f = getForm();
		return !!f && serialize(f) !== baseline;
	};

	// Whatever the form shows on load is the saved state.
	$effect(() => {
		const f = getForm();
		if (f) baseline = serialize(f);
	});

	beforeNavigate((nav) => {
		if (saving || !dirty()) return;
		// Closing the tab or leaving the site: cancelling shows the browser's own question.
		nav.cancel();
		if (nav.willUnload || !nav.to) return;
		const to = nav.to.url;
		leavePrompt.message = message();
		leavePrompt.leave = () => {
			saving = true;
			void goto(to).finally(() => (saving = false));
		};
		leavePrompt.open = true;
	});

	$effect(() => {
		const onUnload = (e: BeforeUnloadEvent) => {
			if (!saving && dirty()) e.preventDefault();
		};
		window.addEventListener('beforeunload', onUnload);
		return () => window.removeEventListener('beforeunload', onUnload);
	});

	return {
		/**
		 * The usual `use:enhance` for the guarded form: marks the save, keeps the fields
		 * (unless `reset`), and tells the guard whether it went through. `after` runs last.
		 */
		submit(opts: { reset?: boolean; after?: (result: ActionResult) => void } = {}): SubmitFunction {
			return () => {
				saving = true;
				return async ({ result, update }) => {
					await update({ reset: opts.reset ?? false });
					saving = false;
					// Saved: what the form shows now is the new baseline. Failed: still unsaved.
					const f = getForm();
					if (f && (result.type === 'success' || result.type === 'redirect'))
						baseline = serialize(f);
					opts.after?.(result);
				};
			};
		}
	};
}
