#!/bin/zsh
# Push latest live results to GitHub (runs every 20 min via LaunchAgent).
REPO="/Users/rajkumarmeena/matka-site"
cd "$REPO" || exit 1
/usr/local/bin/node server/fetch-results.js --to-file live_results.json || exit 1
if ! git diff --quiet live_results.json; then
  git add live_results.json
  git commit -q -m "chore: update live results"
  git push -q
fi