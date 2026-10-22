<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import { useTexts } from '#lib/texts/context.ts';

	// Dark is the default; app.html sets data-theme before first paint. The choice is kept
	// on this device only.
	let { class: klass = '' }: { class?: string } = $props();
	const t = useTexts();
	let dark = $state(true);

	onMount(() => (dark = document.documentElement.dataset.theme !== 'light'));

	function toggle() {
		dark = !dark;
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch {
			/* private mode: the choice lasts until the page closes */
		}
	}
</script>

<button
	type="button"
	class={klass}
	onclick={toggle}
	aria-label={t(dark ? 'theme.toLight' : 'theme.toDark')}
	title={t(dark ? 'theme.toLight' : 'theme.toDark')}
>
	<Icon name={dark ? 'sun' : 'moon'} class="size-6" strokeWidth={1.75} />
</button>
