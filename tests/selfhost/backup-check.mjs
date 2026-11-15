// Runs one backup and one restore test inside a running self-hosted stack and checks that both
// were recorded as good in public.backup_runs. From the repository root on the server:
//   node tests/selfhost/backup-check.mjs
import { execFileSync } from 'node:child_process';

const shop = (...args) => execFileSync('deploy/shop.sh', args, { encoding: 'utf8' });
const step = (msg) => console.log(`✓ ${msg}`);

shop('exec', '-T', 'shop-backup', 'sh', '/opt/backup/backup.sh');
shop('exec', '-T', 'shop-backup', 'sh', '/opt/backup/restore-test.sh');
const out = shop(
	'exec',
	'-T',
	'db',
	'psql',
	'-U',
	'postgres',
	'-tA',
	'-c',
	`select kind || ':' || ok from (
		select distinct on (kind) kind, ok from backup_runs order by kind, started_at desc) r`
);
for (const kind of ['dump', 'restore_test']) {
	if (!out.includes(`${kind}:t`)) throw new Error(`FAILED: last ${kind} is not ok\n${out}`);
	step(`last ${kind} recorded as ok`);
}
