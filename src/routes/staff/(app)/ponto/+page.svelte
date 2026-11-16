<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const clocked = $derived(
		form && 'clocked' in form ? (form.clocked as { name: string; action: 'in' | 'out' }) : undefined
	);
</script>

<svelte:head><title>{t('ponto.title')}</title></svelte:head>

<div class="mx-auto max-w-md space-y-4">
	<h1 class="page-title">{t('ponto.title')}</h1>
	<p class="text-sm text-muted">{t('ponto.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if clocked}
		<p class="alert-ok" role="status">
			{t(clocked.action === 'in' ? 'ponto.in' : 'ponto.out', { name: clocked.name })}
		</p>
	{/if}

	<form
		method="POST"
		action="?/clock"
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: true });
			}}
		class="space-y-3 card p-4"
	>
		<TextField
			label={t('ponto.pin')}
			name="pin"
			type="password"
			inputmode="numeric"
			autocomplete="off"
			pattern={'[0-9]{4,6}'}
			maxlength={6}
			required
		/>
		<button class="btn-primary w-full">{t('ponto.submit')}</button>
	</form>

	<section class="space-y-1">
		<h2 class="font-semibold">{t('ponto.now')}</h2>
		{#each data.clockedIn as c (c.member + c.since)}
			<p class="text-sm">{c.member} · {t('ponto.since', { time: formatTime(c.since) })}</p>
		{:else}
			<p class="text-sm text-muted">{t('ponto.nobody')}</p>
		{/each}
	</section>

	{#if data.shifts.length}
		<section class="space-y-1">
			<h2 class="font-semibold">{t('ponto.today')}</h2>
			{#each data.shifts as s (s.id)}
				<p class="text-sm">{s.member} · {formatTime(s.startsAt)}–{formatTime(s.endsAt)}</p>
			{/each}
		</section>
	{/if}

	<p class="text-xs text-muted">{t('shift.disclaimer')}</p>
</div>
