const fs = require("fs");
const path = require("path");

const STORE_FILE = path.join(__dirname, "store.json");
const BASE = "https://sara567.net/charts/mrecords/";

const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";

const LIVE_MARKETS = [
  { id: "sita-morning",     slug: "SITA%20MORNING",    name: "SITA MORNING" },
  { id: "star-tara-morning",slug: "STAR%20TARA%20MORNING", name: "STAR TARA MORNING" },
  { id: "milan-morning",    slug: "MILAN%20MORNING",   name: "MILAN MORNING" },
  { id: "sridevi",          slug: "SRIDEVI",           name: "SRIDEVI" },
  { id: "kalyan-morning",   slug: "Kalyan%20Morning",  name: "Kalyan Morning" },
  { id: "sita-day",         slug: "SITA%20DAY",        name: "SITA DAY" },
  { id: "star-tara-day",    slug: "STAR%20TARA%20DAY", name: "STAR TARA DAY" },
  { id: "milan-day",        slug: "MILAN%20DAY",       name: "MILAN DAY" },
  { id: "kalyan-main",      slug: "KALYAN",            name: "KALYAN" },
  { id: "sita-night",       slug: "SITA%20NIGHT",      name: "SITA NIGHT" },
  { id: "sridevi-night",    slug: "SRIDEVI%20NIGHT",   name: "SRIDEVI NIGHT" },
  { id: "star-tara-night",  slug: "STAR%20TARA%20NIGHT", name: "STAR TARA NIGHT" },
  { id: "milan-night",      slug: "MILAN%20NIGHT",     name: "MILAN NIGHT" },
  { id: "kalyan-night",     slug: "KALYAN%20NIGHT",    name: "KALYAN NIGHT" },
  { id: "main-bazar",       slug: "MAIN%20BAZAR",      name: "MAIN BAZAR" },
  { id: "andhra-morning",   slug: "ANDHRA%20MORNING",  name: "ANDHRA MORNING" },
  { id: "andhra-day",       slug: "ANDHRA%20DAY",      name: "ANDHRA DAY" },
  { id: "andhra-night",     slug: "ANDHRA%20NIGHT",    name: "ANDHRA NIGHT" },
  { id: "kamal-morning",    slug: "KAMAL%20MORNING",   name: "KAMAL MORNING" },
  { id: "kamal-day",        slug: "KAMAL%20DAY",       name: "KAMAL DAY" },
  { id: "kamal-night",      slug: "KAMAL%20NIGHT",     name: "KAMAL NIGHT" },
  { id: "madhur-morning",   slug: "MADHUR%20MORNING",  name: "MADHUR MORNING" },
  { id: "madhur-day",       slug: "MADHUR%20DAY",      name: "MADHUR DAY" },
  { id: "rajdhani-day",     slug: "RAJDHANI%20DAY",    name: "RAJDHANI DAY" },
  { id: "rajdhani-night",   slug: "RAJDHANI%20NIGHT",  name: "RAJDHANI NIGHT" },
  { id: "supreme-day",      slug: "SUPREME%20DAY",     name: "SUPREME DAY" },
  { id: "supreme-night",    slug: "SUPREME%20NIGHT",   name: "SUPREME NIGHT" },
  { id: "mahadevi",         slug: "MAHADEVI",          name: "MAHADEVI" },
  { id: "time-bazar",       slug: "TIME%20BAZAR",      name: "TIME BAZAR" }
];

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeStore(data) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data));
}

function parsePanelChart(html) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let m;
  while ((m = rowRe.exec(html))) rows.push(m[1]);
  const out = [];
  for (const row of rows) {
    const cells = [];
    let c;
    cellRe.lastIndex = 0;
    while ((c = cellRe.exec(row))) cells.push(c[1]);
    if (cells.length < 8) continue;
    const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // date range like "2026 Jun 01 to Jun 07"
    const range = text(cells[0]);
    const dm = range.match(/(\d{4})\s+([A-Za-z]{3})\s+(\d{1,2})[^]*?([A-Za-z]{3})\s+(\d{1,2})/);
    if (!dm) continue;
    const y = Number(dm[1]);
    const m0 = MONTHS[dm[2]], m1 = MONTHS[dm[4]];
    if (!m0 || !m1) continue;
    const d0 = Number(dm[3]);
    let d1 = Number(dm[5]);
    if (m1 < m0) d1 += 0; // same year range in the wild; keep as is
    const start = new Date(y, m0 - 1, d0);
    for (let day = 0; day < 7; day++) {
      // skip if the range crosses year boundary (rare mid-week year change)
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + day);
      const val = parseCell(cells[day + 1]);
      if (!val) continue;
      const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
      out.push({ date: key, open: val.open, jodi: val.jodi, close: val.close });
    }
  }
  return out;
}

function parseCell(cellHtml) {
  const nums = cellHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ");
  if (nums.length < 3) return null;
  const [open, jodi, close] = nums;
  if (open === "***" || jodi === "**" || close === "***") return null;
  if (!/^\d{3}$/.test(open) || !/^\d{2}$/.test(jodi) || !/^\d{3}$/.test(close)) return null;
  return { open, jodi, close };
}

function fetchChart(slug) {
  return fetch(BASE + slug + "-panel-chart", {
    headers: { "User-Agent": UA, Referer: "https://sara567.net/" },
    signal: AbortSignal.timeout(25000)
  }).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.text();
  });
}

function loadLive() {
  const store = readStore();
  try {
    return JSON.parse(store["matka.live_results"] || "{}");
  } catch {
    return {};
  }
}

async function refreshLiveMarket(market, live) {
  try {
    const html = await fetchChart(market.slug);
    const entries = parsePanelChart(html);
    if (!entries.length) throw new Error("No entries parsed");
    const map = {};
    for (const e of entries) {
      map[e.date] = {
        panel: e.open,
        panel2: e.close,
        jodi: e.jodi[0],
        jodi2: e.jodi[1],
        announced: true,
        live: true,
        source: "sara567.net"
      };
    }
    live[market.id] = map;
    return entries.length;
  } catch (err) {
    console.log("[live] " + market.id + " failed: " + err.message);
    if (!live[market.id]) live[market.id] = {};
    return 0;
  }
}

async function refreshAll() {
  const live = loadLive();
  let ok = 0;
  for (const m of LIVE_MARKETS) {
    const n = await refreshLiveMarket(m, live);
    if (n) ok++;
    await new Promise((r) => setTimeout(r, 1200));
  }
  const store = readStore();
  store["matka.live_results"] = JSON.stringify(live);
  writeStore(store);
  console.log("[live] refreshed " + ok + "/" + LIVE_MARKETS.length + " markets at " + new Date().toISOString());
  return ok;
}

if (require.main === module) {
  refreshAll().then((ok) => process.exit(ok ? 0 : 1));
}

module.exports = { refreshAll, parsePanelChart, LIVE_MARKETS };