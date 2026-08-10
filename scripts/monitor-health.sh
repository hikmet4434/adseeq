#!/bin/sh
set -eu

app_url="${NEXT_PUBLIC_APP_URL:?NEXT_PUBLIC_APP_URL is required}"
if curl --fail --silent --show-error --max-time 10 "${app_url%/}/api/health" >/dev/null; then
  echo "AdSeeQ healthcheck OK"
  exit 0
fi

if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
  curl --fail --silent --show-error --max-time 10 -X POST -H 'content-type: application/json' --data '{"text":"AdSeeQ healthcheck failed"}' "$ALERT_WEBHOOK_URL" >/dev/null || true
fi
echo "AdSeeQ healthcheck FAILED" >&2
exit 1
