import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { buildZip } from './zip';

/** Reads entries back by walking the local headers (enough to check our own output). */
function readZip(buf: Buffer) {
	const out: Record<string, string> = {};
	let p = 0;
	while (buf.readUInt32LE(p) === 0x04034b50) {
		const size = buf.readUInt32LE(p + 18);
		const nameLen = buf.readUInt16LE(p + 26);
		const name = buf.subarray(p + 30, p + 30 + nameLen).toString('utf8');
		const data = buf.subarray(p + 30 + nameLen, p + 30 + nameLen + size);
		out[name] = inflateRawSync(data).toString('utf8');
		p += 30 + nameLen + size;
	}
	return out;
}

describe('buildZip', () => {
	it('round-trips files, including UTF-8 names', () => {
		const zip = buildZip([
			{ name: 'notas/1.xml', data: '<nfe>1</nfe>' },
			{ name: 'resumo-março.csv', data: 'a;b\n1;2\n' }
		]);
		expect(readZip(zip)).toEqual({
			'notas/1.xml': '<nfe>1</nfe>',
			'resumo-março.csv': 'a;b\n1;2\n'
		});
		expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
		expect(zip.readUInt16LE(zip.length - 12)).toBe(2);
	});

	it('is accepted by the system unzip when available', () => {
		let has = true;
		try {
			execFileSync('unzip', ['-v'], { stdio: 'ignore' });
		} catch {
			has = false;
		}
		if (!has) return;
		const dir = mkdtempSync(join(tmpdir(), 'zip-'));
		writeFileSync(join(dir, 'a.zip'), buildZip([{ name: 'x/y.txt', data: 'olá' }]));
		execFileSync('unzip', ['-q', join(dir, 'a.zip'), '-d', dir]);
		expect(readFileSync(join(dir, 'x/y.txt'), 'utf8')).toBe('olá');
	});
});
