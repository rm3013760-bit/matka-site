const fs = require("fs");
const path = require("path");

const STORE_FILE = path.join(__dirname, "store.json");
const BASE = "https://sara567.net/charts/mrecords/";

const UA = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";

const LIVE_MARKETS = [
  { id: "sita-morning",     slug: "SITA%20MORNING",    name: "SITA MORNING",     api: "sita-morning" },
  { id: "star-tara-morning",slug: "STAR%20TARA%20MORNING", name: "STAR TARA MORNING", api: "star-tara-morning" },
  { id: "milan-morning",    slug: "MILAN%20MORNING",   name: "MILAN MORNING",    api: "milan-morning" },
  { id: "sridevi",          slug: "SRIDEVI",           name: "SRIDEVI",          api: "sridevi" },
  { id: "kalyan-morning",   slug: "Kalyan%20Morning",  name: "Kalyan Morning",   api: "kalyan-morning" },
  { id: "sita-day",         slug: "SITA%20DAY",        name: "SITA DAY",         api: "sita-day" },
  { id: "star-tara-day",    slug: "STAR%20TARA%20DAY", name: "STAR TARA DAY",    api: "star-tara-day" },
  { id: "milan-day",        slug: "MILAN%20DAY",       name: "MILAN DAY",        api: "milan-day" },
  { id: "kalyan-main",      slug: "KALYAN",            name: "KALYAN",           api: "kalyan" },
  { id: "sita-night",       slug: "SITA%20NIGHT",      name: "SITA NIGHT",       api: "sita-night" },
  { id: "sridevi-night",    slug: "SRIDEVI%20NIGHT",   name: "SRIDEVI NIGHT",    api: "sridevi-night" },
  { id: "star-tara-night",  slug: "STAR%20TARA%20NIGHT", name: "STAR TARA NIGHT", api: "star-tara-night" },
  { id: "milan-night",      slug: "MILAN%20NIGHT",     name: "MILAN NIGHT",      api: "milan-night" },
  { id: "kalyan-night",     slug: "KALYAN%20NIGHT",    name: "KALYAN NIGHT",     api: "kalyan-night" },
  { id: "main-bazar",       slug: "MAIN%20BAZAR",      name: "MAIN BAZAR",       api: "main-bazar" },
  { id: "andhra-morning",   slug: "ANDHRA%20MORNING",  name: "ANDHRA MORNING",   api: "andhra-morning" },
  { id: "andhra-day",       slug: "ANDHRA%20DAY",      name: "ANDHRA DAY",       api: "andhra-day" },
  { id: "andhra-night",     slug: "ANDHRA%20NIGHT",    name: "ANDHRA NIGHT",     api: "andhra-night" },
  { id: "kamal-morning",    slug: "KAMAL%20MORNING",   name: "KAMAL MORNING",    api: "kamal-morning" },
  { id: "kamal-day",        slug: "KAMAL%20DAY",       name: "KAMAL DAY",        api: "kamal-day" },
  { id: "kamal-night",      slug: "KAMAL%20NIGHT",     name: "KAMAL NIGHT",      api: "kamal-night" },
  { id: "madhur-morning",   slug: "MADHUR%20MORNING",  name: "MADHUR MORNING",   api: "madhur-morning" },
  { id: "madhur-day",       slug: "MADHUR%20DAY",      name: "MADHUR DAY",       api: "madhur-day" },
  { id: "rajdhani-day",     slug: "RAJDHANI%20DAY",    name: "RAJDHANI DAY",     api: "rajdhani-day" },
  { id: "rajdhani-night",   slug: "RAJDHANI%20NIGHT",  name: "RAJDHANI NIGHT",   api: "rajdhani-night" },
  { id: "supreme-day",      slug: "SUPREME%20DAY",     name: "SUPREME DAY",      api: "supreme-day" },
  { id: "supreme-night",    slug: "SUPREME%20NIGHT",   name: "SUPREME NIGHT",    api: "supreme-night" },
  { id: "mahadevi",         slug: "MAHADEVI",          name: "MAHADEVI",         api: "mahadevi" },
  { id: "time-bazar",       slug: "TIME%20BAZAR",      name: "TIME BAZAR",       api: "time-bazar" }
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
  const attempt = () =>
    fetch(BASE + slug + "-panel-chart", {
      headers: { "User-Agent": UA, Referer: "https://sara567.net/" },
      signal: AbortSignal.timeout(12000)
    }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  return attempt().catch(() => attempt());
}

function loadLive() {
  const store = readStore();
  try {
    return JSON.parse(store["matka.live_results"] || "{}");
  } catch {
    return {};
  }
}

const API_BOARD = "https://sattamatkaapi.live/api/results/board";

// Free JSON API primary source: clean board with status/pana/jodi for all markets.
async function fetchApiBoard() {
  const res = await fetch(API_BOARD, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error("API board HTTP " + res.status);
  const js = await res.json();
  const list = Array.isArray(js) ? js : (js && js.data) ? js.data : [];
  const bySlug = {};
  for (const m of list) bySlug[(m.slug || m.name || "").toLowerCase()] = m;
  return bySlug;
}

// Merge API results (primary) into live map. Returns count of fresh markets from API.
function applyApiBoard(bySlug, live) {
  let fresh = 0;
  for (const market of LIVE_MARKETS) {
    const m = bySlug[market.api.toLowerCase()];
    if (!m) continue;
    const date = m.marketDate || m.resultDate;
    if (!date) continue;
    const state = m.boardState || m.status || "";
    const open = m.openPana;
    const jodi = m.jodi ? String(m.jodi).replace("*", "") : "";
    const close = m.closePana;
    const announced = !!open || state === "closed" || state === "open";
    if (!announced && !(open && jodi)) continue;
    const entry = {
      panel: open || null,
      panel2: close || null,
      jodi: jodi ? jodi[0] : null,
      jodi2: jodi ? jodi[1] : null,
      announced: !!open,
      live: state === "open" || state === "closed",
      state: state,
      source: "sattamatkaapi.live"
    };
    if (!live[market.id]) live[market.id] = {};
    live[market.id][date] = entry;
    fresh++;
  }
  return fresh;
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

async function refreshMarkets() {
  const live = loadLive();
  let apiFresh = 0;
  const apiCovered = new Set();
  try {
    const bySlug = await fetchApiBoard();
    apiFresh = applyApiBoard(bySlug, live);
    for (const m of LIVE_MARKETS) if (bySlug[m.api.toLowerCase()]) apiCovered.add(m.api.toLowerCase());
    console.log("[live] api board: " + apiFresh + "/" + LIVE_MARKETS.length + " markets from sattamatkaapi.live");
  } catch (err) {
    console.log("[live] api board failed: " + err.message + " (falling back to sara567 scrape)");
  }

  // Fallback scrape only markets missing from the API board.
  const missing = LIVE_MARKETS.filter((m) => !apiCovered.has(m.api.toLowerCase()));
  let scraped = 0;
  if (missing.length) {
    let idx = 0;
    const worker = async () => {
      while (idx < missing.length) {
        const i = idx++;
        scraped += await refreshLiveMarket(missing[i], live);
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));
  }
  console.log("[live] sara567 fallback: " + scraped + "/" + missing.length + " markets");
  return { live, ok: Math.max(apiFresh, scraped) };
}

async function refreshAll() {
  const { live, ok } = await refreshMarkets();
  const store = readStore();
  store["matka.live_results"] = JSON.stringify(live);
  writeStore(store);
  console.log("[live] refreshed " + ok + "/" + LIVE_MARKETS.length + " markets at " + new Date().toISOString());
  return ok;
}

if (require.main === module) {
  const toFile = process.argv.indexOf("--to-file");
  if (toFile > -1) {
    (async () => {
      const { live, ok } = await refreshMarkets();
      const out = process.argv[toFile + 1];
      if (out) {
        fs.writeFileSync(path.join(__dirname, "..", out), JSON.stringify(live));
        console.log("[live] wrote " + JSON.stringify(out) + " (" + ok + "/" + LIVE_MARKETS.length + " markets, " + JSON.stringify(live).length + " bytes)");
      }
      process.exit(0);
    })();
  } else {
    refreshAll().then((ok) => process.exit(ok ? 0 : 1));
  }
}

module.exports = { refreshAll, parsePanelChart, LIVE_MARKETS };