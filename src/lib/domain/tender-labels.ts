export type TenderMethodLabel =
	| 'cash'
	| 'external_pix'
	| 'terminal_card'
	| 'softpos_nfc'
	| 'pix'
	| 'online_card'
	| 'ifood_collected';

export const METHOD_LABEL_PT: Record<TenderMethodLabel, string> = {
	cash: 'Dinheiro',
	external_pix: 'Pix (conferido)',
	terminal_card: 'Cartão (maquininha)',
	softpos_nfc: 'Cartão por aproximação (celular)',
	pix: 'Pix online',
	online_card: 'Cartão online',
	ifood_collected: 'Pago no iFood'
};
