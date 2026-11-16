// Every message the shop sends goes through message_outbox: queued in the transaction that
// caused it, sent by the whatsapp-send job, retried with backoff, recorded with the provider's id.
import { config } from '../config';
import { db, type Db } from '../db';
import { enqueue, QUEUES } from '../jobs';
import { whatsappCredentials } from '../whatsapp/settings';
import { localStubProvider } from './local-stub';
import { MessagingNotConfigured, type MessageChannel, type MessagingProvider } from './provider';
import { smtpProvider } from './smtp';
import { whatsappCloudProvider } from './whatsapp-cloud';

export interface QueuedMessage {
	channel: MessageChannel;
	to: string;
	template: string;
	vars: Record<string, string>;
	orderId?: string | null;
}

/** Queues a message; a status message already queued for the order is not queued again. */
export async function queueMessage(tx: Db, m: QueuedMessage): Promise<string | null> {
	const [row] = await tx<{ id: string }[]>`
		insert into message_outbox (channel, to_address, template, vars, order_id)
		values (${m.channel}, ${m.to}, ${m.template}, ${tx.json(m.vars)}, ${m.orderId ?? null})
		on conflict do nothing returning id`;
	if (!row) return null;
	await enqueue(tx, QUEUES.whatsappSend, { outboxId: row.id }, { singletonKey: `msg:${row.id}` });
	return row.id;
}

export async function providerFor(channel: MessageChannel): Promise<MessagingProvider> {
	if (channel === 'whatsapp') {
		if (config().WHATSAPP_STUB) return localStubProvider('whatsapp');
		return whatsappCloudProvider(await whatsappCredentials());
	}
	if (!config().SMTP_URL && config().NODE_ENV !== 'production') return localStubProvider('email');
	return smtpProvider();
}

export async function sendOutboxMessage(
	outboxId: string,
	provider?: MessagingProvider
): Promise<'sent' | 'skipped' | 'failed'> {
	const sql = db();
	const [m] = await sql<
		{
			channel: MessageChannel;
			to_address: string;
			template: string;
			vars: Record<string, string>;
			status: string;
		}[]
	>`select channel, to_address, template, vars, status from message_outbox where id = ${outboxId}`;
	if (!m) return 'skipped';
	if (m.status === 'sent' || m.status === 'skipped') return m.status;
	let p: MessagingProvider;
	try {
		p = provider ?? (await providerFor(m.channel));
	} catch (err) {
		if (!(err instanceof MessagingNotConfigured)) throw err;
		await sql`update message_outbox set status = 'skipped', error = ${err.message} where id = ${outboxId}`;
		return 'skipped';
	}
	try {
		const { ref } = await p.send({ to: m.to_address, template: m.template, vars: m.vars });
		await sql`update message_outbox set status = 'sent', sent_at = now(), provider_ref = ${ref},
			attempts = attempts + 1, error = null where id = ${outboxId}`;
		return 'sent';
	} catch (err) {
		await sql`update message_outbox set status = 'failed', attempts = attempts + 1,
			error = ${String(err).slice(0, 500)} where id = ${outboxId}`;
		throw err;
	}
}
