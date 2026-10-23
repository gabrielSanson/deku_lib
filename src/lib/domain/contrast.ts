// WCAG contrast for the owner's brand colours. Each pair is text the storefront
// actually draws in those colours; every one is normal-size text somewhere, so
// each needs 4.5:1.

export type BrandColors = { primary: string; dark: string; background: string };

export const CONTRAST_PAIRS = [
	// Button and badge labels are black on the main colour.
	{ id: 'onPrimary', fg: () => '#000000', bg: (c: BrandColors) => c.primary },
	// Header, footer and cart drawer text is white on the dark colour.
	{ id: 'onDark', fg: () => '#ffffff', bg: (c: BrandColors) => c.dark },
	// Prices, the footer tagline and drawer highlights are the main colour on the dark one.
	{ id: 'primaryOnDark', fg: (c: BrandColors) => c.primary, bg: (c: BrandColors) => c.dark },
	// Body and secondary text on the light page background (layout.css --color-ink / --color-muted).
	{ id: 'inkOnBackground', fg: () => '#141414', bg: (c: BrandColors) => c.background },
	{ id: 'mutedOnBackground', fg: () => '#5c5650', bg: (c: BrandColors) => c.background }
] as const;

export type ContrastPairId = (typeof CONTRAST_PAIRS)[number]['id'];
export const MIN_CONTRAST = 4.5;

/** Server-side wording; the staff screen uses the look.contrast.* catalog keys. */
export const CONTRAST_LABELS_PT: Record<ContrastPairId, string> = {
	onPrimary: 'texto preto na cor principal (botões)',
	onDark: 'texto branco na cor escura (topo e rodapé)',
	primaryOnDark: 'cor principal sobre a cor escura (preços e destaques)',
	inkOnBackground: 'texto do site sobre o fundo da página',
	mutedOnBackground: 'texto secundário sobre o fundo da página'
};

function luminance(hex: string): number {
	const n = parseInt(hex.slice(1), 16);
	const channel = (v: number) => {
		const s = v / 255;
		return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return (
		0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
	);
}

/** Ratio between two #rrggbb colours, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** The pairs below 4.5:1, with their ratio rounded down to one decimal. */
export function contrastFailures(colors: BrandColors): { id: ContrastPairId; ratio: number }[] {
	return CONTRAST_PAIRS.map((p) => ({
		id: p.id,
		ratio: Math.floor(contrastRatio(p.fg(colors), p.bg(colors)) * 10) / 10
	})).filter((r) => r.ratio < MIN_CONTRAST);
}
