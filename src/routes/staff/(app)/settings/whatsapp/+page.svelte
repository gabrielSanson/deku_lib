<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();
	const s = $derived(data.settings);
</script>

<svelte:head><title>{t('wa.tabTitle')}</title></svelte:head>

<div class="space-y-6">
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'ok' in form && typeof form.ok === 'string'}<p class="alert-ok">{form.ok}</p>{/if}

	<section class="space-y-3 card p-4">
		<div class="flex items-center justify-between gap-2">
			<h2 class="text-lg font-bold">WhatsApp</h2>
			<span
				class="rounded-full px-3 py-1 text-xs font-semibold {s.enabled
					? 'bg-ok/15 text-ok'
					: 'bg-line text-muted'}">{s.enabled ? t('integrations.on') : t('integrations.off')}</span
			>
		</div>
		<p class="text-sm text-muted">{t('wa.intro')}</p>
		<p class="alert-warn text-sm">{t('wa.unverified')}</p>
		<p class="text-sm whitespace-pre-line">{t('wa.steps')}</p>
		<p class="text-sm">{t('wa.webhook')}</p>
		<code class="block rounded bg-line/40 p-2 text-xs break-all">{data.webhookUrl}</code>
		<p class="text-sm">{t('wa.verifyToken')}</p>
		<code class="block rounded bg-line/40 p-2 text-xs break-all">{s.verifyToken}</code>
	</section>

	<section class="space-y-3 card p-4">
		<form method="POST" action="?/save" use:enhance class="grid gap-3 sm:grid-cols-2">
			<TextField
				label={t('wa.phoneNumberId')}
				name="phoneNumberId"
				value={s.phoneNumberId ?? ''}
				inputmode="numeric"
				required
			/>
			<TextField label={t('wa.wabaId')} name="wabaId" value={s.wabaId ?? ''} inputmode="numeric" />
			<TextField
				label={t('wa.displayPhone')}
				name="displayPhone"
				value={s.displayPhone ?? ''}
				type="tel"
			/>
			<TextField
				label={t('wa.token')}
				name="accessToken"
				type="password"
				placeholder={s.hasToken ? t('wa.secretKept') : ''}
				disabled={!data.canStoreSecrets}
			/>
			<TextField
				label={t('wa.appSecret')}
				name="appSecret"
				type="password"
				placeholder={s.hasAppSecret ? t('wa.secretKept') : ''}
				disabled={!data.canStoreSecrets}
			/>
			<div class="flex items-end">
				<button class="btn-secondary">{t('wa.save')}</button>
			</div>
		</form>
	</section>

	{#if s.phoneNumberId}
		<section class="space-y-3 card p-4">
			<form method="POST" action="?/test" use:enhance class="flex flex-wrap items-end gap-2">
				<TextField label={t('wa.testTo')} name="to" type="tel" required wrapClass="flex-1" />
				<button class="btn-ghost">{t('wa.test')}</button>
			</form>
			{#if s.lastTestAt}
				<p class="text-sm {s.lastTestError ? 'text-bad' : 'text-ok'}">
					{t('wa.lastTest', { date: formatDateTime(s.lastTestAt) })}
					{s.lastTestError ?? ''}
				</p>
			{/if}
			<form method="POST" action="?/toggle" use:enhance>
				<input type="hidden" name="enabled" value={s.enabled ? 'false' : 'true'} />
				<button
					class={s.enabled ? 'btn-ghost' : 'btn-primary'}
					disabled={!s.enabled && (!s.lastTestAt || !!s.lastTestError)}
					>{s.enabled ? t('wa.turnOff') : t('wa.turnOn')}</button
				>
			</form>
		</section>

		<section class="space-y-3 card p-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<h2 class="text-lg font-bold">{t('wa.templates')}</h2>
				<form method="POST" action="?/templates" use:enhance>
					<button class="btn-ghost">{t('wa.checkTemplates')}</button>
				</form>
			</div>
			<ul class="space-y-1 text-sm">
				{#each data.statusTemplates as name (name)}
					<li class="flex justify-between gap-2">
						<code>{name}</code>
						<span class={s.templates[name] === 'APPROVED' ? 'text-ok' : 'text-muted'}
							>{s.templates[name] ?? t('wa.templateMissing')}</span
						>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
