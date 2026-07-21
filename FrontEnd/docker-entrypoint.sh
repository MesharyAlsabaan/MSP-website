#!/bin/sh
# Renders nginx.conf.template with runtime env and starts nginx.
# PORT        — port nginx listens on (Railway injects this; default 80)
# BACKEND_URL — origin of the NestJS API (default: docker-compose service name)
# DNS_RESOLVER— resolver for re-resolving the backend hostname; auto-detected
#               from /etc/resolv.conf so it works on Docker and Railway alike.
set -e

export PORT="${PORT:-80}"
export BACKEND_URL="${BACKEND_URL:-http://backend:3000}"

if [ -z "$DNS_RESOLVER" ]; then
  DNS_RESOLVER="$(awk '/^nameserver/ { ip = $2; if (ip ~ /:/) ip = "[" ip "]"; out = out ip " " } END { print out }' /etc/resolv.conf)"
  export DNS_RESOLVER="${DNS_RESOLVER:-127.0.0.11}"
fi

envsubst '${PORT} ${BACKEND_URL} ${DNS_RESOLVER}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
