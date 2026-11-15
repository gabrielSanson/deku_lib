<script lang="ts">
	import StatusPill from '#lib/components/atoms/StatusPill.svelte';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	let { data } = $props();
	const t = useTexts();
	const b = $derived(data.backups);

	const rows = $derived([
		{
			label: t('system.lastDump'),
			run: b.lastDump,
			bad: b.dumpStale || (b.lastDump !== null && !b.lastDump.ok)
		},
		{ label: t('system.lastOffsite'), run: b.lastOffsite, bad: b.offsiteStale },
		{
			label: t('system.lastRestore'),
			run: b.lastRestoreTest,
			bad: b.restoreStale || (b.lastRestoreTest !== null && !b.lastRestoreTest.ok)
		}
	]);
	function state(run: (typeof rows)[number]['run'], bad: boolean) {
		if (!run) return t('system.never');
		if (!run.ok) return t('system.failed');
		return bad ? t('system.late') : t('system.ok');
	}
	const mb = (bytes: number | null) =>
		bytes === null ? '' : t('system.size', { size: (bytes / 1_048_576).toFixed(1) });
</script>

<svelte:head><title>{t('system.tabTitle')}</title></svelte:head>

<div class="space-y-4">
	<h1 class="page-title">{t('system.title')}</h1>

	<section class="space-y-3 card p-4" aria-labelledby="backups-title">
		<h2 id="backups-title" class="font-semibold">{t('system.backups')}</h2>
		<p class="text-sm text-muted">{t('system.backupsHint')}</p>
		<ul class="divide-y divide-line">
			{#each rows as row (row.label)}
				<li class="flex flex-wrap items-center justify-between gap-2 py-2">
					<div>
						<p class="font-medium">{row.label}</p>
						{#if row.run}
							<p class="text-sm text-muted">
								{formatDateTime(row.run.at)}
								{#if row.run.bytes}· {mb(row.run.bytes)}{/if}
								{#if typeof row.run.detail.orders === 'number'}
									· {t('system.orders', { count: row.run.detail.orders })}
								{/if}
							</p>
							{#if row.run.error}<p class="text-sm text-bad">{row.run.error}</p>{/if}
						{/if}
					</div>
					<StatusPill tone={row.bad ? 'bad' : 'ok'} label={state(row.run, row.bad)} />
				</li>
			{/each}
		</ul>
	</section>

	{#if !b.offsiteConfigured || b.offsiteStale}
		<section class="space-y-2 card p-4" aria-labelledby="offsite-title">
			<h2 id="offsite-title" class="font-semibold">{t('system.setupTitle')}</h2>
			<ol class="list-decimal space-y-1 pl-5 text-sm">
				<li>{t('system.setup1')}</li>
				<li>{t('system.setup2')}</li>
				<li>{t('system.setup3')}</li>
				<li>{t('system.setup4')}</li>
			</ol>
		</section>
	{/if}
</div>
