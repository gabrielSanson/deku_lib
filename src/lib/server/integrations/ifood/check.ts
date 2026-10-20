// The setup wizard's "Testar conexão": get a token, then read the merchant.
// Errors are explained in plain Portuguese with what to do next. The causes are
// inferred from the HTTP status (iFood's exact error bodies are UNVERIFIED).
import { ifoodClient, IfoodApiError, type IfoodCredentials } from './api';

export type IfoodStage = 'token' | 'merchant' | 'polling';

export interface IfoodProblem {
	stage: IfoodStage;
	title: string;
	action: string;
	detail: string;
}

export function explainIfoodError(err: unknown, stage: IfoodStage): IfoodProblem {
	const detail =
		err instanceof IfoodApiError ? `HTTP ${err.status} ${err.body.slice(0, 200)}` : String(err);
	const status = err instanceof IfoodApiError ? err.status : 0;
	const p = (title: string, action: string): IfoodProblem => ({ stage, title, action, detail });

	if (!(err instanceof IfoodApiError)) {
		if (/credentials are not configured/i.test(detail))
			return p('Faltam credenciais.', 'Preencha Client ID, Client Secret e Merchant ID e salve.');
		return p(
			'Não foi possível falar com o iFood.',
			'Confira se o servidor tem acesso à internet e tente de novo. Se continuar, o iFood pode estar fora do ar.'
		);
	}
	if (status === 429)
		return p(
			'O iFood pediu para esperar (muitas tentativas).',
			'Aguarde um minuto e tente de novo.'
		);
	if (status >= 500)
		return p('O iFood está com instabilidade.', 'Tente de novo em alguns minutos.');
	if (stage === 'token') {
		if (status === 400 || status === 401 || status === 403)
			return p(
				'O iFood recusou o Client ID ou o Client Secret.',
				'Copie os dois de novo no Portal do Desenvolvedor iFood (aplicativo da sua loja → credenciais). Cuidado com espaços no começo ou no fim.'
			);
		return p('O iFood não entregou o acesso.', 'Confira as credenciais e tente de novo.');
	}
	if (status === 401 || status === 403)
		return p(
			'As credenciais funcionam, mas não têm acesso a esta loja.',
			'No Portal do Parceiro iFood, autorize o seu aplicativo para a loja e confira o Merchant ID.'
		);
	if (status === 404)
		return p(
			'O iFood não encontrou a loja com este Merchant ID.',
			'Copie o Merchant ID de novo no Portal do Parceiro (Perfil da loja) e salve.'
		);
	return p(
		'O iFood respondeu com um erro inesperado.',
		'Tente de novo; se continuar, veja o detalhe técnico abaixo.'
	);
}

export async function checkIfoodConnection(
	creds: IfoodCredentials,
	f: typeof fetch = fetch
): Promise<{ ok: true } | { ok: false; problem: IfoodProblem }> {
	const client = ifoodClient(f, async () => creds);
	try {
		await client.authenticate();
	} catch (err) {
		return { ok: false, problem: explainIfoodError(err, 'token') };
	}
	try {
		await client.merchant();
	} catch (err) {
		return { ok: false, problem: explainIfoodError(err, 'merchant') };
	}
	return { ok: true };
}
