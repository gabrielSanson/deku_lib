export const SHOP_TZ = 'America/Sao_Paulo';

const timeFmt = new Intl.DateTimeFormat('pt-BR', {
	timeZone: SHOP_TZ,
	hour: '2-digit',
	minute: '2-digit'
});
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', {
	timeZone: SHOP_TZ,
	day: '2-digit',
	month: '2-digit',
	hour: '2-digit',
	minute: '2-digit'
});

export function formatTime(d: Date | string | null | undefined): string {
	return d ? timeFmt.format(new Date(d)) : '—';
}

export function formatDateTime(d: Date | string | null | undefined): string {
	return d ? dateTimeFmt.format(new Date(d)) : '—';
}

const inputFmt = new Intl.DateTimeFormat('en-CA', {
	timeZone: SHOP_TZ,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23'
});

/** A date as a datetime-local value in shop time: "2026-10-21T18:00". */
export function toShopInput(d: Date | string | null | undefined): string {
	if (!d) return '';
	const p = Object.fromEntries(inputFmt.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
	return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Reads a datetime-local value typed in shop time. */
export function fromShopInput(value: string): Date | null {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
	const asUtc = new Date(`${value}:00Z`);
	// Shift by the zone's offset at that moment (São Paulo has no daylight saving, but stay exact).
	const offset = Date.parse(`${toShopInput(asUtc)}:00Z`) - asUtc.getTime();
	return new Date(asUtc.getTime() - offset);
}
