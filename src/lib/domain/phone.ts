/** Normalizes a Brazilian phone number to E.164 (+55DDNNNNNNNNN), or null if invalid. */
export function normalizeBrPhone(input: string): string | null {
	let digits = input.replace(/\D/g, '');
	if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.slice(2);
	if (digits.startsWith('0')) digits = digits.slice(1);
	if (digits.length !== 10 && digits.length !== 11) return null;
	if (digits.length === 11 && digits[2] !== '9') return null;
	return `+55${digits}`;
}
