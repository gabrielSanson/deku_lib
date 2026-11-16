import { describe, expect, it } from 'vitest';
import { botIntent, botReply, mayMessage, statusTemplate } from './whatsapp-bot';

const texts = {
	greeting: 'Olá, {shop}. {state} {link}',
	open: 'Aberto.',
	closed: 'Fechado.',
	status: 'Pedido {number}: {status}',
	noOrder: 'Sem pedidos.',
	human: 'Já chamamos alguém.'
};
const ctx = {
	shopName: 'Loja Teste',
	open: true,
	menuUrl: 'https://loja.test/cardapio?wa=abc',
	lastOrder: { number: 1042, statusLabel: 'Em preparo' }
};

describe('whatsapp bot', () => {
	it('greets any first message with the shop, open state and the menu link', () => {
		const r = botReply('oi, boa noite!', ctx, texts);
		expect(r).toEqual({
			intent: 'greeting',
			text: 'Olá, Loja Teste. Aberto. https://loja.test/cardapio?wa=abc',
			flagStaff: false
		});
		expect(botReply('Oi', { ...ctx, open: false }, texts).text).toContain('Fechado.');
	});

	it('answers the last order status', () => {
		expect(botReply('Meu pedido?', ctx, texts).text).toBe('Pedido 1042: Em preparo');
		expect(botReply('status', { ...ctx, lastOrder: null }, texts).text).toBe('Sem pedidos.');
		expect(botIntent('Cadê meu lanche')).toBe('status');
	});

	it('flags a request for a person', () => {
		const r = botReply('Quero falar com atendente', ctx, texts);
		expect(r).toMatchObject({ intent: 'human', flagStaff: true });
		expect(botIntent('ATENDENTE')).toBe('human');
	});

	it('picks the status template', () => {
		const pickup = { type: 'pickup', provider: 'shop' };
		const delivery = { type: 'delivery', provider: 'own_driver' };
		expect(statusTemplate('placed', pickup)).toBe('pedido_recebido');
		expect(statusTemplate('ready', pickup)).toBe('pedido_pronto');
		expect(statusTemplate('ready', delivery)).toBe('saiu_para_entrega');
		expect(statusTemplate('out', delivery)).toBe('saiu_para_entrega');
		expect(statusTemplate('cancelled', delivery)).toBe('pedido_cancelado');
	});

	it('messages only opted-in customers or those who wrote in the last 24 hours', () => {
		const now = new Date('2026-11-16T12:00:00Z');
		expect(mayMessage(null, null, now)).toBe(false);
		expect(mayMessage(new Date('2026-01-01'), null, now)).toBe(true);
		expect(mayMessage(null, new Date('2026-11-16T00:00:00Z'), now)).toBe(true);
		expect(mayMessage(null, new Date('2026-11-15T11:00:00Z'), now)).toBe(false);
	});
});
