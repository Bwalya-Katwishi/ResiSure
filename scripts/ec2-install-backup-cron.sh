#!/usr/bin/env bash
# Install daily PostgreSQL backup cron job for ec2-user.
set -euo pipefail

if ! command -v crontab >/dev/null 2>&1; then
  echo "Installing cronie (crontab)..."
  sudo dnf install -y cronie
  sudo systemctl enable crond
  sudo systemctl start crond
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRON_LINE="0 2 * * * cd $ROOT && bash scripts/ec2-backup-db.sh >> /home/ec2-user/backups/backup.log 2>&1"

mkdir -p /home/ec2-user/backups

if crontab -l 2>/dev/null | grep -Fq 'ec2-backup-db.sh'; then
  echo "Backup cron already installed."
else
  (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
  echo "Installed daily backup at 02:00 UTC."
fi

bash "$ROOT/scripts/ec2-backup-db.sh"
echo "Test backup completed."
