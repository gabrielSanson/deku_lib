<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const enrolling = $derived(
		form && 'enrolling' in form
			? (form.enrolling as { factorId: string; qr: string; secret: string })
			: undefined
	);
</script>

<svelte:head><title>{t('mfa.title')}</title></svelte:head>

<div class="max-w-xl space-y-4">
	<h1 class="page-title">{t('mfa.title')}</h1>
	<p class="text-sm text-muted">{t('mfa.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'confirmed' in form}<p class="alert-ok" role="status">{t('mfa.confirmed')}</p>{/if}
	{#if form && 'removed' in form}<p class="alert-ok" role="status">{t('mfa.removed')}</p>{/if}
	{#if data.required && data.applies && data.factors.length === 0}
		<p class="alert-warn" role="alert">{t('mfa.mustEnrol')}</p>
	{/if}

	{#if !data.available}
		<p class="text-sm text-muted">{t('mfa.unavailable')}</p>
	{:else}
		<section class="space-y-2 card p-4">
			<h2 class="font-semibold">{t('mfa.factors')}</h2>
			{#each data.factors as f (f.id)}
				<form method="POST" action="?/remove" use:enhance class="flex items-center gap-2 text-sm">
					<input type="hidden" name="factorId" value={f.id} />
					<span class="flex-1">{t('mfa.factorSince', { date: formatDateTime(f.createdAt) })}</span>
					<button class="btn-ghost text-bad">{t('mfa.remove')}</button>
				</form>
			{:else}
				<p class="text-sm text-muted">{t('mfa.none')}</p>
			{/each}

			{#if enrolling}
				<form method="POST" action="?/confirm" use:enhance class="space-y-3">
					<p class="text-sm">{t('mfa.scan')}</p>
					<img src={enrolling.qr} alt={t('mfa.qrAlt')} class="h-48 w-48 bg-white p-2" />
					<p class="text-xs break-all text-muted">
						{t('mfa.secret')} <code>{enrolling.secret}</code>
					</p>
					<input type="hidden" name="factorId" value={enrolling.factorId} />
					<input type="hidden" name="qr" value={enrolling.qr} />
					<input type="hidden" name="secret" value={enrolling.secret} />
					<TextField
						label={t('mfa.code')}
						name="code"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength={8}
						required
					/>
					<button class="btn-primary">{t('mfa.confirm')}</button>
				</form>
			{:else if data.factors.length === 0}
				<form method="POST" action="?/enrol" use:enhance>
					<button class="btn-primary">{t('mfa.enrol')}</button>
				</form>
			{/if}
		</section>
	{/if}

	{#if data.canRequire}
		<form method="POST" action="?/require" use:enhance class="space-y-2 card p-4">
			<h2 class="font-semibold">{t('mfa.requireTitle')}</h2>
			<p class="text-sm text-muted">{t('mfa.requireHelp')}</p>
			{#if form && 'requireSaved' in form}<p class="alert-ok" role="status">
					{t('settings.saved')}
				</p>{/if}
			<input type="hidden" name="on" value={data.required ? '0' : '1'} />
			<button class="btn-secondary">
				{data.required ? t('mfa.requireOff') : t('mfa.requireOn')}
			</button>
		</form>
	{/if}
</div>
