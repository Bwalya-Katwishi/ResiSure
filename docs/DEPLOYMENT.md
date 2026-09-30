# Deployment

ResiSure supports:

1. **Local Windows production** — PostgreSQL + Node.js on your PC
2. **AWS EC2 (Amazon Linux 2023)** — public deployment without GitHub (verified Sep 2026)

---

## AWS EC2 — Amazon Linux 2023 (production)

This matches the deployment documented in `Today 3.docx` and the live server setup.

### Architecture

```
Internet → Nginx :80 → Next.js :3000 (web)
                    → Express API :5000 (/api/, /health, /ready)
                    → PostgreSQL 15 (localhost)
PM2 keeps API + web running across restarts
```

### Verified live stack (example)

| Item | Value |
| ---- | ----- |
| OS | Amazon Linux 2023 |
| SSH user | `ec2-user` |
| Region | ap-southeast-2 (Sydney) |
| Public IP | `15.134.236.93` (changes if instance stops without Elastic IP) |
| Project path | `/home/ec2-user/resisure` |
| Key | `~/.ssh/resisure-productiom-key.pem` |

Live URLs:

- Web: `http://15.134.236.93`
- Health: `http://15.134.236.93/health`

### Phase 1 — AWS console

1. Create EC2 instance: **Amazon Linux 2023**, Free Tier eligible type (e.g. `t3.micro` / `t3.small`)
2. Storage: **30 GB** minimum
3. Create/download key pair (`.pem`)
4. Security group inbound rules:
   - **SSH 22** — My IP (update when your IP changes)
   - **HTTP 80** — `0.0.0.0/0`
   - **HTTPS 443** — `0.0.0.0/0`
5. Launch and note **Public IPv4**

### Phase 2 — Connect from Windows

```powershell
ssh -i "$env:USERPROFILE\.ssh\resisure-productiom-key.pem" ec2-user@YOUR_PUBLIC_IP
```

If SSH times out: EC2 → Security Groups → edit SSH rule → **My IP** → Save.

### Phase 3 — Install server software (on EC2)

```bash
sudo dnf update -y
sudo dnf install -y nodejs20
node -v   # v20.x

sudo dnf install -y postgresql15 postgresql15-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

sudo -u postgres psql
```

In `psql`:

```sql
CREATE USER resisure WITH PASSWORD 'choose_a_strong_password';
CREATE DATABASE resisure_db OWNER resisure;
\c resisure_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

**Amazon Linux:** if `uuid-ossp` is missing later, install contrib package:

```bash
sudo dnf install -y postgresql15-contrib
sudo -u postgres psql -d resisure_db -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

**Password auth:** ensure `/var/lib/pgsql/data/pg_hba.conf` uses `scram-sha-256` for local connections (not `ident`). After edits:

```bash
sudo systemctl restart postgresql
psql -h localhost -U resisure -d resisure_db   # test login
```

```bash
sudo dnf install -y nginx git tar gzip
sudo systemctl enable --now nginx
sudo npm install -g pm2
```

### Phase 4 — Upload project (no GitHub)

From **Windows PowerShell** in the project folder:

```powershell
cd "C:\Users\bwaly\Desktop\ResiSure Project"
tar -czf "$env:TEMP\resisure-deploy.tgz" `
  --exclude=node_modules --exclude=.git `
  --exclude=apps/api/uploads --exclude=apps/api/.env `
  --exclude=apps/web/.env.local .
scp -i "$env:USERPROFILE\.ssh\resisure-productiom-key.pem" `
  "$env:TEMP\resisure-deploy.tgz" ec2-user@YOUR_PUBLIC_IP:~/
```

On EC2:

```bash
mkdir -p ~/resisure
tar -xzf ~/resisure-deploy.tgz -C ~/resisure
cd ~/resisure
npm install
```

**Or use the automated script:**

```powershell
.\scripts\ec2-finish-deploy.ps1 -ServerIp YOUR_PUBLIC_IP -DbPassword "YOUR_DB_PASSWORD"
```

### Phase 5 — Environment files

`apps/api/.env` (production):

```dotenv
NODE_ENV=production
PORT=5000
CLIENT_URL=http://YOUR_PUBLIC_IP
API_PUBLIC_URL=http://YOUR_PUBLIC_IP
CORS_ALLOW_ALL=false
TRUST_PROXY=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=resisure_db
DB_USER=resisure
DB_PASSWORD=your_db_password
JWT_SECRET=random_string_at_least_32_chars
PAYMENT_PROVIDER=mock
ALLOW_MOCK_PAYMENTS=true
```

Generate JWT: `openssl rand -base64 48`

`apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://YOUR_PUBLIC_IP
```

Never commit `.env` or `.env.local`.

### Phase 6 — Migrate, build, start

```bash
cd ~/resisure
npm run migrate
npm run build:web
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
# Run the sudo command PM2 prints
```

### Phase 7 — Nginx (Amazon Linux uses conf.d)

```bash
sudo tee /etc/nginx/conf.d/resisure.conf > /dev/null <<'NGINX'
server {
    listen 80;
    server_name YOUR_PUBLIC_IP;
    client_max_body_size 20M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location = /health { proxy_pass http://127.0.0.1:5000/health; }
    location = /ready  { proxy_pass http://127.0.0.1:5000/ready; }
}
NGINX
sudo nginx -t && sudo systemctl reload nginx
```

### Phase 8 — Verify

On EC2:

```bash
curl http://127.0.0.1/health
curl -I http://127.0.0.1/
pm2 status
```

From Windows:

```powershell
curl.exe http://YOUR_PUBLIC_IP/health
```

Open `http://YOUR_PUBLIC_IP` in a browser.

### Updating after code changes

```powershell
# Windows: re-upload (or use ec2-finish-deploy.ps1)
```

```bash
# EC2:
cd ~/resisure
npm install
npm run migrate
npm run build:web
pm2 restart all
```

### Phase 9 — Production hardening (recommended)

Scripts in `scripts/` automate most of this. Run from **Windows** (uploads + executes on EC2):

```powershell
cd "C:\Users\bwaly\Desktop\ResiSure Project"
.\scripts\ec2-apply-hardening.ps1 -ServerIp 15.134.236.93
```

Or on **EC2** directly:

```bash
cd ~/resisure
chmod +x scripts/ec2-*.sh
bash scripts/ec2-harden-production.sh
```

Check readiness anytime:

```bash
bash scripts/ec2-production-check.sh
```

#### 9.1 Elastic IP (AWS Console — manual)

1. EC2 → **Elastic IPs** → **Allocate**
2. **Associate** with your running instance
3. Update DNS (when you have a domain) to point to the Elastic IP
4. Update `CLIENT_URL`, `API_PUBLIC_URL`, `NEXT_PUBLIC_API_URL` if the IP changed

#### 9.2 Cloudinary + SMTP secrets

1. Copy `apps/api/.env.production.secrets.example` to a local file (e.g. `resisure-secrets.env`)
2. Fill in Cloudinary and SMTP values (never commit this file)
3. Upload and apply:

```powershell
scp -i "$env:USERPROFILE\.ssh\resisure-productiom-key.pem" resisure-secrets.env ec2-user@15.134.236.93:~/
ssh -i "$env:USERPROFILE\.ssh\resisure-productiom-key.pem" ec2-user@15.134.236.93 "bash ~/resisure/scripts/ec2-harden-production.sh"
```

Sign up: [Cloudinary](https://cloudinary.com) (free tier). For SMTP, Gmail App Password or your domain host.

#### 9.3 HTTPS + domain

1. Buy/configure domain DNS: **A record** `@` and `www` → your EC2 public (or Elastic) IP
2. Wait for DNS propagation
3. Run on EC2:

```bash
bash scripts/ec2-setup-https.sh yourdomain.com admin@yourdomain.com
```

Or from Windows:

```powershell
.\scripts\ec2-apply-hardening.ps1 -ServerIp 15.134.236.93 -Domain yourdomain.com -Email admin@yourdomain.com
```

#### 9.4 Database backups

Installed automatically by `ec2-harden-production.sh`:

- Daily backup at **02:00 UTC** → `/home/ec2-user/backups/`
- Retains **7 days** of `resisure_db_*.sql.gz`

Manual backup: `bash scripts/ec2-backup-db.sh`

Restore example:

```bash
gunzip -c ~/backups/resisure_db_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -U resisure -d resisure_db
```

#### 9.5 Live mobile money (when ready)

See `docs/PAYMENT_INTEGRATION.md`. On the server:

1. Add MTN/Airtel credentials to `resisure-secrets.env`
2. Set `ALLOW_MOCK_PAYMENTS=false`
3. Set `PAYMENTS_WEBHOOK_SECRET` to a long random string
4. Set callback URLs to `https://yourdomain.com/api/payments/webhooks/mtn` (etc.)
5. `pm2 restart resisure-api`

#### 9.6 Security checklist

- [ ] SSH (22) restricted to **My IP** only
- [ ] HTTPS enabled with valid certificate
- [ ] Cloudinary configured for uploads
- [ ] SMTP configured for email
- [ ] Daily DB backups running (`crontab -l`)
- [ ] Elastic IP associated (optional but recommended)
- [ ] Mock payments disabled when accepting real money

### Troubleshooting (from deployment log)

| Issue | Fix |
| ----- | --- |
| SSH timeout | Security group SSH → **My IP**; confirm instance Running |
| `uuid-ossp` not available | `sudo dnf install -y postgresql15-contrib` |
| PostgreSQL won't start after pg_hba edit | Restore valid `pg_hba.conf`; use `scram-sha-256` for host 127.0.0.1 |
| `Ident authentication failed` | Fix `pg_hba.conf` password auth |
| Scripts used `ubuntu` user | Amazon Linux uses **`ec2-user`** |
| Nginx sites-enabled missing | Amazon Linux uses **`/etc/nginx/conf.d/`** |

---

## Native Windows production

ResiSure runs directly on Windows with PostgreSQL and Node.js. PM2 is optional; the included scripts start the API and web in separate PowerShell windows.

### Architecture

- PostgreSQL runs as a Windows service on the local machine.
- The Express API runs on port 5000.
- The compiled Next.js application runs on port 3000.
- The production start script launches both apps in minimized PowerShell windows.

For a public deployment, place IIS, Caddy, or Nginx in front of ports 3000 and 5000 to provide HTTPS and domain routing.

### Prerequisites

1. Install PostgreSQL and keep its Windows service running.
2. Install Node.js 20 or newer.
3. Create `resisure_db`.
4. Copy `apps/api/.env.example` to `apps/api/.env`.
5. Copy `apps/web/.env.local.example` to `apps/web/.env.local`.

Never commit either local environment file.

### Required API settings

Set these values in `apps/api/.env`:

```dotenv
NODE_ENV=production
PORT=5000
CLIENT_URL=http://localhost:3000
API_PUBLIC_URL=http://localhost:5000
CORS_ALLOW_ALL=false
DB_HOST=localhost
DB_PORT=5433
DB_NAME=resisure_db
DB_USER=postgres
DB_PASSWORD=your_private_password
JWT_SECRET=a_random_secret_at_least_32_characters_long
PAYMENT_PROVIDER=mock
ALLOW_MOCK_PAYMENTS=true
```

`ALLOW_MOCK_PAYMENTS=true` is appropriate only for a clearly labelled private demonstration. Configure the MTN/Airtel credentials described in `PAYMENT_INTEGRATION.md` before accepting real payments.

### One-time setup

Run from PowerShell in the repository root:

```powershell
npm run production:setup
```

This installs dependencies, verifies the PostgreSQL connection by running migrations, and creates the optimized Next.js build.

Demo data is optional:

```powershell
$env:ALLOW_DEMO_SEED='true'
npm run seed
Remove-Item Env:ALLOW_DEMO_SEED
```

Do not create the seeded `password123` accounts on a public host.

### Start and operate

```powershell
npm run production:start
npm run production:status
```

Open:

- Web: http://localhost:3000
- API: http://localhost:5000
- Database readiness: http://localhost:5000/ready

Stop both applications:

```powershell
npm run production:stop
```

Close the minimized PowerShell windows if the stop script does not catch a process.

### Updating the application

After pulling code:

```powershell
npm run production:setup
npx pm2 restart ecosystem.config.cjs --update-env
npx pm2 save
```

### Public server checklist

- Change `CLIENT_URL`, `API_PUBLIC_URL`, and `NEXT_PUBLIC_API_URL` to HTTPS URLs.
- Rebuild the web application after changing `NEXT_PUBLIC_API_URL`.
- Enable HTTPS through IIS, Caddy, or Nginx.
- Keep PostgreSQL bound to localhost and blocked by Windows Firewall.
- Use Cloudinary or persistent storage for uploads.
- Configure real payment credentials and `PAYMENTS_WEBHOOK_SECRET`.
- Configure backups for PostgreSQL and uploaded files.
- Monitor `npm run production:logs`.

## CI

`.github/workflows/ci.yml` runs API migrations and tests against PostgreSQL and creates a Next.js production build for each pull request.
