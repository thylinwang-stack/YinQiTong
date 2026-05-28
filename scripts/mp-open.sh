#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_REAL="$ROOT/apps/mp-client"
PROJECT_LINK="$HOME/CodexProjects/business-dinner-mp"

mkdir -p "$(dirname "$PROJECT_LINK")"
if [[ -L "$PROJECT_LINK" ]]; then
  rm "$PROJECT_LINK"
fi
mkdir -p "$PROJECT_LINK"

(cd "$PROJECT_REAL" && npm run build)
rsync -a --delete "$PROJECT_REAL/" "$PROJECT_LINK/"

if [[ -d "/Applications/wechatwebdevtools.app" ]]; then
  open -a "/Applications/wechatwebdevtools.app" "$PROJECT_LINK"
elif [[ -d "/Applications/微信开发者工具.app" ]]; then
  open -a "/Applications/微信开发者工具.app" "$PROJECT_LINK"
else
  echo "微信开发者工具未检测到。请安装后打开项目："
  echo "$PROJECT_LINK"
fi
