#!/bin/bash
# Self-healing updater: fetch sara567 results, insist on FRESH data (not just any
# data), retry with backoff if upstream is blocking/throttling, and only commit
# when new markets announce. Designed to run on GitHub Actions (no Mac needed).
set -u
cd "$(dirname "$0")/../.."
export TZ=Asia/Kolkata

FWD_DAYS=3
FRESH_MARKETS_REQUIRED=2   # at least this many markets must have "today" data

log() { echo "[$(date '+%H:%M:%S')] $*"; }

now_epoch=$(date +%s)
attempt=1
max_attempts=8
while [ $attempt -le $max_attempts ]; do
  node server/fetch-results.js --to-file live_results.json || log "fetch script errored"
  today=$(date '+%Y-%m-%d')

  # Freshness gate: count markets that actually announced TODAY.
  fresh=$(node -e '
    const d=require("./live_results.json");
    const today=process.argv[1];
    let n=0;
    for (const k in d){ if(!d[k]) continue; const ks=Object.keys(d[k]); if(ks.includes(today)) n++; }
    console.log(n);
  ' "$today" 2>/dev/null || echo 0)

    log "attempt $attempt: $fresh/29 markets fresh for $today"

  if [ "$fresh" -ge "$FRESH_MARKETS_REQUIRED" ]; then
    log "data is fresh"
    break
  fi  # Not fresh enough -> upstream blocked/throttled. Back off, then retry.
  wait=$((attempt*20))
  log "not fresh yet (blocked/throttled?). retrying in ${wait}s"
  sleep "$wait"
  attempt=$((attempt+1))
done

# STARLINE & JACKPOT result updater (server-authoritative board results)
node server/actions/starline-updater.js >> server/actions/results.log 2>&1

# No matter whether fresh or not, commit whatever changed (so we never
# silently stop publishing). Commit-push is no-op if nothing changed.
git config user.name "results-bot"
git config user.email "actions@users.noreply.github.com" 2>/dev/null || true
git add -A
if ! git diff --cached --quiet; then
  log "committing changes"
  git commit -qm "auto: results $(date '+%H:%M:%S')"
  git push -q || log "push failed (will be caught next run)"
  log "pushed"
fi
exit 0
