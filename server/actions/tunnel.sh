#!/bin/bash
# Supervisor: keep a Cloudflare quick tunnel up and publish its URL to git.
# Backs off 10 minutes after failures to avoid burning the anonymous-tunnel quota.
set -u
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$DIR"
RAW="$DIR/server/actions/server-url.txt"
cloudflared="$(command -v cloudflared || echo /usr/local/bin/cloudflared)"

log() { echo "$(date '+%H:%M:%S') tunnel: $1" >>"$DIR/server/actions/results.log"; }

publish() {
  local URL="$1"
  printf '%s' "$URL" >"$RAW"
  /usr/local/bin/node -e 'const u=process.argv[1];require("fs").writeFileSync("server-url.json", JSON.stringify({base:u,updated:new Date().toISOString()})+"\n")' "$URL"
  cp -f server-url.json apps/user-app/www/ 2>/dev/null
  cp -f server-url.json apps/admin-app/www/ 2>/dev/null
  cp -f server-url.json cloudflare/app/ 2>/dev/null
  log "new url $URL (published)"
}

new_url() {
  grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cloudflared.log | tail -1
}

health() {
  curl -s -o /dev/null -w "%{http_code}" --max-time 8 "http://localhost:8777/api/health" 2>/dev/null
}

# Quick tunnels take ~10-60s to become publicly reachable after creation.
# Retry several times before declaring the URL dead, so we don't kill a
# healthy-but-still-warming-up tunnel (the previous 1-second check did).
reachable() {
  local url="$1" i code
  for i in 1 2 3 4 5 6; do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url/api/health" 2>/dev/null)
    [ "$code" = "200" ] && return 0
    sleep 15
  done
  return 1
}

start() {
  pkill -f "cloudflared tunnel --no-autoupdate --url" 2>/dev/null
  sleep 2
  "$cloudflared" tunnel --no-autoupdate --url http://localhost:8777 >/tmp/cloudflared.log 2>&1 &
  for i in $(seq 1 15); do
    sleep 2
    [ -n "$(new_url)" ] && break
  done
}

sleep 30
while true; do
  [ "$(health)" = "200" ] || { log "local server not healthy, waiting"; sleep 60; continue; }
  if ! pgrep -f "cloudflared tunnel --no-autoupdate --url" >/dev/null 2>&1 || [ ! -s "$RAW" ]; then
    start
    URL="$(new_url)"
    [ -n "$URL" ] && publish "$URL"
  fi
  URL="$(new_url)"
  if [ -n "$URL" ] && { [ ! -f "$RAW" ] || [ "$(cat "$RAW" 2>/dev/null)" != "$URL" ]; }; then
    publish "$URL"
  fi
  PUB="$RAW"
  if [ -n "$(cat "$PUB" 2>/dev/null)" ]; then
    if reachable "$(cat "$PUB")"; then
      sleep 60
    else
      log "public check failed after 6 tries, restarting tunnel"
      pkill -f "cloudflared tunnel --no-autoupdate --url" 2>/dev/null
      sleep 20
    fi
  else
    sleep 30
  fi
done