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
  else if (route === "play") renderHome(page, { game: parts[1], market: parts[2], focus: true });
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
    a.classList.toggle("active", route === key || (key === "funds" && route === "profile"));
  }
}

function buildNav() {
  const nav = $("#nav");
  if (!nav) return;
  const items = [
    ["Home", "#/"],
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
    <div id="bet-section"></div>
    <section class="quick-links">
      <a href="#/charts">Jodi Chart</a>
      <a href="#/history">Full History</a>
      <a href="#/games">How to Play</a>
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
        <a class="btn play-link" href="#/play/single/${market.id}">Play</a>
        ${hasResult ? `<a class="mc-more" href="#/history/${market.id}">View history →</a>` : ""}
      </div>`;
    card.addEventListener("click", () => (location.hash = "#/market/" + market.id));
    const playBtn = card.querySelector(".play-link");
    if (playBtn) playBtn.addEventListener("click", (e) => e.stopPropagation());
    grid.appendChild(card);
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

  mountBetSection($("#bet-section"), opts || {});
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
              <td><a class="btn play-link" href="#/play/${g.id}">Play</a></td>
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
    <div class="hist-card">
      <h3>Recent Results</h3>
      <table class="result-table">
        <thead><tr><th>Date</th><th>Panel 1</th><th>Panel 2</th><th>Jodi</th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
    </div>`;
  const tbody = $("#rows");
  if (!days.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">No results recorded yet.</td></tr>`;
  }
  for (const key of days) {
    const r = results[key];
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.date}</td><td>${r.panel}</td><td>${r.panel2}</td><td class="jodi-cell">${r.jodi} ${r.jodi2}</td>`;
    tbody.appendChild(tr);
  }
}

function renderHistory(page, marketId) {
  seedDemoResults();
  const results = getResults();
  page.innerHTML = `
    <section class="page-head">
      <h1>Results History</h1>
      <p>Select a market to see its full result history.</p>
    </section>
    <div class="market-nav" id="mnav"></div>
    <div class="hist-card">
      <h3 id="hist-title">All Markets</h3>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Date</th><th>Market</th><th>Panel 1</th><th>Panel 2</th><th>Jodi</th></tr></thead>
        <tbody id="rows"></tbody>
      </table></div>
    </div>`;

  const nav = $("#mnav");
  const allBtn = document.createElement("button");
  allBtn.className = marketId ? "chip" : "chip active";
  allBtn.textContent = "All Markets";
  allBtn.onclick = () => (location.hash = "#/history");
  nav.appendChild(allBtn);
  for (const m of MARKETS) {
    const btn = document.createElement("button");
    btn.className = marketId === m.id ? "chip active" : "chip";
    btn.textContent = m.name;
    btn.onclick = () => (location.hash = "#/history/" + m.id);
    nav.appendChild(btn);
  }

  const tbody = $("#rows");
  const rows = [];
  for (const key of Object.keys(results)) {
    const [mid, date] = key.split("|");
    if (marketId && mid !== marketId) continue;
    const m = MARKETS.find((x) => x.id === mid);
    rows.push({ date, market: m ? m.name : mid, r: results[key] });
  }
  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  if (marketId) $("#hist-title").textContent = MARKETS.find((m) => m.id === marketId).name;
  if (!rows.length) tbody.innerHTML = `<tr><td colspan="5" class="empty">No results recorded yet.</td></tr>`;
  const slice = rows.slice(0, 200);
  for (const row of slice) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.date}</td><td>${row.market}</td><td>${row.r.panel}</td><td>${row.r.panel2}</td><td class="jodi-cell">${row.r.jodi} ${row.r.jodi2}</td>`;
    tbody.appendChild(tr);
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

function mountBetSection(betRoot, opts) {
  if (!betRoot) return;
  if (!currentUser) {
    betRoot.innerHTML = `
      <div class="card panel-card" style="max-width:none">
        <h3>Place a Bet</h3>
        <p class="hint">Sign in to play with your demo wallet — no real money involved.</p>
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
    betRoot.innerHTML = `<p class="hint">Account not found. Please sign in again.</p>`;
    return;
  }

  resolveBets();

  const balance = walletBalance(u.phone);
  const myBets = store.get("matka.bets", []).filter((b) => b.phone === u.phone).slice().reverse();

  betRoot.innerHTML = `
    <div class="live-board">
      <div class="board-header">
        <h2>Place a Bet</h2>
        <span class="live-badge"><span class="dot"></span> DEMO WALLET</span>
      </div>
      <div class="play-grid" style="padding:16px">
        <div class="card panel-card">
          <h3>New Bet</h3>
          <p class="hint">Wallet balance: <span class="wallet-chip" id="play-balance">₹ ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></p>
          <form class="form" id="bet-form">
            <label>Market <select name="market" id="bet-market" required></select></label>
            <label>Game <select name="game" id="bet-game" required></select></label>
            <div id="bet-fields"></div>
            <label>Stake (demo) <input name="stake" type="number" min="1" step="1" placeholder="10" required></label>
            <p class="hint" id="bet-odds">—</p>
            <button class="btn btn-green" type="submit">Place Bet</button>
          </form>
        </div>
        <div class="card panel-card">
          <h3>My Bets</h3>
          <p class="hint">Bets resolve automatically once the market result is announced.</p>
          <div class="bet-list" id="bet-list"></div>
        </div>
      </div>
    </div>`;

  const marketSel = $("#bet-market");

  API.call("get_balance", { mobile: u.phone }).then((res) => {
    const el = $("#play-balance");
    if (el && res.success) el.textContent = "₹ " + Number(res.data.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
  });

  for (const m of MARKETS) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    marketSel.appendChild(opt);
  }
  const gameSel = $("#bet-game");
  for (const g of GAMES) {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name + " (odds " + g.odds + ")";
    gameSel.appendChild(opt);
  }

  function renderBetFields() {
    const g = GAMES.find((x) => x.id === gameSel.value);
    if (!g) return;
    $("#bet-odds").textContent = "Odds: " + g.odds;
    if (g.id === "single" || g.id === "pana-family") {
      $("#bet-fields").innerHTML = `<label>${g.id === "pana-family" ? "Your digit (0-9)" : "Your number (0-9)"} <input name="num" maxlength="1" inputmode="numeric" pattern="[0-9]" placeholder="5" required></label>`;
    } else if (g.id === "jodi" || g.id === "motor" || g.id === "jodi-close") {
      $("#bet-fields").innerHTML = `<label>Your number (00-99) <input name="num" maxlength="2" inputmode="numeric" pattern="[0-9]{2}" placeholder="57" required></label>`;
    } else if (g.id === "single-patti" || g.id === "double-patti" || g.id === "triple-patti") {
      $("#bet-fields").innerHTML = `<label>Your Pana (000-999) <input name="num" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
        <p class="hint">Win if the open panel matches exactly.</p>`;
    } else if (g.id === "family-pair") {
      $("#bet-fields").innerHTML = `<label>Family (1-11)
        <select name="num">
          ${FAMILY_PAIRS.map((f, i) => `<option value="${i + 1}">Family ${i + 1}: ${f[0]} & ${f[1]}</option>`).join("")}
        </select></label>`;
    } else if (g.id === "half-sangam" || g.id === "half-sangam-b") {
      $("#bet-fields").innerHTML = `
        <div class="form-row">
          <label>Jodi (00-99) <input name="jodi" maxlength="2" inputmode="numeric" pattern="[0-9]{2}" placeholder="57" required></label>
          <label>Pana (000-999) <input name="patti" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
        </div>
        <p class="hint">${g.id === "half-sangam-b" ? "Win if Jodi matches AND the pana equals the close panel." : "Win if Jodi matches AND the pana equals the open panel."}</p>`;
    } else if (g.id === "full-sangam") {
      $("#bet-fields").innerHTML = `
        <div class="form-row">
          <label>Open Pana (000-999) <input name="patti1" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="456" required></label>
          <label>Close Pana (000-999) <input name="patti2" maxlength="3" inputmode="numeric" pattern="[0-9]{3}" placeholder="789" required></label>
        </div>
        <p class="hint">Win if both panels match exactly.</p>`;
    }
  }

  gameSel.onchange = renderBetFields;
  if (opts.game) gameSel.value = opts.game;
  if (opts.market) marketSel.value = opts.market;
  renderBetFields();

  $("#bet-form").onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const g = GAMES.find((x) => x.id === gameSel.value);
    const m = MARKETS.find((x) => x.id === fd.get("market"));
    const stake = parseFloat(fd.get("stake"));
    if (!stake || stake <= 0) { alert("Enter a valid stake."); return; }
    const numbers = {};
    if (g.id === "family-pair") numbers.family = fd.get("num");
    else if (g.id === "half-sangam" || g.id === "half-sangam-b") { numbers.jodi = fd.get("jodi"); numbers.patti = fd.get("patti"); }
    else if (g.id === "full-sangam") { numbers.patti1 = fd.get("patti1"); numbers.patti2 = fd.get("patti2"); }
    else numbers.num = fd.get("num");
    const numberStr = numbers.family ? "F" + numbers.family : numbers.jodi ? numbers.jodi + numbers.patti : numbers.patti1 ? numbers.patti1 + numbers.patti2 : numbers.num;
    API.call("place_bid_atomicv1", { mobile: u.phone, market_id: m.id, game_type: g.id, number: numberStr, amount: stake }).then((res) => {
      if (!res.success) { alert(res.message); return; }
      logActivity(u, "Placed " + g.name + " bet of " + stake.toFixed(2) + " (API)");
      alert("Bid placed via API (" + res.data.bet_id + "). It resolves when the market result is announced.");
      mountBetSection(betRoot, {});
    });
  };

  const betList = $("#bet-list");
  betList.innerHTML = myBets.length ? myBets.map((b) => {
    const numLabel = b.game === "half-sangam" || b.game === "half-sangam-b" ? b.numbers.jodi + " / " + b.numbers.patti : b.game === "full-sangam" ? b.numbers.patti1 + " / " + b.numbers.patti2 : b.game === "family-pair" ? "Family " + b.numbers.family : b.numbers.num;
    const statusClass = b.status === "won" ? "req-confirmed" : b.status === "lost" ? "req-rejected" : "req-pending";
    return `<div class="bet-row">
      <div class="bet-main">
        <strong>${b.marketName} · ${b.gameName}</strong>
        <span>Number: ${numLabel} · Stake: ${b.stake.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        ${b.status === "won" ? `<span class="wallet-plus">Won ${(b.stake * b.odds).toLocaleString(undefined, { minimumFractionDigits: 2 })} (${b.odds}x)</span>` : ""}
      </div>
      <span class="req-status ${statusClass}">${b.status.toUpperCase()}</span>
    </div>`;
  }).join("") : `<p class="hint">No bets placed yet.</p>`;

  if (opts.focus) {
    const target = document.getElementById("bet-market");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
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
      const u = { username: fd.get("name").trim(), password: fd.get("password"), name: fd.get("name").trim(), phone: phoneDigits, email: fd.get("email"), role: "user", joined: todayKey(), address: "", city: "", dob: "", idType: "", idNumber: "" };
      users.push(u);
      store.set("matka.users", users);
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
      <button class="chip" data-tab="bets">My Bets</button>
      <button class="chip" data-tab="pay">Payments</button>
    </div>
    <div id="panel-body"></div>`;

  const body = $("#panel-body");

  function showTab(name) {
    for (const c of page.querySelectorAll(".panel-tabs .chip")) c.classList.toggle("active", c.dataset.tab === name);
    if (name === "profile") renderProfileTab();
    else if (name === "wallet") renderWalletTab();
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
              <label>Payment method
                <select name="method">
                  <option>UPI / QR</option>
                  <option>Card</option>
                  <option>Net Banking</option>
                </select>
              </label>
              ${demoQr ? `
                <div class="qr-demo-box">
                  <p>Pay to this QR, then enter the reference below:</p>
                  <img class="qr-img" src="${demoQr.data}" alt="Payment QR">
                </div>` : `<p class="hint">Payment QR not set by the administrator.</p>`}
              <label>UTR / Transaction reference number
                <input name="ref" maxlength="30" placeholder="e.g. 4123876541" required>
              </label>
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
          <h3>Withdraw (Demo)</h3>
          <p class="hint">Request a payout to your UPI — the administrator approves it.</p>
          <form class="form" id="wd-form">
            <label>Amount <input name="amount" type="number" min="1" step="1" placeholder="100" required></label>
            <label>UPI ID <input name="upi" placeholder="yourname@upi" required></label>
            <button class="btn btn-green" type="submit">Request Withdrawal</button>
          </form>
          <h4 class="sub-title">Withdrawal Requests</h4>
          <div class="activity-list" id="wd-list"></div>
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
    $("#add-money-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = parseFloat(fd.get("amount"));
      const ref = String(fd.get("ref") || "").trim();
      if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
      if (ref.length < 4) { alert("Enter the UTR / transaction reference number."); return; }
      API.call("submit_offlinepayment_request", { mobile: u.phone, amount: amount, method: fd.get("method"), ref: ref }).then((res) => {
        if (!res.success) { alert(res.message); return; }
        logActivity(u, "Top-up request of " + amount.toFixed(2) + " submitted (pending confirmation)");
        alert("Payment proof submitted. Your balance will be credited after the administrator confirms the payment.");
        renderProfile(page);
      });
    };

    const wdList = $("#wd-list");
    const myWds = store.get("matka.withdrawals", []).filter((w) => w.phone === u.phone).slice().reverse();
    wdList.innerHTML = myWds.length ? myWds.map((w) => `
      <div class="activity-row">
        <span>${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${w.upi || "—"}</span>
        <small class="req-status req-${w.status}">${w.status.toUpperCase()}</small>
      </div>`).join("") : `<p class="hint">No withdrawal requests yet.</p>`;

    $("#wd-form").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const amount = parseFloat(fd.get("amount"));
      const upi = String(fd.get("upi") || "").trim();
      if (!amount || amount <= 0) { alert("Enter a valid amount."); return; }
      if (!upi) { alert("Enter your UPI ID."); return; }
      API.call("submit_withdrawalv1", { mobile: u.phone, amount: amount, upi_id: upi }).then((res) => {
        if (!res.success) { alert(res.message); return; }
        logActivity(u, "Withdrawal request of " + amount.toFixed(2) + " submitted (pending approval)");
        alert("Withdrawal request submitted. The administrator will approve it.");
        renderProfile(page);
      });
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
