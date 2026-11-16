<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import SelectField from '#lib/components/molecules/SelectField.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { toShopInput, formatTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data, form } = $props();
	const t = useTexts();

	const shiftDay = (monday: string, n: number) => {
		const ms = Date.parse(`${monday}T12:00:00Z`) + n * 86_400_000;
		return new Date(ms).toISOString().slice(0, 10);
	};
	const dayLabel = (day: string) =>
		new Intl.DateTimeFormat('pt-BR', {
			timeZone: 'UTC',
			weekday: 'short',
			day: '2-digit',
			month: '2-digit'
		}).format(new Date(`${day}T12:00:00Z`));
	const localDay = (d: Date | string) =>
		new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(d));
	const hours = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;

	const days = $derived(Array.from({ length: 7 }, (_, i) => shiftDay(data.monday, i)));
	const hasDraft = $derived(data.shifts.some((s) => !s.published));
</script>

<svelte:head><title>{t('shift.title')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('shift.title')}</h1>
	<p class="text-sm text-muted">{t('shift.intro')}</p>
	<FormError message={form && 'error' in form ? (form.error as string) : undefined} />
	{#if form && 'published' in form}<p class="alert-ok" role="status">
			{t('shift.published')}
		</p>{/if}

	<nav class="flex flex-wrap items-center justify-between gap-2">
		<a class="btn-ghost" href="?semana={shiftDay(data.monday, -7)}">{t('shift.prev')}</a>
		<strong>{t('shift.week', { day: dayLabel(data.monday) })}</strong>
		<a class="btn-ghost" href="?semana={shiftDay(data.monday, 7)}">{t('shift.next')}</a>
	</nav>

	<section class="divide-y card">
		{#each days as day (day)}
			{@const list = data.shifts.filter((s) => localDay(s.startsAt) === day)}
			<div class="flex flex-wrap items-start gap-3 p-3">
				<span class="w-24 shrink-0 font-semibold capitalize">{dayLabel(day)}</span>
				<ul class="flex-1 space-y-1 text-sm">
					{#each list as s (s.id)}
						<li class="flex items-center gap-2">
							<span>{s.member} · {formatTime(s.startsAt)}–{formatTime(s.endsAt)}</span>
							{#if !s.published}<span class="text-xs text-muted">({t('shift.draft')})</span>{/if}
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={s.id} />
								<button class="btn-ghost text-xs text-bad">{t('shift.delete')}</button>
							</form>
						</li>
					{:else}
						<li class="text-muted">—</li>
					{/each}
				</ul>
			</div>
		{/each}
	</section>

	{#if data.members.length}
		<form
			method="POST"
			action="?/add"
			use:enhance
			class="grid gap-3 card p-4 sm:grid-cols-5 sm:items-end"
		>
			<SelectField label={t('shift.member')} name="memberId" required>
				{#each data.members as m (m.id)}<option value={m.id}>{m.name}</option>{/each}
			</SelectField>
			<SelectField label={t('shift.day')} name="day" required>
				{#each days as d (d)}<option value={d}>{dayLabel(d)}</option>{/each}
			</SelectField>
			<TextField label={t('shift.start')} name="start" type="time" value="11:00" required />
			<TextField label={t('shift.end')} name="end" type="time" value="19:00" required />
			<button class="btn-primary">{t('shift.add')}</button>
		</form>
	{/if}

	{#if data.shifts.length === 0}
		<p class="text-sm text-muted">{t('shift.empty')}</p>
	{:else if hasDraft}
		<form method="POST" action="?/publish" use:enhance>
			<input type="hidden" name="monday" value={data.monday} />
			<button class="btn-secondary">{t('shift.publish')}</button>
		</form>
	{/if}

	<section class="space-y-2">
		<h2 class="font-semibold">{t('shift.hoursTitle')}</h2>
		{#if data.hours.length === 0}
			<p class="text-sm text-muted">{t('shift.hoursEmpty')}</p>
		{:else}
			<table class="w-full text-sm">
				<thead>
					<tr class="text-left text-muted">
						<th class="py-1">{t('shift.member')}</th>
						<th>{t('shift.scheduled')}</th>
						<th>{t('shift.worked')}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.hours as h (h.memberId)}
						<tr class="border-t align-top">
							<td class="py-1">{h.member}</td>
							<td>{hours(h.scheduledMinutes)}</td>
							<td>
								{hours(h.workedMinutes)}
								{#each h.missingOut as m (m.id)}
									<form
										method="POST"
										action="?/close"
										use:enhance
										class="mt-1 flex flex-wrap items-center gap-2"
									>
										<span class="text-bad">
											{t('shift.missingOut', { at: formatTime(m.clockInAt) })}
										</span>
										<input type="hidden" name="id" value={m.id} />
										<input
											class="field w-auto"
											type="datetime-local"
											name="at"
											aria-label={t('shift.closeAt')}
											value={toShopInput(m.clockInAt)}
											required
										/>
										<button class="btn-ghost text-xs">{t('shift.close')}</button>
									</form>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
		<p class="text-xs text-muted">{t('shift.disclaimer')}</p>
	</section>
</div>
