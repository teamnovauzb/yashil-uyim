#!/bin/sh
set -eu
if [ "${1:-}" != '--run' ]; then
    echo 'Usage: backup.sh --run (only the isolated Yashil Uyim services/database/uploads)'
    exit 2
fi
[ "$(id -u)" -eq 0 ] || { echo 'Run as root on the configured target'; exit 1; }
umask 077
exec 9>/run/lock/yashiluyim-backup.lock
flock -n 9 || { echo 'A Yashil Uyim backup is already running'; exit 1; }
test -d /var/lib/yashiluyim/uploads
test -f /etc/systemd/system/yashiluyim-api.service
test -f /etc/systemd/system/yashiluyim-worker.service
pgbin=/usr/lib/postgresql/18/bin
identity=$(runuser -u postgres -- "$pgbin/psql" -XAt -h /var/run/postgresql -p 5432 -d yashiluyim -c "SELECT current_database() || '|' || current_setting('server_version_num')")
case "$identity" in yashiluyim\|18[0-9][0-9][0-9][0-9]) ;; *) echo 'Unexpected backup database/version'; exit 1 ;; esac
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="/var/backups/yashiluyim/$stamp"
mkdir -p /var/backups/yashiluyim
mkdir "$backup_dir"
running_services=''
for service_name in yashiluyim-api.service yashiluyim-worker.service; do
    if systemctl is-active --quiet "$service_name"; then running_services="$running_services $service_name"; fi
done
restore_services() {
    for service_name in $running_services; do systemctl start "$service_name"; done
}
trap restore_services EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
# Stop/restart only this application's previously running units. Never stop PostgreSQL/Nginx/PM2.
for service_name in $running_services; do systemctl stop "$service_name"; done
runuser -u postgres -- "$pgbin/pg_dump" -h /var/run/postgresql -p 5432 -d yashiluyim -Fc > "$backup_dir/database.dump"
tar -czf "$backup_dir/uploads.tar.gz" -C /var/lib/yashiluyim/uploads .
(cd "$backup_dir" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
echo "Backup created: $backup_dir. Copy it to private off-server storage and test a separate restore."
