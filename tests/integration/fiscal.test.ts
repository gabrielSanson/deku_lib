import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import type { NfceRequest, NfceResult } from '#lib/server/fiscal/focusnfe.ts';
import {
	getFiscalSettings,
	issueFiscalForOrder,
	listFiscalDocuments,
	saveFiscalSettings
} from '#lib/server/fiscal/service.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { recordManualTender } from '#lib/server/payments/tenders.ts';
import { classic, makeStaff } from './helpers.ts';

let admin: Awaited<ReturnType<typeof makeStaff>>;

beforeAll(async () => {
	admin = await makeStaff('admin');
});

afterAll(async () => {
	await saveFiscalSettings(
		{
			enabled: false,
			environment: 'homologacao',
			cnpj: '',
			defaultNcm: '',
			defaultCfop: '5102',
			defaultCsosn: '102'
		},
		admin
	);
	await stopBoss();
	await closeDb();
});

async function paidOrder() {
	const o = await createOrder({
		channel: 'counter',
		sourceMode: 'staff_pos',
		lines: [classic, { sku: 'ACP-FRITAS', quantity: 2 }],
		fulfillmentType: 'counter',
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: admin
	});
	await recordManualTender({
		orderId: o.id,
		method: 'terminal_card',
		amountCents: o.totalCents,
		providerReference: 'NSU-FISCAL',
		idempotencyKey: randomUUID(),
		actor: admin
	});
	return o;
}

describe('NFC-e', () => {
	it('stays off until the shop data is complete', async () => {
		expect((await getFiscalSettings()).enabled).toBe(false);
		await expect(
			saveFiscalSettings(
				{
					enabled: true,
					environment: 'homologacao',
					cnpj: '12.345.678/0001-90',
					defaultNcm: '',
					defaultCfop: '5102',
					defaultCsosn: '102'
				},
				admin
			)
		).rejects.toMatchObject({ code: 'incomplete' });
	});

	it('issues once for a paid order, totals matching, and a rejection makes a new reference', async () => {
		await saveFiscalSettings(
			{
				enabled: true,
				environment: 'homologacao',
				cnpj: '12.345.678/0001-90',
				token: 'test-token',
				defaultNcm: '2106.90.90',
				defaultCfop: '5102',
				defaultCsosn: '102'
			},
			admin
		);
		const o = await paidOrder();
		const seen: NfceRequest[] = [];
		const reject = async (_env: string, token: string, r: NfceRequest): Promise<NfceResult> => {
			expect(token).toBe('test-token');
			seen.push(r);
			return { status: 'rejected', message: 'NCM inválido' };
		};
		await issueFiscalForOrder(o.id, reject as never);
		let docs = await listFiscalDocuments(o.id);
		expect(docs[0]).toMatchObject({ status: 'rejected', errorMessage: 'NCM inválido' });
		const r = seen[0];
		const lineTotal = r.lines.reduce(
			(n, l) => n + l.grossCents - l.discountCents + l.otherCents,
			0
		);
		expect(lineTotal).toBe(o.totalCents);
		expect(r.payments.reduce((n, p) => n + p.amountCents, 0)).toBe(o.totalCents);
		expect(r.defaults.ncm).toBe('21069090');

		const authorize = async (_e: string, _t: string, req: NfceRequest): Promise<NfceResult> => {
			seen.push(req);
			return { status: 'authorized', number: '12', series: '1', accessKey: '3526' };
		};
		await issueFiscalForOrder(o.id, authorize as never);
		await issueFiscalForOrder(o.id, authorize as never);
		docs = await listFiscalDocuments(o.id);
		expect(docs.map((d) => d.status)).toEqual(['authorized', 'rejected']);
		expect(seen[1].ref).not.toBe(seen[0].ref);
		// The second call found the authorized note and did not call the provider again.
		expect(seen).toHaveLength(2);
		const [{ n }] = await db()<{ n: number }[]>`
			select count(*)::int as n from pgboss.job where name = 'fiscal-issue' and data->>'orderId' = ${o.id}`;
		expect(n).toBe(1);
	});
});
