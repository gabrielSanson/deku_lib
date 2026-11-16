<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
</script>

<svelte:head><title>{t('od.tabTitle')}</title></svelte:head>

<div class="space-y-6">
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'ok' in form && typeof form.ok === 'string'}<p class="alert-ok">{form.ok}</p>{/if}
	<p class="text-sm text-muted">{t('od.intro')}</p>
	<p class="alert-warn text-sm">{t('od.unverified')}</p>

	{#each data.partners as p (p.partner)}
		<section class="space-y-3 card p-4">
			<div class="flex items-center justify-between gap-2">
				<h2 class="text-lg font-bold">{p.label}</h2>
				<span
					class="rounded-full px-3 py-1 text-xs font-semibold {p.enabled
						? 'bg-ok/15 text-ok'
						: 'bg-line text-muted'}"
					>{p.enabled ? t('integrations.on') : t('integrations.off')}</span
				>
			</div>
			<form method="POST" action="?/save" use:enhance class="grid gap-3 sm:grid-cols-2">
				<input type="hidden" name="partner" value={p.partner} />
				<TextField
					label={t('od.baseUrl')}
					name="baseUrl"
					value={p.baseUrl ?? ''}
					placeholder="https://"
					required
					wrapClass="sm:col-span-2"
				/>
				<TextField label={t('od.clientId')} name="clientId" value={p.clientId ?? ''} required />
				<TextField
					label={t('od.clientSecret')}
					name="clientSecret"
					type="password"
					placeholder={p.hasSecret ? t('od.secretKept') : ''}
					disabled={!data.canStoreSecrets}
				/>
				<TextField
					label={t('od.merchantId')}
					name="merchantId"
					value={p.merchantId ?? ''}
					required
				/>
				<div class="flex items-end">
					<button class="btn-secondary">{t('od.save')}</button>
				</div>
			</form>
			{#if p.baseUrl}
				<div class="flex flex-wrap gap-2">
					<form method="POST" action="?/test" use:enhance>
						<input type="hidden" name="partner" value={p.partner} />
						<button class="btn-ghost">{t('od.test')}</button>
					</form>
					<form method="POST" action="?/toggle" use:enhance>
						<input type="hidden" name="partner" value={p.partner} />
						<input type="hidden" name="enabled" value={p.enabled ? 'false' : 'true'} />
						<button
							class={p.enabled ? 'btn-ghost' : 'btn-primary'}
							disabled={!p.enabled && !p.lastCheckOk}
							>{p.enabled ? t('od.turnOff') : t('od.turnOn')}</button
						>
					</form>
				</div>
			{/if}
			{#if p.lastCheckAt}
				<p class="text-sm {p.lastCheckOk ? 'text-ok' : 'text-bad'}">
					{t('od.lastCheck', { date: formatDateTime(p.lastCheckAt) })}
					{p.lastCheckError ?? ''}
				</p>
			{/if}
			{#if p.lastPollOkAt}
				<p class="text-sm text-muted">
					{t('od.lastPoll', { date: formatDateTime(p.lastPollOkAt) })}
				</p>
			{/if}
			{#if p.lastPollError}<p class="text-sm text-bad">{p.lastPollError}</p>{/if}
			<p class="text-sm">{t('od.webhook')}</p>
			<code class="block rounded bg-line/40 p-2 text-xs break-all">{p.webhookUrl}</code>
		</section>
	{/each}
</div>
