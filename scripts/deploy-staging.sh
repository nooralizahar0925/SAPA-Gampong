#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/gampong-blang/staging/SAPA-Gampong}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-staging}"
BACKEND_SERVICE="${BACKEND_SERVICE:-gbd-backend-staging}"
DASHBOARD_API_BASE_URL="${DASHBOARD_API_BASE_URL:-https://gampongblangdigital.web.id/api}"
BACKUP_DIR="${BACKUP_DIR:-/opt/gampong-blang/backups/staging}"
SKIP_GIT_UPDATE="${SKIP_GIT_UPDATE:-false}"
RUN_SEED="${RUN_SEED:-false}"
RESTART_SERVICES="${RESTART_SERVICES:-true}"
STAGING_APK_SOURCE="${STAGING_APK_SOURCE:-}"
STAGING_APK_METADATA_SOURCE="${STAGING_APK_METADATA_SOURCE:-}"
STAGING_APK_PUBLIC_PATH="${STAGING_APK_PUBLIC_PATH:-$APP_DIR/dashboard/dist/mobile-app}"
STAGING_MOBILE_WEB_SOURCE="${STAGING_MOBILE_WEB_SOURCE:-}"
APK_PRESERVE_DIR=""

cleanup() {
  if [ -n "$APK_PRESERVE_DIR" ] && [ -d "$APK_PRESERVE_DIR" ]; then
    rm -rf "$APK_PRESERVE_DIR"
  fi
}

trap cleanup EXIT

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

preserve_staging_apk() {
  if [ -d "$STAGING_APK_PUBLIC_PATH" ]; then
    APK_PRESERVE_DIR="$(mktemp -d)"
    cp -a "$STAGING_APK_PUBLIC_PATH" "$APK_PRESERVE_DIR/mobile-app"
  fi
}

publish_staging_apk() {
  if [ -n "$STAGING_APK_SOURCE" ]; then
    require_file "$STAGING_APK_SOURCE"
    log "Publishing staging Android APK"
    mkdir -p "$STAGING_APK_PUBLIC_PATH"
    cp "$STAGING_APK_SOURCE" "$STAGING_APK_PUBLIC_PATH/latest.apk"
    chmod 644 "$STAGING_APK_PUBLIC_PATH/latest.apk"

    if [ -n "$STAGING_APK_METADATA_SOURCE" ]; then
      require_file "$STAGING_APK_METADATA_SOURCE"
      cp "$STAGING_APK_METADATA_SOURCE" "$STAGING_APK_PUBLIC_PATH/metadata.json"
      chmod 644 "$STAGING_APK_PUBLIC_PATH/metadata.json"
    fi
    return
  fi

  if [ -n "$APK_PRESERVE_DIR" ] && [ -d "$APK_PRESERVE_DIR/mobile-app" ]; then
    log "Restoring existing staging Android APK"
    mkdir -p "$(dirname "$STAGING_APK_PUBLIC_PATH")"
    rm -rf "$STAGING_APK_PUBLIC_PATH"
    cp -a "$APK_PRESERVE_DIR/mobile-app" "$STAGING_APK_PUBLIC_PATH"
  fi
}

publish_staging_mobile_web() {
  if [ -z "$STAGING_MOBILE_WEB_SOURCE" ]; then
    log "Keeping the existing staging mobile web build"
    return
  fi

  [ -d "$STAGING_MOBILE_WEB_SOURCE" ] || fail "staging mobile web build is missing: $STAGING_MOBILE_WEB_SOURCE"
  require_file "$STAGING_MOBILE_WEB_SOURCE/index.html"
  log "Publishing staging mobile web build"
  rm -rf "$APP_DIR/mobile/build/web"
  mkdir -p "$APP_DIR/mobile/build/web"
  cp -a "$STAGING_MOBILE_WEB_SOURCE/." "$APP_DIR/mobile/build/web/"
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
printf 'VITE_DEPLOY_ENV=staging\n' >> .env.production
printf 'VITE_ENABLE_STAGING_APP_INSTALL=true\n' >> .env.production
printf 'VITE_STAGING_ANDROID_APK_URL=%s\n' 'https://gampongblangdigital.web.id/mobile-app/latest.apk' >> .env.production
printf 'VITE_STAGING_ANDROID_APK_METADATA_URL=%s\n' 'https://gampongblangdigital.web.id/mobile-app/metadata.json' >> .env.production
preserve_staging_apk
npm run build
# Belt-and-suspenders protection: robots.txt discourages discovery, while the
# noindex directive also covers a staging URL that somebody links directly.
printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt
find dist -name '*.html' -type f -exec sed -i 's/content="index, follow, max-image-preview:large"/content="noindex, nofollow, noarchive"/g' {} +
publish_staging_apk
publish_staging_mobile_web

if [ "$RESTART_SERVICES" = "true" ]; then
  log "Restarting backend service and reloading nginx"
  sudo systemctl restart "$BACKEND_SERVICE"
  sudo nginx -t
  sudo systemctl reload nginx
fi

log "Staging deploy completed"
