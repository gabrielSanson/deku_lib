<script lang="ts">
	import { enhance } from '$app/forms';
	import FormError from '#lib/components/molecules/FormError.svelte';
	import { WEEKDAYS_PT } from '#lib/domain/hours.ts';

	let { data, form } = $props();

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

<svelte:head><title>Horários · Configurações</title></svelte:head>

<form
	method="POST"
	action="?/save"
	use:enhance={() =>
		async ({ update }) =>
			update({ reset: false })}
	class="space-y-4"
>
	<input type="hidden" name="payload" value={payload} />
	<h1 class="page-title">Horário de funcionamento</h1>

	<label class="flex min-h-11 items-start gap-3 card p-4"
		><input type="checkbox" class="mt-1 size-5" bind:checked={s.enabled} />
		<span
			>Abrir e fechar o site sozinho pelos horários abaixo
			<span class="block text-sm text-muted"
				>Fora do horário o site mostra quando a loja abre e não aceita pedidos. O botão "Pausar
				pedidos" continua valendo a qualquer hora. Se fechar depois da meia-noite, use por exemplo
				18:00 até 02:00.</span
			></span
		></label
	>

	<section class="divide-y divide-line card" aria-label="Horários por dia">
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
								aria-label="{WEEKDAYS_PT[wd]}: abre"
							/>
							<span class="text-muted">até</span>
							<input
								class="field w-32"
								type="time"
								bind:value={shift.closes}
								required
								aria-label="{WEEKDAYS_PT[wd]}: fecha"
							/>
							<button
								type="button"
								class="btn-ghost min-h-9 px-2"
								aria-label="Remover horário"
								onclick={() => s.days[wd].splice(i, 1)}>✕</button
							>
						</span>
					{:else}
						<span class="text-sm text-muted">Fechado</span>
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
						)}>+ Horário</button
				>
				{#if s.days[wd].length}
					<button type="button" class="btn-ghost min-h-9 text-sm" onclick={() => copyToAll(wd)}
						>Copiar para todos</button
					>
				{/if}
			</div>
		{/each}
	</section>

	<section class="space-y-2 card p-4">
		<h2 class="font-semibold">Dias fechados</h2>
		<p class="text-sm text-muted">Feriados, folgas e reformas. Valem o dia inteiro.</p>
		{#each s.closures as c, i (i)}
			<div class="flex flex-wrap items-center gap-2">
				<input class="field w-44" type="date" bind:value={c.day} aria-label="Data" />
				<input
					class="field flex-1"
					bind:value={c.reason}
					maxlength="80"
					placeholder="Motivo (opcional)"
					aria-label="Motivo"
				/>
				<button
					type="button"
					class="btn-ghost min-h-9 px-2"
					aria-label="Remover dia"
					onclick={() => s.closures.splice(i, 1)}>✕</button
				>
			</div>
		{/each}
		<button
			type="button"
			class="btn-secondary min-h-9 text-sm"
			onclick={() => s.closures.push({ day: '', reason: '' })}>+ Dia fechado</button
		>
	</section>

	<FormError message={form?.error} />
	{#if form?.ok}<p class="alert-ok">Horários salvos.</p>{/if}
	<button class="btn-primary">Salvar horários</button>
</form>
