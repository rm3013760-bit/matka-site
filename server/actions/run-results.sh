#!/bin/zsh
# Push latest live results to GitHub (Pages) and the Cloudflare worker (sync users).
REPO="/Users/rajkumarmeena/matka-site"
cd "$REPO" || exit 1
/usr/local/bin/node server/fetch-results.js --to-file live_results.json || { echo "$(date '+%H:%M') fetch failed, keeping last data" >> server/actions/results.log; exit 0; }

# STARLINE & JACKPOT result updater (server-authoritative board results)
/usr/local/bin/node server/actions/starline-updater.js >> server/actions/results.log 2>&1

CLOUD_FILE="$REPO/server/actions/cloud-url"
if [ -s "$CLOUD_FILE" ]; then
  CLOUD=$(cat "$CLOUD_FILE")
  curl -s -X PUT -H "x-sync-token: matka-demo-2026" --max-time 60 --data-binary @live_results.json "$CLOUD/api/live" >/dev/null && echo "cloud: pushed $(wc -c < live_results.json) bytes to $CLOUD"
fi

"$REPO/server/actions/publish-url.sh"
"$REPO/server/actions/commit-push.sh"