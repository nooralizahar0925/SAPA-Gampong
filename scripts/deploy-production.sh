#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gampong-blang/production/SAPA-Gampong}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-production}"
BACKEND_SERVICE="${BACKEND_SERVICE:-gbd-backend-production}"
DASHBOARD_API_BASE_URL="${DASHBOARD_API_BASE_URL:-https://gampongblangdigital.com/api}"
BACKUP_DIR="${BACKUP_DIR:-/opt/gampong-blang/backups/production}"
BACKUP_NAME_PREFIX="${BACKUP_NAME_PREFIX:-gbd_production}"
SKIP_GIT_UPDATE="${SKIP_GIT_UPDATE:-false}"
RUN_SEED="${RUN_SEED:-false}"
RESTART_SERVICES="${RESTART_SERVICES:-true}"
BUILD_MOBILE_WEB="${BUILD_MOBILE_WEB:-false}"
MOBILE_WEB_API_BASE_URL="${MOBILE_WEB_API_BASE_URL:-https://gampongblangdigital.com/api}"

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
  local backup_file="$BACKUP_DIR/${BACKUP_NAME_PREFIX}_$(date +%Y%m%d_%H%M%S).sql"
  pg_dump "$database_url" > "$backup_file"
  chmod 600 "$backup_file"
  log "Database backup written to $backup_file"
}

protect_storage() {
  log "Checking persistent storage folder"
  mkdir -p "$APP_DIR/backend/storage/production"
  mkdir -p "$APP_DIR/backend/storage/production/releases/android"
  [ -d "$APP_DIR/backend/storage/production" ] || fail "storage folder is not available"
}

log "Starting production deploy"
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
npx playwright install chromium
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
printf 'VITE_DEPLOY_ENV=production\n' >> .env.production
npm run build
cp "$APP_DIR/docs/play-store-assets/app-icon-512.png" dist/app-icon.png
cp "$APP_DIR/docs/play-store-assets/feature-graphic-1024x500.png" dist/social-preview.png
printf 'User-agent: *\nAllow: /\nAllow: /privacy-policy\nAllow: /assets/\nAllow: /app-icon.png\nAllow: /social-preview.png\nAllow: /api/app-distribution\nDisallow: /api/\nDisallow: /login\nDisallow: /settings/\nDisallow: /requests/\nDisallow: /content/\nDisallow: /feedback\nDisallow: /profile\nDisallow: /staging-app\nSitemap: https://gampongblangdigital.com/sitemap.xml\n' > dist/robots.txt
printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>' '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' '  <url><loc>https://gampongblangdigital.com/</loc><changefreq>weekly</changefreq></url>' '  <url><loc>https://gampongblangdigital.com/privacy-policy</loc><changefreq>monthly</changefreq></url>' '</urlset>' > dist/sitemap.xml

if [ "$BUILD_MOBILE_WEB" = "true" ]; then
  command -v flutter >/dev/null 2>&1 || fail "Flutter is required when BUILD_MOBILE_WEB=true"
  log "Building mobile web preview"
  cd "$APP_DIR/mobile"
  flutter pub get
  dart run build_runner build --delete-conflicting-outputs
  flutter build web --base-href=/mobile/ --dart-define=API_BASE_URL="$MOBILE_WEB_API_BASE_URL"
else
  log "Skipping mobile web build because BUILD_MOBILE_WEB=false"
fi

if [ "$RESTART_SERVICES" = "true" ]; then
  log "Restarting backend service and reloading nginx"
  sudo systemctl restart "$BACKEND_SERVICE"
  sudo nginx -t
  sudo systemctl reload nginx
fi

log "Production deploy completed"
