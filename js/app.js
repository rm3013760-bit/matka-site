const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

let currentUser = store.get("matka.user", null);

function todayKey() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function jodiFromPanel(p) {
  const digits = String(p).split("");
  const sum = digits.reduce((a, b) => a + Number(b), 0);
  return String(sum % 10);
}

let liveFileOverlay = null;

function getResults() {
  const results = store.get("matka.results", {});
  const live = liveFileOverlay || store.get("matka.live_results", null) || {};
  for (const mid of Object.keys(live)) {
    for (const date of Object.keys(live[mid] || {})) {
      results[mid + "|" + date] = Object.assign({ date: date }, live[mid][date]);
    }
  }
  return results;
}

function getResult(marketId, date) {
  return getResults()[marketId + "|" + (date || todayKey())] || null;
}

function setResult(marketId, date, panel, panel2, announce) {
  const results = getResults();
  results[marketId + "|" + date] = {
    panel: panel,
    panel2: panel2,
    jodi: jodiFromPanel(panel),
    jodi2: jodiFromPanel(panel2),
    date: date,
    demo: false,
    announced: announce || false
  };
  store.set("matka.results", results);
}

function deleteResult(marketId, date) {
  const results = getResults();
  delete results[marketId + "|" + date];
  store.set("matka.results", results);
}

function seedDemoResults() {
  const results = getResults();
  let changed = false;
  const days = 7;
  for (let i = 1; i <= days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    for (const m of MARKETS) {
      if (m.live) continue;
      const id = m.id + "|" + key;
      if (!results[id]) {
        const p1 = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        const p2 = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        results[id] = { panel: p1, panel2: p2, jodi: jodiFromPanel(p1), jodi2: jodiFromPanel(p2), date: key, demo: true, announced: true };
        changed = true;
      }
    }
  }
  if (changed) store.set("matka.results", results);
}

function getTodayResults() {
  const results = getResults();
  return MARKETS.map((m) => ({
    market: m,
    result: getResult(m.id, todayKey())
  }));
}

function $(sel) {
  return document.querySelector(sel);
}

function fmtCountdown(target) {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function nextResultTime(market) {
  const [hh, mm] = market.result.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

function timeToMin(t) {
  if (!t) return null;
  const s = String(t).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return (parseInt(m[1], 10) % 24) * 60 + parseInt(m[2], 10);
}

// Returns "open" / "pending" / "closed" for a market based on the device clock.
function marketPlayStatus(market) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = timeToMin(market.open);
  const closeMin = timeToMin(market.close);
  if (openMin == null || closeMin == null) return "open";
  if (nowMin >= openMin && nowMin < closeMin) return "open";
  if (nowMin < openMin) return "pending";
  return "closed";
}

function router() {
  const page = $("#page");
  if (!page) return;
  blockIfNeeded();
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/");
  const route = parts[0] || "";
  updateBottomNav(route);
  if (route === "chart" || route === "charts") renderCharts(page, parts[1]);
  else if (route === "funds") renderFunds(page, parts[1]);
  else if (route === "history") renderMyHistory(page, parts[1] || "entries");
  else if (route === "results") renderHistory(page, parts[1]);
  else if (route === "my-bids") renderMyBids(page);
  else if (route === "passbook") renderPassbook(page);
  else if (route === "notification") renderNotifications(page);
  else if (route === "timetable") renderTimetable(page);
  else if (route === "notice") renderNotice(page);
  else if (route === "share") { shareApp(); renderHome(page); }
  else if (route === "settings") {
    if (currentUser) renderSettings(page);
    else renderLogin(page);
  }
  else if (route === "login") renderLogin(page);
  else if (route === "register") renderRegister(page);
  else if (route === "games") renderGames(page);
  else if (route === "profile") renderProfile(page);
  else if (route === "bid") renderBidPage(page, parts[1] || "single", parts[2]);
  else if (route === "play") renderBidPage(page, parts[1] || "single", parts[2]);
  else if (route === "market") renderMarketDetail(page, parts[1]);
  else if (route === "ledger") renderMyHistory(page, "entries");
  else if (route === "account") {
    if (currentUser) renderSettings(page);
    else renderLogin(page);
  }
  else if (route === "about") renderAbout(page);
  else if (route === "faq") renderFaq(page);
  else if (route === "contact") renderContact(page);
  else if (route === "privacy") renderPrivacy(page);
  else renderHome(page);
}

function updateBottomNav(route) {
  const bn = document.getElementById("bottom-nav");
  if (!bn) return;
  const map = { "": "/", home: "/", myBids: "my-bids", "my-bids": "my-bids", passbook: "passbook", funds: "funds", contact: "contact", charts: "charts" };
  const activeKey = map[route] ?? "";
  for (const a of bn.querySelectorAll("a")) {
    a.classList.toggle("active", a.dataset.active === activeKey);
  }
}

function updateHeaderBalance() {
  const chip = $("#drawer-bal");
  if (!chip) return;
  if (currentUser) {
    const bal = walletBalance(currentUser.phone || currentUser.username);
    chip.textContent = "₹ " + bal.toLocaleString(undefined, { minimumFractionDigits: 2 });
  } else {
    chip.textContent = "₹ 0.00";
  }
}

function buildNav() {
  const nameEl = $("#drawer-name");
  const subEl = $("#drawer-sub");
  const avEl = $("#drawer-avatar");
  const logoutBtn = $("#drawer-logout");
  const drawerIdentity = $("#side-drawer").querySelector(".drawer-identity");
  if (currentUser) {
    if (nameEl) nameEl.textContent = currentUser.name || "User";
    if (subEl) subEl.textContent = currentUser.role === "admin" ? "ADMIN · " + (currentUser.phone || currentUser.username || "") : "USER · " + (currentUser.phone || currentUser.username || "");
    if (avEl) avEl.textContent = (currentUser.name || "U").trim().charAt(0).toUpperCase();
    if (drawerIdentity) drawerIdentity.style.cursor = "pointer";
    if (logoutBtn) logoutBtn.style.display = "";
  } else {
    if (nameEl) nameEl.textContent = "Guest";
    if (subEl) subEl.textContent = "Tap here to sign in";
    if (avEl) avEl.textContent = "?";
    if (drawerIdentity) drawerIdentity.style.cursor = "pointer";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
  updateHeaderBalance();
}

function marketCategory(m) {
  const n = m.name.toLowerCase();
  if (n.includes("night")) return "Night";
  if (n.includes("morning") || n.includes("day")) return "Day";
  return "Main Bazar";
}

function renderHome(page, opts) {
  seedDemoResults();
  const cats = ["All", "Main Bazar", "Day", "Night"];

  page.innerHTML = `
    <div class="cat-chips" id="cat-chips">
      ${cats.map((c) => `<button type="button" class="cat-chip ${c === "All" ? "on" : ""}" data-cat="${c}">${c}</button>`).join("")}
    </div>
    <div class="s5-section matka-results">
      <div class="s5-head">
        <h2>MATKA RESULT</h2>
        <a href="#/charts">VIEW ALL</a>
      </div>
      <div class="s5-list" id="home-rows"></div>
    </div>
    <div class="s5-section guessing">
      <div class="s5-head"><h2>GUESSING</h2><span class="s5-live"><span class="dot"></span> DEMO</span></div>
      <div class="guess-strip">
        <div class="guess-day">TODAY'S<br>PICKS</div>
        <div class="guess-cards">
          <div class="guess-card"><small>Single</small><b>3 \u00b7 7 \u00b7 9</b></div>
          <div class="guess-card"><small>Jodi</small><b>14 \u00b7 65 \u00b7 89</b></div>
          <div class="guess-card"><small>Pana</small><b>123 \u00b7 567 \u00b7 890</b></div>
          <div class="guess-card"><small>Starline</small><b>2 \u00b7 5 \u00b7 8</b></div>
        </div>
      </div>
      <p class="hint">Entertainment picks only — not predictions or advice. Demo content.</p>
    </div>
    <div class="s5-section games-play">
      <div class="s5-head"><h2>MATKA GAMES</h2><a href="#/games">GAME RATES</a></div>
      <div class="s5-games" id="home-games"></div>
    </div>
    <section class="quick-links">
      <a href="#/charts">Jodi Chart</a>
      <a href="#/history">My History</a>
      <a href="#/games">How to Play</a>
      <a href="#/funds">Funds</a>
    </section>`;

  const chips = $("#cat-chips");
  if (chips) {
    chips.addEventListener("click", (e) => {
      const btn = e.target.closest(".cat-chip");
      if (!btn) return;
      for (const c of chips.querySelectorAll(".cat-chip")) c.classList.toggle("on", c === btn);
      renderHomeRows(btn.dataset.cat);
    });
  }
  renderHomeRows("All");
  renderHomeGames();

  updateHeaderBalance();
}

function renderHomeRows(cat) {
  const homeRows = $("#home-rows");
  if (!homeRows) return;
  const today = getTodayResults();
  homeRows.innerHTML = "";
  for (const { market, result } of today) {
    if (cat !== "All" && marketCategory(market) !== cat) continue;
    const row = document.createElement("div");
    row.className = "s5-row";
    const hasResult = result && result.announced;
    const jodi = hasResult ? result.jodi + result.jodi2 : "--";
    const pan1 = hasResult ? result.panel : "---";
    const pan2 = hasResult ? result.panel2 || "--" : "---";
    const status = marketPlayStatus(market);
    let tagTxt = "PENDING";
    let tagCls = "t-closed";
    if (hasResult) { tagTxt = "RESULT"; tagCls = "t-open"; }
    else if (status === "open") { tagTxt = "OPEN"; tagCls = "t-open"; }
    else if (status === "closed") { tagTxt = "CLOSED"; tagCls = "t-closed"; }
    const tag = `<span class="s5-tag ${tagCls}">${tagTxt}</span>`;
    const playable = !hasResult;
    const bidBtn = playable
      ? `<button type="button" class="s5-bid" data-play-market="${market.id}">PLAY</button>`
      : `<span class="s5-bid disabled" aria-disabled="true">DONE</span>`;
    row.innerHTML = `
      <div class="s5-top">
        <div class="s5-mkt">
          <b>${market.name}</b>
          <small>OPEN ${market.open} \u00b7 CLOSE ${market.close}</small>
        </div>
        ${tag}
      </div>
      <div class="s5-btm">
        <div class="s5-jodi"><em>JODI</em><b>${jodi}</b><small>PANNA ${pan1} - ${pan2}</small></div>
        <div class="s5-oc">
          <span class="s5-open"><i>OPEN</i>${pan1}</span>
          <span class="s5-close"><i>CLOSE</i>${pan2}</span>
        </div>
        ${bidBtn}
      </div>`;
    row.addEventListener("click", () => (location.hash = "#/market/" + market.id));
    const playBtn = row.querySelector(".s5-bid[data-play-market]");
    if (playBtn) playBtn.addEventListener("click", (e) => { e.stopPropagation(); openStyleMenu({ market: market.id, anchor: playBtn }); });
    homeRows.appendChild(row);
  }
}

function renderHomeGames() {
  const homeGames = $("#home-games");
  if (!homeGames) return;
  for (const g of GAMES) {
    const c = document.createElement("div");
    c.className = "s5-game";
    c.innerHTML = `
      <b>${g.code}</b>
      <strong>${g.name}</strong>
      <small>${g.odds}</small>
      <button type="button" class="s5-bid s5-bid-small" data-play-game="${g.id}">PLAY</button>`;
    const pb = c.querySelector("[data-play-game]");
    pb.addEventListener("click", () => openStyleMenu({ game: g.id, anchor: pb }));
    homeGames.appendChild(c);
  }
}

function renderTutorialVideos(page) {
  const container = document.getElementById("tutorial-videos");
  if (!container) return;
  Promise.all([
    fetch("assets/videos/index.json?t=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).catch(() => ({ videos: [] })),
    Promise.resolve(store.get("matka.videos", []))
  ]).then(([remote, local]) => {
    let list = ((remote && remote.videos) || []).slice();
    for (const v of local || []) {
      if (v.data && !list.some((x) => x.id === v.id)) list.push(v);
    }
    container.innerHTML = list.length ? `
      <h3>Tutorial Videos</h3>
      <div class="video-gallery">
        ${list.map((v) => {
          if (v.data) return `<div class="video-item"><div class="video-frame"><video controls preload="metadata" src="${v.data}"></video></div><b>${v.title}</b></div>`;
          const src = v.url ? location.origin + v.url : "#";
          return `<a class="video-item video-link" href="${src}" target="_blank" rel="noopener"><div class="video-frame"><video controls preload="metadata" src="${src}"></video></div><b>${v.title}</b></a>`;
        }).join("")}
      </div>` : "";
  });
}

function renderGames(page) {
  const videoHTML = `<div id="tutorial-videos" class="hist-card rates-wrap"></div>`;
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> Rules</div>
      <h1>Game Rates & Rules</h1>
      <p>Entertainment format for information & demonstration purposes only.</p>
    </section>
    <div class="hist-card rates-wrap">
      <h3>Main Market Rates (Bid ₹ 10)</h3>
      <div class="table-wrap">
        <table class="result-table rates-table">
          <thead><tr><th>Game Type</th><th>Pick</th><th>Bid Amount</th><th>Winning Amount</th><th></th></tr></thead>
          <tbody>
            ${GAMES.map((g) => `<tr>
              <td><strong>${g.name}</strong></td>
              <td class="dimmed">${g.range}</td>
              <td class="rate-amount">₹ 10.00</td>
              <td class="rate-cell"><b>KA ${(10 * parseFloat(g.odds)).toFixed(2)}</b></td>
              <td><button type="button" class="btn play-link" data-play-game="${g.id}">Play</button></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
    <div class="hist-card rates-wrap">
      <h3>Starline Rates (Bid ₹ 10) — ${STARLINE_TIMES.length} hourly markets</h3>
      <div class="table-wrap">
        <table class="result-table rates-table">
          <thead><tr><th>Game Type</th><th>Rate</th></tr></thead>
          <tbody>
            ${Object.entries(STARLINE_RATES).map(([k, v]) => `<tr>
              <td><strong>${k === "single" ? "Single Digit" : k === "jodi" ? "Jodi" : k === "single_pana" ? "Single Pana" : k === "double_pana" ? "Double Pana" : "Triple Pana"}</strong></td>
              <td class="rate-cell"><b>${v}</b></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="market-nav" style="margin-top:14px">
        ${STARLINE_TIMES.map((t) => `<span class="chip">${t}</span>`).join("")}
      </div>
      <p class="hint">Starline draws run every hour. Disawar markets: ${DISAWAR_MARKETS.join(" · ")}.</p>
    </div>
    ${videoHTML}
    <div class="howto-grid">
      <div class="howto-step"><b>1</b><h4>Pick a Market</h4><p>Open Play and select any market from the live board.</p></div>
      <div class="howto-step"><b>2</b><h4>Choose a Game</h4><p>Single Digit, Jodi, Pana, Sangam, Family or Motor.</p></div>
      <div class="howto-step"><b>3</b><h4>Place a Bet</h4><p>Enter a valid number and amount against your demo wallet.</p></div>
      <div class="howto-step"><b>4</b><h4>Wait for Result</h4><p>Results auto-announce at the scheduled time per market.</p></div>
      <div class="howto-step"><b>5</b><h4>Win Payout</h4><p>Winning bets are auto-resolved and credited to your wallet.</p></div>
    </div>
    <section class="family-section">
      <h2>Family Pairs (11 Families)</h2>
      <p>Pick a family — every Jodi in that family wins together.</p>
      <div class="family-grid">
        ${FAMILY_PAIRS.map((f, i) => `<div class="family-card"><b>${i + 1}</b><span>${f[0]} & ${f[1]}</span></div>`).join("")}
      </div>
    </section>`;

  renderTutorialVideos(page);

  for (const b of page.querySelectorAll("[data-play-game]")) {
    b.addEventListener("click", () => openStyleMenu({ game: b.dataset.playGame, anchor: b }));
  }
}

function fmtDateNice(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function histRowHTML(r, withMarket, isToday) {
  const jodi2 = r.jodi2 ? " · " + r.jodi2 : "";
  return `<div class="hist-row${isToday ? " today" : ""}">
    <div class="hist-date">
      <span class="hd-day">${isToday ? "Today" : new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</span>
      <span class="hd-date">${fmtDateNice(r.date)}</span>
    </div>
    ${withMarket ? `<span class="hist-market">${r.market}</span>` : ""}
    <div class="hist-panels">
      <div class="hpanel"><span class="hpanel-label">Open</span><span class="hpanel-digits">${r.panel}</span></div>
      <span class="hpanel-arrow">→</span>
      <div class="hpanel"><span class="hpanel-label">Close</span><span class="hpanel-digits">${r.panel2 || "---"}</span></div>
    </div>
    <div class="hist-jodi"><span class="hpanel-label">Jodi</span><span class="jodi-pill">${r.jodi}${jodi2}</span></div>
  </div>`;
}

function renderMarketDetail(page, id) {
  const market = MARKETS.find((m) => m.id === id);
  if (!market) {
    location.hash = "#/";
    return;
  }
  const results = getResults();
  const todayR = results[id + "|" + todayKey()];
  const declaredToday = todayR && todayR.announced;
  const playable = !declaredToday;
  const playBtns = playable
    ? `<div class="card-actions" style="margin-top:10px">
        <a class="btn btn-green" href="#/play/jodi/${market.id}">Play Jodi</a>
        <a class="btn ghost" href="#/play/single/${market.id}">Play Digit</a>
      </div>`
    : `<div class="card-actions" style="margin-top:10px">
        <span class="s5-bid disabled" style="font-size:0.75rem">Result declared — closed</span>
      </div>`;
  const days = Object.keys(results).filter((k) => k.startsWith(id + "|")).sort().slice(-14).reverse();
  page.innerHTML = `
    <section class="page-head">
      <h1>${market.name}</h1>
      <p>Open ${market.open} · Close ${market.close} · Result ${market.result} · ${market.days}</p>
      ${playBtns}
    </section>
    <div class="hist-stats">
      <div class="hist-stat"><b>${days.length}</b><span>Results</span></div>
      <div class="hist-stat"><b>${days.length ? fmtDateNice(days[0].split("|").pop()) : "—"}</b><span>Latest</span></div>
      <div class="hist-stat"><b>${declaredToday ? "LIVE" : "AWAIT"}</b><span>Today</span></div>
    </div>
    <div class="hist-card">
      <h3>Recent Results</h3>
      <div class="hist-list" id="rows">${days.length ? days.map((k, i) => histRowHTML(results[k], false, results[k].date === todayKey())).join("") : `<p class="empty">No results recorded yet.</p>`}</div>
    </div>`;
}

function renderHistory(page, marketId) {
  seedDemoResults();
  const results = getResults();
  page.innerHTML = `
    <section class="page-head">
      <h1>Results History</h1>
      <p>Select a market to see its full result history.</p>
    </section>
    <div class="market-nav" id="mnav">
      <select id="market-select" class="market-select">
        <option value="">All Markets</option>
        ${MARKETS.map((m) => `<option value="${m.id}" ${marketId === m.id ? "selected" : ""}>${m.name}</option>`).join("")}
      </select>
    </div>
    <div class="hist-card">
      <div class="hist-head">
        <h3 id="hist-title">All Markets</h3>
        <span class="hist-count" id="hist-count"></span>
      </div>
      <div class="hist-list" id="rows"></div>
    </div>`;

  $("#market-select").onchange = (e) => {
    location.hash = e.target.value ? "#/results/" + e.target.value : "#/results";
  };

  const tbody = $("#rows");
  const rows = [];
  for (const key of Object.keys(results)) {
    const [mid, date] = key.split("|");
    if (marketId && mid !== marketId) continue;
    const m = MARKETS.find((x) => x.id === mid);
    rows.push({ date, market: m ? m.name : mid, r: results[key] });
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  if (marketId) {
    $("#hist-title").textContent = MARKETS.find((m) => m.id === marketId).name;
    $("#hist-count").textContent = rows.length + " results";
  } else {
    $("#hist-count").textContent = rows.length + " results · " + new Set(rows.map((x) => x.market)).size + " markets";
  }
  const list = $("#rows");
  if (!rows.length) {
    list.innerHTML = `<p class="empty">No results recorded yet.</p>`;
    return;
  }
  const slice = rows.slice(0, 200);
  for (const row of slice) {
    const div = document.createElement("div");
    div.innerHTML = histRowHTML(row.r, !marketId, row.r.date === todayKey());
    list.appendChild(div.firstElementChild);
  }
}

function renderCharts(page, mid) {
  seedDemoResults();
  const results = getResults();
  const mkt = mid && MARKETS.find((m) => m.id === mid) ? MARKETS.find((m) => m.id === mid) : null;
  page.innerHTML = `
    <section class="page-head">
      <h1>Charts</h1>
      <p>Jodi, Open-Close and Panel charts for every market.</p>
    </section>
    <div class="s5-head">
      <div class="panel-tabs">
        <button type="button" class="chip active" data-chart="jodi">JODI</button>
        <button type="button" class="chip" data-chart="oc">OPEN-CLOSE</button>
        <button type="button" class="chip" data-chart="panel">PANEL</button>
      </div>
      <select id="chart-market" class="market-select">
        <option value="">All Markets</option>
        ${MARKETS.map((m) => `<option value="${m.id}" ${mkt && mkt.id === m.id ? "selected" : ""}>${m.name}</option>`).join("")}
      </select>
    </div>
    <div class="chart-grid" id="charts"></div>`;

  let chartType = "jodi";
  const charts = $("#charts");
  const mkts = mkt ? [mkt] : MARKETS;

  const renderGrid = () => {
    charts.innerHTML = "";
    for (const m of mkts) {
      const days = Object.keys(results).filter((k) => k.startsWith(m.id + "|")).sort().slice(-14);
      const el = document.createElement("div");
      el.className = "chart-card";
      let body;
      if (chartType === "jodi") {
        body = days.map((k) => {
          const r = results[k];
          return `<div class="chart-cell"><b>${r.jodi}${r.jodi2}</b><span>${r.date.slice(5)}</span></div>`;
        }).join("");
      } else if (chartType === "oc") {
        body = days.map((k) => {
          const r = results[k];
          return `<div class="chart-cell oc"><b><span class="c-open">${r.jodi}</span>-<span class="c-close">${r.jodi2}</span></b><span>${r.date.slice(5)}</span></div>`;
        }).join("");
      } else {
        body = days.map((k) => {
          const r = results[k];
          return `<div class="chart-cell pna"><b><span class="c-open">${r.panel}</span><i>·</i><span class="c-close">${r.panel2 || "--"}</span></b><span>${r.date.slice(5)}</span></div>`;
        }).join("");
      }
      el.innerHTML = `<h3>${m.name}</h3><div class="chart-row">${body || `<p class="empty">No results yet.</p>`}</div>`;
      charts.appendChild(el);
    }
  };
  renderGrid();

  for (const b of page.querySelectorAll("[data-chart]")) {
    b.onclick = () => {
      chartType = b.dataset.chart;
      for (const x of page.querySelectorAll("[data-chart]")) x.classList.toggle("active", x === b);
      renderGrid();
    };
  }
  $("#chart-market").onchange = (e) => {
    location.hash = e.target.value ? "#/charts/" + e.target.value : "#/charts";
  };
}

function renderLedger(page) {
  if (!currentUser) { renderLogin(page); return; }
  resolveBets();
  const u = currentUser;
  const bets = store.get("matka.bets", []).filter((b) => b.phone === u.phone).slice().reverse();
  const won = bets.filter((b) => b.status === "won");
  const invested = bets.filter((b) => b.status === "pending").reduce((s, b) => s + b.stake, 0);
  const paid = bets.filter((b) => b.status === "won").reduce((s, b) => s + b.stake * b.odds, 0);
  const today = todayKey();
  const todayBets = bets.filter((b) => (b.date || "").slice(0, 10) === today).length;

  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> My Ledger</div>
      <h1>Betting History</h1>
      <p>${u.name} · demo records only.</p>
    </section>
    <div class="hist-stats">
      <div class="hist-stat"><b>${bets.length}</b><span>Total Bids</span></div>
      <div class="hist-stat"><b>${todayBets}</b><span>Today</span></div>
      <div class="hist-stat"><b>₹ ${invested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b><span>In Play</span></div>
      <div class="hist-stat"><b class="${paid ? "c-win" : ""}">₹ ${paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b><span>Won</span></div>
    </div>
    <div class="hist-card">
      <div class="hist-head">
        <h3>My Bets</h3>
        <span class="hist-count">${won.length} won</span>
      </div>
      <div class="hist-list" id="ledger-rows"></div>
    </div>`;

  const list = $("#ledger-rows");
  if (!bets.length) {
    list.innerHTML = `<p class="empty">No bids yet. Place one from the Home page.</p>`;
    return;
  }
  for (const b of bets.slice(0, 100)) {
    const div = document.createElement("div");
    const num = b.game === "half-sangam" || b.game === "half-sangam-b" ? b.numbers.jodi + " - " + b.numbers.patti :
      b.game === "full-sangam" ? b.numbers.patti1 + " - " + b.numbers.patti2 :
      b.game === "family-pair" ? "F" + b.numbers.num : b.numbers.num;
    const statusCls = b.status === "won" ? "l-win" : b.status === "lost" ? "l-lose" : "l-open";
    const statusTxt = b.status === "won" ? "WON" : b.status === "lost" ? "LOST" : "OPEN";
    const winAmt = b.status === "won" ? " · +₹ " + (b.stake * b.odds).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "";
    div.innerHTML = `
      <div class="hist-row">
        <div class="hist-date">
          <span class="hd-day">${b.gameName}</span>
          <span class="hd-date">${(b.date || "").slice(0, 10)}</span>
        </div>
        <span class="hist-market">${b.marketName}</span>
        <div class="hist-jodi"><span class="hpanel-label">Number</span><span class="jodi-pill">${num}</span></div>
        <div class="hist-panels">
          <div class="hpanel"><span class="hpanel-label">Stake</span><span class="hpanel-digits">₹ ${b.stake}</span></div>
          <div class="hpanel"><span class="hpanel-label">Odds</span><span class="hpanel-digits">${b.odds}x</span></div>
        </div>
        <span class="l-status ${statusCls}">${statusTxt}${winAmt}</span>
      </div>`;
    list.appendChild(div.firstElementChild);
  }
}

function renderMyHistory(page, tab) {
  if (!currentUser) { renderLogin(page); return; }
  resolveBets();
  const u = currentUser;
  const bets = store.get("matka.bets", []).filter((b) => b.phone === u.phone).slice().reverse();
  const requests = store.get("matka.requests", []).filter((r) => r.phone === u.phone).slice().reverse();
  const wds = store.get("matka.withdrawals", []).filter((w) => w.phone === u.phone).slice().reverse();
  const tabName = tab === "deposits" ? "deposits" : tab === "withdrawals" ? "withdrawals" : "entries";

  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> ${u.name}</div>
      <h1>My History</h1>
      <p>Bids, deposits and withdrawals for ${u.phone}.</p>
    </section>
    <div class="panel-tabs">
      <button type="button" class="chip ${tabName === "entries" ? "active" : ""}" data-tab="entries">My Entries</button>
      <button type="button" class="chip ${tabName === "deposits" ? "active" : ""}" data-tab="deposits">Deposits</button>
      <button type="button" class="chip ${tabName === "withdrawals" ? "active" : ""}" data-tab="withdrawals">Withdrawals</button>
    </div>
    <div id="myhist-body"></div>`;

  for (const c of page.querySelectorAll(".panel-tabs .chip")) {
    c.onclick = () => { location.hash = "#/history/" + c.dataset.tab; };
  }

  const body = $("#myhist-body");

  if (tabName === "entries") {
    const won = bets.filter((b) => b.status === "won");
    body.innerHTML = `
      <div class="hist-stats">
        <div class="hist-stat"><b>${bets.length}</b><span>Total Bids</span></div>
        <div class="hist-stat"><b>${bets.filter((b) => (b.date || "").slice(0, 10) === todayKey()).length}</b><span>Today</span></div>
        <div class="hist-stat"><b>₹ ${bets.filter((b) => b.status === "pending").reduce((s, b) => s + b.stake, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b><span>In Play</span></div>
        <div class="hist-stat"><b>₹ ${won.reduce((s, b) => s + b.stake * b.odds, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b><span>Won</span></div>
      </div>
      <div class="hist-card"><div class="hist-list" id="myhist-rows"></div></div>`;
    const list = $("#myhist-rows");
    if (!bets.length) { list.innerHTML = `<p class="empty">No bids yet. Place one from the Home page.</p>`; return; }
    for (const b of bets.slice(0, 100)) {
      const div = document.createElement("div");
      const num = b.game === "half-sangam" || b.game === "half-sangam-b" ? b.numbers.jodi + " - " + b.numbers.patti :
        b.game === "full-sangam" ? b.numbers.patti1 + " - " + b.numbers.patti2 :
        b.game === "family-pair" ? "F" + b.numbers.num : b.numbers.num;
      const statusCls = b.status === "won" ? "l-win" : b.status === "lost" ? "l-lose" : "l-open";
      const statusTxt = b.status === "won" ? "WON" : b.status === "lost" ? "LOST" : "OPEN";
      const winAmt = b.status === "won" ? " · +₹ " + (b.stake * b.odds).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "";
      const styleLabel = b.style ? (BID_STYLES.find((s) => s.id === b.style) || {}).label || b.gameName : b.gameName;
      div.innerHTML = `
        <div class="hist-row">
          <div class="hist-date">
            <span class="hd-day">${styleLabel}</span>
            <span class="hd-date">${(b.date || "").slice(0, 10)}</span>
          </div>
          <span class="hist-market">${b.marketName}</span>
          <div class="hist-jodi"><span class="hpanel-label">Number</span><span class="jodi-pill">${num}</span></div>
          <div class="hist-panels">
            <div class="hpanel"><span class="hpanel-label">Stake</span><span class="hpanel-digits">₹ ${b.stake}</span></div>
            <div class="hpanel"><span class="hpanel-label">Odds</span><span class="hpanel-digits">${b.odds}x</span></div>
          </div>
          <span class="l-status ${statusCls}">${statusTxt}${winAmt}</span>
        </div>`;
      list.appendChild(div.firstElementChild);
    }
    return;
  }

  if (tabName === "deposits") {
    body.innerHTML = `<div class="hist-card">
      <div class="hist-head"><h3>Fund Deposit History</h3><span class="hist-count">${requests.length}</span></div>
      <div class="hist-list">
        ${requests.length ? requests.map((r) => `
          <div class="hist-row">
            <div class="hist-date"><span class="hd-day">${r.method}</span><span class="hd-date">${String(r.date || "").slice(0, 16)}</span></div>
            <span class="hist-market">Ref: ${r.ref || "—"}</span>
            <div class="hist-panels"><div class="hpanel"><span class="hpanel-label">Amount</span><span class="hpanel-digits">₹ ${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div></div>
            <span class="l-status ${r.status === "confirmed" ? "l-win" : r.status === "rejected" ? "l-lose" : "l-open"}">${String(r.status || "pending").toUpperCase()}</span>
          </div>`).join("") : `<p class="empty">No deposit requests yet.</p>`}
      </div>
    </div>`;
    return;
  }

  body.innerHTML = `<div class="hist-card">
    <div class="hist-head"><h3>Withdraw Fund History</h3><span class="hist-count">${wds.length}</span></div>
    <div class="hist-list">
      ${wds.length ? wds.map((w) => `
        <div class="hist-row">
          <div class="hist-date"><span class="hd-day">${w.method === "bank" ? "BANK" : "UPI"}</span><span class="hd-date">${String(w.date || "").slice(0, 16)}</span></div>
          <span class="hist-market">${w.method === "bank" ? (w.bankName || "—") + " · " + (w.accName || "—") : w.upi || "—"}</span>
          <div class="hist-panels"><div class="hpanel"><span class="hpanel-label">Amount</span><span class="hpanel-digits">₹ ${Number(w.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div></div>
          <span class="l-status ${w.status === "confirmed" ? "l-win" : w.status === "rejected" ? "l-lose" : "l-open"}">${String(w.status || "pending").toUpperCase()}</span>
        </div>`).join("") : `<p class="empty">No withdrawal requests yet.</p>`}
    </div>
  </div>`;
}

function renderMyBids(page) {
  if (!currentUser) { renderLogin(page); return; }
  resolveBets();
  const u = currentUser;
  const bets = store.get("matka.bets", []).filter((b) => b.phone === u.phone).slice().reverse();
  const won = bets.filter((b) => b.status === "won");
  let rows = "";
  if (bets.length) {
    for (const b of bets.slice(0, 100)) {
      const num = b.game === "half-sangam" || b.game === "half-sangam-b" ? b.numbers.jodi + " - " + b.numbers.patti :
        b.game === "full-sangam" ? b.numbers.patti1 + " - " + b.numbers.patti2 :
        b.game === "family-pair" ? "F" + b.numbers.num : b.numbers.num;
      const statusCls = b.status === "won" ? "l-win" : b.status === "lost" ? "l-lose" : "l-open";
      const statusTxt = b.status === "won" ? "WON" : b.status === "lost" ? "LOST" : "OPEN";
      const winAmt = b.status === "won" ? " · +₹ " + (b.stake * b.odds).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "";
      const styleLabel = b.style ? (BID_STYLES.find((s) => s.id === b.style) || {}).label || b.gameName : b.gameName;
      rows += `
        <div class="hist-row">
          <div class="hist-date"><span class="hd-day">${styleLabel}</span><span class="hd-date">${(b.date || "").slice(0, 10)}</span></div>
          <span class="hist-market">${b.marketName}</span>
          <div class="hist-jodi"><span class="hpanel-label">Number</span><span class="jodi-pill">${num}</span></div>
          <div class="hist-panels">
            <div class="hpanel"><span class="hpanel-label">Stake</span><span class="hpanel-digits">₹ ${b.stake}</span></div>
            <div class="hpanel"><span class="hpanel-label">Odds</span><span class="hpanel-digits">${b.odds}x</span></div>
          </div>
          <span class="l-status ${statusCls}">${statusTxt}${winAmt}</span>
        </div>`;
    }
  } else {
    rows = `<p class="empty">No bids yet. Place one from the Home page.</p>`;
  }
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> ${u.name}</div>
      <h1>My Bids</h1>
      <p>All your placed bids.</p>
    </section>
    <div class="hist-stats">
      <div class="hist-stat"><b>${bets.length}</b><span>Total Bids</span></div>
      <div class="hist-stat"><b>${bets.filter((b) => b.status === "pending").length}</b><span>In Play</span></div>
      <div class="hist-stat"><b>₹ ${bets.filter((b) => b.status === "pending").reduce((s, b) => s + b.stake, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b><span>In Play Amt</span></div>
      <div class="hist-stat"><b>₹ ${won.reduce((s, b) => s + b.stake * b.odds, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b><span>Won</span></div>
    </div>
    <div class="hist-card"><div class="hist-list">${rows}</div></div>`;
}

function renderPassbook(page) {
  if (!currentUser) { renderLogin(page); return; }
  const u = currentUser;
  const wallet = walletTx(u.phone, 200);
  const balance = walletBalance(u.phone);
  const rows = wallet.length
    ? wallet.map((t) => `
        <div class="hist-row">
          <div class="hist-date"><span class="hd-day">${t.note || "Transaction"}</span><span class="hd-date">${new Date(t.date).toLocaleString()}</span></div>
          <span class="hist-market">${t.amount >= 0 ? "Credit" : "Debit"}</span>
          <div class="hist-panels"><div class="hpanel"><span class="hpanel-label">Amount</span><span class="hpanel-digits ${t.amount >= 0 ? "wallet-plus" : "wallet-minus"}">${t.amount >= 0 ? "+" : "−"}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div></div>
          <span class="l-status ${t.amount >= 0 ? "l-win" : "l-lose"}">${t.amount >= 0 ? "CREDIT" : "DEBIT"}</span>
        </div>`).join("")
    : `<p class="empty">No passbook entries yet.</p>`;
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> ${u.name}</div>
      <h1>Passbook</h1>
      <p>Your complete wallet transaction history.</p>
    </section>
    <div class="hist-stats">
      <div class="hist-stat"><b>₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b><span>Balance</span></div>
      <div class="hist-stat"><b>${wallet.length}</b><span>Transactions</span></div>
    </div>
    <div class="hist-card"><div class="hist-list">${rows}</div></div>`;
}

function renderFunds(page, tab) {
  if (!currentUser) { renderLogin(page); return; }
  const users = store.get("matka.users", []);
  const u = users.find((x) => x.phone === currentUser.phone && x.phone) || users.find((x) => x.username === currentUser.username);
  if (!u) { renderLogin(page); return; }
  const balance = walletBalance(u.phone);
  const demoQr = store.get("matka.qr", null);
  const myRequests = store.get("matka.requests", []).filter((r) => r.phone === u.phone).slice().reverse();
  const tabName = (tab === "add" || tab === "withdraw" || tab === "bank") ? tab : "hub";
  const savedBank = store.get("matka.bank." + u.phone, null);
  const accounts = store.get("matka.accounts." + u.phone, null) || {
    upi: (savedBank && savedBank.upi) || "",
    banks: savedBank ? [{ bankName: savedBank.bankName || "", accName: savedBank.accName || "", accNo: savedBank.accNo || "", ifsc: savedBank.ifsc || "" }] : []
  };
  const wds = store.get("matka.withdrawals", []).filter((w) => w.phone === u.phone).slice().reverse();

  page.innerHTML = (tabName === "hub"
    ? `
    <section class="page-head">
      <h1>Funds</h1>
      <p>Manage your wallet, deposits, withdrawals and bank accounts.</p>
    </section>
    <div class="funds-balance card">
      <span>Wallet Balance</span>
      <b>₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
    </div>
    <div class="funds-quick">
      <a class="funds-btn f-add" href="#/funds/add">Add Funds</a>
      <a class="funds-btn f-withdraw" href="#/funds/withdraw">Withdraw Funds</a>
      <a class="funds-btn f-bank" href="#/funds/bank">Add Bank Account</a>
    </div>
    <div id="funds-body"></div>`
    : `
    <section class="page-head">
      <h1>${tabName === "withdraw" ? "Withdrawals" : tabName === "bank" ? "Add Bank Account" : "Add Money"}</h1>
      <p>${tabName === "withdraw" ? "Request a payout from your wallet." : tabName === "bank" ? "Store your bank account for fast withdrawals." : "Add money to your wallet."}</p>
    </section>
    <div class="funds-balance card">
      <span>Wallet Balance</span>
      <b>₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b>
    </div>
    <div id="funds-body"></div>`);

  const body = $("#funds-body");

  if (tabName === "hub") {
    body.innerHTML = "";
    return;
  }

  if (tabName === "withdraw") {
    body.innerHTML = `
      <div class="card panel-card">
        <h3>Withdraw Fund</h3>
        <p class="hint">Request a payout via UPI or bank transfer — the administrator approves it. Minimum withdrawal: ₹ 100.</p>
        <form class="form" id="wd-form">
          <label>Amount <input name="amount" type="number" min="100" step="1" placeholder="100" required></label>
          <label class="form-label">Payout method
            <div class="seg-row">
              <button type="button" class="seg active" id="m-upi">UPI</button>
              <button type="button" class="seg" id="m-bank">Bank Transfer</button>
            </div>
          </label>
          <div id="upi-fields">
            <label>UPI ID <input name="upi" placeholder="yourname@upi" value="${accounts.upi || ""}"></label>
          </div>
          <div id="bank-fields" style="display:none">
            ${accounts.banks.length ? `
              <h4>Saved Bank Accounts</h4>
              ${accounts.banks.map((b, i) => `<p class="hint" style="margin:2px 0">${i + 1}. ${b.bankName} · ${b.accName} · ${b.accNo} · ${b.ifsc}</p>`).join("")}
              <p class="hint" style="margin-top:6px">Enter details below (or edit your <a href="#/funds/bank">bank accounts</a>).</p>` : `<p class="hint">No saved bank account. <a href="#/funds/bank">Add your bank account</a> to pay out faster.</p>`}
            <label>Bank Name <input name="bankName" placeholder="e.g. HDFC Bank" value="${accounts.banks[0] ? accounts.banks[0].bankName : ""}"></label>
            <label>Account Holder Name <input name="accName" placeholder="Name on account" value="${accounts.banks[0] ? accounts.banks[0].accName : ""}"></label>
            <label>Account Number <input name="accNo" type="text" inputmode="numeric" placeholder="1234567890" value="${accounts.banks[0] ? accounts.banks[0].accNo : ""}"></label>
            <label>IFSC Code <input name="ifsc" placeholder="HDFC0000123" value="${accounts.banks[0] ? accounts.banks[0].ifsc : ""}"></label>
          </div>
          <button class="btn btn-green" type="submit">Request Withdrawal</button>
        </form>
      </div>
      <div id="wd-list"></div>`;

    const wdList = $("#wd-list");
    wdList.innerHTML = `
      <div class="card panel-card">
        <h3>Withdrawal Requests</h3>
        <p class="hint">Withdraw request submitted — track the status here; the administrator approves it.</p>
        <div class="activity-list">
          ${wds.length ? wds.slice(0, 8).map((w) => `
            <div class="activity-row">
              <span>₹ ${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${w.method === "bank" ? w.bankName + " · " + w.accName : "UPI · " + w.upi}</span>
              <small class="req-status req-${w.status}">${String(w.status || "pending").toUpperCase()}</small>
            </div>`).join("") : `<p class="hint">No withdrawal requests yet.</p>`}
        </div>
      </div>`;

    const mMethod = { upi: true };
    const showM = (upi) => {
      mMethod.upi = upi;
      $("#m-upi").classList.toggle("active", upi);
      $("#m-bank").classList.toggle("active", !upi);
      $("#upi-fields").style.display = upi ? "" : "none";
      $("#bank-fields").style.display = upi ? "none" : "";
    };
    $("#m-upi").onclick = () => showM(true);
    $("#m-bank").onclick = () => showM(false);
    if (accounts.banks.length === 0) showM(true);

    $("#wd-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = parseFloat(fd.get("amount"));
      if (!amount || amount < 100) { alert("Minimum withdrawal is ₹ 100."); return; }
      const bal = walletBalance(u.phone);
      if (amount > bal) { alert("Insufficient balance. Add fund first."); return; }
      if (mMethod.upi) {
        const upi = String(fd.get("upi") || "").trim();
        if (!upi.includes("@")) { alert("Enter a valid UPI ID."); return; }
        API.call("submit_withdrawalv1", { mobile: u.phone, amount: amount, method: "upi", upi_id: upi }).then((res) => {
          if (!res.success) { alert(res.message); return; }
          logActivity(u, "Withdrawal request of " + amount.toFixed(2) + " submitted via UPI (pending approval)");
          alert("Withdraw request submitted!");
          renderFunds(page, "withdraw");
        });
        return;
      }
      const bankName = String(fd.get("bankName") || "").trim();
      const accName = String(fd.get("accName") || "").trim();
      const accNo = String(fd.get("accNo") || "").trim();
      const ifsc = String(fd.get("ifsc") || "").trim();
      if (!bankName || !accName || !accNo || !ifsc) { alert("Fill in the bank details (Name, Account Holder, Account Number, IFSC)."); return; }
      API.call("submit_withdrawalv1", { mobile: u.phone, amount: amount, method: "bank", bank_name: bankName, acc_name: accName, acc_no: accNo, ifsc: ifsc }).then((res) => {
        if (!res.success) { alert(res.message); return; }
        logActivity(u, "Withdrawal request of " + amount.toFixed(2) + " submitted via bank transfer (pending approval)");
        alert("Withdraw request submitted!");
        renderFunds(page, "withdraw");
      });
    };
    return;
  }

  if (tabName === "bank") {
    body.innerHTML = `
      <div class="card panel-card">
        <h3>UPI ID</h3>
        <p class="hint">Set your default UPI ID used for payouts.</p>
        <form class="form" id="upi-form">
          <label>UPI ID <input name="upi" placeholder="yourname@upi" value="${accounts.upi || ""}"></label>
          <button class="btn btn-green" type="submit">Save UPI</button>
        </form>
      </div>
      <div class="card panel-card">
        <h3>Bank Accounts</h3>
        <p class="hint">Store your bank account details for fast withdrawals.</p>
        <div id="bank-list"></div>
        <form class="form" id="bank-form" style="margin-top:10px">
          <label>Bank Name <input name="bankName" placeholder="e.g. HDFC Bank" required></label>
          <label>Account Holder Name <input name="accName" placeholder="Name on account" required></label>
          <label>Account Number <input name="accNo" type="text" inputmode="numeric" placeholder="1234567890" required></label>
          <label>IFSC Code <input name="ifsc" placeholder="HDFC0000123" required></label>
          <button class="btn btn-green" type="submit">Save Bank Account</button>
        </form>
      </div>`;

    const bankList = $("#bank-list");
    const renderList = () => {
      const acc = store.get("matka.accounts." + u.phone, null) || { upi: "", banks: [] };
      bankList.innerHTML = acc.banks.length
        ? acc.banks.map((b, i) => `
            <div class="activity-row">
              <span><strong>${b.bankName}</strong> · ${b.accName} · <em>${b.accNo}</em> · ${b.ifsc}</span>
              <span class="bank-actions">
                <button type="button" class="bank-del" data-i="${i}">Remove</button>
              </span>
            </div>`).join("")
        : `<p class="hint">No bank accounts saved yet.</p>`;
      for (const b of bankList.querySelectorAll(".bank-del")) {
        b.onclick = () => {
          const a = store.get("matka.accounts." + u.phone, null) || { upi: "", banks: [] };
          a.banks.splice(parseInt(b.dataset.i, 10), 1);
          store.set("matka.accounts." + u.phone, a);
          if (a.banks[0]) store.set("matka.bank." + u.phone, a.banks[0]);
          renderList();
        };
      }
    };
    renderList();

    $("#upi-form").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const upi = String(f.get("upi") || "").trim();
      if (!upi.includes("@")) { alert("Enter a valid UPI ID."); return; }
      const a = store.get("matka.accounts." + u.phone, null) || { upi: "", banks: accounts.banks };
      a.upi = upi;
      store.set("matka.accounts." + u.phone, a);
      if (!store.get("matka.bank." + u.phone, null)) store.set("matka.bank." + u.phone, { upi: upi });
      else { const sb = store.get("matka.bank." + u.phone); sb.upi = upi; store.set("matka.bank." + u.phone, sb); }
      logActivity(u, "Updated default UPI ID");
      alert("UPI ID saved.");
      renderFunds(page, "bank");
    };

    $("#bank-form").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const bankName = String(f.get("bankName") || "").trim();
      const accName = String(f.get("accName") || "").trim();
      const accNo = String(f.get("accNo") || "").trim();
      const ifsc = String(f.get("ifsc") || "").trim();
      if (!bankName || !accName || !accNo || !ifsc) { alert("Fill in all bank fields."); return; }
      const a = store.get("matka.accounts." + u.phone, null) || { upi: accounts.upi, banks: [] };
      a.banks.push({ bankName, accName, accNo, ifsc });
      store.set("matka.accounts." + u.phone, a);
      store.set("matka.bank." + u.phone, a.banks[a.banks.length - 1]);
      logActivity(u, "Added bank account " + bankName + " · " + accNo);
      alert("Bank account saved.");
      renderFunds(page, "bank");
    };
    return;
  }

  body.innerHTML = `
    <div class="card panel-card">
      <h3>Add Fund</h3>
      <div class="pay-icon-row">
        <img src="assets/icons/gpay.svg" alt="GPay" title="GPay">
        <img src="assets/icons/phonepe.svg" alt="PhonePe" title="PhonePe">
        <img src="assets/icons/paytm.svg" alt="Paytm" title="Paytm">
        <img src="assets/icons/bank.svg" alt="Bank" title="Bank Transfer">
        <img src="assets/icons/whatsapp.svg" alt="WhatsApp" title="WhatsApp">
      </div>
      <form class="form" id="add-fund-form">
        <label>Amount
          <input name="amount" type="number" min="100" step="1" placeholder="100" required>
        </label>
        <label class="form-label">Payment method
          <div class="seg-row">
            <button type="button" class="seg active" id="af-upi">UPI</button>
            <button type="button" class="seg" id="af-qr">QR Code</button>
          </div>
        </label>
        <div id="af-upi-fields">
          <div class="qr-demo-box">
            <p>Pay to this UPI ID, then enter the reference below:</p>
            <p class="upi-id">${(demoQr && demoQr.upi) || DEMO_UPI}</p>
          </div>
          <label>UTR / Transaction reference number
            <input name="ref" maxlength="30" placeholder="e.g. 4123876541" required>
          </label>
        </div>
        <div id="af-qr-fields" style="display:none">
          ${demoQr ? `
            <div class="qr-demo-box">
              <p>Pay to this QR, then enter the reference below:</p>
              <img class="qr-img" src="${demoQr.data}" alt="Payment QR">
            </div>` : `<p class="hint">Payment QR not set by the administrator.</p>`}
          <label>UTR / Transaction reference number
            <input name="qrRef" maxlength="30" placeholder="e.g. 4123876541" required>
          </label>
        </div>
        <button class="btn btn-green" type="submit">Submit Payment Proof</button>
        <p class="form-hint">Balance is credited only after the administrator confirms your payment.</p>
      </form>
    </div>
    <div class="card panel-card">
      <h3>Fund Deposit History</h3>
      ${myRequests.length ? `<div class="activity-list">${myRequests.slice(0, 8).map((r) => `
        <div class="activity-row">
          <span>₹ ${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${r.method} · Ref: ${r.ref}</span>
          <small class="req-status req-${r.status}">${String(r.status || "pending").toUpperCase()}</small>
        </div>`).join("")}</div>` : `<p class="hint">No top-up requests yet.</p>`}
    </div>`;

  const afMethod = { upi: true };
  const showAf = (upi) => {
    afMethod.upi = upi;
    $("#af-upi").classList.toggle("active", upi);
    $("#af-qr").classList.toggle("active", !upi);
    $("#af-upi-fields").style.display = upi ? "" : "none";
    $("#af-qr-fields").style.display = upi ? "none" : "";
  };
  $("#af-upi").onclick = () => showAf(true);
  $("#af-qr").onclick = () => showAf(false);

  $("#add-fund-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = parseFloat(fd.get("amount"));
    if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
    const ref = String(fd.get(afMethod.upi ? "ref" : "qrRef") || "").trim();
    if (ref.length < 4) { alert("Enter the UTR / transaction reference number."); return; }
    API.call("submit_offlinepayment_request", { mobile: u.phone, amount: amount, method: afMethod.upi ? "upi" : "qr", ref: ref }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      logActivity(u, "Top-up request of " + amount.toFixed(2) + " submitted via " + (afMethod.upi ? "UPI" : "QR") + " (pending confirmation)");
      alert("Payment proof submitted. Your balance will be credited after the administrator confirms the payment.");
      renderFunds(page, "add");
    });
  };
}


function renderSettings(page) {
  if (!currentUser) { renderLogin(page); return; }
  const users = store.get("matka.users", []);
  const u = users.find((x) => x.phone === currentUser.phone && x.phone) || users.find((x) => x.username === currentUser.username);
  if (!u) { renderLogin(page); return; }
  const initial = (u.name || "U").trim().charAt(0).toUpperCase();
  const balance = walletBalance(u.phone);

  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> Settings</div>
      <h1>My Profile</h1>
      <p>Manage your demo account.</p>
    </section>
    <div class="card panel-card member-head">
      <div class="avatar">${initial}</div>
      <div class="member-meta">
        <h3>${u.name}</h3>
        <p class="member-phone">${u.phone || "—"}</p>
        <p class="profile-sub">MPIN: ${u.mpin || "0000"} · demo only</p>
      </div>
      <div class="member-side">
        <span class="member-flag"><span class="dot"></span> Member</span>
        <div class="member-balance">₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
    </div>
    <div class="profile-grid">
      <div class="card panel-card">
        <h3>Security</h3>
        <form class="form" id="chg-pw-form">
          <label>Current password <input name="old" type="password" required></label>
          <label>New password (min 8 chars) <input name="pw" type="password" minlength="8" required></label>
          <button class="btn btn-green" type="submit">Change Password</button>
        </form>
        <form class="form" id="chg-mpin-form" style="margin-top:14px">
          <label>Current MPIN (4 digits) <input name="oldmpin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>
          <label>New MPIN (4 digits) <input name="newmpin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>
          <button class="btn btn-green" type="submit">Change MPIN</button>
        </form>
      </div>
      <div class="card panel-card">
        <h3>Account</h3>
        <div class="card-actions" style="flex-direction:column;align-items:stretch">
          <a class="btn ghost" href="#/profile">Edit Profile &amp; Activity</a>
          <button class="btn ghost" id="settings-logout">Log out</button>
        </div>
        <p class="hint" style="margin-top:12px">Login info: phone + password. Reset MPIN by logging out and back in.</p>
      </div>
    </div>`;

  $("#chg-pw-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get("old") !== u.password) { alert("Current password is incorrect."); return; }
    API.call("reset_password", { mobile: u.phone, new_password: fd.get("pw") }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      logActivity(u, "Password changed");
      alert("Password updated.");
      renderSettings(page);
    });
  };
  $("#chg-mpin-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get("oldmpin") !== String(u.mpin || "0000")) { alert("Current MPIN is incorrect."); return; }
    u.mpin = String(fd.get("newmpin"));
    store.set("matka.users", users);
    logActivity(u, "MPIN changed");
    alert("MPIN updated.");
    renderSettings(page);
  };
  $("#settings-logout").onclick = () => { localStorage.removeItem("matka.user"); currentUser = null; buildNav(); location.hash = "#/login"; };
}

function renderLogin(page) {
  if (currentUser) {
    page.innerHTML = `
      <section class="page-head">
        <div class="panel-badge"><span class="dot"></span> User Panel</div>
        <h1>Welcome, ${currentUser.name}</h1>
        <p>You are logged in.</p>
      </section>
      <div class="card panel-card">
        <h3>Your Account</h3>
        <p><strong>Name:</strong> ${currentUser.name}</p>
        <p><strong>Phone:</strong> ${currentUser.phone || "—"}</p>
        <p><strong>Email:</strong> ${currentUser.email || "—"}</p>
        <p><strong>Joined:</strong> ${currentUser.joined || "—"}</p>
        <div class="card-actions">
          <a class="btn btn-green" href="#/profile">Go to Profile</a>
          <button class="btn ghost" id="logout">Log out</button>
          <button class="btn ghost" id="switch">Switch Account</button>
        </div>
      </div>`;
    $("#logout").onclick = () => { localStorage.removeItem("matka.user"); currentUser = null; buildNav(); location.hash = "#/login"; };
    $("#switch").onclick = () => { localStorage.removeItem("matka.user"); currentUser = null; buildNav(); renderLogin(page); };
    return;
  }
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> User Panel</div>
      <h1>Sign In</h1>
      <p>Access your panel and demo features.</p>
    </section>
    <div class="login-tabs">
      <button class="chip active" id="tab-pw">Password</button>
      <button class="chip" id="tab-otp">Phone OTP</button>
    </div>
    <form class="card panel-card form" id="login-form">
      <label>Mobile Number <input name="loginid" inputmode="numeric" placeholder="9876543210" required></label>
      <label>Password <input name="password" type="password" required></label>
      <button class="btn btn-green" type="submit">Sign In</button>
      <p class="form-hint">No account? <a href="#/register">Register here</a></p>
      <p class="form-hint">Demo users: demo1–demo5 · password 123456 · MPIN 0000</p>
    </form>
    <div class="card panel-card form" id="otp-form" style="display:none">
      <label>Registered phone <input id="otp-phone" type="tel" placeholder="+1 555 000 1234" required></label>
      <button class="btn btn-green" id="send-otp" type="button">Send OTP</button>
      <div class="otp-demo" id="otp-demo" style="display:none">
        <p>Demo mode — OTP shown here instead of SMS:</p>
        <b id="otp-code"></b>
        <span id="otp-timer" class="otp-timer"></span>
      </div>
      <label>Enter OTP <input id="otp-input" maxlength="6" inputmode="numeric" pattern="[0-9]{6}" disabled required></label>
      <button class="btn btn-green" id="verify-otp" type="button" disabled>Verify &amp; Sign In</button>
      <p class="form-hint">Resend enabled again after the code expires.</p>
    </div>`;

  const pwTab = $("#tab-pw"), otpTab = $("#tab-otp");
  const pwForm = $("#login-form"), otpForm = $("#otp-form");
  pwTab.onclick = () => { pwTab.classList.add("active"); otpTab.classList.remove("active"); pwForm.style.display = ""; otpForm.style.display = "none"; };
  otpTab.onclick = () => { otpTab.classList.add("active"); pwTab.classList.remove("active"); pwForm.style.display = "none"; otpForm.style.display = ""; };

  $("#login-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = fd.get("loginid").trim().toLowerCase();
    API.call("login", { mobile: id, password: fd.get("password") }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      const users = store.get("matka.users", []);
      const u = users.find((x) =>
        x.username.toLowerCase() === id ||
        (x.phone && x.phone.replace(/\D/g, "") === id.replace(/\D/g, "")) ||
        (x.email && x.email.toLowerCase() === id)
      );
      if (!u) { alert("Account data missing locally."); return; }
      completeLogin(u);
    });
  };

  let pendingOtp = null;
  let otpTimer = null;

  $("#send-otp").onclick = () => {
    const digits = $("#otp-phone").value.replace(/\D/g, "");
    if (digits.length < 10) { alert("Enter a valid phone number."); return; }
    API.call("request_otp", { mobile: digits }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      pendingOtp = { code: res.data.demo_otp, phone: digits, expires: Date.now() + 5 * 60 * 1000 };
      $("#otp-demo").style.display = "";
      $("#otp-code").textContent = pendingOtp.code;
      $("#otp-input").disabled = false;
      $("#verify-otp").disabled = false;
      $("#otp-input").focus();
      startOtpTimer();
    });
  };

  function startOtpTimer() {
    clearInterval(otpTimer);
    otpTimer = setInterval(() => {
      if (!pendingOtp) { clearInterval(otpTimer); return; }
      const left = Math.round((pendingOtp.expires - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(otpTimer);
        pendingOtp = null;
        $("#otp-timer").textContent = "OTP expired. Send a new one.";
        $("#otp-input").disabled = true;
        $("#verify-otp").disabled = true;
      } else {
        $("#otp-timer").textContent = "Expires in " + left + "s";
      }
    }, 1000);
  }

  $("#verify-otp").onclick = () => {
    if (!pendingOtp) { alert("Send an OTP first."); return; }
    if (Date.now() > pendingOtp.expires) { alert("OTP expired. Send a new one."); pendingOtp = null; return; }
    API.call("verify_otp", { mobile: pendingOtp.phone, otp: $("#otp-input").value.trim() }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      const users = store.get("matka.users", []);
      const u = users.find((x) => x.phone && x.phone.replace(/\D/g, "") === pendingOtp.phone);
      clearInterval(otpTimer);
      pendingOtp = null;
      if (u) completeLogin(u);
      else alert("Local account data missing.");
    });
  };
}

function completeLogin(u) {
  currentUser = { username: u.username, name: u.name, role: u.role, joined: u.joined, email: u.email || "", phone: u.phone || "" };
  store.set("matka.user", currentUser);
  logActivity(u, "Signed in");
  buildNav();
  location.hash = "#/profile";
}

function userBlocked() {
  if (!currentUser) return false;
  const phone = currentUser.phone || "";
  const users = store.get("matka.users", []);
  const u = phone
    ? users.find((x) => x.phone && x.phone.replace(/\D/g, "") === String(phone).replace(/\D/g, ""))
    : users.find((x) => x.username === currentUser.username);
  return !!(u && u.blocked);
}

function blockIfNeeded() {
  if (currentUser && userBlocked()) {
    if (localStorage.getItem("matka.blockedNotified") !== "1") {
      localStorage.setItem("matka.blockedNotified", "1");
      alert("Your account has been blocked by the administrator. Please contact support.");
    }
    localStorage.removeItem("matka.user");
    currentUser = null;
    buildNav();
  } else if (currentUser) {
    localStorage.removeItem("matka.blockedNotified");
  }
}

function logActivity(user, action) {
  const log = store.get("matka.activities", []);
  log.unshift({ phone: user.phone || user.username, action: action, date: new Date().toISOString() });
  store.set("matka.activities", log.slice(0, 100));
}

function getActivityFor(user) {
  const log = store.get("matka.activities", []);
  const key = user.phone || user.username;
  return log.filter((a) => a.phone === key);
}

function walletBalance(phone) {
  const tx = store.get("matka.wallet", []);
  return tx.filter((t) => t.phone === phone).reduce((sum, t) => sum + (t.amount || 0), 0);
}

function walletTx(phone, limit) {
  const tx = store.get("matka.wallet", []);
  return tx.filter((t) => t.phone === phone).slice(0, limit || 15);
}

function openStyleMenu(opts) {
  const panel = document.createElement("div");
  panel.className = "style-backdrop";
  panel.innerHTML = `
    <div class="style-panel">
      <div class="style-head">
        <b>Select Bid Style</b>
        <button type="button" class="style-close" aria-label="Close">×</button>
      </div>
      <div class="style-market" id="style-market"></div>
      <div class="style-grid" id="style-grid"></div>
    </div>`;
  document.body.appendChild(panel);
  panel.querySelector(".style-close").onclick = () => panel.remove();
  panel.addEventListener("click", (e) => { if (e.target === panel) panel.remove(); });

  let market = opts && opts.market ? opts.market : (MARKETS[0] || {}).id;
  const mBox = panel.querySelector("#style-market");
  if (opts && opts.market) {
    const m = MARKETS.find((x) => x.id === opts.market);
    const lock = document.createElement("div");
    lock.className = "style-market-locked";
    lock.innerHTML = `<span>Market:</span><b>${m ? m.name : ""}</b>`;
    mBox.appendChild(lock);
  } else {
    for (const m of MARKETS) {
      const c = document.createElement("button");
      c.type = "button";
      c.className = "chip" + (m.id === market ? " active" : "");
      c.textContent = m.name;
      c.onclick = () => {
        market = m.id;
        for (const x of mBox.querySelectorAll(".chip")) x.classList.toggle("active", x === c);
      };
      mBox.appendChild(c);
    }
  }

  const grid = panel.querySelector("#style-grid");
  const styles = opts && opts.game ? BID_STYLES.filter((s) => s.game === opts.game) : BID_STYLES;
  for (const s of styles) {
    const g = GAMES.find((x) => x.id === s.game);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "style-btn";
    b.innerHTML = `<b>${s.label}</b><small>${g.odds}</small>`;
    b.onclick = () => {
      panel.remove();
      location.hash = "#/bid/" + s.id + "/" + market;
    };
    grid.appendChild(b);
  }
}

function renderBidPage(page, styleId, marketId) {
  const style = BID_STYLES.find((s) => s.id === styleId) || BID_STYLES[0];
  if (!currentUser) {
    page.innerHTML = `
      <section class="page-head">
        <div class="panel-badge"><span class="dot"></span> User Panel</div>
        <h1>${style.label}</h1>
        <p>Sign in to play with your demo wallet — no real money involved.</p>
      </section>
      <div class="card panel-card" style="max-width:none">
        <h3>Sign in required</h3>
        <p class="hint">Create an account or sign in to start placing bids.</p>
        <div class="card-actions">
          <a class="btn btn-green" href="#/login">Sign In</a>
          <a class="btn ghost" href="#/register">Register</a>
        </div>
      </div>`;
    return;
  }
  const users = store.get("matka.users", []);
  const u = users.find((x) => x.phone === currentUser.phone && x.phone) || users.find((x) => x.username === currentUser.username);
  if (!u) {
    page.innerHTML = `<section class="page-head"><h1>${style.label}</h1><p>Account not found. Please sign in again.</p></section>`;
    return;
  }

  resolveBets();

  const g = GAMES.find((x) => x.id === style.game);
  let selMarket = marketId && MARKETS.find((m) => m.id === marketId) ? marketId : (MARKETS[0] || {}).id;
  const balance = walletBalance(u.phone);
  const myBets = store.get("matka.bets", []).filter((b) => b.phone === u.phone).slice().reverse();

  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> Place Bid</div>
      <h1>${style.label}</h1>
      <p><span class="chip" id="bid-market-name">${(MARKETS.find((m) => m.id === selMarket) || {}).name}</span> · Wallet: <span class="wallet-chip" id="bid-balance">₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
    </section>
    <div class="card panel-card">
      <h3>Enter ${style.game === "jodi" || style.game === "motor" || style.game === "jodi-close" ? "Jodi Digit" : style.game === "single" || style.game === "pana-family" ? "Digit" : style.game === "single-patti" || style.game === "double-patti" || style.game === "triple-patti" ? "Pana" : style.game === "half-sangam" || style.game === "half-sangam-b" ? "Jodi + Pana" : style.game === "full-sangam" ? "Open + Close Pana" : "Number"}</h3>
      ${style.id.includes("bulk") ? `<span class="s5-tag t-open" style="margin-bottom:10px">BULK PLAY</span>` : ""}
      <p class="hint" id="bid-odds">Odds: ${g.odds} · Success payout on bid value.</p>
      <div id="bid-fields"></div>
      <div id="bid-pad"></div>
      <div class="pad-display" id="pad-display" hidden></div>
    </div>
    <div class="card panel-card">
      <h3>Enter Point (Amount)</h3>
      <div class="amt-chips" id="bid-amts">
        <button type="button" class="amt-chip active" data-v="10">10</button>
        <button type="button" class="amt-chip" data-v="50">50</button>
        <button type="button" class="amt-chip" data-v="100">100</button>
        <button type="button" class="amt-chip" data-v="500">500</button>
        <button type="button" class="amt-chip" data-v="1000">1000</button>
      </div>
      <label class="form-label">Point ₹ <input id="bid-stake" class="bid-stake" type="number" min="1" step="1" value="10" inputmode="numeric"></label>
      <div class="wallet-beforeafter">
        <span>Wallet Balance Before Deduction: <b id="wb-before">₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></span>
        <span>Balance After Deduction: <b id="wb-after">₹ ${(balance - 10).toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></span>
      </div>
      <p class="hint" id="bid-win">Win = ${g.odds} × point</p>
    </div>
    <div class="card-actions">
      <button class="btn btn-green btn-big" id="bid-submit">Add</button>
    </div>
    <div class="card panel-card">
      <h3>My Bets</h3>
      <p class="hint">Bids resolve automatically once the market result is announced.</p>
      <div class="bet-list" id="bid-list"></div>
    </div>`;

  let padVal = [];
  let padMax = 2;

  function renderPad() {
    const pad = $("#bid-pad");
    if (!pad) return;
    const f = style.game;
    const grid = f === "jodi" || f === "motor" || f === "jodi-close";
    const fill = (n) => { padVal = String(n).split(""); showPadDisplay(); };
    padMax = grid ? 2 : (f === "single-patti" || f === "double-patti" || f === "triple-patti" ? 3 : 1);
    pad.innerHTML = "";
    const d = document.createElement("div");
    d.className = grid ? "digit-grid" : "digit-pad";
    d.innerHTML = Array.from({ length: grid ? 100 : 10 }, (_, i) =>
      `<button type="button" class="pad-d" data-n="${i}">${String(i).padStart(grid ? 2 : 1, "0")}</button>`).join("");
    pad.appendChild(d);
    for (const b of d.querySelectorAll(".pad-d")) {
      b.onclick = () => {
        if (grid) { fill(Number(b.dataset.n)); return; }
        if (padVal.length >= padMax) padVal = [];
        padVal.push(b.dataset.n);
        showPadDisplay();
      };
    }
  }

  function showPadDisplay() {
    const disp = $("#pad-display");
    const num = padVal.join("");
    if (!disp) return;
    if (num) {
      disp.hidden = false;
      disp.innerHTML = `<b>${num}</b><button type="button" class="pad-clear" id="pad-clear">✕</button>`;
      $("#pad-clear").onclick = () => { padVal = []; showPadDisplay(); };
    } else disp.hidden = true;
  }
  renderPad();

  function renderFields() {
    const f = style.game;
    if (f === "half-sangam" || f === "half-sangam-b") {
      $("#bid-fields").innerHTML = `
        <div class="form-row">
          <label>Jodi (00-99) <input id="bjodi" maxlength="2" inputmode="numeric" pattern="[0-9]{2}" placeholder="57" required></label>
          <label>Pana (000-999) <input id="bpatti" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
        </div>
        <p class="hint">${f === "half-sangam-b" ? "Win if Jodi matches AND the pana equals the close panel." : "Win if Jodi matches AND the pana equals the open panel."}</p>`;
      const padSel = $("#bid-pad");
      padSel.style.display = "none";
    } else if (f === "full-sangam") {
      $("#bid-fields").innerHTML = `
        <div class="form-row">
          <label>Open Pana (000-999) <input id="bp1" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
          <label>Close Pana (000-999) <input id="bp2" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="789" required></label>
        </div>
        <p class="hint">Win if both panels match exactly.</p>`;
      const padSel2 = $("#bid-pad");
      padSel2.style.display = "none";
    } else if (f === "family-pair") {
      $("#bid-fields").innerHTML = `<label>Family (1-11)
        <select id="bnum">
          ${FAMILY_PAIRS.map((fp, i) => `<option value="${i + 1}">Family ${i + 1}: ${fp[0]} & ${fp[1]}</option>`).join("")}
        </select></label>`;
      const padSel3 = $("#bid-pad");
      padSel3.style.display = "none";
    } else {
      $("#bid-fields").innerHTML = "";
      const padSel4 = $("#bid-pad");
      if (padSel4) padSel4.style.display = "";
      $("#pad-display").hidden = true;
    }
  }
  renderFields();

  const amts = $("#bid-amts");
  for (const c of amts.querySelectorAll(".amt-chip")) {
    c.onclick = () => {
      for (const x of amts.querySelectorAll(".amt-chip")) x.classList.remove("active");
      c.classList.add("active");
      $("#bid-stake").value = c.dataset.v;
      $("#bid-win").textContent = "Win = " + g.odds.replace("x", "") + " × " + c.dataset.v + " = ₹" + (parseFloat(g.odds) * parseFloat(c.dataset.v)).toFixed(2);
      const after = $("#wb-after");
      if (after) after.textContent = "₹ " + (balance - parseFloat(c.dataset.v)).toLocaleString(undefined, { minimumFractionDigits: 2 });
    };
  }
  $("#bid-stake").oninput = () => {
    for (const x of amts.querySelectorAll(".amt-chip")) x.classList.toggle("active", x.dataset.v === $("#bid-stake").value);
    const v = parseFloat($("#bid-stake").value) || 0;
    $("#bid-win").textContent = "Win = " + g.odds.replace("x", "") + " × " + v + " = ₹" + (parseFloat(g.odds) * v).toFixed(2);
    const after = $("#wb-after");
    if (after) after.textContent = "₹ " + (balance - v).toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  API.call("get_balance", { mobile: u.phone }).then((res) => {
    const el = $("#bid-balance");
    if (el && res.success) el.textContent = "₹ " + Number(res.data.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
  });

  $("#bid-submit").onclick = () => {
    const g2 = g;
    const m = MARKETS.find((x) => x.id === selMarket);
    const point = parseFloat($("#bid-stake").value);
    if (!point || point <= 0) { alert("Enter a valid point (amount)."); return; }
    const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
    const numbers = {};
    if (g2.id === "family-pair") numbers.family = val("bnum");
    else if (g2.id === "half-sangam" || g2.id === "half-sangam-b") { numbers.jodi = val("bjodi"); numbers.patti = val("bpatti"); }
    else if (g2.id === "full-sangam") { numbers.patti1 = val("bp1"); numbers.patti2 = val("bp2"); }
    else numbers.num = padVal.join("") || val("bnum");
    const numberStr = numbers.family ? "F" + numbers.family : numbers.jodi ? numbers.jodi + numbers.patti : numbers.patti1 ? numbers.patti1 + numbers.patti2 : numbers.num;
    if (!numberStr) { alert("Enter your digit."); return; }
    API.call("place_bid_atomicv1", { mobile: u.phone, market_id: m.id, game_type: g2.id, number: numberStr, amount: point, style: style.id }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      logActivity(u, "Placed " + style.label + " bid of " + point.toFixed(2) + " (API)");
      alert("Bid added (" + res.data.bet_id + "). It resolves when the market result is announced.");
      renderBidPage(page, style.id, selMarket);
    });
  };

  const bidList = $("#bid-list");
  bidList.innerHTML = myBets.length ? myBets.map((b) => {
    const numLabel = b.game === "half-sangam" || b.game === "half-sangam-b" ? b.numbers.jodi + " / " + b.numbers.patti : b.game === "full-sangam" ? b.numbers.patti1 + " / " + b.numbers.patti2 : b.game === "family-pair" ? "Family " + b.numbers.family : b.numbers.num;
    const styleLabel = (b.style && BID_STYLES.find((s) => s.id === b.style)) ? BID_STYLES.find((s) => s.id === b.style).label : b.gameName;
    const statusClass = b.status === "won" ? "req-confirmed" : b.status === "lost" ? "req-rejected" : "req-pending";
    return `<div class="bet-row">
      <div class="bet-main">
        <strong>${b.marketName} · ${styleLabel}</strong>
        <span>Number: ${numLabel} · Point: ${b.stake.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        ${b.status === "won" ? `<span class="wallet-plus">Won ${(b.stake * b.odds).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${b.odds}x)</span>` : ""}
      </div>
      <span class="req-status ${statusClass}">${b.status.toUpperCase()}</span>
    </div>`;
  }).join("") : `<p class="hint">No bids placed yet.</p>`;
}

function resolveBets() {
  const results = getResults();
  const bets = store.get("matka.bets", []);
  const tx = store.get("matka.wallet", []);
  let changed = false;
  for (const b of bets) {
    if (b.status !== "pending") continue;
    const r = getResult(b.marketId, todayKey());
    if (!r || !r.announced) continue;
    let won = false;
    if (b.game === "single") {
      won = String(b.numbers.num) === String(r.panel).slice(-1);
    } else if (b.game === "jodi") {
      won = String(b.numbers.num) === r.jodi + r.jodi2;
    } else if (b.game === "jodi-close") {
      won = String(b.numbers.num) === r.jodi2 + r.jodi;
    } else if (b.game === "motor") {
      won = String(b.numbers.num) === String(r.panel).slice(0, 2);
    } else if (b.game === "single-patti" || b.game === "double-patti" || b.game === "triple-patti") {
      won = String(b.numbers.num) === String(r.panel);
    } else if (b.game === "family-pair") {
      const fam = FAMILY_PAIRS[Number(b.numbers.family) - 1] || [];
      const j = r.jodi + r.jodi2;
      const jr = r.jodi2 + r.jodi;
      won = fam.includes(j) || fam.includes(jr);
    } else if (b.game === "half-sangam") {
      won = String(b.numbers.jodi) === r.jodi + r.jodi2 && String(b.numbers.patti) === String(r.panel);
    } else if (b.game === "half-sangam-b") {
      won = String(b.numbers.jodi) === r.jodi + r.jodi2 && String(b.numbers.patti) === String(r.panel2);
    } else if (b.game === "pana-family") {
      won = String(r.panel).includes(String(b.numbers.num));
    } else if (b.game === "full-sangam") {
      won = String(b.numbers.patti1) === String(r.panel) && String(b.numbers.patti2) === String(r.panel2);
    }
    b.status = won ? "won" : "lost";
    changed = true;
    if (won) {
      const payout = b.stake * b.odds;
      tx.push({
        phone: b.phone,
        userName: b.userName,
        amount: payout,
        note: "Winnings: " + b.gameName + " · " + b.marketName,
        by: "System (auto)",
        date: new Date().toISOString()
      });
    }
  }
  if (changed) {
    store.set("matka.bets", bets);
    store.set("matka.wallet", tx);
  }
}

function renderRegister(page) {
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> User Panel</div>
      <h1>Register</h1>
      <p>Create a free account (demo only).</p>
    </section>
    <form class="card panel-card form" id="reg-form">
      <label>Full name <input name="name" required></label>
      <label>Phone number (required) <input name="phone" type="tel" pattern="[0-9+ -]{10,16}" placeholder="9876543210" required></label>
      <label>Create Password (minimum 8 characters) <input name="password" type="password" required minlength="8"></label>
      <label>MPIN (4 digits, used for quick login) <input name="mpin" type="password" inputmode="numeric" pattern="[0-9]{4}" placeholder="0000" required maxlength="4"></label>
      <label>Email <input name="email" type="email" required></label>
      <button class="btn btn-green" type="submit">Create Account</button>
      <p class="form-hint">Already registered? <a href="#/login">Sign in</a></p>
    </form>`;
  $("#reg-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const phoneDigits = String(fd.get("phone")).replace(/\D/g, "");
    if (phoneDigits.length < 10) { alert("A valid phone number (at least 10 digits) is required to create an account."); return; }
    API.call("signupv1", { name: fd.get("name"), mobile: phoneDigits, email: fd.get("email"), password: fd.get("password"), mpin: fd.get("mpin") }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      const users = store.get("matka.users", []);
      const u = users.find((x) => String((x && x.phone) || "").replace(/\D/g, "") === phoneDigits);
      if (!u) { alert("Account creation failed. Please try again."); return; }
      u.mpin = String(fd.get("mpin") || "0000");
      store.set("matka.users", users);
      currentUser = { username: u.username, name: u.name, role: u.role, joined: u.joined, email: u.email, phone: u.phone };
      store.set("matka.user", currentUser);
      logActivity(u, "Account registered (API)");
      buildNav();
      location.hash = "#/";
    });
  };
}

function renderProfile(page) {
  if (!currentUser) {
    page.innerHTML = `<section class="page-head"><h1>Profile</h1><p>Please <a href="#/login">sign in</a> first.</p></section>`;
    return;
  }
  const users = store.get("matka.users", []);
  const u = users.find((x) => x.phone === currentUser.phone && x.phone) || users.find((x) => x.username === currentUser.username);
  if (!u) { page.innerHTML = `<section class="page-head"><h1>Profile</h1><p>Account not found.</p></section>`; return; }

  resolveBets();
  const activity = getActivityFor(u);
  const initial = (u.name || "U").trim().charAt(0).toUpperCase();
  const balance = walletBalance(u.phone);
  const wallet = walletTx(u.phone);
  const demoQr = store.get("matka.qr", null);
  const myRequests = store.get("matka.requests", []).filter((r) => r.phone === u.phone).slice().reverse();
  const myPays = store.get("matka.payments", []).filter((p) => p.phone === u.phone);
  const myBets = store.get("matka.bets", []).filter((b) => b.phone === u.phone).slice().reverse();
  const phoneDisp = u.phone || "—";

  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> User Panel</div>
      <h1>My Profile</h1>
      <p>Member since ${u.joined || "—"}</p>
    </section>
    <div class="card panel-card member-head">
      <div class="avatar">${initial}</div>
      <div class="member-meta">
        <h3>${u.name}</h3>
        <p class="member-phone">${phoneDisp}</p>
        <p class="profile-sub">${u.email || ""}</p>
      </div>
      <div class="member-side">
        <span class="member-flag"><span class="dot"></span> Member</span>
        <div class="member-balance">₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      </div>
    </div>
    <div class="panel-tabs">
      <button class="chip active" data-tab="profile">Profile</button>
      <button class="chip" data-tab="wallet">Wallet</button>
      <button class="chip" data-tab="withdraw">Withdraw</button>
      <button class="chip" data-tab="bets">My Bets</button>
      <button class="chip" data-tab="pay">Payments</button>
    </div>
    <div id="panel-body"></div>`;

  const body = $("#panel-body");

  function showTab(name) {
    for (const c of page.querySelectorAll(".panel-tabs .chip")) c.classList.toggle("active", c.dataset.tab === name);
    if (name === "profile") renderProfileTab();
    else if (name === "wallet") renderWalletTab();
    else if (name === "withdraw") renderWithdrawTab();
    else if (name === "bets") renderBetsTab();
    else renderPayTab();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  for (const c of page.querySelectorAll(".panel-tabs .chip")) c.onclick = () => showTab(c.dataset.tab);

  function renderProfileTab() {
    body.innerHTML = `
      <div class="profile-grid">
        <div class="card panel-card">
          <h3>Personal Information</h3>
          <p><strong>Name:</strong> ${u.name || "—"}</p>
          <p><strong>Phone:</strong> ${u.phone || "—"}</p>
          <p><strong>Email:</strong> ${u.email || "—"}</p>
          <p><strong>Date of birth:</strong> ${u.dob || "—"}</p>
          <p><strong>Address:</strong> ${u.address || "—"}</p>
          <p><strong>City:</strong> ${u.city || "—"}</p>
        </div>
        <div class="card panel-card">
          <h3>Edit Profile</h3>
          <form class="form" id="edit-form">
            <label>Full name <input name="name" value="${u.name || ""}" required></label>
            <label>Date of birth <input name="dob" type="date" value="${u.dob || ""}"></label>
            <label>Address <input name="address" value="${u.address || ""}"></label>
            <label>City <input name="city" value="${u.city || ""}"></label>
            <button class="btn btn-green" type="submit">Save Changes</button>
          </form>
          <div class="card-actions">
            <button class="btn ghost" id="logout-btn">Log out</button>
          </div>
        </div>
        <div class="card panel-card">
          <h3>Activity History</h3>
          ${activity.length ? `<div class="activity-list">${activity.slice(0, 15).map((a) => `
            <div class="activity-row">
              <span>${a.action}</span>
              <small>${new Date(a.date).toLocaleString()}</small>
            </div>`).join("")}</div>` : `<p class="hint">No activity recorded yet.</p>`}
        </div>
      </div>`;

    $("#edit-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      u.name = fd.get("name").trim();
      u.dob = fd.get("dob");
      u.address = fd.get("address").trim();
      u.city = fd.get("city").trim();
      store.set("matka.users", users);
      currentUser.name = u.name;
      store.set("matka.user", currentUser);
      logActivity(u, "Profile updated");
      alert("Profile saved.");
      renderProfile(page);
    };
    $("#logout-btn").onclick = () => { localStorage.removeItem("matka.user"); currentUser = null; buildNav(); location.hash = "#/login"; };
  }

  function renderWalletTab() {
    body.innerHTML = `
      <div class="profile-grid">
        <div class="card panel-card">
          <h3>Wallet</h3>
          <div class="wallet-balance">₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <p class="hint">Demo currency — no real value, no real payment. Balance credits only after the administrator confirms.</p>
          <button class="btn btn-green" id="add-money-btn">Add Money (Demo)</button>
          <div class="add-money" id="add-money-box" style="display:none">
            <form class="form" id="add-money-form">
              <label>Amount
                <input name="amount" type="number" min="1" step="1" placeholder="100" required>
              </label>
              <label class="form-label">Payment method
                <div class="seg-row">
                  <button type="button" class="seg active" id="am-upi">UPI</button>
                  <button type="button" class="seg" id="am-qr">QR Code</button>
                </div>
              </label>
              <div id="am-upi-fields">
                <div class="qr-demo-box">
                  <p>Pay to this UPI ID, then enter the reference below:</p>
                  <p class="upi-id">${(demoQr && demoQr.upi) || DEMO_UPI}</p>
                </div>
                <label>UTR / Transaction reference number
                  <input name="ref" maxlength="30" placeholder="e.g. 4123876541" required>
                </label>
              </div>
              <div id="am-qr-fields" style="display:none">
                ${demoQr ? `
                  <div class="qr-demo-box">
                    <p>Pay to this QR, then enter the reference below:</p>
                    <img class="qr-img" src="${demoQr.data}" alt="Payment QR">
                  </div>` : `<p class="hint">Payment QR not set by the administrator.</p>`}
                <label>UTR / Transaction reference number
                  <input name="qrRef" maxlength="30" placeholder="e.g. 4123876541" required>
                </label>
              </div>
              <button class="btn btn-green" type="submit">Submit Payment Proof</button>
              <button class="btn ghost" type="button" id="add-money-cancel">Cancel</button>
              <p class="form-hint">Balance is credited only after the administrator confirms your payment.</p>
            </form>
          </div>
        </div>
        <div class="card panel-card">
          <h3>Top-Up Requests</h3>
          ${myRequests.length ? `<div class="activity-list">${myRequests.map((r) => `
            <div class="activity-row">
              <span>${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${r.method} · Ref: ${r.ref}</span>
              <small class="req-status req-${r.status}">${r.status.toUpperCase()}</small>
            </div>`).join("")}</div>` : `<p class="hint">No top-up requests yet.</p>`}
        </div>
        <div class="card panel-card">
          <h3>Wallet Activity</h3>
          ${wallet.length ? `<div class="activity-list">${wallet.map((t) => `
            <div class="activity-row">
              <span class="${t.amount >= 0 ? "wallet-plus" : "wallet-minus"}">${t.amount >= 0 ? "+" : "−"}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${t.note ? "· " + t.note : ""}</span>
              <small>${new Date(t.date).toLocaleString()}</small>
            </div>`).join("")}</div>` : `<p class="hint">No wallet activity yet.</p>`}
        </div>
      </div>`;

    $("#add-money-btn").onclick = () => { $("#add-money-box").style.display = ""; };
    $("#add-money-cancel").onclick = () => { $("#add-money-box").style.display = "none"; };

    const amMethod = { upi: true };
    const showAmMethod = (upi) => {
      amMethod.upi = upi;
      $("#am-upi").classList.toggle("active", upi);
      $("#am-qr").classList.toggle("active", !upi);
      $("#am-upi-fields").style.display = upi ? "" : "none";
      $("#am-qr-fields").style.display = upi ? "none" : "";
    };
    $("#am-upi").onclick = () => showAmMethod(true);
    $("#am-qr").onclick = () => showAmMethod(false);

    $("#add-money-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = parseFloat(fd.get("amount"));
      if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
      const ref = String(fd.get(amMethod.upi ? "ref" : "qrRef") || "").trim();
      if (ref.length < 4) { alert("Enter the UTR / transaction reference number."); return; }
      API.call("submit_offlinepayment_request", { mobile: u.phone, amount: amount, method: amMethod.upi ? "upi" : "qr", ref: ref }).then((res) => {
        if (!res.success) { alert(res.message); return; }
        logActivity(u, "Top-up request of " + amount.toFixed(2) + " submitted via " + (amMethod.upi ? "UPI" : "QR") + " (pending confirmation)");
        alert("Payment proof submitted. Your balance will be credited after the administrator confirms the payment.");
        renderProfile(page);
      });
    };
  }

  function renderWithdrawTab() {
    body.innerHTML = `
      <div class="profile-grid">
        <div class="card panel-card">
          <h3>Withdraw (Demo)</h3>
          <p class="hint">Request a payout via UPI or bank transfer — the administrator approves it. Minimum withdrawal: ₹ 100.</p>
          <form class="form" id="wd-form">
            <label>Amount <input name="amount" type="number" min="100" step="1" placeholder="100" required></label>
            <label class="form-label">Payout method
              <div class="seg-row">
                <button type="button" class="seg active" id="m-upi">UPI</button>
                <button type="button" class="seg" id="m-bank">Bank Transfer</button>
              </div>
            </label>
            <div id="upi-fields">
              <label>UPI ID <input name="upi" placeholder="yourname@upi" required></label>
            </div>
            <div id="bank-fields" style="display:none">
              <label>Bank Name <input name="bankName" placeholder="e.g. HDFC Bank"></label>
              <label>Account Holder Name <input name="accName" placeholder="Name on account"></label>
              <label>Account Number <input name="accNo" type="text" inputmode="numeric" placeholder="1234567890"></label>
              <label>IFSC Code <input name="ifsc" placeholder="HDFC0000123"></label>
            </div>
            <button class="btn btn-green" type="submit">Request Withdrawal</button>
          </form>
        </div>
        <div class="card panel-card">
          <h3>Withdrawal Requests</h3>
          <p class="hint">Track the status of your requests here.</p>
          <div class="activity-list" id="wd-list"></div>
        </div>
      </div>`;

    const wdMethod = { upi: true };
    const showMethod = (upi) => {
      wdMethod.upi = upi;
      $("#m-upi").classList.toggle("active", upi);
      $("#m-bank").classList.toggle("active", !upi);
      $("#upi-fields").style.display = upi ? "" : "none";
      $("#bank-fields").style.display = upi ? "none" : "";
      const f = $("#upi-fields").querySelector("input"), b = $("#bank-fields").querySelector("input");
      if (f) f.required = upi;
      if (b) b.required = !upi;
    };
    $("#m-upi").onclick = () => showMethod(true);
    $("#m-bank").onclick = () => showMethod(false);

    const wdList = $("#wd-list");
    const myWds = store.get("matka.withdrawals", []).filter((w) => w.phone === u.phone).slice().reverse();
    wdList.innerHTML = myWds.length ? myWds.map((w) => `
      <div class="activity-row">
        <span>${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${w.method === "bank" ? (w.bankName || "Bank") + " ·••• " + String(w.accNo || "").slice(-4) : w.upi || "UPI"}</span>
        <small class="req-status req-${w.status}">${w.status.toUpperCase()}</small>
      </div>`).join("") : `<p class="hint">No withdrawal requests yet.</p>`;

    $("#wd-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = parseFloat(fd.get("amount"));
      if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
      if (amount < 100) { alert("Minimum withdrawal is ₹ 100."); return; }
      if (wdMethod.upi) {
        const upi = String(fd.get("upi") || "").trim();
        if (!upi) { alert("Enter your UPI ID."); return; }
        API.call("submit_withdrawalv1", { mobile: u.phone, amount: amount, method: "upi", upi_id: upi }).then((res) => {
          if (!res.success) { alert(res.message); return; }
          logActivity(u, "Withdrawal request of " + amount.toFixed(2) + " submitted via UPI (pending approval)");
          alert("Withdrawal request submitted. The administrator will approve it.");
          renderProfile(page);
        });
      } else {
        const bankName = String(fd.get("bankName") || "").trim();
        const accName = String(fd.get("accName") || "").trim();
        const accNo = String(fd.get("accNo") || "").replace(/\s/g, "");
        const ifsc = String(fd.get("ifsc") || "").trim().toUpperCase();
        if (!bankName || !accName || !accNo || !ifsc) { alert("Fill in all bank details."); return; }
        API.call("submit_withdrawalv1", { mobile: u.phone, amount: amount, method: "bank", bank_name: bankName, acc_name: accName, acc_no: accNo, ifsc: ifsc }).then((res) => {
          if (!res.success) { alert(res.message); return; }
          logActivity(u, "Withdrawal request of " + amount.toFixed(2) + " submitted via bank transfer (pending approval)");
          alert("Withdrawal request submitted. The administrator will approve it.");
          renderProfile(page);
        });
      }
    };
  }

  function renderBetsTab() {
    body.innerHTML = `
      <div class="card panel-card">
        <h3>My Bets</h3>
        <p class="hint">Bets resolve automatically once the market result is announced.</p>
        <div class="bet-list">${myBets.length ? myBets.map((b) => {
          const numLabel = b.game === "half-sangam" ? b.numbers.jodi + " / " + b.numbers.patti : b.game === "full-sangam" ? b.numbers.patti1 + " / " + b.numbers.patti2 : b.game === "family-pair" ? "Family " + b.numbers.family : b.numbers.num;
          const statusClass = b.status === "won" ? "req-confirmed" : b.status === "lost" ? "req-rejected" : "req-pending";
          return `<div class="bet-row">
            <div class="bet-main">
              <strong>${b.marketName} · ${b.gameName}</strong>
              <span>Number: ${numLabel} · Stake: ${b.stake.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              ${b.status === "won" ? `<span class="wallet-plus">Won ${(b.stake * b.odds).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${b.odds}x)</span>` : ""}
            </div>
            <span class="req-status ${statusClass}">${b.status.toUpperCase()}</span>
          </div>`;
        }).join("") : `<p class="hint">No bets placed yet. Place one in the <a href="#/">home page bet section</a>.</p>`}</div>
      </div>`;
  }

  function renderPayTab() {
    body.innerHTML = `
      <div class="profile-grid">
        <div class="card panel-card">
          <h3>Payment Methods (Demo)</h3>
          <p class="hint">Simulation only — do not enter real payment details.</p>
          <form class="form" id="pay-form">
            <label>Type
              <select id="pay-type">
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Net Banking</option>
              </select>
            </label>
            <div id="pay-fields"></div>
            <button class="btn btn-green" type="submit">Save Demo Method</button>
          </form>
          <div class="pay-list" id="pay-list"></div>
        </div>
      </div>`;

    function renderPayFields() {
      const type = $("#pay-type").value;
      $("#pay-fields").innerHTML = type === "upi" ? `
        <label>UPI ID <input name="upiId" placeholder="yourname@upi" required></label>` : type === "card" ? `
        <label>Name on card <input name="cardName" placeholder="JOHN DOE" required></label>
        <label>Card number <input name="cardNumber" inputmode="numeric" maxlength="19" placeholder="4111 1111 1111 1111" required></label>
        <label>Expiry (MM/YY) <input name="cardExpiry" maxlength="5" placeholder="08/29" required></label>
        <label>CVV <input name="cardCvv" type="password" inputmode="numeric" maxlength="3" placeholder="123" required></label>` : `
        <label>Bank name <input name="bankName" placeholder="Demo Bank" required></label>
        <label>Account number <input name="accNumber" inputmode="numeric" maxlength="20" placeholder="000123456789" required></label>
        <label>IFSC code <input name="ifsc" maxlength="11" placeholder="DEMO0001234" required></label>`;
    }

    renderPayFields();
    $("#pay-type").onchange = renderPayFields;
    $("#pay-form").onsubmit = (e) => {
      e.preventDefault();
      const type = $("#pay-type").value;
      const fd = new FormData(e.target);
      const pay = store.get("matka.payments", []);
      let saved = null;
      if (type === "upi") {
        const upiId = String(fd.get("upiId") || "").trim();
        if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) { alert("Enter a valid UPI ID (e.g. name@bank)."); return; }
        saved = { phone: u.phone, userName: u.name, type: "upi", upiId: upiId, date: new Date().toISOString() };
      } else if (type === "card") {
        const num = String(fd.get("cardNumber") || "").replace(/\D/g, "");
        const cvv = String(fd.get("cardCvv") || "");
        if (num.length < 13 || num.length > 19) { alert("Enter a valid demo card number (13–19 digits)."); return; }
        if (cvv.length !== 3) { alert("Enter a 3-digit CVV."); return; }
        saved = { phone: u.phone, userName: u.name, type: "card", cardName: String(fd.get("cardName") || "").trim(), cardLast4: num.slice(-4), cardExpiry: String(fd.get("cardExpiry") || "").trim(), cardCvv: cvv, date: new Date().toISOString() };
      } else {
        const acc = String(fd.get("accNumber") || "").replace(/\D/g, "");
        if (acc.length < 6) { alert("Enter a valid demo account number (6+ digits)."); return; }
        saved = { phone: u.phone, userName: u.name, type: "netbanking", bankName: String(fd.get("bankName") || "").trim(), accLast4: acc.slice(-4), ifsc: String(fd.get("ifsc") || "").trim().toUpperCase(), date: new Date().toISOString() };
      }
      pay.push(saved);
      store.set("matka.payments", pay);
      logActivity(u, "Saved demo " + type + " method");
      alert("Demo " + type + " method saved (simulation only).");
      renderProfile(page);
    };

    const payList = $("#pay-list");
    payList.innerHTML = myPays.length ? myPays.map((p, i) => {
      const detail = p.type === "upi" ? p.upiId : p.type === "card" ? `•••• ${p.cardLast4} · ${p.cardName}` : `${p.bankName} · •••• ${p.accLast4} · ${p.ifsc}`;
      return `<div class="activity-row">
        <span class="pay-type">${p.type.toUpperCase()}</span>
        <span>${detail}</span>
        <button class="mini-del" data-i="${i}">Remove</button>
      </div>`;
    }).join("") : `<p class="hint">No demo payment methods saved yet.</p>`;
    for (const btn of payList.querySelectorAll(".mini-del")) {
      btn.onclick = () => {
        const all = store.get("matka.payments", []);
        const mine = all.filter((p) => p.phone === u.phone);
        const target = mine[Number(btn.dataset.i)];
        all.splice(all.indexOf(target), 1);
        store.set("matka.payments", all);
        renderProfile(page);
      };
    }
  }

  showTab("profile");
}

function renderAbout(page) {
  page.innerHTML = `
    <section class="page-head"><h1>About MatkaLive</h1></section>
    <div class="content">
      <p><strong>MatkaLive</strong> is a results & information platform that keeps track of results across 30+ markets, including daily schedules, open/close panels, Jodi pairs, and 14-day chart history.</p>
      <p>This is a demonstration build created for showcasing product design and functionality. It does not offer, process, or facilitate any betting, wagering, or real-money transactions. All results shown are sample data unless manually updated by the administrator.</p>
      <p>For any questions, reach us on <a href="https://wa.me/918290594203" target="_blank" rel="noopener">WhatsApp</a>.</p>
    </div>`;
}

function renderFaq(page) {
  page.innerHTML = `
    <section class="page-head"><h1>FAQ</h1></section>
    <div class="content">
      <details open><summary>What is a panel?</summary><p>A panel is a three-digit number (e.g. 456). The Jodi is derived by adding its digits — 4+5+6 = 15, so the Jodi digit is 5.</p></details>
      <details><summary>What is a Jodi?</summary><p>A Jodi is a two-digit pair (00–99) formed from the open and close panels of a market.</p></details>
      <details><summary>When are results announced?</summary><p>Each market has its own schedule shown on the home page. Results appear once announced by the administrator.</p></details>
      <details><summary>Is real money involved?</summary><p>No. This site is for information and demonstration only. No betting, deposits, or payouts are offered.</p></details>
      <details><summary>How do I update results?</summary><p>Sign in with an admin account and use the Admin Panel — single or bulk entry.</p></details>
      <details><summary>Where does the data come from?</summary><p>Data is stored locally in your browser. In a live deployment, it would come from your own licensed data source.</p></details>
    </div>`;
}

function renderContact(page) {
  page.innerHTML = `
    <section class="page-head"><h1>Contact</h1><p>Get support directly on WhatsApp.</p></section>
    <div class="wa-center">
      <p class="wa-num">+91 82905 94203</p>
      <a class="wa-btn" href="https://wa.me/918290594203" target="_blank" rel="noopener">Chat on WhatsApp</a>
    </div>`;
}

function renderPrivacy(page) {
  page.innerHTML = `
    <section class="page-head"><h1>Privacy & Terms</h1></section>
    <div class="content">
      <h3>Privacy</h3>
      <p>This demo stores data locally in your browser (localStorage). Nothing is transmitted to any server. In a production deployment, a separate privacy policy covering your data handling would apply.</p>
      <h3>Terms</h3>
      <p>This site is provided for information and demonstration purposes only. It does not offer, facilitate, or process gambling, betting, or real-money transactions. Users must be 18 years or older. We are not liable for any decisions made based on the information displayed.</p>
    </div>`;
}

function openDrawer() {
  const drawer = $("#side-drawer");
  const overlay = $("#drawer-overlay");
  if (!drawer) return;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  if (overlay) { overlay.hidden = false; }
  document.body.classList.add("drawer-lock");
}
function closeDrawer() {
  const drawer = $("#side-drawer");
  const overlay = $("#drawer-overlay");
  if (!drawer) return;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  if (overlay) { overlay.hidden = true; }
  document.body.classList.remove("drawer-lock");
}

function setupDrawer() {
  const menuBtn = $("#menu-btn");
  const drawerClose = $("#drawer-close");
  const overlay = $("#drawer-overlay");
  const logoutBtn = $("#drawer-logout");
  const identity = $("#side-drawer") ? $("#side-drawer").querySelector(".drawer-identity") : null;
  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (overlay) overlay.addEventListener("click", closeDrawer);
  if (identity) identity.addEventListener("click", () => { closeDrawer(); location.hash = currentUser ? "#/account" : "#/login"; });
  const shareLink = document.querySelector('.drawer-nav a[href="#share"]');
  if (shareLink) shareLink.addEventListener("click", (e) => { e.preventDefault(); closeDrawer(); shareApp(); });
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("matka.user");
    currentUser = null;
    buildNav();
    closeDrawer();
    location.hash = "#/login";
  });
  for (const a of document.querySelectorAll(".drawer-nav a")) {
    a.addEventListener("click", () => { closeDrawer(); });
  }
}

function shareApp() {
  const url = location.origin + location.pathname;
  const text = "MatkaLive — live matka results, charts & games (demo). Play responsibly. 18+.";
  if (navigator.share) {
    navigator.share({ title: "MatkaLive", text: text, url: url })
      .catch(() => { navigator.clipboard && navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard.")).catch(() => {}); });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert("Link copied: " + url)).catch(() => alert(url));
  } else {
    alert(url);
  }
}

function renderNotifications(page) {
  const list = currentUser ? getActivityFor(currentUser) : [];
  const items = list.length
    ? list.map((a) => `
        <div class="card panel-card" style="margin-bottom:8px">
          <div class="notif-txt">${a.action}</div>
          <div class="hint" style="font-size:0.72rem;color:var(--gold)">${new Date(a.date).toLocaleString()}</div>
        </div>`).join("")
    : `<div class="card panel-card"><div class="hint">No notifications yet. Sign in and place bids to see activity here.</div></div>`;
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> Alerts</div>
      <h1>Notification</h1>
      <p>Latest account activity and updates.</p>
    </section>
    ${items}`;
}

function renderTimetable(page) {
  const rows = MARKETS.map((m) => `
    <tr>
      <td>${m.name}</td>
      <td>${m.open}</td>
      <td>${m.result}</td>
    </tr>`).join("");
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> Time Table</div>
      <h1>Market Time Table</h1>
      <p>Opening and result times for all markets (24h).</p>
    </section>
    <div class="hist-card rates-wrap">
      <table class="result-table">
        <thead><tr><th>Market</th><th>Open</th><th>Result</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderNotice(page) {
  const notices = store.get("matka.notices", []);
  const items = notices && notices.length
    ? notices.slice().reverse().map((n) => `
        <div class="card panel-card" style="margin-bottom:10px">
          <h3 style="margin:0 0 4px">${n.title || "Notice"}</h3>
          <p class="hint" style="margin:0 0 6px">${n.body || ""}</p>
          <div class="hint" style="font-size:0.72rem;color:var(--gold)">${n.date || ""}</div>
        </div>`).join("")
    : `<div class="card panel-card"><div class="hint">No notices posted.</div></div>`;
  page.innerHTML = `
    <section class="page-head">
      <div class="panel-badge"><span class="dot"></span> Notice Board</div>
      <h1>Notice Board</h1>
      <p>Official announcements and updates.</p>
    </section>
    ${items}`;
}

window.addEventListener("hashchange", () => { buildNav(); router(); });
window.addEventListener("sync-updated", () => {
  if (currentUser && userBlocked()) { blockIfNeeded(); router(); return; }
  const h = location.hash || "#/";
  if (h === "#/" || h.startsWith("#/home") || h.startsWith("#/market") || h.startsWith("#/charts") || h.startsWith("#/history") || h.startsWith("#/games") || h.startsWith("#/results")) router();
});
(function syncFoot() {
  const el = document.getElementById("foot-sync-url");
  if (el) {
    const base = Sync.mode() === "local" ? (localStorage.getItem("matka.server") || "http://localhost:8777") : "github-gist";
    const err = Sync.lastErr;
    el.textContent = base + (err ? " · ERROR: " + err.slice(0, 40) : (Sync.lastPush ? " · synced " + new Date(Sync.lastPush).toLocaleTimeString() : " · connecting…"));
  }
  setTimeout(syncFoot, 5000);
})();
window.__syncReady.then(() => {
  fetch("live_results.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no live file"))))
    .then((d) => {
      if (d && typeof d === "object" && Object.keys(d).length) {
        liveFileOverlay = d;
        buildNav();
        router();
      }
    })
    .catch(() => {});
  refreshLiveResults();
});

function refreshLiveResults() {
  const srcs = [];
  const finish = (d) => {
    if (d && typeof d === "object" && Object.keys(d).length) {
      const key = JSON.stringify(d);
      if (key !== JSON.stringify(liveFileOverlay)) {
        liveFileOverlay = d;
        buildNav();
        router();
      }
    }
  };
  Promise.resolve()
    .then(async () => {
      const base = Sync.serverBase && Sync.serverBase();
      if (!base && Sync.discover) return Sync.discover();
      return base;
    })
    .then((base) => {
      if (base) srcs.push(base + "/live_results.json?t=" + Date.now());
      srcs.push("live_results.json?t=" + Date.now());
      const tryNext = (i) => {
        if (i >= srcs.length) return;
        fetch(srcs[i], { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no live file"))))
          .then(finish)
          .catch(() => tryNext(i + 1));
      };
      tryNext(srcs.length > 1 && base ? 1 : 0);
    });
}
setInterval(refreshLiveResults, 60000);
window.addEventListener("load", () => {
  setupDrawer();
  buildNav();
  if (window.__syncReady instanceof Promise) {
    window.__syncReady.then(() => { buildNav(); router(); });
  } else {
    router();
  }
});
