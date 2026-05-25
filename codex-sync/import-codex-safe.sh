#!/usr/bin/env zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
IN_DIR="$ROOT_DIR/safe-config"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
BACKUP_DIR="$CODEX_HOME/backup-before-safe-import-$(date +%Y%m%d-%H%M%S)"

if [[ ! -d "$IN_DIR" ]]; then
  echo "Safe config folder not found: $IN_DIR" >&2
  echo "Run export-codex-safe.sh on the source computer first." >&2
  exit 1
fi

mkdir -p "$CODEX_HOME"
mkdir -p "$BACKUP_DIR"

for item in config.toml rules skills; do
  if [[ -e "$CODEX_HOME/$item" ]]; then
    cp -R "$CODEX_HOME/$item" "$BACKUP_DIR/"
  fi
done

if [[ -f "$IN_DIR/config.toml" ]]; then
  sed "s|__HOME__|$HOME|g" "$IN_DIR/config.toml" > "$CODEX_HOME/config.toml"
fi

if [[ -d "$IN_DIR/rules" ]]; then
  rm -rf "$CODEX_HOME/rules"
  cp -R "$IN_DIR/rules" "$CODEX_HOME/rules"
fi

if [[ -d "$IN_DIR/skills" ]]; then
  rm -rf "$CODEX_HOME/skills"
  cp -R "$IN_DIR/skills" "$CODEX_HOME/skills"
fi

echo "Imported safe Codex config into: $CODEX_HOME"
echo "Backup saved at: $BACKUP_DIR"
