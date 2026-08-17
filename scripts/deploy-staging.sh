#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gampong-blang/SAPA-Gampong}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
BACKEND_SERVICE="${BACKEND_SERVICE:-gbd-backend-staging}"
DASHBOARD_API_BASE_URL="${DASHBOARD_API_BASE_URL:-https://gampongblangdigital.web.id/api}"
BACKUP_DIR="${BACKUP_DIR:-/opt/gampong-blang/backups}"
SKIP_GIT_UPDATE="${SKIP_GIT_UPDATE:-false}"
RUN_SEED="${RUN_SEED:-false}"
RESTART_SERVICES="${RESTART_SERVICES:-true}"

log() {
  printf '\n[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  printf '\nDeploy blocked: %s\n' "$*" >&2
  exit 1
}

require_file() {
  [ -f "$1" ] || fail "required file is missing: $1"
}

scan_destructive_migrations() {
  log "Checking Prisma migrations for destructive SQL"
  local pattern='(^|[[:space:]])(DROP[[:space:]]+(TABLE|COLUMN|DATABASE|SCHEMA)|TRUNCATE[[:space:]]+|DELETE[[:space:]]+FROM|ALTER[[:space:]]+TABLE.*DROP)'
  if grep -R -n -E "$pattern" "$APP_DIR/backend/db/migrations" --include='migration.sql'; then
    fail "destructive migration SQL was found. Create a safe data-preserving migration before deploying."
  fi
}

database_url_from_env() {
  (
    cd "$APP_DIR/backend"
    node -e "require('dotenv').config(); process.stdout.write(process.env.DATABASE_URL || '')"
  )
}

backup_database() {
  log "Creating PostgreSQL backup before migrations"
  command -v pg_dump >/dev/null 2>&1 || fail "pg_dump is required before running migrations"

  local database_url
  database_url="$(database_url_from_env)"
  [ -n "$database_url" ] || fail "DATABASE_URL is empty in backend/.env"

  mkdir -p "$BACKUP_DIR"
  local backup_file="$BACKUP_DIR/gbd_staging_$(date +%Y%m%d_%H%M%S).sql"
  pg_dump "$database_url" > "$backup_file"
  chmod 600 "$backup_file"
  log "Database backup written to $backup_file"
}

protect_storage() {
  log "Checking persistent storage folder"
  mkdir -p "$APP_DIR/backend/storage/production"
  [ -d "$APP_DIR/backend/storage/production" ] || fail "storage folder is not available"
}

log "Starting staging deploy"
cd "$APP_DIR"
require_file "$APP_DIR/backend/.env"
require_file "$APP_DIR/backend/package-lock.json"
require_file "$APP_DIR/dashboard/package-lock.json"

if [ "$SKIP_GIT_UPDATE" != "true" ]; then
  log "Updating repository from origin/$DEPLOY_BRANCH"
  git fetch origin "$DEPLOY_BRANCH"
  git checkout "$DEPLOY_BRANCH"
  git pull --ff-only origin "$DEPLOY_BRANCH"
fi

protect_storage
scan_destructive_migrations

log "Installing backend dependencies"
cd "$APP_DIR/backend"
npm ci
npx prisma generate
npm run build

backup_database
log "Applying data-preserving Prisma migrations"
npm run db:deploy

if [ "$RUN_SEED" = "true" ]; then
  log "Running seed script because RUN_SEED=true"
  npm run db:seed
else
  log "Skipping seed script by default"
fi

log "Installing dashboard dependencies"
cd "$APP_DIR/dashboard"
npm ci
printf 'VITE_API_BASE_URL=%s\n' "$DASHBOARD_API_BASE_URL" > .env.production
npm run build

if [ "$RESTART_SERVICES" = "true" ]; then
  log "Restarting backend service and reloading nginx"
  sudo systemctl restart "$BACKEND_SERVICE"
  sudo nginx -t
  sudo systemctl reload nginx
fi

log "Staging deploy completed"
