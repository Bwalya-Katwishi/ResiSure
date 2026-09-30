#!/usr/bin/env bash
# ResiSure EC2 server-side deploy. Run ON the EC2 instance after upload.
# Tested on Amazon Linux 2023 (ec2-user). Also works on Ubuntu (ubuntu).
#
# Usage:
#   cd ~/resisure
#   bash scripts/ec2-deploy.sh YOUR_PUBLIC_IP [db_password]

set -euo pipefail

SERVER_IP="${1:-}"
DB_PASSWORD="${2:-${RESISURE_DB_PASSWORD:-}}"
DEPLOY_USER="${SUDO_USER:-${USER:-ec2-user}}"

if [[ -z "$SERVER_IP" ]]; then
  echo "Usage: bash scripts/ec2-deploy.sh YOUR_PUBLIC_IP [db_password]"
  exit 1
fi

if [[ -z "$DB_PASSWORD" ]]; then
  read -rsp "PostgreSQL password for user resisure: " DB_PASSWORD
  echo
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Writing apps/api/.env"
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
cat > apps/api/.env <<EOF
NODE_ENV=production
PORT=5000
CLIENT_URL=http://${SERVER_IP}
API_PUBLIC_URL=http://${SERVER_IP}
CORS_ALLOW_ALL=false
TRUST_PROXY=true

DB_HOST=localhost
DB_PORT=5432
DB_NAME=resisure_db
DB_USER=resisure
DB_PASSWORD=${DB_PASSWORD}

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d

PAYMENT_PROVIDER=mock
ALLOW_MOCK_PAYMENTS=true
PAYMENTS_WEBHOOK_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
EOF

echo "==> Writing apps/web/.env.local"
cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://${SERVER_IP}
EOF

echo "==> Installing dependencies"
npm install

echo "==> Ensuring uuid-ossp extension (Amazon Linux needs postgresql15-contrib)"
if command -v psql >/dev/null 2>&1; then
  sudo -u postgres psql -d resisure_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' 2>/dev/null || true
fi

echo "==> Running migrations"
npm run migrate

echo "==> Building web app"
npm run build:web

echo "==> Starting PM2"
pm2 delete resisure-api resisure-web 2>/dev/null || pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
STARTUP_CMD="$(pm2 startup systemd -u "$DEPLOY_USER" --hp "/home/$DEPLOY_USER" 2>/dev/null | tail -1 || true)"
if [[ -n "$STARTUP_CMD" && "$STARTUP_CMD" == sudo* ]]; then
  eval "$STARTUP_CMD" || true
fi

echo "==> Configuring Nginx"
sudo tee /etc/nginx/conf.d/resisure.conf > /dev/null <<NGINX
server {
    listen 80;
    server_name ${SERVER_IP};

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

echo "==> Health checks"
sleep 3
curl -sf "http://127.0.0.1:5000/health" | head -c 200 || true
echo
curl -sf -o /dev/null -w "Web HTTP %{http_code}\n" "http://127.0.0.1:3000" || true
curl -sf -o /dev/null -w "Nginx HTTP %{http_code}\n" "http://127.0.0.1/" || true

echo
echo "============================================"
echo " Deploy complete."
echo " Open in browser: http://${SERVER_IP}"
echo " API health:      http://${SERVER_IP}/health"
echo " PM2 status:      pm2 status"
echo " Logs:            pm2 logs"
echo "============================================"
