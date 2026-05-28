#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/api"

PG_VERSION="${PG_VERSION:-16}"
postgres_app_bin="/Applications/Postgres.app/Contents/Versions/$PG_VERSION/bin"
if [[ -x "$postgres_app_bin/pg_isready" ]]; then
  export PATH="$postgres_app_bin:$PATH"
fi

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "PostgreSQL client not found. Expected Postgres.app at /Applications/Postgres.app."
  exit 1
fi

"$ROOT/scripts/postgres-local.sh"

DB_NAME="${DB_NAME:-business_concierge}"
if ! psql -h 127.0.0.1 -p 5432 -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
  createdb -h 127.0.0.1 -p 5432 -U postgres "$DB_NAME"
fi

npx prisma db push

npm run start:dev
