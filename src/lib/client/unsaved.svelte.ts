import { beforeNavigate } from '$app/navigation';
import { SvelteURLSearchParams } from 'svelte/reactivity';

/**
 * One guard for every editor form: leaving the page with unsaved edits asks first.
 * Text inputs are compared with the last saved state; file inputs are not compared,
 * so picking a new photo alone does not count as a change.
 * Call from a component's script at the top level, and pass the form element getter.
 */
export function guardUnsaved(getForm: () => HTMLFormElement | undefined, message: () => string) {
	let baseline = '';
	let saving = false;

	const serialize = (f: HTMLFormElement) =>
		new SvelteURLSearchParams(
			[...new FormData(f)].filter(
				(entry): entry is [string, string] => typeof entry[1] === 'string'
			)
		).toString();
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
		if (!confirm(message())) nav.cancel();
	});

	$effect(() => {
		const onUnload = (e: BeforeUnloadEvent) => {
			if (!saving && dirty()) e.preventDefault();
		};
		window.addEventListener('beforeunload', onUnload);
		return () => window.removeEventListener('beforeunload', onUnload);
	});

	return {
		/** Call when a save starts, so the redirect after it is not treated as leaving. */
		saving() {
			saving = true;
		},
		/** Call when a save finishes: the form now shows the saved state. */
		saved() {
			saving = false;
			const f = getForm();
			if (f) baseline = serialize(f);
		}
	};
}
