import { describe, expect, it } from 'vitest';
import { HELP_ARTICLES, helpFor } from './index';

describe('help centre', () => {
	it('has every article the spec lists, each with a heading', () => {
		expect(HELP_ARTICLES.map((a) => a.slug)).toEqual([
			'primeiros-passos',
			'cardapio',
			'pix',
			'nota-fiscal',
			'ifood',
			'impressora',
			'whatsapp',
			'backups'
		]);
		for (const a of HELP_ARTICLES) expect(a.source.startsWith('# ')).toBe(true);
	});

	it('links settings pages to their article', () => {
		expect(helpFor('/staff/settings/payments')?.slug).toBe('pix');
		expect(helpFor('/staff/settings/fiscal/export')?.slug).toBe('nota-fiscal');
		expect(helpFor('/staff/menu/edit')?.slug).toBe('cardapio');
		expect(helpFor('/staff/orders')).toBeUndefined();
	});
});
