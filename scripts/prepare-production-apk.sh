#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="${1:-$ROOT_DIR/mobile/build/app/outputs/flutter-apk/app-production-release.apk}"
METADATA_PATH="${2:-${APK_PATH%/*}/metadata.json}"

[ -f "$APK_PATH" ] || { printf 'APK not found: %s\n' "$APK_PATH" >&2; exit 1; }

VERSION_VALUE="$(sed -n 's/^version:[[:space:]]*//p' "$ROOT_DIR/mobile/pubspec.yaml" | head -1)"
VERSION_NAME="${VERSION_VALUE%%+*}"
[ -n "$VERSION_NAME" ] || { printf 'Version is missing from mobile/pubspec.yaml\n' >&2; exit 1; }

node -e '
const fs = require("node:fs");
const [output, version] = process.argv.slice(1);
fs.writeFileSync(output, `${JSON.stringify({ version_name: version }, null, 2)}\n`);
' "$METADATA_PATH" "$VERSION_NAME"

printf 'Prepared %s for APK version %s\n' "$METADATA_PATH" "$VERSION_NAME"
