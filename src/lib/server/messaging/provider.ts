// How a message leaves the shop: WhatsApp Cloud API, e-mail over SMTP, or the local stub.
export type MessageChannel = 'whatsapp' | 'email';

export interface OutMessage {
	to: string;
	/** A template name, or '_text' for a free text (vars.body, and vars.subject for e-mail). */
	template: string;
	/** Template variables in the order the template uses them. */
	vars: Record<string, string>;
}

export interface MessagingProvider {
	readonly name: string;
	send(message: OutMessage): Promise<{ ref: string | null }>;
}

export class MessagingNotConfigured extends Error {}
