// E-mail through SMTP_URL (the same mailbox as the owner alerts).
import nodemailer from 'nodemailer';
import { config } from '../config';
import { MessagingNotConfigured, type MessagingProvider } from './provider';

export function smtpProvider(): MessagingProvider {
	const { SMTP_URL, ALERT_FROM } = config();
	if (!SMTP_URL) throw new MessagingNotConfigured('SMTP_URL is not set');
	const transport = nodemailer.createTransport(SMTP_URL);
	return {
		name: 'smtp',
		async send(message) {
			const info = await transport.sendMail({
				from: ALERT_FROM ?? undefined,
				to: message.to,
				subject: message.vars.subject ?? message.template,
				text: message.vars.body ?? Object.values(message.vars).join('\n')
			});
			return { ref: info.messageId ?? null };
		}
	};
}
