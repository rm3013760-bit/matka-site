#!/bin/bash
# Long-running supervisor: keep the Cloudflare quick tunnel up and publish
# the current public URL to git (server-url.json) whenever it changes.
set -u
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RAW="$DIR/server/actions/server-url.txt"
PUB="$DIR/server-url.json"

log() { echo "$(date '+%H:%M:%S') tunnel: $1" >>"$DIR/server/actions/results.log"; }

publish() {
  local URL="$1"
  printf '%s' "$URL" >"$RAW"
  node -e 'const u=process.argv[1];require("fs").writeFileSync("server-url.json", JSON.stringify({base:u,updated:new Date().toISOString()})+"\n")' "$URL"
  cp -f server-url.json apps/user-app/www/ 2>/dev/null
  cp -f server-url.json apps/admin-app/www/ 2>/dev/null
  cp -f server-url.json cloudflare/app/ 2>/dev/null
  log "new url $URL (published)"
}

new_url() {
  grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cloudflared.log | tail -1
}

start() {
  pkill -f "cloudflared tunnel --no-autoupdate --url" 2>/dev/null
  sleep 2
  cloudflared="$(command -v cloudflared || echo /usr/local/bin/cloudflared)"
  $cloudflared tunnel --no-autoupdate --url http://localhost:8777 >/tmp/cloudflared.log 2>&1 &
  sleep 6
}

health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://localhost:8777/api/health" 2>/dev/null
}

[ "$(health)" = "200" ] || { log "server down (health=$(health))"; sleep 30; exit 1; }

if ! pgrep -f "cloudflared tunnel --no-autoupdate --url" >/dev/null 2>&1; then
  start
fi

while true; do
  if ! pgrep -f "cloudflared tunnel --no-autoupdate --url" >/dev/null 2>&1; then
    start
    log "restarted"
  fi
  URL="$(new_url)"
  if [ -n "$URL" ] && { [ ! -f "$RAW" ] || [ "$(cat "$RAW" 2>/dev/null)" != "$URL" ]; }; then
    publish "$URL"
  fi
  sleep 60
done