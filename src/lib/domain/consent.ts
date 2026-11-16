// Who may receive marketing (LGPD): only contacts who gave consent on one of the shop's own
// channels and did not opt out. Delivery-app contacts belong to the app's relationship with the
// customer and are never marketed to, whatever their record says.

export type CustomerSource = 'own' | 'ifood' | 'opendelivery' | 'whatsapp' | 'pos';

export const OWN_SOURCES: readonly CustomerSource[] = ['own', 'whatsapp', 'pos'];

export interface ConsentFacts {
	source: CustomerSource;
	marketingConsentAt: Date | null;
	marketingOptOutAt: Date | null;
	deletedAt?: Date | null;
}

export function mayMarket(c: ConsentFacts): boolean {
	if (c.deletedAt) return false;
	if (!OWN_SOURCES.includes(c.source)) return false;
	return !!c.marketingConsentAt && !c.marketingOptOutAt;
}

/** The same rule as a SQL condition on a customers row aliased `alias`. */
export function mayMarketSql(alias = 'c'): string {
	return `(${alias}.deleted_at is null and ${alias}.source in ('own', 'whatsapp', 'pos') and ${alias}.marketing_consent_at is not null and ${alias}.marketing_opt_out_at is null)`;
}

/** The contact source of an order's channel. */
export function sourceForChannel(channel: string, sourceMode?: string): CustomerSource {
	if (channel === 'ifood') return 'ifood';
	if (channel === 'opendelivery') return 'opendelivery';
	if (channel === 'counter' || sourceMode === 'staff_pos') return 'pos';
	return 'own';
}
