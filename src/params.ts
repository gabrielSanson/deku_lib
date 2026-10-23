import { defineParams } from '@sveltejs/kit/params';
import { isUuid } from '#lib/domain/ids.ts';

// Route params that must be a uuid (`[id=uuid]`): anything else is a 404 instead of
// a database error.
export const params = defineParams({
	uuid: (param) => (isUuid(param) ? param : undefined)
});
