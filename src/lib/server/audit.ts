import type { Db } from './db';

export interface Actor {
	type: 'staff' | 'system' | 'customer' | 'integration';
	id: string | null;
}

export const SYSTEM: Actor = { type: 'system', id: null };

export async function audit(
	sql: Db,
	actor: Actor,
	action: string,
	objectType: string,
	objectId: string | null,
	summary: Record<string, unknown> = {}
) {
	await sql`
		insert into audit_log (actor_id, actor_type, action, object_type, object_id, summary)
		values (${actor.id}, ${actor.type}, ${action}, ${objectType}, ${objectId}, ${sql.json(summary as never)})
	`;
}
