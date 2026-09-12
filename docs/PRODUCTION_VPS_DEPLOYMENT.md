# Production VPS Deployment Guide

This runbook deploys the production web stack to one Ubuntu VPS.

Target layout:

- Dashboard: `https://gampongblangdigital.com/`
- Backend API: `https://gampongblangdigital.com/api`
- Verification page: `https://gampongblangdigital.com/verify/...`
- Optional mobile web preview: `https://gampongblangdigital.com/mobile/`

For the current server size, `1 vCPU / 2GB RAM / 20GB SSD` is acceptable for launch with fewer than 100 users. The main risk is disk usage from gallery uploads, logs, database growth, and backups.

## 0. DNS

Create an `A` record:

```text
gampongblangdigital.com -> <VPS_PUBLIC_IP>
```

Wait until it resolves:

```bash
dig +short gampongblangdigital.com
```

## 1. One-Time VPS Setup

SSH into the VPS:

```bash
ssh root@<VPS_PUBLIC_IP>
```

Install packages:

```bash
apt update
apt install -y curl git nginx postgresql postgresql-contrib sudo ufw unzip certbot python3-certbot-nginx
```

Install Node.js 20:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

Enable swap for the 2GB RAM VPS:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
cp /etc/fstab /etc/fstab.bak
printf '/swapfile none swap sw 0 0\n' >> /etc/fstab
free -h
```

Create the app user and folders:

```bash
adduser --disabled-password --gecos "" gbd
mkdir -p /opt/gampong-blang/production /opt/gampong-blang/backups/production
chown -R gbd:gbd /opt/gampong-blang
```

Create the production database:

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE USER gbd_production WITH PASSWORD '<STRONG_DATABASE_PASSWORD>';
CREATE DATABASE gbd_production OWNER gbd_production;
\q
```

## 2. Clone Repository

Run as the app user:

```bash
su - gbd
cd /opt/gampong-blang
cd production
git clone git@github.com:nooralizahar0925/SAPA-Gampong.git
cd SAPA-Gampong
```

If the VPS does not have GitHub SSH access yet, add an SSH deploy key first or clone with HTTPS.

## 3. Backend Environment

Create the production env file:

```bash
cd /opt/gampong-blang/production/SAPA-Gampong/backend
cp .env.example .env
nano .env
```

Use production values like this:

```env
NODE_ENV=production
PORT=8082
DATABASE_URL=postgresql://gbd_production:<STRONG_DATABASE_PASSWORD>@localhost:5432/gbd_production
JWT_SECRET=<LONG_RANDOM_SECRET>
APP_CONFIG_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_SECRET>

PUBLIC_BASE_URL=https://gampongblangdigital.com
DASHBOARD_BASE_URL=https://gampongblangdigital.com
CORS_ORIGINS=https://gampongblangdigital.com,https://www.gampongblangdigital.com
DOCS_ENABLED=false

EMAIL_PROVIDER_DEFAULT=mailersend
MAILERSEND_API_KEY=<MAILERSEND_API_KEY>
MAILERSEND_FROM_EMAIL=<VERIFIED_SENDER_EMAIL>
MAILERSEND_FROM_NAME=Gampong Blang Digital

MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_BASE_URL=https://api.mailgun.net
MAILGUN_FROM_EMAIL=
MAILGUN_FROM_NAME=

GMAIL_USER=
GMAIL_APP_PASSWORD=
GMAIL_FROM_EMAIL=
GMAIL_FROM_NAME=

SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=
SMTP_FROM_NAME=

FIREBASE_SERVICE_ACCOUNT_JSON=<PASTE_ONE_LINE_FIREBASE_SERVICE_ACCOUNT_JSON>

SEED_ADMIN_EMAIL=<ADMIN_EMAIL>
SEED_ADMIN_PASSWORD=<TEMP_ADMIN_PASSWORD_CHANGE_AFTER_LOGIN>
```

Generate strong secrets:

```bash
openssl rand -hex 32
```

Validate Firebase JSON after pasting it:

```bash
cd /opt/gampong-blang/production/SAPA-Gampong/backend
node -e "require('dotenv').config(); JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); console.log('Firebase service account JSON OK')"
```

## 4. First Build And Migration

```bash
cd /opt/gampong-blang/production/SAPA-Gampong/backend
npm ci
npx prisma generate
npm run build
npm run db:deploy
npm run db:seed
```

The backend stores uploads and generated files under:

```text
/opt/gampong-blang/production/SAPA-Gampong/backend/storage/production
```

Do not delete this folder during deploys.

Build the dashboard:

```bash
cd /opt/gampong-blang/production/SAPA-Gampong/dashboard
printf 'VITE_API_BASE_URL=https://gampongblangdigital.com/api\n' > .env.production
npm ci
npm run build
```

## 5. systemd Backend Service

Create the service as root:

```bash
sudo nano /etc/systemd/system/gbd-backend-production.service
```

Paste:

```ini
[Unit]
Description=Gampong Blang Digital Backend Production
After=network.target postgresql.service

[Service]
Type=simple
User=gbd
Group=gbd
WorkingDirectory=/opt/gampong-blang/production/SAPA-Gampong/backend
EnvironmentFile=/opt/gampong-blang/production/SAPA-Gampong/backend/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gbd-backend-production
sudo systemctl start gbd-backend-production
sudo systemctl status gbd-backend-production
```

Check logs:

```bash
journalctl -u gbd-backend-production -f
```

## 6. Nginx

Create the Nginx site:

```bash
sudo nano /etc/nginx/sites-available/gbd-production
```

Paste:

```nginx
server {
    listen 80;
    server_name gampongblangdigital.com www.gampongblangdigital.com;

    client_max_body_size 50m;

    root /opt/gampong-blang/production/SAPA-Gampong/dashboard/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8082/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /verify/ {
        proxy_pass http://127.0.0.1:8082/verify/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8082/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /mobile/ {
        alias /opt/gampong-blang/production/SAPA-Gampong/mobile/build/web/;
        try_files $uri $uri/ /mobile/index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/gbd-production /etc/nginx/sites-enabled/gbd-production
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS And Firewall

Issue the Let's Encrypt certificate:

```bash
sudo certbot --nginx -d gampongblangdigital.com -d www.gampongblangdigital.com
sudo certbot renew --dry-run
```

Configure the firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Do not expose PostgreSQL or backend port `8082` publicly.

## 8. Deploy Script

For manual deploys from the VPS:

```bash
sudo -iu gbd
cd /opt/gampong-blang/production/SAPA-Gampong
DEPLOY_BRANCH=production bash scripts/deploy-production.sh
```

For the first deployment only, run:

```bash
RUN_SEED=true DEPLOY_BRANCH=production bash scripts/deploy-production.sh
```

If the VPS should also publish `/mobile/`, install Flutter first and run:

```bash
BUILD_MOBILE_WEB=true DEPLOY_BRANCH=production bash scripts/deploy-production.sh
```

## 9. GitHub Actions Production Deploy

The production workflow is manual-only:

```text
.github/workflows/deploy-production.yml
```

Add these repository secrets:

```text
PRODUCTION_HOST=<VPS_PUBLIC_IP_OR_DOMAIN>
PRODUCTION_USER=gbd
PRODUCTION_SSH_KEY=<PRIVATE_SSH_KEY_ALLOWED_TO_LOGIN_TO_VPS>
```

Optional secrets:

```text
PRODUCTION_PORT=22
PRODUCTION_APP_DIR=/opt/gampong-blang/production/SAPA-Gampong
PRODUCTION_DASHBOARD_API_BASE_URL=https://gampongblangdigital.com/api
PRODUCTION_MOBILE_WEB_API_BASE_URL=https://gampongblangdigital.com/api
```

Allow the deploy user to restart the backend and reload Nginx without a password:

```bash
sudo visudo -f /etc/sudoers.d/gbd-production-deploy
```

Paste:

```text
gbd ALL=(root) NOPASSWD: /bin/systemctl restart gbd-backend-production, /usr/sbin/nginx -t, /bin/systemctl reload nginx
```

Check paths first with:

```bash
command -v systemctl
command -v nginx
```

## 10. Smoke Test

From your laptop:

```bash
curl -i https://gampongblangdigital.com/api/health
curl -I https://gampongblangdigital.com/
```

Then test in browser:

1. Open `https://gampongblangdigital.com/`.
2. Login with the seeded admin.
3. Change the seeded admin password.
4. Upload a small gallery image.
5. Upload a small gallery video.
6. Update Profile Desa social media links.
7. Create a test surat request from mobile web or app.
8. Approve it from dashboard and verify the generated PDF/QR link.
