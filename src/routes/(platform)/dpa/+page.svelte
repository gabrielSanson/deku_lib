<script lang="ts">
	import DocText from '#lib/components/organisms/DocText.svelte';
	import { LEGAL_DOCS, LEGAL_VERSION } from '#lib/platform/legal/index.ts';
	const doc = LEGAL_DOCS.dpa;
</script>

<svelte:head><title>{doc.title}</title></svelte:head>

<DocText source={doc.source} />
<p class="text-xs text-muted">Versão {LEGAL_VERSION}</p>
