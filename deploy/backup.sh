#!/bin/sh
# Standalone Docker profile only; the shared host uses deploy/hetzner/backup.sh.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
umask 077
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="./backups/$stamp"
mkdir -p ./backups
mkdir "$backup_dir"
# Freeze application writes so the database and uploaded files represent the same state.
# The EXIT trap restarts only services that were running before the backup.
running_services=$(docker compose -f compose.standalone.yml --profile deliveries ps --services --status running | awk '/^(api|worker)$/')
restart_services() {
  for service_name in $running_services; do docker compose -f compose.standalone.yml --profile deliveries start "$service_name"; done
}
trap restart_services EXIT INT TERM
for service_name in $running_services; do docker compose -f compose.standalone.yml --profile deliveries stop "$service_name"; done
docker compose -f compose.standalone.yml exec -T db pg_dump -U yashiluyim -d yashiluyim -Fc > "$backup_dir/database.dump"
docker compose -f compose.standalone.yml run --rm --no-deps -T --entrypoint tar api -czf - -C /app/uploads . > "$backup_dir/uploads.tar.gz"
(cd "$backup_dir" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
echo "Backup created: $backup_dir. Copy it to the configured off-server backup destination."
