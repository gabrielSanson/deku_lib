// The platform's legal texts (drafts until a lawyer reviews them). The version is recorded with
// each acceptance at sign-up; change it whenever a text changes.
import dpa from './dpa.md?raw';
import privacy from './privacy.md?raw';
import terms from './terms.md?raw';

export const LEGAL_VERSION = '2026-11-16-rascunho';

export const LEGAL_DOCS = {
	terms: { title: 'Termos de uso', path: '/termos', source: terms },
	privacy: { title: 'Aviso de privacidade', path: '/privacidade-plataforma', source: privacy },
	dpa: { title: 'Acordo de tratamento de dados (DPA)', path: '/dpa', source: dpa }
} as const;
export type LegalDoc = keyof typeof LEGAL_DOCS;
