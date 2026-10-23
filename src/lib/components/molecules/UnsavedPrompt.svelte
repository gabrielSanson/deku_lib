<script lang="ts">
	// Asks before leaving an editor with unsaved edits, in the app's own dialog instead of the
	// browser pop-up. Mounted once in the root layout; guardUnsaved opens it.
	import ConfirmDialog from '#lib/components/molecules/ConfirmDialog.svelte';
	import { leavePrompt } from '#lib/client/unsaved.svelte.ts';
	import { useTexts } from '#lib/texts/context.ts';

	const t = useTexts();
</script>

<ConfirmDialog
	bind:open={leavePrompt.open}
	title={t('unsaved.title')}
	text={leavePrompt.message}
	confirmLabel={t('unsaved.leave')}
	cancelLabel={t('unsaved.stay')}
	danger
	onconfirm={() => leavePrompt.leave()}
/>
