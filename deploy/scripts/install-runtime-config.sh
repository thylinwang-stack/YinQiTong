#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

install -m 0644 "$ROOT/deploy/systemd/youge-api.service" /etc/systemd/system/youge-api.service
install -m 0644 "$ROOT/deploy/nginx/juclub.http.conf" /etc/nginx/conf.d/juclub.http.conf

nginx -t
systemctl daemon-reload
systemctl enable youge-api
systemctl reload nginx

echo "Runtime config installed. Start API with: systemctl restart youge-api"
