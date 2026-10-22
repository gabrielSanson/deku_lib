<script lang="ts">
	// A thin rule between groups of content. Decorative, so screen readers skip it.
	let { class: klass = '' }: { class?: string } = $props();
</script>

<hr class="border-0 border-t border-line {klass}" aria-hidden="true" />
