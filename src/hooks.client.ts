// Error tracking (S5.11): unhandled errors in the browser are sent to /api/v1/client-errors so the
// platform sees problems customers and staff hit. At most a few reports per page load.
import type { ClientInit, HandleClientError } from '@sveltejs/kit/hooks';

let sent = 0;

function report(message: string, stack?: string) {
	if (sent >= 5 || !message) return;
	sent++;
	const body = JSON.stringify({
		message: message.slice(0, 1000),
		stack: stack?.slice(0, 8000),
		url: location.href.slice(0, 500)
	});
	try {
		void fetch('/api/v1/client-errors', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body,
			keepalive: true
		}).catch(() => {});
	} catch {
		/* reporting must never break the page */
	}
}

const describe = (e: unknown) =>
	e instanceof Error ? { message: e.message, stack: e.stack } : { message: String(e) };

export const init: ClientInit = () => {
	addEventListener('error', (e) => {
		const d = describe(e.error ?? e.message);
		report(d.message, d.stack);
	});
	addEventListener('unhandledrejection', (e) => {
		const d = describe(e.reason);
		report(d.message, d.stack);
	});
};

export const handleError: HandleClientError = (caught) => {
	// App and framework errors (404s, error(...)) are expected; only the unknown ones are bugs.
	if (caught.kind !== 'unknown') return;
	const d = describe(caught.error);
	report(d.message, d.stack);
};
