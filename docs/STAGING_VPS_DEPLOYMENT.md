# Staging VPS Deployment Guide

This runbook deploys Gampong Blang Digital staging to one Ubuntu VPS.

Target layout:

- Dashboard: `https://gampongblangdigital.web.id/`
- Mobile web preview: `https://gampongblangdigital.web.id/mobile/`
- Backend API: `https://gampongblangdigital.web.id/api`
- Verification page: `https://gampongblangdigital.web.id/verify/...`

## 0. DNS

Create an `A` record:

```text
gampongblangdigital.web.id -> <VPS_PUBLIC_IP>
```

Wait until it resolves:

```bash
dig +short gampongblangdigital.web.id
```

## 1. One-Time VPS Setup

SSH into the VPS:

```bash
ssh root@<VPS_PUBLIC_IP>
```

Install system packages:

```bash
apt update
apt install -y curl git nginx postgresql postgresql-contrib sudo ufw unzip
```

Install Node.js 22:

```bash
apt install -y nodejs
node -v
npm -v
```

Create the app user and folders:

```bash
adduser --disabled-password --gecos "" gbd
mkdir -p /opt/gampong-blang/staging /opt/gampong-blang/backups/staging
chown -R gbd:gbd /opt/gampong-blang
```

Create the staging database:

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE USER gbd_staging WITH PASSWORD '<STRONG_DATABASE_PASSWORD>';
CREATE DATABASE gbd_staging OWNER gbd_staging;
\q
```

## 2. Clone Repository

Run as the app user:

```bash
su - gbd
cd /opt/gampong-blang
cd staging
git clone git@github.com:nooralizahar0925/SAPA-Gampong.git
cd SAPA-Gampong
```

If the VPS does not have GitHub SSH access yet, add an SSH deploy key first or clone with HTTPS.

## 3. Check Repository Assets

The backend reads the government logo from `backend/assets/logo.webp` for generated PDFs and email logos. This file is committed to Git, so no separate `Brief/` copy step is needed on staging.

After cloning, check it exists:

```bash
ls -lh /opt/gampong-blang/staging/SAPA-Gampong/backend/assets/logo.webp
```

## 4. Backend Environment

Create the staging env file:

```bash
cd /opt/gampong-blang/staging/SAPA-Gampong/backend
cp .env.example .env
nano .env
```

Use values like this:

```env
NODE_ENV=production
PORT=8081
DATABASE_URL=postgresql://gbd_staging:<STRONG_DATABASE_PASSWORD>@localhost:5432/gbd_staging
JWT_SECRET=<LONG_RANDOM_SECRET>
APP_CONFIG_ENCRYPTION_KEY=<LONG_RANDOM_ENCRYPTION_SECRET>

PUBLIC_BASE_URL=https://gampongblangdigital.web.id
DASHBOARD_BASE_URL=https://gampongblangdigital.web.id
CORS_ORIGINS=https://gampongblangdigital.web.id,http://localhost:8092,http://127.0.0.1:8092
DOCS_ENABLED=true

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

Generate strong secrets locally or on the VPS:

```bash
openssl rand -hex 32
```

Important:

- `PUBLIC_BASE_URL` must be the public HTTPS staging URL. It is used for file links, verification URLs, and OpenAPI.
- `DASHBOARD_BASE_URL` is used in admin password reset emails.
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are required when `NODE_ENV=production`.
- `FIREBASE_SERVICE_ACCOUNT_JSON` must be one-line JSON, not a file path.
- Keep `.env` out of Git.

### Firebase Service Account Value

Download the Firebase Admin SDK service account JSON from Firebase Console:

```text
Project settings -> Service accounts -> Firebase Admin SDK -> Generate new private key
```

Copy the JSON file to the VPS temporarily, for example:

```bash
scp firebase-service-account.json gbd@<VPS_PUBLIC_IP>:/tmp/firebase-service-account.json
```

Convert it to a one-line `.env` value:

```bash
node -e "const fs=require('fs'); const json=JSON.parse(fs.readFileSync('/tmp/firebase-service-account.json','utf8')); console.log('FIREBASE_SERVICE_ACCOUNT_JSON='+JSON.stringify(json));"
```

Paste the printed line into:

```bash
/opt/gampong-blang/staging/SAPA-Gampong/backend/.env
```

Then remove the temporary JSON file:

```bash
rm /tmp/firebase-service-account.json
```

Validate the `.env` value can be parsed:

```bash
cd /opt/gampong-blang/staging/SAPA-Gampong/backend
node -e "require('dotenv').config(); JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON); console.log('Firebase service account JSON OK')"
```

## 5. Install and Build Backend

```bash
cd /opt/gampong-blang/staging/SAPA-Gampong/backend
npm ci
npx playwright install chromium
npx prisma generate
npm run build
npm run db:deploy
npm run db:seed
```

The backend stores uploads and generated PDFs under:

```text
/opt/gampong-blang/staging/SAPA-Gampong/backend/storage/production
```

Do not delete this folder during deploys.

## 6. systemd Backend Service

Create the service as root:

```bash
sudo nano /etc/systemd/system/gbd-backend-staging.service
```

Paste:

```ini
[Unit]
Description=Gampong Blang Digital Backend Staging
After=network.target postgresql.service

[Service]
Type=simple
User=gbd
Group=gbd
WorkingDirectory=/opt/gampong-blang/staging/SAPA-Gampong/backend
EnvironmentFile=/opt/gampong-blang/staging/SAPA-Gampong/backend/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gbd-backend-staging
sudo systemctl start gbd-backend-staging
sudo systemctl status gbd-backend-staging
```

Check logs:

```bash
journalctl -u gbd-backend-staging -f
```

Local health check:

```bash
curl -i http://127.0.0.1:8081/api/health
```

## 7. Build Dashboard

```bash
cd /opt/gampong-blang/staging/SAPA-Gampong/dashboard
cat > .env.production <<'EOF'
VITE_API_BASE_URL=https://gampongblangdigital.web.id/api
EOF
npm ci
npm run build
```

The dashboard build output is:

```text
/opt/gampong-blang/staging/SAPA-Gampong/dashboard/dist
```

## 8. Build Mobile Web Preview

Only do this if the staging VPS should serve the resident app in browser.

Install Flutter on the VPS first, or build `mobile/build/web` locally and upload it. If Flutter is installed on the VPS:

```bash
cd /opt/gampong-blang/staging/SAPA-Gampong/mobile
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter build web \
  --base-href=/mobile/ \
  --dart-define=API_BASE_URL=https://gampongblangdigital.web.id/api
```

The mobile web build output is:

```text
/opt/gampong-blang/staging/SAPA-Gampong/mobile/build/web
```

## 8.1 Staging Android Tester Install

Future staging releases should support direct Android tester installation from the admin dashboard. This is for staging only, so clients can install and test new app features before the Play Store release.

Recommended design:

- Build a signed staging APK from the `staging` branch, separate from the production Play Store AAB.
- Use a staging package id suffix, for example `id.gampongblang.sapa_gampong.staging`, so testers can install staging and production side by side.
- Use a staging app label, for example `Gampong Blang Digital Staging`, so testers do not confuse it with production.
- Publish the latest staging APK under the staging domain, for example `https://gampongblangdigital.web.id/mobile-app/latest.apk`.
- Add a staging-only dashboard panel with version, build date, release notes, QR code, and a clickable APK download button.
- Hide this dashboard panel outside staging builds.

Testers must allow Android installation from the browser because this is a direct APK download, not a Play Store release. Production Android releases should still use Play Console and `.aab` uploads.

## 9. Nginx

Create the Nginx site:

```bash
sudo nano /etc/nginx/sites-available/gbd-staging
```

Paste:

```nginx
server {
    listen 80;
    server_name gampongblangdigital.web.id;

    client_max_body_size 25m;

    root /opt/gampong-blang/staging/SAPA-Gampong/dashboard/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8081/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /verify/ {
        proxy_pass http://127.0.0.1:8081/verify/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8081/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /mobile/ {
        alias /opt/gampong-blang/staging/SAPA-Gampong/mobile/build/web/;
        try_files $uri $uri/ /mobile/index.html;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/gbd-staging /etc/nginx/sites-enabled/gbd-staging
sudo nginx -t
sudo systemctl reload nginx
```

## 10. HTTPS With Let's Encrypt

Use Let's Encrypt through Certbot. Install the Nginx Certbot plugin:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue the Let's Encrypt certificate:

```bash
sudo certbot --nginx -d gampongblangdigital.web.id
```

Confirm Let's Encrypt auto-renew:

```bash
sudo certbot renew --dry-run
```

## 11. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Do not expose PostgreSQL or backend port `8081` publicly. Nginx should be the public entry point.

## 12. Smoke Test

From your laptop:

```bash
curl -i https://gampongblangdigital.web.id/api/health
curl -I https://gampongblangdigital.web.id/
curl -I https://gampongblangdigital.web.id/mobile/
```

Then check manually:

1. Open `https://gampongblangdigital.web.id/`.
2. Login using the seeded admin.
3. Immediately change the seeded admin password from the dashboard profile page.
4. Open `https://gampongblangdigital.web.id/api/docs`.
5. Upload a small image/PDF from the dashboard or mobile web.
6. Create a test surat request from mobile web.
7. Approve, generate PDF, and send email from dashboard.
8. Check the received email:
   - Logo appears.
   - PDF is attached.
   - Verification QR/link opens.

## 13. Repeat Deploy After New Code

The safest repeat deploy path is the guarded deploy script:

```bash
sudo -iu gbd
cd /opt/gampong-blang/staging/SAPA-Gampong
DEPLOY_BRANCH=staging bash scripts/deploy-staging.sh
```

The script:

- pulls with `git pull --ff-only`
- checks migrations for destructive SQL
- creates a database backup with `pg_dump`
- runs `prisma migrate deploy`
- builds backend and dashboard
- does not delete `backend/storage/production`
- restarts `gbd-backend-staging` and reloads Nginx

Run the smoke tests again after deployment.

For GitHub Actions CI/CD setup, see `docs/CI_CD.md`.

## 14. Database Backup Before Risky Deploys

```bash
sudo -u postgres pg_dump gbd_staging > /opt/gampong-blang/backups/gbd_staging_$(date +%Y%m%d_%H%M%S).sql
```

Create the backup folder once:

```bash
sudo mkdir -p /opt/gampong-blang/backups
sudo chown gbd:gbd /opt/gampong-blang/backups
```

Restore only if you are sure:

```bash
sudo -u postgres psql gbd_staging < /opt/gampong-blang/backups/<BACKUP_FILE>.sql
```

## 15. Useful Operations

Backend logs:

```bash
journalctl -u gbd-backend-staging -f
```

Restart backend:

```bash
sudo systemctl restart gbd-backend-staging
```

Check backend status:

```bash
sudo systemctl status gbd-backend-staging
```

Check Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx
```

Check PostgreSQL:

```bash
sudo systemctl status postgresql
sudo -u postgres psql -d gbd_staging -c '\dt'
```

## 16. Staging Notes

- Staging should use real HTTPS because email links, file URLs, Firebase web push, and QR verification all depend on public URLs.
- `DOCS_ENABLED=true` is fine for staging. Set it to `false` for production if public docs are not desired.
- iOS push notification is still blocked until a paid Apple Developer account exists.
- Keep `backend/storage/production` backed up. The repo alone is not enough to restore uploaded files or generated PDFs.
