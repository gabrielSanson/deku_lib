#!/bin/sh
# Nightly database dump for the shop-backup container (deploy/compose.shop.yml).
# 1. pg_dump into /backups  2. copy it off the machine when RCLONE_REMOTE is set
# 3. delete local dumps older than BACKUP_KEEP_DAYS  4. record the run in public.backup_runs
set -u
# busybox crond starts jobs with an empty environment; the container saved it here.
[ -f /etc/backup.env ] && . /etc/backup.env

dir=${BACKUP_DIR:-/backups}
keep=${BACKUP_KEEP_DAYS:-14}
log=/tmp/backup.err
: > "$log"
started=$(date -u +%Y-%m-%dT%H:%M:%SZ)
file="$dir/shop-$(date -u +%Y%m%dT%H%MZ).dump"
ok=false
offsite=false
bytes=0
err=""

if pg_dump -Fc -f "$file.part" "$PGDATABASE" 2>>"$log"; then
	mv "$file.part" "$file"
	ok=true
	bytes=$(wc -c < "$file" | tr -d ' ')
	if [ -n "${RCLONE_REMOTE:-}" ]; then
		if rclone copy "$dir" "$RCLONE_REMOTE" --include 'shop-*.dump' --max-age 26h 2>>"$log"; then
			offsite=true
		else
			err="rclone: $(tail -c 400 "$log")"
		fi
	fi
	find "$dir" -name 'shop-*.dump' -mtime +"$keep" -exec rm -f {} \;
else
	rm -f "$file.part"
	err="pg_dump: $(tail -c 400 "$log")"
fi

psql -X -q -v ON_ERROR_STOP=1 -v started="$started" -v ok="$ok" -v bytes="$bytes" \
	-v offsite="$offsite" -v file="$(basename "$file")" -v err="$err" -v keep="$keep" <<'SQL'
insert into public.backup_runs (kind, started_at, finished_at, ok, bytes, offsite, detail, error)
values ('dump', :'started'::timestamptz, now(), :'ok'::boolean, :'bytes'::bigint, :'offsite'::boolean,
	jsonb_build_object('file', :'file', 'keep_days', :'keep'::int), nullif(:'err', ''));
SQL

echo "backup: ok=$ok offsite=$offsite bytes=$bytes ${err:+error=$err}"
[ "$ok" = true ]
