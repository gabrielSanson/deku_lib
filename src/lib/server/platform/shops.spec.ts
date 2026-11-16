import { describe, expect, it } from 'vitest';
import { normalizeHost } from './shops';

describe('normalizeHost', () => {
	it('lowercases and drops the port and a trailing dot', () => {
		expect(normalizeHost('Loja.Example.com:443')).toBe('loja.example.com');
		expect(normalizeHost('loja.example.com.')).toBe('loja.example.com');
		expect(normalizeHost('localhost:5173')).toBe('localhost');
	});
});
