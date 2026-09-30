#!/usr/bin/env bash
# Enable HTTPS with Let's Encrypt (Certbot) on Amazon Linux 2023.
# Usage: bash scripts/ec2-setup-https.sh yourdomain.com admin@yourdomain.com
#
# Before running:
# 1. Point DNS A record @ and www to your EC2 public IP
# 2. Wait for DNS propagation (5–60 minutes)

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_CONF="/etc/nginx/conf.d/resisure.conf"
NGINX_BACKUP="/etc/nginx/conf.d/resisure.conf.bak"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  echo "Usage: bash scripts/ec2-setup-https.sh YOUR_DOMAIN ADMIN_EMAIL"
  exit 1
fi

BASE_URL="https://${DOMAIN}"

dns_ready() {
  local ip expected
  expected="$(curl -s -4 --max-time 5 ifconfig.me 2>/dev/null || true)"
  ip="$(dig +short "$1" A 2>/dev/null | head -1 | tr -d '\r')"
  if [[ -z "$ip" ]]; then
    echo "DNS check failed: no A record for $1"
    return 1
  fi
  if [[ -n "$expected" && "$ip" != "$expected" ]]; then
    echo "DNS check failed: $1 -> $ip (expected $expected)"
    return 1
  fi
  echo "DNS OK: $1 -> $ip"
  return 0
}

restore_nginx_backup() {
  if [[ -f "$NGINX_BACKUP" ]]; then
    echo "Restoring previous Nginx config..."
    sudo cp "$NGINX_BACKUP" "$NGINX_CONF"
    sudo nginx -t
    sudo systemctl reload nginx
  fi
}

echo "==> Checking DNS for $DOMAIN"
if ! dns_ready "$DOMAIN"; then
  echo ""
  echo "HTTPS aborted — DNS is not ready for $DOMAIN."
  echo "Add an A record pointing to your Elastic IP (15.134.236.93), wait for propagation, then re-run."
  exit 1
fi

WWW_DOMAIN="www.${DOMAIN}"
if dig +short "$WWW_DOMAIN" A 2>/dev/null | grep -q .; then
  CERT_DOMAINS=(-d "$DOMAIN" -d "$WWW_DOMAIN")
  SERVER_NAMES="${DOMAIN} ${WWW_DOMAIN}"
else
  echo "Note: www.${DOMAIN} has no A record — certificate will cover apex only."
  CERT_DOMAINS=(-d "$DOMAIN")
  SERVER_NAMES="${DOMAIN}"
fi

echo "==> Installing Certbot"
sudo dnf install -y certbot python3-certbot-nginx

echo "==> Backing up Nginx config"
sudo cp "$NGINX_CONF" "$NGINX_BACKUP" 2>/dev/null || true

echo "==> Updating Nginx server_name to $SERVER_NAMES"
sudo tee "$NGINX_CONF" > /dev/null <<NGINX
server {
    listen 80;
    server_name ${SERVER_NAMES};

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location = /health {
        proxy_pass http://127.0.0.1:5000/health;
    }

    location = /ready {
        proxy_pass http://127.0.0.1:5000/ready;
    }
}
NGINX

sudo nginx -t
sudo systemctl reload nginx

echo "==> Requesting SSL certificate"
if ! sudo certbot --nginx "${CERT_DOMAINS[@]}" \
  --non-interactive --agree-tos -m "$EMAIL" --redirect; then
  echo "Certbot failed — restoring previous Nginx config."
  restore_nginx_backup
  exit 1
fi

echo "==> Updating application URLs to $BASE_URL"
API_ENV="$ROOT/apps/api/.env"
WEB_ENV="$ROOT/apps/web/.env.local"

if [[ -f "$API_ENV" ]]; then
  grep -v '^CLIENT_URL=' "$API_ENV" | grep -v '^API_PUBLIC_URL=' > "$API_ENV.tmp" || true
  printf 'CLIENT_URL=%s\nAPI_PUBLIC_URL=%s\n' "$BASE_URL" "$BASE_URL" >> "$API_ENV.tmp"
  mv "$API_ENV.tmp" "$API_ENV"
  if grep -q '^MTN_CALLBACK_URL=' "$API_ENV"; then
    grep -v '^MTN_CALLBACK_URL=' "$API_ENV" > "$API_ENV.tmp"
    printf 'MTN_CALLBACK_URL=%s/api/payments/webhooks/mtn\n' "$BASE_URL" >> "$API_ENV.tmp"
    mv "$API_ENV.tmp" "$API_ENV"
  fi
  if grep -q '^ZAMTEL_CALLBACK_URL=' "$API_ENV"; then
    grep -v '^ZAMTEL_CALLBACK_URL=' "$API_ENV" > "$API_ENV.tmp"
    printf 'ZAMTEL_CALLBACK_URL=%s/api/payments/webhooks/zamtel\n' "$BASE_URL" >> "$API_ENV.tmp"
    mv "$API_ENV.tmp" "$API_ENV"
  fi
fi

echo "NEXT_PUBLIC_API_URL=${BASE_URL}" > "$WEB_ENV"

echo "==> Rebuilding web and restarting PM2"
cd "$ROOT"
npm run build:web
pm2 restart all

echo "============================================"
echo " HTTPS enabled: ${BASE_URL}"
echo " Health:        ${BASE_URL}/health"
echo " Cert renewal:  sudo certbot renew --dry-run"
echo "============================================"
