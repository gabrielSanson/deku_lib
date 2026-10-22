<script lang="ts">
	// A placeholder block shown while content loads. Decorative, and motion stops under reduced motion.
	let { class: klass = 'h-4 w-full' }: { class?: string } = $props();
</script>

<div
	class="animate-pulse rounded-md bg-quiet motion-reduce:animate-none {klass}"
	aria-hidden="true"
></div>
