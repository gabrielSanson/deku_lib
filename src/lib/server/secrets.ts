// Encrypts secrets the owner types into the app before they reach the database
// (AES-256-GCM, key derived from APP_SECRET). A database dump alone is then not
// enough to use them.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { config } from './config';
import { DomainError } from './errors';

function key() {
	const secret = config().APP_SECRET;
	if (!secret) {
		throw new DomainError(
			'O servidor não tem APP_SECRET configurado, então não pode guardar senhas. Rode deploy/setup.sh de novo ou defina APP_SECRET.',
			'no_app_secret',
			501
		);
	}
	return createHash('sha256').update(`deku-shop:${secret}`).digest();
}

export function canStoreSecrets() {
	return Boolean(config().APP_SECRET);
}

export function encryptSecret(plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(), iv);
	const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
	return ['v1', iv, cipher.getAuthTag(), body]
		.map((p) => (typeof p === 'string' ? p : p.toString('base64')))
		.join(':');
}

export function decryptSecret(stored: string): string {
	const [v, iv, tag, body] = stored.split(':');
	if (v !== 'v1' || !iv || !tag || !body) throw new Error('unknown secret format');
	const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
	decipher.setAuthTag(Buffer.from(tag, 'base64'));
	return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString(
		'utf8'
	);
}
