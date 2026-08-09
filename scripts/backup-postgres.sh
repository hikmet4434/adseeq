#!/bin/sh
set -eu

backup_dir="${BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_dir/winninghunter-$timestamp.sql.gz"

docker compose exec -T db pg_dump -U winninghunter -d winninghunter | gzip -9 > "$target"
find "$backup_dir" -type f -name 'winninghunter-*.sql.gz' -mtime +"${BACKUP_RETENTION_DAYS:-14}" -delete
echo "Backup created: $target"
