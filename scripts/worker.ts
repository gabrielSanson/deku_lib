// Worker process: `pnpm worker`. Runs pg-boss handlers from the same codebase
// as the web app. Needs a direct or session-mode Postgres connection
// (not the transaction pooler), because pg-boss relies on session features.
import { closeDb } from '#lib/server/db.ts';
import { stopBoss } from '#lib/server/jobs.ts';
import { startWorker } from '#lib/server/worker/handlers.ts';
import { ifoodHandlers } from '#lib/server/integrations/ifood/worker.ts';

await startWorker(await ifoodHandlers());

let stopping = false;
async function shutdown(signal: string) {
	if (stopping) return;
	stopping = true;
	console.log(JSON.stringify({ msg: 'worker stopping', signal }));
	await stopBoss();
	await closeDb();
	process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
