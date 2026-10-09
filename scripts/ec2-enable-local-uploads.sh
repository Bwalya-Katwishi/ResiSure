#!/bin/bash
set -euo pipefail
CONF=/etc/nginx/conf.d/resisure.conf
if ! sudo grep -q 'location /uploads/' "$CONF"; then
  sudo python3 - << 'PY'
from pathlib import Path
p = Path("/etc/nginx/conf.d/resisure.conf")
text = p.read_text()
block = """    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

"""
text = text.replace("    location /api/ {", block + "    location /api/ {", 1)
p.write_text(text)
print("nginx updated")
PY
else
  echo "nginx already has uploads"
fi
sudo nginx -t
sudo systemctl reload nginx
ENV=~/resisure/apps/api/.env
if ! grep -q '^UPLOAD_STORAGE=' "$ENV"; then
  echo 'UPLOAD_STORAGE=local' >> "$ENV"
fi
cd ~/resisure
pm2 restart resisure-api
sleep 2
curl -sf http://127.0.0.1:5000/health
echo
