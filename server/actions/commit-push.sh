#!/bin/bash
# Push commits (results + server-url.json) to GitHub without keychain prompts.
set -eu
DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$DIR"
GITTOKEN="$(cat "$DIR/server/actions/gh-token")"

git add -A
if git diff --cached --quiet; then
  exit 0
fi
git -c credential.helper= commit -qm "auto: results + sync config $(date '+%H:%M')"
git -c credential.helper= push -q "https://oauth2:${GITTOKEN}@github.com/rm3013760-bit/matka-site.git" master 2>"$DIR/server/actions/push.err" \
  && echo "auto-push ok $(date '+%H:%M')" >>"$DIR/server/actions/results.log" \
  || echo "auto-push failed: $(head -1 "$DIR/server/actions/push.err")" >>"$DIR/server/actions/results.log"