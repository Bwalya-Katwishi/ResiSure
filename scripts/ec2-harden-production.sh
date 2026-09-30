#!/usr/bin/env bash
# Run recommended production hardening on EC2.
#
# Usage:
#   bash scripts/ec2-harden-production.sh
#   bash scripts/ec2-harden-production.sh --domain resisure.zm --email admin@resisure.zm
#
# Optional secrets file (NOT in git): ~/resisure-secrets.env
# Copy apps/api/.env.production.secrets.example to ~/resisure-secrets.env and fill in.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN=""
EMAIL=""
SECRETS_FILE="${RESISURE_SECRETS_FILE:-/home/ec2-user/resisure-secrets.env}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --secrets) SECRETS_FILE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "==> Step 1: Merge production secrets (if provided)"
if [[ -f "$SECRETS_FILE" ]]; then
  echo "Merging $SECRETS_FILE into apps/api/.env"
  sed -i 's/\r$//' "$SECRETS_FILE"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line//$'\r'/}"
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    key="${line%%=*}"
    val="${line#*=}"
    [[ -z "$key" || "$key" =~ [[:space:]] ]] && continue
    if grep -q "^${key}=" "$ROOT/apps/api/.env" 2>/dev/null; then
      grep -v "^${key}=" "$ROOT/apps/api/.env" > "$ROOT/apps/api/.env.tmp"
      printf '%s=%s\n' "$key" "$val" >> "$ROOT/apps/api/.env.tmp"
      mv "$ROOT/apps/api/.env.tmp" "$ROOT/apps/api/.env"
    else
      printf '%s=%s\n' "$key" "$val" >> "$ROOT/apps/api/.env"
    fi
  done < "$SECRETS_FILE"
  sed -i 's/\r$//' "$ROOT/apps/api/.env"
  pm2 restart resisure-api 2>/dev/null || true
else
  echo "No secrets file at $SECRETS_FILE (optional)."
  echo "Copy apps/api/.env.production.secrets.example to that path and re-run."
fi

echo "==> Step 1b: Sync web API URL with server .env"
API_ENV="$ROOT/apps/api/.env"
WEB_ENV="$ROOT/apps/web/.env.local"
read_api_env() {
  grep -E "^${1}=" "$API_ENV" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r'
}
if [[ -f "$API_ENV" ]]; then
  PUBLIC_URL="$(read_api_env API_PUBLIC_URL)"
  if [[ -z "$PUBLIC_URL" ]]; then
    PUBLIC_URL="$(read_api_env CLIENT_URL)"
  fi
  if [[ -n "$PUBLIC_URL" ]]; then
    echo "NEXT_PUBLIC_API_URL=${PUBLIC_URL}" > "$WEB_ENV"
    echo "Web env set to ${PUBLIC_URL}"
    if command -v pm2 >/dev/null; then
      cd "$ROOT"
      npm run build:web
      pm2 restart resisure-web 2>/dev/null || true
    fi
  fi
fi

echo "==> Step 2: Install daily database backups"
bash "$ROOT/scripts/ec2-install-backup-cron.sh"

echo "==> Step 3: Production readiness check"
bash "$ROOT/scripts/ec2-production-check.sh" || true

if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
  echo "==> Step 4: HTTPS for $DOMAIN"
  bash "$ROOT/scripts/ec2-setup-https.sh" "$DOMAIN" "$EMAIL"
else
  echo "==> Step 4: HTTPS skipped (pass --domain and --email when DNS is ready)"
fi

echo ""
echo "Manual steps still required in AWS Console:"
echo "  • Elastic IP: EC2 → Elastic IPs → Allocate → Associate with your instance"
echo "  • SSH rule: keep port 22 restricted to My IP only"
echo "  • Live payments: add MTN/Airtel credentials — see docs/PAYMENT_INTEGRATION.md"
echo ""
echo "Run: bash scripts/ec2-production-check.sh"
