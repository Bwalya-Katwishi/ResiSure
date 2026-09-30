#!/usr/bin/env bash
# Quick SMTP verification on EC2. Usage: bash scripts/ec2-test-smtp.sh [to-email]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TO="${1:-${SMTP_TEST_TO:-}}"

read_env() {
  local val
  val="$(grep -E "^${1}=" "$ROOT/apps/api/.env" | head -1 | cut -d= -f2- | tr -d '\r')"
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"
  printf '%s' "$val"
}

HOST="$(read_env SMTP_HOST)"
PORT="$(read_env SMTP_PORT)"; PORT="${PORT:-587}"
USER="$(read_env SMTP_USER)"
PASS="$(read_env SMTP_PASS)"
FROM="$(read_env SMTP_FROM)"

if [[ -z "$HOST" || -z "$FROM" ]]; then
  echo "SMTP not configured in apps/api/.env"
  exit 1
fi

if [[ -z "$TO" ]]; then
  TO="$USER"
fi

cd "$ROOT/apps/api"
HOST="$HOST" PORT="$PORT" USER="$USER" PASS="$PASS" FROM="$FROM" TO="$TO" \
  node -e "
const nodemailer = require('nodemailer');
(async () => {
  const transport = nodemailer.createTransport({
    host: process.env.HOST,
    port: Number(process.env.PORT || 587),
    secure: false,
    auth: { user: process.env.USER, pass: process.env.PASS },
  });
  await transport.verify();
  await transport.sendMail({
    from: process.env.FROM,
    to: process.env.TO,
    subject: 'ResiSure SMTP test',
    text: 'SMTP is working on your ResiSure server. Welcome and password reset emails are enabled.',
  });
  console.log('SMTP OK — test email sent to', process.env.TO);
})().catch((err) => { console.error('SMTP failed:', err.message); process.exit(1); });
"
