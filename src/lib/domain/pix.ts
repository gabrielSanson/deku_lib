// Static Pix "copia e cola" (BR Code) for the shop's own Pix key, following the
// Banco Central's EMV QR Code layout (Manual de Padrões para Iniciação do Pix).
// The customer's bank fills in nothing: key, amount and a reference are in the code.
// Nobody tells us when it is paid, so staff confirm it by hand.

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';

/** Recognises and normalises a Pix key as the BR Code expects it. */
export function normalizePixKey(raw: string): { type: PixKeyType; key: string } | null {
	const v = raw.trim();
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
		return { type: 'random', key: v.toLowerCase() };
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 77)
		return { type: 'email', key: v.toLowerCase() };
	const digits = v.replace(/\D/g, '');
	if (/^\+/.test(v) || /^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(v)) {
		const national = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
		if (/^\d{2}9?\d{8}$/.test(national)) return { type: 'phone', key: `+55${national}` };
	}
	if (digits.length === 11 && validCpf(digits)) return { type: 'cpf', key: digits };
	if (digits.length === 14 && validCnpj(digits)) return { type: 'cnpj', key: digits };
	return null;
}

function validCpf(d: string) {
	if (/^(\d)\1{10}$/.test(d)) return false;
	const check = (len: number) => {
		let sum = 0;
		for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
		const r = (sum * 10) % 11;
		return r === 10 ? 0 : r;
	};
	return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

function validCnpj(d: string) {
	if (/^(\d)\1{13}$/.test(d)) return false;
	const check = (len: number) => {
		const weights =
			len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		const sum = weights.reduce((s, w, i) => s + w * Number(d[i]), 0);
		const r = sum % 11;
		return r < 2 ? 0 : 11 - r;
	};
	return check(12) === Number(d[12]) && check(13) === Number(d[13]);
}

/** Merchant name and city must be plain ASCII in the BR Code. */
export function pixText(text: string, max: number) {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^A-Za-z0-9 .-]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max)
		.trim();
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as the BR Code requires. */
export function crc16(payload: string): string {
	let crc = 0xffff;
	for (const byte of new TextEncoder().encode(payload)) {
		crc ^= byte << 8;
		for (let i = 0; i < 8; i++)
			crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
	}
	return crc.toString(16).toUpperCase().padStart(4, '0');
}

function field(id: string, value: string) {
	const len = new TextEncoder().encode(value).length;
	if (len > 99) throw new Error(`BR Code field ${id} too long`);
	return `${id}${String(len).padStart(2, '0')}${value}`;
}

export interface PixCharge {
	key: string;
	merchantName: string;
	merchantCity: string;
	amountCents: number;
	/** Shown in the payer's statement and the shop's bank app; letters and digits only, max 25. */
	reference: string;
}

export function buildPixCode(c: PixCharge): string {
	const key = normalizePixKey(c.key);
	if (!key) throw new Error('invalid Pix key');
	const name = pixText(c.merchantName, 25);
	const city = pixText(c.merchantCity, 15);
	if (!name || !city) throw new Error('merchant name and city are required');
	if (!Number.isInteger(c.amountCents) || c.amountCents <= 0) throw new Error('invalid amount');
	const txid = c.reference.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
	const payload =
		field('00', '01') +
		field('26', field('00', 'br.gov.bcb.pix') + field('01', key.key)) +
		field('52', '0000') +
		field('53', '986') +
		field('54', (c.amountCents / 100).toFixed(2)) +
		field('58', 'BR') +
		field('59', name) +
		field('60', city) +
		field('62', field('05', txid)) +
		'6304';
	return payload + crc16(payload);
}
