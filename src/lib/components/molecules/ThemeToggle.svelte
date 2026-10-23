<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '#lib/components/atoms/Icon.svelte';
	import { isDark, setDark } from '#lib/client/theme.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { class: klass = '' }: { class?: string } = $props();
	const t = useTexts();
	let dark = $state(true);

	onMount(() => (dark = isDark()));

	function toggle() {
		dark = !dark;
		setDark(dark);
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
