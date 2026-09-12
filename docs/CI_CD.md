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

- automatically on pushes to `main` that touch backend, dashboard, deploy script, or deploy workflow files
- manually from GitHub Actions with `workflow_dispatch`

The deploy job SSHes into the VPS, updates the Git checkout, and runs:

```bash
scripts/deploy-staging.sh
```

### Production Deploy

File:

```text
.github/workflows/deploy-production.yml
```

Runs manually from GitHub Actions after CI verification. It does not auto-deploy on push.

The deploy job SSHes into the production VPS, updates the Git checkout, and runs:

```bash
scripts/deploy-production.sh
```

## Required GitHub Secrets

Add these in:

```text
GitHub repo -> Settings -> Secrets and variables -> Actions -> Repository secrets
```

Required:

```text
STAGING_HOST=<VPS_PUBLIC_IP_OR_DOMAIN>
STAGING_USER=gbd
STAGING_SSH_KEY=<PRIVATE_SSH_KEY_ALLOWED_TO_LOGIN_TO_VPS>
```

Optional:

```text
STAGING_PORT=22
STAGING_APP_DIR=/opt/gampong-blang/staging/SAPA-Gampong
STAGING_DASHBOARD_API_BASE_URL=https://gampongblangdigital.web.id/api
```

Production required:

```text
PRODUCTION_HOST=<VPS_PUBLIC_IP_OR_DOMAIN>
PRODUCTION_USER=gbd
PRODUCTION_SSH_KEY=<PRIVATE_SSH_KEY_ALLOWED_TO_LOGIN_TO_VPS>
```

Production optional:

```text
PRODUCTION_PORT=22
PRODUCTION_APP_DIR=/opt/gampong-blang/production/SAPA-Gampong
PRODUCTION_DASHBOARD_API_BASE_URL=https://gampongblangdigital.com/api
PRODUCTION_MOBILE_WEB_API_BASE_URL=https://gampongblangdigital.com/api
```

## VPS Requirements

The VPS must already be prepared using `docs/STAGING_VPS_DEPLOYMENT.md`.

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
