<script lang="ts">
	import TextField from '#lib/components/molecules/TextField.svelte';
	import IconButton from '#lib/components/atoms/IconButton.svelte';
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import GuardedForm from '#lib/components/organisms/GuardedForm.svelte';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { useLabels, useTexts } from '#lib/texts/context.ts';
	import { enhance } from '$app/forms';
	import { formatDateTime } from '#lib/domain/time.ts';

	let { data, form } = $props();
	const st = $derived(data.settings);
	let pauseReason = $state('');
	const t = useTexts();
	const label = useLabels(t);

	type Shift = { opens: string; closes: string };
	// Monday first, the way the shop reads its week.
	const order = [1, 2, 3, 4, 5, 6, 0];
	const init = () => ({
		enabled: data.schedule.enabled,
		days: Object.fromEntries(
			order.map((wd) => [
				wd,
				data.schedule.days
					.filter((d) => d.weekday === wd)
					.map((d) => ({ opens: d.opens, closes: d.closes }))
			])
		) as Record<number, Shift[]>,
		closures: data.closures.map((c) => ({ day: c.day, reason: c.reason ?? '' }))
	});
	let s = $state(init());

	const payload = $derived(
		JSON.stringify({
			enabled: s.enabled,
			days: order.flatMap((wd) => s.days[wd].map((x) => ({ weekday: wd, ...x }))),
			closures: s.closures.filter((c) => c.day)
		})
	);
	const copyToAll = (wd: number) => {
		for (const other of order) s.days[other] = s.days[wd].map((x) => ({ ...x }));
	};
</script>

<svelte:head><title>{t('hours.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<section
		class="flex flex-wrap items-center justify-between gap-3 card p-4 {st.acceptingOrders
			? ''
			: 'border-bad/40 bg-bad-tint'}"
	>
		<div>
			<h2 class="text-lg font-bold">{st.acceptingOrders ? t('store.open') : t('store.paused')}</h2>
			<p class="text-sm text-muted">
				{st.acceptingOrders ? t('store.accepting') : (st.pauseReason ?? '')} ·
				{t('store.updated', { time: formatDateTime(st.updatedAt) })}
			</p>
		</div>
		<form method="POST" action="?/toggle" use:enhance class="flex gap-2">
			<input type="hidden" name="open" value={st.acceptingOrders ? '0' : '1'} />
			{#if st.acceptingOrders}
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

	<GuardedForm action="?/save" class="space-y-4">
		<input type="hidden" name="payload" value={payload} />
		<h1 class="page-title">{t('hours.title')}</h1>

		<Checkbox
			label={t('hours.auto')}
			hint={t('hours.autoHint')}
			bind:checked={s.enabled}
			class="card p-4"
		/>

		<section class="divide-y divide-line card" aria-label={t('hours.byDay')}>
			{#each order as wd (wd)}
				<div class="flex flex-wrap items-center gap-3 p-3">
					<span class="w-20 font-medium">{label.weekday(wd)}</span>
					<div class="flex flex-1 flex-wrap items-center gap-2">
						{#each s.days[wd] as shift, i (i)}
							<span class="flex items-center gap-1">
								<TextField
									label={t('hours.opens', { day: label.weekday(wd) })}
									hideLabel
									class="w-32"
									type="time"
									bind:value={shift.opens}
									required
								/>
								<span class="text-muted">{t('hours.until')}</span>
								<TextField
									label={t('hours.closes', { day: label.weekday(wd) })}
									hideLabel
									class="w-32"
									type="time"
									bind:value={shift.closes}
									required
								/>
								<button
									type="button"
									class="btn-ghost min-h-9 px-2"
									aria-label={t('hours.removeShift')}
									onclick={() => s.days[wd].splice(i, 1)}>✕</button
								>
							</span>
						{:else}
							<span class="text-sm text-muted">{t('hours.closed')}</span>
						{/each}
					</div>
					<button
						type="button"
						class="btn-secondary min-h-9 text-sm"
						disabled={s.days[wd].length >= 3}
						onclick={() =>
							s.days[wd].push(
								s.days[wd].length
									? { opens: '18:00', closes: '23:00' }
									: { opens: '11:00', closes: '23:00' }
							)}>{t('hours.addShift')}</button
					>
					{#if s.days[wd].length}
						<button type="button" class="btn-ghost min-h-9 text-sm" onclick={() => copyToAll(wd)}
							>{t('hours.copy')}</button
						>
					{/if}
				</div>
			{/each}
		</section>

		<section class="space-y-2 card p-4">
			<h2 class="font-semibold">{t('hours.closures')}</h2>
			<p class="text-sm text-muted">{t('hours.closuresHint')}</p>
			{#each s.closures as c, i (i)}
				<div class="flex flex-wrap items-center gap-2">
					<TextField
						label={t('hours.date')}
						hideLabel
						class="w-44"
						type="date"
						bind:value={c.day}
					/>
					<TextField
						label={t('hours.reason')}
						hideLabel
						wrapClass="flex-1"
						bind:value={c.reason}
						maxlength={80}
						placeholder={t('hours.reasonOptional')}
					/>
					<IconButton
						label={t('hours.removeDay')}
						icon="close"
						size="sm"
						onclick={() => s.closures.splice(i, 1)}
					/>
				</div>
			{/each}
			<button
				type="button"
				class="btn-secondary min-h-9 text-sm"
				onclick={() => s.closures.push({ day: '', reason: '' })}>{t('hours.addClosure')}</button
			>
		</section>

		<FormError message={form?.error} />
		{#if form?.ok}<p class="alert-ok">{t('hours.saved')}</p>{/if}
		<button class="btn-primary">{t('hours.save')}</button>
	</GuardedForm>
</div>
