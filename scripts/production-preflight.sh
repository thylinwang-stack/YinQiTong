#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
errors=0

fail() {
  echo "[blocker] $1"
  errors=$((errors + 1))
}

warn() {
  echo "[warn] $1"
}

info() {
  echo "[ok] $1"
}

if grep -q '"appid": "touristappid"' "$ROOT/apps/mp-client/project.config.json"; then
  fail "小程序 project.config.json 仍是 touristappid，正式上传前必须替换为真实 AppID。"
else
  info "小程序 AppID 不是 touristappid。"
fi

if grep -q "environment: 'production'" "$ROOT/apps/mp-client/miniprogram/config/runtime.ts"; then
  info "小程序 runtime 已设置为 production。"
else
  fail "小程序 runtime 仍是 development；正式上传前必须切 production 配置。"
fi

if grep -q "apiMode: 'real'" "$ROOT/apps/mp-client/miniprogram/config/runtime.ts"; then
  info "小程序 runtime 使用真实 API。"
else
  fail "小程序 runtime 仍未使用真实 API。"
fi

if grep -q "https://api.juclub.com.cn" "$ROOT/apps/mp-client/miniprogram/config/runtime.ts"; then
  info "小程序 API 域名指向 api.juclub.com.cn。"
else
  fail "小程序 API 域名未指向生产 HTTPS 域名。"
fi

if [[ -f "$ROOT/apps/api/.env.production" ]]; then
  if grep -q '^WECHAT_LOGIN_MOCK=true' "$ROOT/apps/api/.env.production"; then
    fail "API 生产环境不能开启 WECHAT_LOGIN_MOCK=true。"
  else
    info "API 生产环境未开启 mock 微信登录。"
  fi
  if grep -q '^PAYMENT_PROVIDER=wechat_pay' "$ROOT/apps/api/.env.production"; then
    info "API 生产环境支付 provider 为 wechat_pay。"
  else
    fail "API 生产环境 PAYMENT_PROVIDER 不是 wechat_pay。"
  fi
  if grep -Eq '替换为|change-me|127\.0\.0\.1:3000' "$ROOT/apps/api/.env.production"; then
    fail "API .env.production 仍包含占位值或本地回调地址。"
  fi
else
  warn "缺少 apps/api/.env.production；上线前需基于 .env.production.example 创建。"
fi

if [[ -f "$ROOT/apps/admin-web/.env.production" ]]; then
  if grep -q '^VITE_USE_MOCK=false' "$ROOT/apps/admin-web/.env.production"; then
    info "后台生产环境关闭 mock。"
  else
    fail "后台生产环境 VITE_USE_MOCK 必须为 false。"
  fi
else
  warn "缺少 apps/admin-web/.env.production；上线前需基于 .env.production.example 创建。"
fi

if [[ "$errors" -gt 0 ]]; then
  echo
  echo "Production preflight failed with $errors blocker(s)."
  exit 1
fi

echo
echo "Production preflight passed."
