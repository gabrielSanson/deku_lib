// Development and tests: messages are kept in memory and logged instead of sent.
import { randomUUID } from 'node:crypto';
import type { MessagingProvider, OutMessage } from './provider';

export const stubSent: (OutMessage & { channel: string })[] = [];

export function localStubProvider(channel: string): MessagingProvider {
	return {
		name: 'local_stub',
		async send(message) {
			stubSent.push({ ...message, channel });
			console.log(JSON.stringify({ msg: 'message (stub)', channel, ...message }));
			return { ref: `stub-${randomUUID()}` };
		}
	};
}
