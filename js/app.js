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

function getResults() {
  return store.get("matka.results", {});
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

function router() {
  const page = $("#page");
  if (!page) return;
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/");
  const route = parts[0] || "";
  updateBottomNav(route);
  if (route === "games") renderGames(page);
  else if (route === "history") renderHistory(page, parts[1]);
  else if (route === "charts") renderCharts(page);
  else if (route === "login") renderLogin(page);
  else if (route === "register") renderRegister(page);
  else if (route === "profile") renderProfile(page);
  else if (route === "bid") renderBidPage(page, parts[1] || "single", parts[2]);
  else if (route === "play") renderBidPage(page, parts[1] || "single", parts[2]);
  else if (route === "market") renderMarketDetail(page, parts[1]);
  else if (route === "about") renderAbout(page);
  else if (route === "faq") renderFaq(page);
  else if (route === "contact") renderContact(page);
  else if (route === "privacy") renderPrivacy(page);
  else renderHome(page);
}

function updateBottomNav(route) {
  const bn = document.getElementById("bottom-nav");
  if (!bn) return;
  for (const a of bn.querySelectorAll("a")) {
    const key = a.dataset.active;
    a.classList.toggle("active", route === key || (key === "play" && (route === "bid" || route === "play")) || (key === "funds" && route === "profile"));
  }
}

function buildNav() {
  const nav = $("#nav");
  if (!nav) return;
  const items = [
    ["Home", "#/"],
    ["Play", "#/bid/single"],
    ["Games", "#/games"],
    ["History", "#/history"],
    ["Charts", "#/charts"],
    ["About", "#/about"],
    ["FAQ", "#/faq"],
    ["Contact", "#/contact"]
  ];
  nav.innerHTML = "";
  for (const [label, href] of items) {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = label;
    nav.appendChild(a);
  }
  const chip = document.createElement("a");
  chip.className = "user-chip";
  chip.href = currentUser ? "#/profile" : "#/login";
  if (currentUser) {
    const av = document.createElement("span");
    av.className = "chip-avatar";
    av.textContent = (currentUser.name || "U").trim().charAt(0).toUpperCase();
    chip.appendChild(av);
    chip.appendChild(document.createTextNode(currentUser.role === "admin" ? "ADMIN: " + currentUser.name : "USER: " + currentUser.name));
  } else {
    chip.textContent = "Sign In";
  }
  nav.appendChild(chip);
}

function renderHome(page, opts) {
  seedDemoResults();
  const today = getTodayResults();
  const announced = today.filter((t) => t.result && t.result.announced).length;

  page.innerHTML = `
    <section class="hero">
      <div class="hero-badge"><span class="dot"></span> Trusted Demo Portal</div>
      <h1>Live Matka Results &amp; Games</h1>
      <p>Daily updates for all major markets — ${todayKey()}</p>
      <div class="hero-stats">
        <span data-label="Markets">${MARKETS.length}+</span>
        <span data-label="Announced Today">${announced}</span>
        <span data-label="Games">${GAMES.length}</span>
        <span data-label="Round The Clock">24/7</span>
      </div>
    </section>
    <div class="ticker-wrap"><div class="ticker-inner" id="ticker"></div></div>
    <div class="live-board">
      <div class="board-header">
        <h2>Today's Results</h2>
        <span class="live-badge"><span class="dot"></span> LIVE</span>
      </div>
      <div class="board-grid" id="board"></div>
    </div>
    <div class="live-board games-play">
      <div class="board-header">
        <h2>Play Games</h2>
        <span class="live-badge"><span class="dot"></span> BID STYLES</span>
      </div>
      <div class="game-cards" id="home-games"></div>
    </div>
    <section class="quick-links">
      <a href="#/charts">Jodi Chart</a>
      <a href="#/history">Full History</a>
      <a href="#/games">How to Play</a>
      <a href="#/bid/single">Place a Bid</a>
      <a href="#/login">User Panel</a>
    </section>`;

  const grid = $("#board");

  const ticker = $("#ticker");
  if (ticker) {
    const items = today
      .filter((t) => t.result && t.result.announced)
      .slice(0, 8)
      .map((t) => `<span class="ticker-item">${t.market.name} — <strong>${t.result.panel}-${t.result.panel2} / ${t.result.jodi}${t.result.jodi2}</strong></span>`)
      .join("");
    ticker.innerHTML = items + items;
  }

  for (const { market, result } of today) {
    const card = document.createElement("div");
    card.className = "market-card";
    const hasResult = result && result.announced;
    const jodi = hasResult ? result.jodi + result.jodi2 : "--";
    card.innerHTML = `
      <div class="mc-top">
        <strong>${market.name}</strong>
        <span class="mc-time">Open ${market.open} · Close ${market.close} · Result ${market.result}</span>
      </div>
      ${hasResult ? `
        <div class="mc-result">
          <div class="mc-panel"><label>Panel</label><b>${result.panel}</b><small>${result.panel2}</small></div>
          <div class="mc-jodi"><label>Jodi</label><b>${jodi}</b></div>
        </div>` 
      : `
        <div class="mc-pending"><span class="pulse"></span> Result pending</div>
        <div class="mc-count" data-target="${nextResultTime(market)}">Result in 00:00:00</div>`}
      <div class="mc-actions">
        <button type="button" class="btn play-link" data-play-market="${market.id}">Play</button>
        ${hasResult ? `<a class="mc-more" href="#/history/${market.id}">View history →</a>` : ""}
      </div>`;
    card.addEventListener("click", () => (location.hash = "#/market/" + market.id));
    const playBtn = card.querySelector(".play-link");
    if (playBtn) {
      playBtn.addEventListener("click", (e) => { e.stopPropagation(); openStyleMenu({ market: market.id, anchor: playBtn }); });
    }
    grid.appendChild(card);
  }

  const homeGames = $("#home-games");
  if (homeGames) {
    for (const g of GAMES) {
      const c = document.createElement("div");
      c.className = "game-card";
      c.innerHTML = `
        <b>${g.code}</b>
        <strong>${g.name}</strong>
        <small>Win up to ${g.odds}</small>
        <button type="button" class="btn btn-green play-btn" data-play-game="${g.id}">Play</button>`;
      const pb = c.querySelector(".play-btn");
      pb.addEventListener("click", () => openStyleMenu({ game: g.id, anchor: pb }));
      homeGames.appendChild(c);
    }
  }

  if (grid.querySelector(".mc-count")) {
    const tick = () => {
      for (const el of grid.querySelectorAll(".mc-count")) {
        const t = fmtCountdown(Number(el.dataset.target));
        el.textContent = t ? "Result in " + t : "Announcing now…";
      }
    };
    tick();
    setInterval(tick, 1000);
  }
}

function renderGames(page) {
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
    location.hash = "#/history";
    return;
  }
  const results = getResults();
  const days = Object.keys(results).filter((k) => k.startsWith(id + "|")).sort().slice(-14).reverse();
  page.innerHTML = `
    <section class="page-head">
      <h1>${market.name}</h1>
      <p>Open ${market.open} · Close ${market.close} · Result ${market.result} · ${market.days}</p>
    </section>
    <div class="hist-stats">
      <div class="hist-stat"><b>${days.length}</b><span>Results</span></div>
      <div class="hist-stat"><b>${days.length ? fmtDateNice(days[0].split("|").pop()) : "—"}</b><span>Latest</span></div>
      <div class="hist-stat"><b>${days.some((k) => results[k].announced && results[k].date === todayKey()) ? "LIVE" : "AWAIT"}</b><span>Today</span></div>
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
    location.hash = e.target.value ? "#/history/" + e.target.value : "#/history";
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

function renderCharts(page) {
  seedDemoResults();
  const results = getResults();
  page.innerHTML = `
    <section class="page-head">
      <h1>Jodi Charts</h1>
      <p>Last 14 days for each market. First digit = open result, second = close result.</p>
    </section>
    <div class="chart-grid" id="charts"></div>`;
  const charts = $("#charts");
  for (const m of MARKETS) {
    const days = Object.keys(results).filter((k) => k.startsWith(m.id + "|")).sort().slice(-14);
    const el = document.createElement("div");
    el.className = "chart-card";
    el.innerHTML = `<h3>${m.name}</h3><div class="chart-row">${days.map((k) => {
      const r = results[k];
      return `<div class="chart-cell"><b>${r.jodi}${r.jodi2}</b><span>${r.date.slice(5)}</span></div>`;
    }).join("")}</div>`;
    charts.appendChild(el);
  }
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
      <label>Email, Name or Phone <input name="loginid" required></label>
      <label>Password <input name="password" type="password" required></label>
      <button class="btn btn-green" type="submit">Sign In</button>
      <p class="form-hint">No account? <a href="#/register">Register here</a></p>
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
      <h3>Enter ${style.label === "Jodi Digit" || style.label === "Jodi Digit Bulk" || style.label === "Motor" || style.label === "Motor Bulk" || style.label === "Jodi Close" || style.label === "Jodi Close Bulk" ? "Jodi Digit" : "Digit"}</h3>
      <p class="hint" id="bid-odds">Odds: ${g.odds} · Success payout on bid value.</p>
      <div id="bid-fields"></div>
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

  function renderFields() {
    const f = style.game;
    if (f === "single" || f === "pana-family") {
      $("#bid-fields").innerHTML = `<label>${f === "pana-family" ? "Your digit (0-9)" : "Your digit (0-9)"} <input id="bnum" maxlength="1" inputmode="numeric" pattern="[0-9]" placeholder="5" required></label>`;
    } else if (f === "jodi" || f === "motor" || f === "jodi-close") {
      $("#bid-fields").innerHTML = `<label>Jodi / number (00-99) <input id="bnum" maxlength="2" inputmode="numeric" pattern="[0-9]{2}" placeholder="57" required></label>`;
    } else if (f === "single-patti" || f === "double-patti" || f === "triple-patti") {
      $("#bid-fields").innerHTML = `<label>Your Pana (000-999) <input id="bnum" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
        <p class="hint">Win if the open panel matches exactly.</p>`;
    } else if (f === "family-pair") {
      $("#bid-fields").innerHTML = `<label>Family (1-11)
        <select id="bnum">
          ${FAMILY_PAIRS.map((fp, i) => `<option value="${i + 1}">Family ${i + 1}: ${fp[0]} & ${fp[1]}</option>`).join("")}
        </select></label>`;
    } else if (f === "half-sangam" || f === "half-sangam-b") {
      $("#bid-fields").innerHTML = `
        <div class="form-row">
          <label>Jodi (00-99) <input id="bjodi" maxlength="2" inputmode="numeric" pattern="[0-9]{2}" placeholder="57" required></label>
          <label>Pana (000-999) <input id="bpatti" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
        </div>
        <p class="hint">${f === "half-sangam-b" ? "Win if Jodi matches AND the pana equals the close panel." : "Win if Jodi matches AND the pana equals the open panel."}</p>`;
    } else if (f === "full-sangam") {
      $("#bid-fields").innerHTML = `
        <div class="form-row">
          <label>Open Pana (000-999) <input id="bp1" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
          <label>Close Pana (000-999) <input id="bp2" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="789" required></label>
        </div>
        <p class="hint">Win if both panels match exactly.</p>`;
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
    };
  }
  $("#bid-stake").oninput = () => {
    for (const x of amts.querySelectorAll(".amt-chip")) x.classList.toggle("active", x.dataset.v === $("#bid-stake").value);
    const v = parseFloat($("#bid-stake").value) || 0;
    $("#bid-win").textContent = "Win = " + g.odds.replace("x", "") + " × " + v + " = ₹" + (parseFloat(g.odds) * v).toFixed(2);
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
    else numbers.num = val("bnum");
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
      <label>Phone number (required) <input name="phone" type="tel" pattern="[0-9+ -]{10,16}" placeholder="+1 555 000 1234" required></label>
      <label>Email <input name="email" type="email" required></label>
      <label>Password <input name="password" type="password" required minlength="6"></label>
      <button class="btn btn-green" type="submit">Create Account</button>
      <p class="form-hint">Already registered? <a href="#/login">Sign in</a></p>
    </form>`;
  $("#reg-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const phoneDigits = String(fd.get("phone")).replace(/\D/g, "");
    if (phoneDigits.length < 10) { alert("A valid phone number (at least 10 digits) is required to create an account."); return; }
    API.call("signupv1", { name: fd.get("name"), mobile: phoneDigits, email: fd.get("email"), password: fd.get("password") }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      const users = store.get("matka.users", []);
      const u = users.find((x) => getPhone(x) === phoneDigits);
      if (!u) { alert("Account creation failed. Please try again."); return; }
      currentUser = { username: u.username, name: u.name, role: u.role, joined: u.joined, email: u.email, phone: u.phone };
      store.set("matka.user", currentUser);
      logActivity(u, "Account registered (API)");
      buildNav();
      location.hash = "#/profile";
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
      <p>For any questions, reach out via the <a href="#/contact">contact page</a>.</p>
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
    <section class="page-head"><h1>Contact Us</h1><p>We usually reply within 24 hours.</p></section>
    <form class="card form" id="contact-form">
      <label>Name <input name="name" required></label>
      <label>Email <input name="email" type="email" required></label>
      <label>Message <textarea name="msg" rows="5" required></textarea></label>
      <button class="btn" type="submit">Send Message</button>
    </form>`;
  $("#contact-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msgs = store.get("matka.messages", []);
    msgs.push({ name: fd.get("name"), email: fd.get("email"), msg: fd.get("msg"), date: todayKey() });
    store.set("matka.messages", msgs);
    page.innerHTML = `<section class="page-head"><h1>Message Sent</h1><p>Thanks ${fd.get("name")}, we'll get back to you at ${fd.get("email")}.</p></section>`;
  };
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

window.addEventListener("hashchange", () => { buildNav(); router(); });
window.addEventListener("load", () => { buildNav(); router(); });
