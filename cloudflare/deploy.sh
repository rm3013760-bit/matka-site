#!/bin/zsh
# One-time setup + deploy of the MatkaLive sync backend on Cloudflare Workers + D1.
set -e
cd "$(dirname "$0")"

command -v wrangler >/dev/null || { echo "Install wrangler:"; echo "  npm i -g wrangler"; exit 1; }

if ! grep -q "REPLACE_AFTER_WRANGLER_D1_CREATE" wrangler.toml; then
  echo "database_id already set"
else
  echo "Creating D1 database (copy the id into wrangler.toml):"
  wrangler d1 create matkalive
  echo "-> Paste the database_id into wrangler.toml, then re-run this script."
  exit 1
fi

wrangler d1 execute matkalive --remote --file schema.sql
wrangler deploy
echo
echo "Deployed. Your URL is printed above (https://matkalive.<sub>.workers.dev)."
echo "Then:"
echo "  1) Put that URL in server/actions/cloud-url (Mac scheduler will push live results)"
echo "  2) Update SERVER_URL + FALLBACK_URL in js/sync.js to the same URL and push"
echo "  3) Test: open the worker URL + /admin.html from any phone/browser"