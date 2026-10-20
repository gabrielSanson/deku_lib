// Remembers the customer's latest order link on this device so the header can
// offer "Acompanhar pedido" without an account.
const KEY = 'deku-last-order-v1';

export function rememberOrder(token: string) {
	try {
		localStorage.setItem(KEY, token);
	} catch {
		/* private mode: the order page link still works */
	}
}

export function lastOrder(): string | null {
	try {
		return localStorage.getItem(KEY);
	} catch {
		return null;
	}
}
