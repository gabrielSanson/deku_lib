import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, db } from '#lib/server/db.ts';
import type { NfceRequest, NfceResult } from '#lib/server/fiscal/focusnfe.ts';
import {
	getFiscalSettings,
	issueFiscalForOrder,
	failedNotes,
	fiscalReadiness,
	issueTestNote,
	listFiscalDocuments,
	listIbsCbsRates,
	ratesNeedConfirmation,
	saveFiscalSettings,
	saveIbsCbsRates
} from '#lib/server/fiscal/service.ts';
import { fiscalYear } from '#lib/domain/nfce.ts';
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

	it('sends IBS/CBS when switched on and keeps what was sent for the accountant', async () => {
		const settings = {
			enabled: true,
			environment: 'homologacao' as const,
			cnpj: '12.345.678/0001-90',
			defaultNcm: '21069090',
			defaultCfop: '5102',
			defaultCsosn: '102'
		};
		await saveFiscalSettings({ ...settings, ibsCbsEnabled: true, crt: '1' }, admin);
		expect(await getFiscalSettings()).toMatchObject({
			ibsCbsEnabled: true,
			ibsCbsCst: '000',
			ibsCbsClass: '000001',
			crt: '1'
		});
		const o = await paidOrder();
		const seen: NfceRequest[] = [];
		await issueFiscalForOrder(o.id, (async (_e: string, _t: string, r: NfceRequest) => {
			seen.push(r);
			return { status: 'authorized', number: '13', series: '1' };
		}) as never);
		expect(seen[0].ibsCbs).toMatchObject({ enabled: true, cst: '000', cls: '000001' });
		const [doc] = await db()<{ ibs_cbs: { year: number; totals: { baseCents: number } } }[]>`
			select ibs_cbs from fiscal_documents where order_id = ${o.id}`;
		expect(doc.ibs_cbs.year).toBe(fiscalYear(new Date()));
		expect(doc.ibs_cbs.totals.baseCents).toBe(o.totalCents);

		// Older settings forms that do not send the new fields keep them.
		await saveFiscalSettings(settings, admin);
		expect((await getFiscalSettings()).ibsCbsEnabled).toBe(true);
	});

	it('refuses to issue without the rates of the year', async () => {
		const year = fiscalYear(new Date());
		const saved = await db()`select * from ibs_cbs_rates where year = ${year}`;
		await db()`delete from ibs_cbs_rates where year = ${year}`;
		const o = await paidOrder();
		let called = false;
		await expect(
			issueFiscalForOrder(o.id, (async () => {
				called = true;
				return { status: 'authorized' };
			}) as never)
		).rejects.toMatchObject({ code: 'no_rates' });
		expect(called).toBe(false);
		const [doc] = await listFiscalDocuments(o.id);
		expect(doc.status).toBe('error');
		expect(doc.errorMessage).toMatch(String(year));
		await db()`insert into ibs_cbs_rates ${db()(saved[0] as never)}`;
		await saveFiscalSettings(
			{
				enabled: false,
				environment: 'homologacao',
				cnpj: '',
				defaultNcm: '',
				defaultCfop: '5102',
				defaultCsosn: '102',
				ibsCbsEnabled: false
			},
			admin
		);
	});

	it('asks to confirm the 2027 rates from December 2026 until they are saved', async () => {
		const rates = await listIbsCbsRates();
		expect(rates.map((r) => r.year)).toEqual([2026, 2027]);
		expect(ratesNeedConfirmation(rates, new Date('2026-11-20T12:00:00Z'))).toBeNull();
		expect(ratesNeedConfirmation(rates, new Date('2026-12-02T12:00:00Z'))).toBe(2027);
		await saveIbsCbsRates(
			rates.map((r) => ({
				year: r.year,
				cbsRate: r.cbsRate,
				ibsUfRate: r.ibsUfRate,
				ibsMunRate: r.ibsMunRate,
				note: r.note ?? ''
			})),
			admin
		);
		const after = await listIbsCbsRates();
		expect(
			ratesNeedConfirmation(after, new Date(Math.max(Date.now(), Date.parse('2026-12-02'))))
		).toBeNull();
		await expect(
			saveIbsCbsRates(
				[{ year: 2027, cbsRate: 'x', ibsUfRate: '0', ibsMunRate: '0', note: '' }],
				admin
			)
		).rejects.toMatchObject({ key: 'err.fiscal.rate' });
	});

	it('lists what is missing, issues a R$ 1 test note in homologação and lists failed notes', async () => {
		await saveFiscalSettings(
			{
				enabled: false,
				environment: 'homologacao',
				cnpj: '12.345.678/0001-90',
				token: 'test-token',
				defaultNcm: '21069090',
				defaultCfop: '5102',
				defaultCsosn: '102',
				ibsCbsEnabled: false,
				crt: '1'
			},
			admin
		);
		const before = await fiscalReadiness(db(), new Date('2026-11-20T12:00:00Z'));
		expect(Object.fromEntries(before.map((i) => [i.key, i.state]))).toMatchObject({
			cnpj: 'ok',
			token: 'ok',
			environment: 'warn',
			ibsCbs: 'warn'
		});
		const late = await fiscalReadiness(db(), new Date('2027-02-01T12:00:00Z'));
		expect(late.find((i) => i.key === 'ibsCbs')?.state).toBe('missing');

		const seen: NfceRequest[] = [];
		const doc = await issueTestNote(admin, (async (_e: string, _t: string, r: NfceRequest) => {
			seen.push(r);
			return { status: 'authorized', number: '1', series: '9' };
		}) as never);
		expect(doc?.status).toBe('authorized');
		expect(seen[0].payments).toEqual([{ method: 'external_pix', amountCents: 100 }]);
		const [o] = await db()<{ is_test: boolean; total_cents: number }[]>`
			select o.is_test, o.total_cents from orders o join fiscal_documents d on d.order_id = o.id
			where d.id = ${doc!.id}`;
		expect(o).toEqual({ is_test: true, total_cents: 100 });
		const after = await fiscalReadiness();
		expect(after.find((i) => i.key === 'homologation')?.state).toBe('ok');

		const bad = await issueTestNote(admin, (async () => ({
			status: 'rejected',
			message: 'Rejeição 999'
		})) as never);
		expect(bad?.status).toBe('rejected');
		const failed = await failedNotes();
		expect(failed.find((f) => f.message === 'Rejeição 999')).toBeTruthy();
	});

	it('only issues test notes in homologação', async () => {
		await db()`update fiscal_settings set environment = 'producao'`;
		await expect(
			issueTestNote(admin, (async () => ({ status: 'authorized' })) as never)
		).rejects.toMatchObject({
			code: 'not_homolog'
		});
		await db()`update fiscal_settings set environment = 'homologacao'`;
	});
});
