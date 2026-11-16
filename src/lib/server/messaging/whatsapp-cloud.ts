// WhatsApp Business Platform (Cloud API). [UNVERIFIED] TODO(verify): the Graph API version, the
// template language code and the body parameter format, with one real message.
import { MessagingNotConfigured, type MessagingProvider, type OutMessage } from './provider';

export const GRAPH_VERSION = 'v21.0';
export const GRAPH_BASE = 'https://graph.facebook.com';
export const TEMPLATE_LANGUAGE = 'pt_BR';

export interface WhatsappCredentials {
	phoneNumberId: string;
	accessToken: string;
}

export class WhatsappApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
		readonly body: string
	) {
		super(message);
	}
}

/** The request body for one message. */
export function whatsappPayload(m: OutMessage) {
	const to = m.to.replace(/^\+/, '');
	if (m.template === '_text') {
		return { messaging_product: 'whatsapp', to, type: 'text', text: { body: m.vars.body ?? '' } };
	}
	const params = Object.values(m.vars).map((text) => ({ type: 'text', text }));
	return {
		messaging_product: 'whatsapp',
		to,
		type: 'template',
		template: {
			name: m.template,
			language: { code: TEMPLATE_LANGUAGE },
			components: params.length ? [{ type: 'body', parameters: params }] : []
		}
	};
}

export function whatsappCloudProvider(
	creds: WhatsappCredentials | null,
	f: typeof fetch = fetch
): MessagingProvider {
	if (!creds) throw new MessagingNotConfigured('WhatsApp is not configured');
	return {
		name: 'whatsapp_cloud',
		async send(message) {
			const res = await f(`${GRAPH_BASE}/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${creds.accessToken}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify(whatsappPayload(message)),
				signal: AbortSignal.timeout(10_000)
			});
			const text = await res.text();
			if (!res.ok) throw new WhatsappApiError('WhatsApp send failed', res.status, text);
			const body = JSON.parse(text || '{}') as { messages?: { id: string }[] };
			return { ref: body.messages?.[0]?.id ?? null };
		}
	};
}

/** Template name → status as Meta reports it for the business account. */
export async function fetchTemplateStatus(
	wabaId: string,
	accessToken: string,
	f: typeof fetch = fetch
): Promise<Record<string, string>> {
	const res = await f(
		`${GRAPH_BASE}/${GRAPH_VERSION}/${wabaId}/message_templates?fields=name,status&limit=200`,
		{ headers: { authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) }
	);
	const text = await res.text();
	if (!res.ok) throw new WhatsappApiError('WhatsApp templates failed', res.status, text);
	const body = JSON.parse(text) as { data?: { name: string; status: string }[] };
	return Object.fromEntries((body.data ?? []).map((t) => [t.name, t.status]));
}
