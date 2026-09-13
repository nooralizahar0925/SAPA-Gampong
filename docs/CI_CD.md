# CI/CD Guide

This repository uses GitHub Actions for backend and dashboard verification plus staging and production deployment.

The deployment is intentionally conservative. It never runs database reset commands, never deletes Docker volumes, and never deletes `backend/storage/production`.

## Workflows

### CI

File:

```text
.github/workflows/ci.yml
```

Runs on pull requests and pushes to `main`.

It verifies:

- Backend `npm ci`
- Playwright Chromium install
- Prisma client generation
- Test database migrations with `prisma migrate deploy`
- Backend typecheck, tests, and build
- Dashboard `npm ci`
- Dashboard typecheck, tests, and build

### Staging Deploy

File:

```text
.github/workflows/deploy-staging.yml
```

Runs after CI verification:

- automatically on pushes to `staging` that touch backend, dashboard, deploy script, or deploy workflow files
- manually from GitHub Actions with `workflow_dispatch`

The deploy job runs on the `gbd-vps-deploy` self-hosted runner, updates the Git checkout on the VPS, and runs:

```bash
scripts/deploy-staging.sh
```

Future staging deploy work should also publish a tester Android APK for client testing. Keep this staging-only:

- Build the APK from the `staging` branch.
- Sign it with a staging/testing key, not the production Play Store upload key.
- Use a staging package id suffix and app label so it can be installed beside production.
- Upload it to the staging server under a stable HTTPS path such as `/mobile-app/latest.apk`.
- Show the install option only in the staging dashboard, with version, build date, release notes, QR code, and download action.

### Production Deploy

File:

```text
.github/workflows/deploy-production.yml
```

Runs manually from GitHub Actions after CI verification. It does not auto-deploy on push.

The deploy job runs on the `gbd-vps-deploy` self-hosted runner, updates the Git checkout on the VPS, and runs:

```bash
scripts/deploy-production.sh
```

## Required GitHub Secrets

Add these in:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions -> Repository secrets
```

Staging optional:

```text
STAGING_APP_DIR=/opt/gampong-blang/staging/SAPA-Gampong
STAGING_DASHBOARD_API_BASE_URL=https://gampongblangdigital.web.id/api
```

Production optional:

```text
PRODUCTION_APP_DIR=/opt/gampong-blang/production/SAPA-Gampong
PRODUCTION_DASHBOARD_API_BASE_URL=https://gampongblangdigital.com/api
PRODUCTION_MOBILE_WEB_API_BASE_URL=https://gampongblangdigital.com/api
```

The older SSH deploy secrets are no longer used when the self-hosted runner is online.

## VPS Requirements

The VPS must already be prepared using `docs/STAGING_VPS_DEPLOYMENT.md`.

The repository must have a self-hosted runner installed on the VPS with labels:

```text
self-hosted
gbd-vps
deploy
```

The deploy user should be able to run these commands without an interactive password prompt:

```bash
sudo systemctl restart gbd-backend-staging
sudo nginx -t
sudo systemctl reload nginx
```

One safe sudoers option:

```bash
sudo visudo -f /etc/sudoers.d/gbd-deploy
```

Paste:

```text
gbd ALL=(root) NOPASSWD: /bin/systemctl restart gbd-backend-staging, /usr/sbin/nginx -t, /bin/systemctl reload nginx
```

For production:

```text
gbd ALL=(root) NOPASSWD: /bin/systemctl restart gbd-backend-production, /usr/sbin/nginx -t, /bin/systemctl reload nginx
```

Paths may differ by VPS. Check with:

```bash
command -v systemctl
command -v nginx
```

## Data And File Safety

The deploy script is designed to protect production/staging data:

- Uses `git pull --ff-only`, not reset.
- Uses `npm ci` only inside app folders.
- Uses `prisma migrate deploy`, never `prisma migrate reset`.
- Runs `pg_dump` before applying migrations.
- Blocks migrations containing destructive SQL patterns:
  - `DROP TABLE`
  - `DROP COLUMN`
  - `DROP DATABASE`
  - `DROP SCHEMA`
  - `TRUNCATE`
  - `DELETE FROM`
  - `ALTER TABLE ... DROP`
- Ensures `backend/storage/production` exists and does not delete it.
- Does not run `docker compose down -v`.
- Does not delete PostgreSQL data directories or upload/generated PDF folders.

Important: if a future schema change truly needs destructive data movement, do not bypass the guard. Create a safe migration that copies/renames data first, deploy it, verify it, and only then remove unused columns in a separate reviewed plan.

## Manual Deploy From VPS

If GitHub Actions is unavailable, SSH to the VPS and run:

```bash
sudo -iu gbd
cd /opt/gampong-blang/staging/SAPA-Gampong
DEPLOY_BRANCH=staging bash scripts/deploy-staging.sh
```

For production:

```bash
sudo -iu gbd
cd /opt/gampong-blang/production/SAPA-Gampong
DEPLOY_BRANCH=production bash scripts/deploy-production.sh
```

## Manual Deploy From GitHub

1. Open GitHub repository.
2. Go to Actions.
3. Select `Deploy Staging`.
4. Click `Run workflow`.
5. Use branch `main`.

## Smoke Test

After staging deploy:

```bash
curl -fsS https://gampongblangdigital.web.id/api/health
curl -fsSI https://gampongblangdigital.web.id/
```

Then open:

```text
https://gampongblangdigital.web.id/
```

Login to dashboard and verify the latest backend/dashboard behavior.

After production deploy:

```bash
curl -fsS https://gampongblangdigital.com/api/health
curl -fsSI https://gampongblangdigital.com/
```

Then open:

```text
https://gampongblangdigital.com/
```
