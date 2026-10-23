<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { guardUnsaved } from '#lib/client/unsaved.svelte.ts';
	import { WEEKDAYS_PT } from '#lib/domain/hours.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

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

	let formEl = $state<HTMLFormElement>();
	const guard = guardUnsaved(
		() => formEl,
		() => t('unsaved.confirm')
	);

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

<form
	method="POST"
	action="?/save"
	bind:this={formEl}
	use:enhance={() => {
		guard.saving();
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'success') guard.saved();
			else guard.failed();
		};
	}}
	class="space-y-4"
>
	<input type="hidden" name="payload" value={payload} />
	<h1 class="page-title">{t('hours.title')}</h1>

	<label class="flex min-h-11 items-start gap-3 card p-4"
		><input type="checkbox" class="mt-1 size-5" bind:checked={s.enabled} />
		<span
			>{t('hours.auto')}
			<span class="block text-sm text-muted">{t('hours.autoHint')}</span></span
		></label
	>

	<section class="divide-y divide-line card" aria-label={t('hours.byDay')}>
		{#each order as wd (wd)}
			<div class="flex flex-wrap items-center gap-3 p-3">
				<span class="w-20 font-medium">{WEEKDAYS_PT[wd]}</span>
				<div class="flex flex-1 flex-wrap items-center gap-2">
					{#each s.days[wd] as shift, i (i)}
						<span class="flex items-center gap-1">
							<input
								class="field w-32"
								type="time"
								bind:value={shift.opens}
								required
								aria-label={t('hours.opens', { day: WEEKDAYS_PT[wd] })}
							/>
							<span class="text-muted">{t('hours.until')}</span>
							<input
								class="field w-32"
								type="time"
								bind:value={shift.closes}
								required
								aria-label={t('hours.closes', { day: WEEKDAYS_PT[wd] })}
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
				<input class="field w-44" type="date" bind:value={c.day} aria-label={t('hours.date')} />
				<input
					class="field flex-1"
					bind:value={c.reason}
					maxlength="80"
					placeholder={t('hours.reasonOptional')}
					aria-label={t('hours.reason')}
				/>
				<button
					type="button"
					class="btn-ghost min-h-9 px-2"
					aria-label={t('hours.removeDay')}
					onclick={() => s.closures.splice(i, 1)}>✕</button
				>
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
</form>
