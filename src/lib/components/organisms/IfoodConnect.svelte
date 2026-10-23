<script lang="ts" module>
	export interface IfoodProblem {
		stage: string;
		title: string;
		action: string;
		detail: string;
	}
</script>

<script lang="ts">
	// The iFood connection form: credentials, connection test and the on/off switch.
	// Shared by the setup wizard and Configurações → iFood; the actions come from
	// lib/server/integrations/ifood/actions.ts on both pages.
	import Checkbox from '#lib/components/atoms/Checkbox.svelte';
	import TextField from '#lib/components/molecules/TextField.svelte';
	import { enhance } from '$app/forms';
	import { formatDateTime } from '#lib/domain/time.ts';
	import { useTexts } from '#lib/texts/context.ts';

	interface IfoodState {
		enabled: boolean;
		source: string;
		problem: string | null;
		clientId: string | null;
		merchantId: string | null;
		hasSecret: boolean;
		lastCheckAt: string | Date | null;
		lastCheckOk: boolean | null;
		lastCheckError: string | null;
	}
	let {
		ifood,
		problem,
		canStoreSecrets,
		webhookUrl,
		query = ''
	}: {
		ifood: IfoodState;
		problem: IfoodProblem | null;
		canStoreSecrets: boolean;
		webhookUrl: string;
		/** Extra search params kept on each form action, e.g. the wizard step. */
		query?: string;
	} = $props();
	const t = useTexts();
	const keep =
		() =>
		async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
			update({ reset: false });
</script>

{#if ifood.source === 'env'}
	<p class="text-sm text-muted">{t('setup.ifood.envNote')}</p>
{/if}
{#if !canStoreSecrets}
	<p class="alert-error text-sm">{t('setup.ifood.noSecret')}</p>
{/if}
{#if ifood.problem}<p class="alert-error text-sm">{ifood.problem}</p>{/if}

<form method="POST" action="?{query}/ifoodSave" use:enhance={keep} class="space-y-3">
	<TextField
		label={t('setup.ifood.clientId')}
		name="clientId"
		value={ifood.clientId ?? ''}
		autocomplete="off"
		required
		class="font-mono"
	/>
	<TextField
		label={t('setup.ifood.clientSecret')}
		name="clientSecret"
		type="password"
		autocomplete="new-password"
		placeholder={ifood.hasSecret ? t('setup.ifood.secretSaved') : ''}
		required={!ifood.hasSecret}
		class="font-mono"
	/>
	<TextField
		label={t('setup.ifood.merchantId')}
		name="merchantId"
		value={ifood.merchantId ?? ''}
		autocomplete="off"
		required
		class="font-mono"
	/>
	<div class="flex flex-wrap gap-2">
		<button class="btn-primary" disabled={!canStoreSecrets}>{t('setup.ifood.save')}</button>
	</div>
</form>
{#if ifood.clientId}
	<form method="POST" action="?{query}/ifoodTest" use:enhance>
		<button class="btn-secondary">{t('setup.ifood.retest')}</button>
	</form>
{/if}

{#if problem}
	<div class="space-y-1 alert-error" role="alert">
		<p class="font-semibold">{problem.title}</p>
		<p>{problem.action}</p>
		<details class="text-xs">
			<summary>{t('setup.ifood.technical')}</summary>
			<code class="break-all">{problem.detail}</code>
		</details>
	</div>
{:else if ifood.lastCheckAt}
	<p class="text-sm {ifood.lastCheckOk ? 'text-ok' : 'text-bad'}">
		{t('setup.ifood.lastTest', {
			when: formatDateTime(ifood.lastCheckAt),
			result: ifood.lastCheckOk ? t('setup.ifood.ok') : (ifood.lastCheckError ?? '')
		})}
	</p>
{/if}

{#if ifood.enabled}
	<form method="POST" action="?{query}/ifoodEnable" use:enhance>
		<input type="hidden" name="enabled" value="0" />
		<button class="btn-danger">{t('setup.ifood.disable')}</button>
	</form>
{:else if ifood.lastCheckOk && ifood.source === 'app'}
	<form
		method="POST"
		action="?{query}/ifoodEnable"
		use:enhance
		class="space-y-2 border-t border-line pt-3"
	>
		<input type="hidden" name="enabled" value="1" />
		<Checkbox label={t('setup.ifood.ack')} name="understood" required class="text-sm" />
		<button class="btn-primary">{t('setup.ifood.enable')}</button>
	</form>
{/if}
<p class="text-xs text-muted">
	{t('setup.ifood.webhook', { url: webhookUrl })}
</p>
