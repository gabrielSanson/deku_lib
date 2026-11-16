import { describe, expect, it } from 'vitest';
import { parseDocText } from './doc-text';

describe('parseDocText', () => {
	it('reads headings, paragraphs and lists, keeping any HTML as plain text', () => {
		const blocks = parseDocText(
			'# Termos\n\nPrimeira linha\ncontinua.\n\n## Dados\n- um\n- <b>dois</b>\nfim'
		);
		expect(blocks).toEqual([
			{ type: 'h1', text: 'Termos' },
			{ type: 'p', text: 'Primeira linha continua.' },
			{ type: 'h2', text: 'Dados' },
			{ type: 'ul', items: ['um', '<b>dois</b>'] },
			{ type: 'p', text: 'fim' }
		]);
	});
});
