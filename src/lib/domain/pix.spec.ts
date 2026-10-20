import { describe, expect, it } from 'vitest';
import { buildPixCode, crc16, normalizePixKey, pixText } from './pix';

describe('Pix BR Code', () => {
	it('uses CRC-16/CCITT-FALSE', () => {
		expect(crc16('123456789')).toBe('29B1');
		// Example from the Banco Central's BR Code manual.
		expect(
			crc16(
				'00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304'
			)
		).toBe('1D3D');
	});

	it('recognises each key type', () => {
		expect(normalizePixKey('(11) 98765-4321')).toEqual({ type: 'phone', key: '+5511987654321' });
		expect(normalizePixKey('+55 11 98765-4321')).toEqual({ type: 'phone', key: '+5511987654321' });
		expect(normalizePixKey('Loja@Exemplo.com.br')).toEqual({
			type: 'email',
			key: 'loja@exemplo.com.br'
		});
		expect(normalizePixKey('529.982.247-25')).toEqual({ type: 'cpf', key: '52998224725' });
		expect(normalizePixKey('11.222.333/0001-81')).toEqual({ type: 'cnpj', key: '11222333000181' });
		expect(normalizePixKey('123E4567-E89B-12D3-A456-426614174000')?.type).toBe('random');
		expect(normalizePixKey('111.111.111-11')).toBeNull();
		expect(normalizePixKey('não é chave')).toBeNull();
	});

	it('strips accents from merchant text', () => {
		expect(pixText('Hambúrgueria São João!', 25)).toBe('Hamburgueria Sao Joao');
	});

	it('builds a well-formed code with a valid checksum', () => {
		const code = buildPixCode({
			key: 'loja@exemplo.com.br',
			merchantName: 'Deku Burger',
			merchantCity: 'São Paulo',
			amountCents: 4380,
			reference: 'PEDIDO-123'
		});
		expect(code.startsWith('000201')).toBe(true);
		expect(code).toContain('0014br.gov.bcb.pix0119loja@exemplo.com.br');
		expect(code).toContain('540543.80');
		expect(code).toContain('5802BR5911Deku Burger6009Sao Paulo');
		expect(code).toContain('62130509PEDIDO123');
		const body = code.slice(0, -4);
		expect(body.endsWith('6304')).toBe(true);
		expect(code.slice(-4)).toBe(crc16(body));
	});

	it('refuses a bad key or amount', () => {
		const base = { merchantName: 'X', merchantCity: 'Y', reference: '1' };
		expect(() => buildPixCode({ ...base, key: 'nope', amountCents: 100 })).toThrow();
		expect(() => buildPixCode({ ...base, key: 'a@b.co', amountCents: 0 })).toThrow();
	});
});
