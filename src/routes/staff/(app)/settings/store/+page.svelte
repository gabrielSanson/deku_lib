<script lang="ts">
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { useTexts } from '#lib/texts/context.ts';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SettingsSection from '#lib/components/organisms/SettingsSection.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const s = $derived(data.settings);
	let pauseReason = $state('');
	const t = useTexts();
</script>

<svelte:head><title>{t('store.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<section
		class="flex flex-wrap items-center justify-between gap-3 card p-4 {s.acceptingOrders
			? ''
			: 'border-bad/40 bg-bad-tint'}"
	>
		<div>
			<h1 class="page-title">{s.acceptingOrders ? t('store.open') : t('store.paused')}</h1>
			<p class="text-sm text-muted">
				{s.acceptingOrders ? t('store.accepting') : (s.pauseReason ?? '')} ·
				{t('store.updated', { time: formatDateTime(s.updatedAt) })}
			</p>
		</div>
		<form method="POST" action="?/toggle" use:enhance class="flex gap-2">
			<input type="hidden" name="open" value={s.acceptingOrders ? '0' : '1'} />
			{#if s.acceptingOrders}
				<TextField
					label={t('store.pauseReason')}
					hideLabel
					name="pauseReason"
					placeholder={t('store.pauseReason')}
					bind:value={pauseReason}
				/>
				<button class="btn-danger whitespace-nowrap">{t('store.pause')}</button>
			{:else}
				<button class="btn-primary">{t('store.openStore')}</button>
			{/if}
		</form>
	</section>

	<SettingsSection
		title={t('store.operation')}
		action="?/save"
		saveLabel={t('settings.save')}
		saved={form?.ok ? t('settings.saved') : undefined}
	>
		<input type="hidden" name="version" value={s.version} />
		<Checkbox
			label={t('store.acceptingField')}
			name="acceptingOrders"
			checked={s.acceptingOrders}
		/>
		<TextField
			label={t('store.pauseMessage')}
			name="pauseReason"
			value={s.pauseReason ?? ''}
			maxlength={160}
		/>
		<Checkbox label={t('store.web')} name="webOrderingEnabled" checked={s.webOrderingEnabled} />
		<Checkbox label={t('store.dineIn')} name="dineInEnabled" checked={s.dineInEnabled} />
		{#if s.dineInEnabled}
			<p class="-mt-2 pl-8 text-sm text-muted">
				{t('store.qrBefore')} <code class="rounded bg-quiet px-1">{page.url.origin}/?mesa=7</code>
				{t('store.qrAfter')}
			</p>
		{/if}
		<Checkbox label={t('store.pickup')} name="pickupEnabled" checked={s.pickupEnabled} />
		<Checkbox label={t('store.delivery')} name="deliveryEnabled" checked={s.deliveryEnabled} />
		<div class="grid gap-4 sm:grid-cols-2">
			<TextField
				label={t('store.prep')}
				id="prep"
				name="prepTimeMinutes"
				type="number"
				min={1}
				max={240}
				value={s.prepTimeMinutes}
				required
			/>
			<TextField
				label={t('store.maxOpen')}
				id="max"
				name="maxOpenOrders"
				type="number"
				min={1}
				value={s.maxOpenOrders ?? ''}
			/>
		</div>
		<FormError message={form?.error} />
	</SettingsSection>
	<p class="text-sm text-muted">
		{t('store.menuHint')}
		<a class="underline" href="/staff/menu/edit">{t('store.menuEdit')}</a>. {t('store.soldOutHint')}
		<a class="underline" href="/staff/menu">{t('store.menu')}</a>.
	</p>
</div>
