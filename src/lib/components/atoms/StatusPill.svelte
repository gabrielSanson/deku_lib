<script lang="ts">
	// A rounded label with a coloured dot, e.g. "● Ativa" or "● Em atraso".
	export type PillTone = 'ok' | 'warn' | 'bad' | 'brand' | 'info' | 'quiet';
	let { tone = 'quiet', label }: { tone?: PillTone; label: string } = $props();

	const tones: Record<PillTone, { pill: string; dot: string }> = {
		ok: { pill: 'bg-ok-tint text-ok', dot: 'bg-ok' },
		warn: { pill: 'bg-brand-tint text-warn', dot: 'bg-warn' },
		bad: { pill: 'bg-bad-tint text-bad', dot: 'bg-bad' },
		brand: { pill: 'bg-brand-tint text-brand-700', dot: 'bg-brand-500' },
		info: { pill: 'bg-info-tint text-info', dot: 'bg-info' },
		quiet: { pill: 'bg-quiet text-muted', dot: 'bg-stone-400' }
	};
</script>

<span class="pill {tones[tone].pill}"
	><span class="size-1.5 rounded-full {tones[tone].dot}" aria-hidden="true"></span>{label}</span
>
