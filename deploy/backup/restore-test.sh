#!/bin/sh
# Weekly restore test: loads the newest dump into a scratch database, checks the orders are
# there, records the result in public.backup_runs and drops the scratch database.
set -u
[ -f /etc/backup.env ] && . /etc/backup.env

latest=$(ls -1t "${BACKUP_DIR:-/backups}"/shop-*.dump 2>/dev/null | head -n 1)
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
ok=false
orders=""
newest=""
err=""

if [ -z "$latest" ]; then
	err="no dump in ${BACKUP_DIR:-/backups}"
else
	dropdb --if-exists restore_check && createdb restore_check
	# Supabase's own schemas and extensions may print warnings; the orders check decides.
	pg_restore --no-owner --no-acl -d restore_check "$latest" > /tmp/restore.err 2>&1
	if orders=$(psql -X -tA -d restore_check -c 'select count(*) from public.orders' 2>>/tmp/restore.err); then
		newest=$(psql -X -tA -d restore_check -c 'select coalesce(max(created_at)::text, $$$$) from public.orders')
		ok=true
	else
		orders=""
		err="restore: $(tail -c 400 /tmp/restore.err)"
	fi
	dropdb --if-exists restore_check
fi

psql -X -q -v ON_ERROR_STOP=1 -v started="$started" -v ok="$ok" -v file="$(basename "${latest:-none}")" \
	-v orders="$orders" -v newest="$newest" -v err="$err" <<'SQL'
insert into public.backup_runs (kind, started_at, finished_at, ok, detail, error)
values ('restore_test', :'started'::timestamptz, now(), :'ok'::boolean,
	jsonb_build_object('file', :'file', 'orders', nullif(:'orders', '')::bigint,
		'newest_order', nullif(:'newest', '')),
	nullif(:'err', ''));
SQL

echo "restore test: ok=$ok orders=$orders ${err:+error=$err}"
[ "$ok" = true ]
