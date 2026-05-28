#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_VERSION="${PG_VERSION:-16}"
PG_HOST="${PGHOST:-127.0.0.1}"
PG_PORT="${PGPORT:-5432}"
PGDATA="${PGDATA:-$ROOT/.tmp/postgres-data}"
PGLOG="${PGLOG:-$ROOT/.tmp/postgres.log}"

postgres_app_bin="/Applications/Postgres.app/Contents/Versions/$PG_VERSION/bin"
if [[ -x "$postgres_app_bin/pg_ctl" ]]; then
  export PATH="$postgres_app_bin:$PATH"
fi

if ! command -v pg_ctl >/dev/null 2>&1 || ! command -v initdb >/dev/null 2>&1 || ! command -v pg_isready >/dev/null 2>&1; then
  echo "PostgreSQL tools not found. Expected Postgres.app at /Applications/Postgres.app."
  exit 1
fi

mkdir -p "$(dirname "$PGDATA")"

if [[ ! -s "$PGDATA/PG_VERSION" ]]; then
  initdb -D "$PGDATA" -U postgres --auth=trust >/dev/null
fi

if ! pg_isready -h "$PG_HOST" -p "$PG_PORT" -U postgres >/dev/null 2>&1; then
  pg_ctl -D "$PGDATA" -l "$PGLOG" -o "-h $PG_HOST -p $PG_PORT" start >/dev/null
fi

for _ in {1..30}; do
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -U postgres >/dev/null 2>&1; then
    echo "PostgreSQL is running at $PG_HOST:$PG_PORT"
    echo "PGDATA: $PGDATA"
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready. Log: $PGLOG"
exit 1
