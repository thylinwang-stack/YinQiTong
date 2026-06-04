#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root."
  exit 1
fi

dnf install -y nginx nodejs npm postgresql-server postgresql-contrib tar gzip

id youge >/dev/null 2>&1 || useradd --system --create-home --shell /sbin/nologin youge
mkdir -p /opt/youge-fanjv /etc/youge-fanjv /var/lib/youge-fanjv/uploads /var/www/youge-admin /var/www/juclub-site
chown -R youge:youge /opt/youge-fanjv /var/lib/youge-fanjv

if [[ ! -d /var/lib/pgsql/data/base ]]; then
  postgresql-setup --initdb
fi

systemctl enable --now postgresql nginx

echo "Bootstrap done. Copy api.env to /etc/youge-fanjv/api.env, then deploy code to /opt/youge-fanjv."
