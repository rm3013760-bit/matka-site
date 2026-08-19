#!/bin/zsh
# Push latest live results to GitHub (Pages) and the Cloudflare worker (sync users).
REPO="/Users/rajkumarmeena/matka-site"
cd "$REPO" || exit 1
/usr/local/bin/node server/fetch-results.js --to-file live_results.json || exit 1

CLOUD_FILE="$REPO/server/actions/cloud-url"
if [ -s "$CLOUD_FILE" ]; then
  CLOUD=$(cat "$CLOUD_FILE")
  curl -s -X PUT -H "x-sync-token: matka-demo-2026" --max-time 60 --data-binary @live_results.json "$CLOUD/api/live" >/dev/null && echo "cloud: pushed $(wc -c < live_results.json) bytes to $CLOUD"
fi

if ! git diff --quiet live_results.json; then
  git add live_results.json
  git commit -q -m "chore: update live results"
  git -c credential.helper= push -q "https://oauth2:$(cat "$REPO/server/actions/gh-token")@github.com/rm3013760-bit/matka-site.git" master
fi