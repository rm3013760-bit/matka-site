#!/bin/bash
# One-shot: if the tunnel URL file exists and differs from the committed
# server-url.json, publish it to the website copies.
set -u
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$DIR"
RAW="$DIR/server/actions/server-url.txt"
URL=""
[ -f "$RAW" ] && URL="$(cat "$RAW")"
if [ -z "$URL" ]; then
  echo "publish-url: no server-url.txt" >>"$DIR/server/actions/results.log"
  exit 0
fi
CUR=""
[ -f "$DIR/server-url.json" ] && CUR="$(node -e 'const j=require(process.argv[1]);process.stdout.write(j.base||"")' "$DIR/server-url.json" 2>/dev/null)"
if [ "$CUR" != "$URL" ]; then
  node -e 'const u=process.argv[1];require("fs").writeFileSync("server-url.json", JSON.stringify({base:u,updated:new Date().toISOString()})+"\n")' "$URL"
  cp -f server-url.json apps/user-app/www/ 2>/dev/null
  cp -f server-url.json apps/admin-app/www/ 2>/dev/null
  cp -f server-url.json cloudflare/app/ 2>/dev/null
  echo "publish-url: published $URL" >>"$DIR/server/actions/results.log"
else
  echo "publish-url: unchanged $URL" >>"$DIR/server/actions/results.log"
fi
exit 0