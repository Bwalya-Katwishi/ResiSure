#!/usr/bin/env bash
# PostgreSQL backup for ResiSure on EC2.
# Usage: bash scripts/ec2-backup-db.sh
# Cron (daily 2am): 0 2 * * * /home/ec2-user/resisure/scripts/ec2-backup-db.sh >> /home/ec2-user/backups/backup.log 2>&1

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/api/.env"
BACKUP_DIR="${RESISURE_BACKUP_DIR:-/home/ec2-user/backups}"
RETAIN_DAYS="${RESISURE_BACKUP_RETAIN_DAYS:-7}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

read_env() {
  local val
  val="$(grep -E "^${1}=" "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  printf '%s' "$val"
}

DB_HOST="$(read_env DB_HOST)"; DB_HOST="${DB_HOST:-localhost}"
DB_PORT="$(read_env DB_PORT)"; DB_PORT="${DB_PORT:-5432}"
DB_USER="$(read_env DB_USER)"; DB_USER="${DB_USER:-resisure}"
DB_NAME="$(read_env DB_NAME)"; DB_NAME="${DB_NAME:-resisure_db}"
DB_PASSWORD="$(read_env DB_PASSWORD)"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$BACKUP_DIR/resisure_db_${STAMP}.sql.gz"

export PGPASSWORD="$DB_PASSWORD"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"
unset PGPASSWORD

find "$BACKUP_DIR" -name 'resisure_db_*.sql.gz' -mtime +"$RETAIN_DAYS" -delete 2>/dev/null || true

echo "Backup saved: $OUT ($(du -h "$OUT" | cut -f1))"
