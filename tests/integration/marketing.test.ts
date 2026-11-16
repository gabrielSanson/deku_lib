// S3.5: marketing reaches only contacts who accept offers, never a delivery-app contact, and the
// one-tap link takes a person off the list.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { marketingAudience, optOut, sendMarketing } from '#lib/server/campaigns/messages.ts';
import { closeDb, db } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { createOrder } from '#lib/server/orders/service.ts';
import { classic, ensureCashOpen, makeStaff } from './helpers.ts';

let manager: Awaited<ReturnType<typeof makeStaff>>;
const tag = randomUUID().slice(0, 6);

async function contact(
	channel: 'counter' | 'ifood',
	name: string,
	email: string,
	consent: boolean
) {
	const o = await createOrder({
		channel,
		sourceMode: channel === 'ifood' ? 'ifood_api' : 'staff_pos',
		channelOrderId: channel === 'ifood' ? randomUUID() : undefined,
		paymentPlan: channel === 'ifood' ? 'channel' : undefined,
		lines: [classic],
		fulfillmentType: 'counter',
		customer: { name, email, marketingConsent: consent },
		idempotencyKey: randomUUID(),
		initialStatus: 'confirmed',
		actor: manager
	});
	const [c] = await db()<{ id: string; opt_out_token: string }[]>`
		select c.id, c.opt_out_token from customers c join orders o on o.customer_id = c.id
		where o.id = ${o.id}`;
	return c;
}

beforeAll(async () => {
	manager = await makeStaff('admin');
	await ensureCashOpen(manager);
});

afterAll(async () => {
	await stopBoss();
	await closeDb();
});

describe('marketing messages', () => {
	it('sends only to own contacts who accept offers, each with an opt-out link', async () => {
		const yes = await contact('counter', `Sim ${tag}`, `sim-${tag}@x.test`, true);
		await contact('counter', `Nao ${tag}`, `nao-${tag}@x.test`, false);
		const app = await contact('ifood', `App ${tag}`, `app-${tag}@x.test`, true);
		// Even a forced consent on a delivery-app contact is ignored.
		await db()`update customers set marketing_consent_at = now() where id = ${app.id}`;

		const audience = { q: tag };
		expect((await marketingAudience('email', audience)).count).toBe(1);
		const r = await sendMarketing(
			{ channel: 'email', subject: 'Oferta', body: 'Oi {nome}, 10% hoje!', audience },
			{ type: 'staff', id: manager.id },
			'https://loja.test'
		);
		expect(r.recipients).toBe(1);
		const out = await db()<{ to_address: string; vars: { body: string } }[]>`
			select to_address, vars from message_outbox where send_id = ${r.id}`;
		expect(out.map((o) => o.to_address)).toEqual([`sim-${tag}@x.test`]);
		expect(out[0].vars.body).toContain(`Oi Sim, 10% hoje!`);
		expect(out[0].vars.body).toContain(`https://loja.test/sair/${yes.opt_out_token}`);
		const [a] = await db()<{ n: number }[]>`
			select count(*)::int as n from audit_log where action = 'marketing.sent' and object_id = ${r.id}`;
		expect(a.n).toBe(1);
	});

	it('takes a person off the list with one tap', async () => {
		const p = await contact('counter', `Sai ${tag}`, `sai-${tag}@x.test`, true);
		expect((await marketingAudience('email', { q: `Sai ${tag}` })).count).toBe(1);
		expect(await optOut(p.opt_out_token)).toBe(true);
		expect((await marketingAudience('email', { q: `Sai ${tag}` })).count).toBe(0);
		expect(await optOut('nope')).toBe(false);
	});

	it('refuses WhatsApp while it is off', async () => {
		await db()`update whatsapp_settings set enabled = false where shop_id = current_shop_id()`;
		await expect(
			sendMarketing(
				{ channel: 'whatsapp', template: 'oferta', audience: { q: tag } },
				{ type: 'staff', id: manager.id },
				'https://loja.test'
			)
		).rejects.toMatchObject({ key: 'err.marketing.noWhatsapp' });
	});
});
