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
