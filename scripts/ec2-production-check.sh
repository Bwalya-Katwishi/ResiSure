#!/usr/bin/env bash
# Production readiness checklist for ResiSure on EC2.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/apps/api/.env"
WEB_ENV="$ROOT/apps/web/.env.local"

pass=0
warn=0
fail=0

ok()   { echo "  [OK]   $1"; pass=$((pass + 1)); }
note() { echo "  [WARN] $1"; warn=$((warn + 1)); }
bad()  { echo "  [FAIL] $1"; fail=$((fail + 1)); }

echo "ResiSure production checklist"
echo "=============================="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; source "$ENV_FILE"; set +a
else
  bad "Missing apps/api/.env"
fi

# JWT
if [[ -n "${JWT_SECRET:-}" && ${#JWT_SECRET} -ge 32 ]]; then ok "JWT_SECRET set"; else bad "JWT_SECRET missing or too short"; fi

# URLs
if [[ "${CLIENT_URL:-}" == https://* ]]; then ok "HTTPS CLIENT_URL"; elif [[ -n "${CLIENT_URL:-}" ]]; then note "CLIENT_URL is HTTP — add domain + certbot"; else bad "CLIENT_URL not set"; fi

# Cloudinary
if [[ -n "${CLOUDINARY_CLOUD_NAME:-}" && -n "${CLOUDINARY_API_KEY:-}" && -n "${CLOUDINARY_API_SECRET:-}" ]]; then
  ok "Cloudinary configured"
else
  note "Cloudinary not set — uploads stored on EC2 disk (lost if instance replaced)"
fi

# SMTP
if [[ -n "${SMTP_HOST:-}" && -n "${SMTP_FROM:-}" ]]; then ok "SMTP configured"; else note "SMTP not set — password reset emails will not send"; fi

# Payments
if [[ "${ALLOW_MOCK_PAYMENTS:-}" == "true" ]]; then
  note "Mock payments enabled (demo mode)"
else
  ok "Mock payments disabled"
  if [[ -n "${PAYMENTS_WEBHOOK_SECRET:-}" ]]; then ok "PAYMENTS_WEBHOOK_SECRET set"; else bad "Live payments need PAYMENTS_WEBHOOK_SECRET"; fi
fi

# PM2
if command -v pm2 >/dev/null && pm2 jlist 2>/dev/null | grep -q resisure-api; then ok "PM2 resisure-api running"; else note "PM2 resisure-api not detected"; fi
if command -v pm2 >/dev/null && pm2 jlist 2>/dev/null | grep -q resisure-web; then ok "PM2 resisure-web running"; else note "PM2 resisure-web not detected"; fi

# Nginx
if systemctl is-active nginx >/dev/null 2>&1; then ok "Nginx active"; else bad "Nginx not running"; fi

# Backup cron
if crontab -l 2>/dev/null | grep -q ec2-backup-db.sh; then ok "Daily DB backup cron"; else note "DB backup cron not installed — run scripts/ec2-install-backup-cron.sh"; fi

# Web env matches API URL
if [[ -f "$WEB_ENV" ]]; then
  web_url="$(grep '^NEXT_PUBLIC_API_URL=' "$WEB_ENV" | cut -d= -f2- || true)"
  if [[ "$web_url" == "${CLIENT_URL:-}" || "$web_url" == "${API_PUBLIC_URL:-}" ]]; then ok "Web API URL matches"; else note "NEXT_PUBLIC_API_URL ($web_url) may not match CLIENT_URL (${CLIENT_URL:-})"; fi
else
  note "Missing apps/web/.env.local"
fi

echo "=============================="
echo "Pass: $pass  Warnings: $warn  Failures: $fail"
if [[ $fail -gt 0 ]]; then exit 1; fi
