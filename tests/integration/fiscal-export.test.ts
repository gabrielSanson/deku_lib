// S5.5: NFC-e in offline contingency waits as 'contingency' until SEFAZ authorizes it, the
// receipt says so, and the month's notes export as a zip of XMLs plus a CSV for the accountant.
import { randomUUID } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, currentShopId, db } from '#lib/server/db.ts';
import type { NfceResult } from '#lib/server/fiscal/focusnfe.ts';
import {
	exportMonth,
	exportToken,
	sendMonthlyExport,
	verifyExportToken
} from '#lib/server/fiscal/export.ts';
import {
	followContingency,
	issueFiscalForOrder,
	saveAccountantEmail,
	saveFiscalSettings
} from '#lib/server/fiscal/service.ts';
import { monthOf } from '#lib/server/expenses/service.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { recordManualTender } from '#lib/server/payments/tenders.ts';
import { classic, makeStaff } from './helpers.ts';

let admin: Awaited<ReturnType<typeof makeStaff>>;

const settings = (enabled: boolean, environment: 'homologacao' | 'producao' = 'producao') =>
	saveFiscalSettings(
		{
			enabled,
			environment,
			cnpj: enabled ? '12345678000190' : '',
			token: enabled ? 'focus-token' : null,
			defaultNcm: enabled ? '21069090' : '',
			defaultCfop: '5102',
			defaultCsosn: '102'
		},
		admin
	);

async function paidOrder() {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic],
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: admin
	});
	await recordManualTender({
		orderId: o.id,
		method: 'terminal_card',
		amountCents: o.totalCents,
		providerReference: 'NSU-EXPORT',
		idempotencyKey: randomUUID(),
		actor: admin
	});
	return o;
}

beforeAll(async () => {
	admin = await makeStaff('admin');
	await db()`delete from fiscal_documents where environment = 'producao'`;
	await settings(true);
});

afterAll(async () => {
	await saveAccountantEmail('', admin);
	await settings(false, 'homologacao');
	await stopBoss();
	await closeDb();
});

describe('NFC-e contingency', () => {
	it('keeps a contingency note live, then settles it when SEFAZ authorizes', async () => {
		const o = await paidOrder();
		const issuer = async (): Promise<NfceResult> => ({
			status: 'contingency',
			number: '15',
			series: '1',
			accessKey: '3526'.padEnd(44, '1'),
			xmlUrl: 'https://focus.test/xml/15.xml'
		});
		expect(await issueFiscalForOrder(o.id, issuer)).toEqual({ status: 'contingency' });
		// A second job run does not issue again.
		expect(await issueFiscalForOrder(o.id, issuer)).toEqual({ skipped: true });

		let answer: NfceResult = { status: 'contingency' };
		const consult = async () => answer;
		expect(await followContingency(consult)).toBe(0);
		answer = { status: 'error', message: 'fora do ar' };
		expect(await followContingency(consult)).toBe(0);
		answer = { status: 'authorized', number: '15', series: '1' };
		expect(await followContingency(consult)).toBe(1);
		const [d] = await db()<{ status: string; issued_at: Date | null }[]>`
			select status, issued_at from fiscal_documents where order_id = ${o.id}`;
		expect(d.status).toBe('authorized');
		expect(d.issued_at).not.toBeNull();
	});
});

describe('monthly export', () => {
	it('zips the XMLs (downloaded once) with a CSV summary', async () => {
		let downloads = 0;
		const fetcher = (async () => {
			downloads++;
			return { ok: true, text: async () => '<nfeProc>15</nfeProc>' };
		}) as unknown as typeof fetch;
		const month = monthOf();
		const first = await exportMonth(month, fetcher);
		expect(first.count).toBe(1);
		expect(first.missing).toBe(0);
		await exportMonth(month, fetcher);
		expect(downloads).toBe(1);

		const names: string[] = [];
		const files: Record<string, string> = {};
		const zip = first.zip;
		let p = 0;
		while (zip.readUInt32LE(p) === 0x04034b50) {
			const size = zip.readUInt32LE(p + 18);
			const len = zip.readUInt16LE(p + 26);
			const name = zip.subarray(p + 30, p + 30 + len).toString();
			names.push(name);
			files[name] = inflateRawSync(zip.subarray(p + 30 + len, p + 30 + len + size)).toString();
			p += 30 + len + size;
		}
		expect(names).toEqual([`nfce-${month}/${'3526'.padEnd(44, '1')}.xml`, `resumo-${month}.csv`]);
		expect(files[names[0]]).toBe('<nfeProc>15</nfeProc>');
		expect(files[names[1]]).toContain('15;1;');
		expect(files[names[1]]).toContain('autorizada');
	});

	it('signs accountant links per shop and month, with an expiry', () => {
		const shop = currentShopId();
		const token = exportToken(shop, '2026-10');
		expect(verifyExportToken(token, shop)).toBe('2026-10');
		expect(verifyExportToken(token, randomUUID())).toBeNull();
		expect(verifyExportToken(token.replace('2026-10', '2026-09'), shop)).toBeNull();
		expect(verifyExportToken(token, shop, Date.now() + 46 * 86_400_000)).toBeNull();
		expect(verifyExportToken('garbage', shop)).toBeNull();
	});

	it("e-mails the accountant last month's link on the 1st", async () => {
		expect(await sendMonthlyExport(new Date('2026-12-01T11:00:00Z'))).toBe('skipped');
		await saveAccountantEmail('Contador@Exemplo.com.br', admin);
		await expect(saveAccountantEmail('not-an-email', admin)).rejects.toThrow();
		expect(await sendMonthlyExport(new Date('2026-12-01T11:00:00Z'))).toBe('sent');
		const [m] = await db()<{ to: string; vars: { subject: string; body: string } }[]>`
			select to_address as to, vars from message_outbox where to_address = 'contador@exemplo.com.br'
			order by created_at desc limit 1`;
		expect(m.vars.subject).toContain('11/2026');
		expect(m.vars.body).toContain('/api/v1/fiscal-export/');
	});
});
