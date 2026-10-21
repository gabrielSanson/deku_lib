<script lang="ts">
	// Vertical steps with a yellow check when done and a dashed line between.
	import Icon from '#lib/components/atoms/Icon.svelte';

	export interface Step {
		label: string;
		/** Shown when the step is done, e.g. "18:32". */
		time?: string | null;
		/** Shown while the step is still ahead. */
		hint?: string;
		state: 'done' | 'current' | 'next';
	}
	let { steps, dark = false }: { steps: Step[]; dark?: boolean } = $props();
</script>

<ol class="space-y-0">
	{#each steps as step, i (step.label)}
		<li class="relative flex gap-3 pb-5 last:pb-0">
			{#if i < steps.length - 1}
				<span
					class="absolute top-8 bottom-1 left-[15px] border-l-2 border-dashed {step.state === 'done'
						? 'border-brand-500'
						: dark
							? 'border-night-line'
							: 'border-line'}"
					aria-hidden="true"
				></span>
			{/if}
			<span
				class="relative grid size-8 shrink-0 place-items-center rounded-full {step.state === 'done'
					? 'bg-brand-500 text-black'
					: step.state === 'current'
						? 'border-2 border-brand-500 ' +
							(dark ? 'bg-night text-brand-500' : 'bg-surface text-brand-700')
						: dark
							? 'border-2 border-night-line bg-night'
							: 'border-2 border-line bg-surface'}"
			>
				{#if step.state === 'done'}<Icon
						name="check"
						class="size-4.5"
						strokeWidth={3}
					/>{:else if step.state === 'current'}<span
						class="size-2.5 animate-pulse rounded-full bg-brand-500"
					></span>{/if}
			</span>
			<div class="min-w-0 pt-1">
				<p
					aria-current={step.state === 'current' ? 'step' : undefined}
					class="font-semibold {step.state === 'next'
						? dark
							? 'text-stone-400'
							: 'text-muted'
						: ''}"
				>
					{step.label}
				</p>
				{#if step.state === 'done' && step.time}
					<p class="text-sm {dark ? 'text-stone-400' : 'text-muted'}">{step.time}</p>
				{:else if step.hint}
					<p class="text-sm {dark ? 'text-stone-400' : 'text-muted'}">{step.hint}</p>
				{/if}
			</div>
		</li>
	{/each}
</ol>
