#!/usr/bin/env zsh
set -euo pipefail
setopt NULL_GLOB

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="$ROOT_DIR/safe-config"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

if [[ ! -d "$CODEX_HOME" ]]; then
  echo "Codex home not found: $CODEX_HOME" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

if [[ -f "$CODEX_HOME/config.toml" ]]; then
  sed "s|$HOME|__HOME__|g" "$CODEX_HOME/config.toml" > "$OUT_DIR/config.toml"
fi

if [[ -d "$CODEX_HOME/rules" ]]; then
  rm -rf "$OUT_DIR/rules"
  cp -R "$CODEX_HOME/rules" "$OUT_DIR/rules"
fi

if [[ -d "$CODEX_HOME/skills" ]]; then
  rm -rf "$OUT_DIR/skills"
  mkdir -p "$OUT_DIR/skills"
  for skill_path in "$CODEX_HOME"/skills/* "$CODEX_HOME"/skills/.[!.]*; do
    [[ -e "$skill_path" ]] || continue
    [[ "$(basename "$skill_path")" == ".system" ]] && continue
    cp -R "$skill_path" "$OUT_DIR/skills/"
  done
fi

cat > "$OUT_DIR/DO_NOT_SYNC_SECRETS.txt" <<'EOF'
This safe-config folder intentionally excludes:

- auth.json
- *.sqlite*
- *-wal
- *-shm
- cache/
- .tmp/
- tmp/
- sessions/
- shell_snapshots/
- computer-use/

Do not manually add those files to Git.
EOF

echo "Exported safe Codex config to: $OUT_DIR"
