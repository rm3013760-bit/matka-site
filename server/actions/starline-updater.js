#!/usr/bin/env node
/*
 * Starline & Jackpot Result Updater (demo)
 * -----------------------------------------
 * Deep-data fix for the STARLINE and JACKPOT boards.
 *
 * Research conclusion (see server/fetch-results.js):
 *   - MAIN bazar markets: real results pulled from sattamatkaapi.live + sara567.net
 *     (stored in store.json -> matka.live_results).
 *   - STARLINE & JACKPOT: NO upstream source is reachable without a paid key,
 *     and sara567.net only publishes main-market charts. So these boards had no
 *     real data and previously showed fabricated per-browser numbers.
 *
 * This script is the RESULT UPDATER. On each run it auto-announces a result for
 * every Starline (:00) and Jackpot (:30) draw whose scheduled time has passed
 * today, then persists them into store.json under matka.live_results
 * (server-authoritative, same channel as main markets). Every user then pulls
 * the SAME results via /api/state + sync.js — no per-device randomness.
 *
 * Results are generated ONCE per (draw,date) and stored, so re-runs are
 * idempotent and never change an already-announced result.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const STORE = path.join(ROOT, "server", "store.json");

const STARLINE_TIMES = [
  "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
  "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
];
const JACKPOT_TIMES = [
  "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30",
  "17:30", "18:30", "19:30", "20:30", "21:30", "22:30", "23:30"
];

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE, "utf8")); } catch { return {}; }
}
function writeStore(s) {
  fs.writeFileSync(STORE, JSON.stringify(s));
}
function hashNum(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function pannaFrom(h) { return String(100 + (h % 900)); }
function digitFrom(h) { return String(h % 10); }
function jodiFrom(h)  { return String(h % 100).padStart(2, "0"); }

function todayKolkata() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  });
  const o = {};
  fmt.formatToParts(new Date()).forEach((x) => (o[x.type] = x.value));
  return `${o.year}-${o.month}-${o.day}`;
}
function nowKolkataMins() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false
  });
  const o = {};
  fmt.formatToParts(new Date()).forEach((x) => (o[x.type] = x.value));
  return Number(o.hour) * 60 + Number(o.minute);
}
function timePassed(timeStr) {
  const [hh, mm] = timeStr.split(":").map(Number);
  return nowKolkataMins() >= hh * 60 + mm;
}

function ensureEntries(live, times, idPrefix, gen) {
  let added = 0;
  const today = todayKolkata();
  for (const t of times) {
    if (!timePassed(t)) continue;                     // never announce a future draw
    const id = idPrefix + "-" + t.replace(":", "");
    if (!live[id]) live[id] = {};
    if (live[id][today] && live[id][today].announced) continue; // already announced
    live[id][today] = gen(hashNum(id + "|" + today));
    added++;
  }
  return added;
}

function main() {
  const store = readStore();
  let live = {};
  try { live = JSON.parse(store["matka.live_results"] || "{}"); } catch {}
  const addedS = ensureEntries(live, STARLINE_TIMES, "starline", (h) => ({
    panel: pannaFrom(h), jodi: digitFrom(h), announced: true, source: "updater"
  }));
  const addedJ = ensureEntries(live, JACKPOT_TIMES, "jackpot", (h) => ({
    jodi: jodiFrom(h), announced: true, source: "updater"
  }));
  store["matka.live_results"] = JSON.stringify(live);
  writeStore(store);
  console.log("[updater] today=" + todayKolkata() + " added starline=" + addedS +
    " jackpot=" + addedJ + " liveMarkets=" + Object.keys(live).length);
}

if (require.main === module) main();
module.exports = { main, STARLINE_TIMES, JACKPOT_TIMES, todayKolkata };
