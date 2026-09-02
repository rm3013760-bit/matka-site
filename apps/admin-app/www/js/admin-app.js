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

let adminUser = store.get("matka.admin", null);

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

function ensureAdmin() {
  const users = store.get("matka.users", []);
  const seen = new Set();
  const deduped = users.filter((x) => {
    const key = String(x.phone || x.username || "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (deduped.length !== users.length) {
    users.length = 0;
    users.push(...deduped);
    store.set("matka.users", users);
  }
  let adminUserRow = users.find((x) => x.username === "admin");
  if (!adminUserRow) {
    adminUserRow = { username: "admin", password: "112233", name: "Admin", role: "admin", joined: "Demo", email: "admin@demo.com" };
    users.push(adminUserRow);
  } else {
    adminUserRow.password = "112233";
    adminUserRow.role = "admin";
  }
  if (!users.some((x) => x.role === "user")) {
    users.push(
      { username: "demo1", password: "123456", name: "Rahul Sharma", phone: "9876500001", email: "rahul@demo.com", role: "user", joined: todayKey() },
      { username: "demo2", password: "123456", name: "Priya Patel", phone: "9876500002", email: "priya@demo.com", role: "user", joined: todayKey() },
      { username: "demo3", password: "123456", name: "Amit Verma", phone: "9876500003", email: "amit@demo.com", role: "user", joined: todayKey() },
      { username: "demo4", password: "123456", name: "Sneha Gupta", phone: "9876500004", email: "sneha@demo.com", role: "user", joined: todayKey() },
      { username: "demo5", password: "123456", name: "Vikram Singh", phone: "9876500005", email: "vikram@demo.com", role: "user", joined: todayKey() }
    );
  }
  store.set("matka.users", users);
}

function $(sel) {
  return document.querySelector(sel);
}

function page() {
  return $("#page");
}

function renderLogin() {
  page().innerHTML = `
    <section class="page-head">
      <h1>Admin Panel</h1>
      <p>Sign in with an administrator account.</p>
    </section>
    <form class="card form" id="admin-login">
      <label>Username <input name="username" required autocomplete="username"></label>
      <label>Password <input name="password" type="password" required autocomplete="current-password"></label>
      <button class="btn" type="submit">Sign In</button>
      <p class="form-hint">Demo admin: <code>admin / 112233</code></p>
    </form>`;
  $("#admin-login").onsubmit = (e) => {
    e.preventDefault();
    ensureAdmin();
    const fd = new FormData(e.target);
    const users = store.get("matka.users", []);
    const u = users.find((x) => x.username === fd.get("username") && x.password === fd.get("password") && x.role === "admin");
    if (!u) { alert("Invalid admin credentials."); return; }
    adminUser = { username: u.username, name: u.name, email: u.email || "" };
    store.set("matka.admin", adminUser);
    renderDashboard();
  };
}

function renderTabApi() {
  const eps = API.endpoints;
  $("#tab-api").innerHTML = `
    <div class="card wide">
      <h3>API Console — local mock of api.sara567official.site</h3>
      <p class="hint">Same endpoint names, params and JSON shapes as the app build. Runs 100% locally (localStorage) — no real server, no real money.</p>
      <div class="table-wrap" style="max-height:520px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;">
        <table class="result-table">
          <thead><tr><th>Endpoint</th><th>Method</th><th>Params (sample)</th><th></th></tr></thead>
          <tbody>
            ${eps.map((e, i) => `
              <tr>
                <td><code>${e.name}</code></td>
                <td><span class="req-status req-pending">${e.method}</span></td>
                <td><span class="hint" style="margin:0">${e.params.join(" · ") || "—"}</span></td>
                <td><button class="mini-del" id="api-test-${i}" style="border-color:var(--green);color:var(--green)">Test</button></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <pre id="api-output" class="json-example" style="margin-top:14px;max-height:260px;overflow:auto;color:var(--green)">Click Test on any endpoint to see its mock response.</pre>
    </div>`;
  for (const e of eps) {
    const btn = document.getElementById("api-test-" + (eps.indexOf(e)));
    if (!btn) continue;
    btn.onclick = () => {
      const sample = {
        mobile: "9876543210",
        market_name: MARKETS[0] ? MARKETS[0].name : "Kalyan",
        market_id: MARKETS[0] ? MARKETS[0].id : "kalyan-main",
        game_type: "single",
        number: "5",
        amount: "10",
        date: todayKey(),
        otp: "123456",
        key_name: "game_status",
        time: STARLINE_TIMES[0],
        id: "1",
        ref: "DEMO1234",
        upi_id: "demo@upi",
        method: "UPI / QR",
        name: "Demo",
        email: "demo@demo.com",
        password: "112233",
        new_password: "112233"
      };
      API.call(e.name, sample)
        .then((res) => {
          document.getElementById("api-output").textContent = "→ " + e.name + "\n" + JSON.stringify(sample, null, 2) + "\n\n← RESPONSE\n" + JSON.stringify(res, null, 2);
        });
    };
  }
}

function wdDetail(w) {
  if (w.method === "bank") {
    return `BANK · ${w.bankName || "—"} · ${w.accName || "—"} · •••• ${String(w.accNo || "").slice(-4)} · ${w.ifsc || ""}`;
  }
  return `UPI · ${w.upi || "—"}`;
}

function renderWithdrawalsInto(el) {
  const wds = store.get("matka.withdrawals", []);
  const pending = wds.filter((w) => w.status === "pending");
  const all = wds.slice().reverse();
  if (!el) return;
  el.innerHTML = `
    <div class="card wide">
      <h3>Withdrawal Requests</h3>
      <p class="hint">Approve = payout marked done (demonstration only — no real transfer).</p>
      ${pending.length ? `<div class="activity-list">
        ${pending.map((w, i) => `
          <div class="activity-row wd-row">
            <span><b>${w.userName}</b> · ${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}<br><small>${wdDetail(w)}</small></span>
            <span>
              <button type="button" class="mini-del req-ok" id="wd-ok-${i}">Approve</button>
              <button type="button" class="mini-del req-no" id="wd-no-${i}">Reject</button>
            </span>
          </div>`).join("")}
      </div>` : `<p class="hint">No pending withdrawals.</p>`}
      ${all.length ? `<h3 style="margin-top:18px">All Requests</h3>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Method & Details</th><th>Status</th></tr></thead>
        <tbody>${all.map((w) => `<tr><td>${String(w.date || "").slice(0, 16) || "—"}</td><td>${w.userName}</td><td>₹ ${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${wdDetail(w)}</td><td><span class="req-status ${w.status === "confirmed" ? "req-confirmed" : w.status === "rejected" ? "req-rejected" : "req-pending"}">${w.status.toUpperCase()}</span></td></tr>`).join("")}</tbody>
      </table></div>` : ""}
    </div>`;
  pending.forEach((w, i) => {
    const ok = document.getElementById("wd-ok-" + i);
    const no = document.getElementById("wd-no-" + i);
    if (ok) ok.onclick = () => { w.status = "confirmed"; store.set("matka.withdrawals", wds); renderWithdrawalsInto(el); };
    if (no) no.onclick = () => { w.status = "rejected"; store.set("matka.withdrawals", wds); renderWithdrawalsInto(el); };
  });
}

function renderTabWithdrawals() {
  $("#tab-withdrawals").innerHTML = `<div class="card wide" id="wd-list"></div>`;
  renderWithdrawalsInto(document.getElementById("wd-list"));
}

function renderTabVideos() {
  const el = $("#tab-videos");
  if (!el) return;
  const list = store.get("matka.videos", []);
  el.innerHTML = `
    <div class="card wide">
      <h3>How to Play Videos</h3>
      <p class="hint">Upload a video file from your device. It is shown on the “How to Play” (Game Rates) page. Files are stored locally in this browser — keep each under ~3&nbsp;MB.</p>
      <form class="form" id="video-form">
        <label>Video Title <input name="title" required placeholder="e.g. How to Place a Bet"></label>
        <label>Video File
          <input type="file" name="file" accept="video/mp4,video/webm,video/ogg" required>
        </label>
        <button class="btn" type="submit">Upload Video</button>
      </form>
    </div>
    <div class="card wide">
      <h3>Saved Videos (${list.length})</h3>
      ${list.length ? `<div class="activity-list video-admin-list">
        ${list.map((v, i) => `
          <div class="video-admin-item">
            ${v.data ? `<video controls preload="none" src="${v.data}"></video>` : `<a class="video-admin-url" href="${v.url}" target="_blank" rel="noopener">${v.url}</a>`}
            <div class="video-admin-meta">
              <b>${v.title}</b>
              ${v.size ? `<small>${(v.size / 1024 / 1024).toFixed(2)} MB</small>` : ""}
            </div>
            <button type="button" class="mini-del req-no" id="video-del-${i}">Remove</button>
          </div>`).join("")}
      </div>` : `<p class="hint">No videos added yet.</p>`}
    </div>`;
  const form = $("#video-form");
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = (fd.get("title") || "How to Play").trim() || "How to Play";
    const file = fd.get("file");
    if (!file || !file.type) { alert("Please choose a video file."); return; }
    const MAX = 3 * 1024 * 1024;
    const used = list.reduce((s, x) => s + (x.size || 0), 0);
    if (file.size > MAX) { alert("File too large. Keep it under ~3 MB (localStorage limit)."); return; }
    if (used + file.size > 4.5 * 1024 * 1024) { alert("Total videos too large for browser storage. Remove some or use a smaller file."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const videos = store.get("matka.videos", []);
      videos.push({ title, data: reader.result, mime: file.type || "video/mp4", size: file.size, id: "v" + Date.now() });
      try {
        store.set("matka.videos", videos);
      } catch (err) {
        alert("Could not save — storage full. Use a smaller/shorter video.");
        videos.pop();
        return;
      }
      renderTabVideos();
    };
    reader.onerror = () => alert("Could not read the file.");
    reader.readAsDataURL(file);
  };
  list.forEach((v, i) => {
    const d = document.getElementById("video-del-" + i);
    if (d) d.onclick = () => {
      const videos = store.get("matka.videos", []);
      videos.splice(i, 1);
      store.set("matka.videos", videos);
      renderTabVideos();
    };
  });
}


function renderDashboard() {
  if (!adminUser) { renderLogin(); return; }
  page().innerHTML = `
    <section class="admin-shell">
      <aside class="admin-side">
        <nav class="side-nav" id="side-nav">
          <span class="side-group">Overview</span>
          <button type="button" class="side-btn active" data-tab="dashboard">Dashboard</button>
          <span class="side-group">Results</span>
          <button type="button" class="side-btn" data-tab="update">Update Result</button>
          <button type="button" class="side-btn" data-tab="bulk">Bulk Entry</button>
          <button type="button" class="side-btn" data-tab="json">JSON Import</button>
          <span class="side-group">Markets</span>
          <button type="button" class="side-btn" data-tab="markets">Add Market</button>
          <span class="side-group">Users</span>
          <button type="button" class="side-btn" data-tab="users">Users</button>
          <span class="side-group">Wallet</span>
          <button type="button" class="side-btn" data-tab="wallet">Wallet & Top-Ups</button>
          <span class="side-group">Withdrawals</span>
          <button type="button" class="side-btn" data-tab="withdrawals">Withdrawal Requests</button>
          <span class="side-group">Content</span>
          <button type="button" class="side-btn" data-tab="videos">How to Play Videos</button>
          <span class="side-group">System</span>
          <button type="button" class="side-btn" data-tab="api">API Console</button>
          <div class="side-foot">
            <span>${adminUser.name}</span>
            <button type="button" class="chip" id="logout">Log out</button>
          </div>
        </nav>
      </aside>
      <main class="admin-main">
        <div class="admin-grid" id="tab-dashboard"></div>
        <div class="admin-grid" id="tab-update" style="display:none"></div>
        <div class="admin-grid" id="tab-bulk" style="display:none"></div>
        <div class="admin-grid" id="tab-json" style="display:none"></div>
        <div class="admin-grid" id="tab-markets" style="display:none"></div>
        <div class="admin-grid" id="tab-users" style="display:none"></div>
        <div class="admin-grid wallet-grid" id="tab-wallet" style="display:none"></div>
        <div class="admin-grid" id="tab-withdrawals" style="display:none"></div>
        <div class="admin-grid" id="tab-videos" style="display:none"></div>
        <div class="admin-grid" id="tab-api" style="display:none"></div>
      </main>
    </section>`;

  $("#logout").onclick = () => { localStorage.removeItem("matka.admin"); adminUser = null; renderLogin(); };

  const ALL_TABS = ["dashboard", "update", "bulk", "json", "markets", "users", "wallet", "withdrawals", "videos", "api"];
  window.switchTab = (tab) => {
    for (const t of ALL_TABS) {
      const el = $("#tab-" + t);
      if (el) el.style.display = t === tab ? "" : "none";
    }
    for (const b of document.querySelectorAll("#side-nav .side-btn")) b.classList.toggle("active", b.dataset.tab === tab);
  };
  for (const b of document.querySelectorAll("#side-nav .side-btn")) {
    b.onclick = () => switchTab(b.dataset.tab);
  }

  renderTabDashboard();
  renderTabUpdate();
  renderTabBulk();
  renderTabJson();
  renderTabWallet();
  renderTabMarkets();
  renderTabUsers();
  renderTabWithdrawals();
  renderTabVideos();
  renderTabApi();
  window.addEventListener("sync-updated", () => {
    if (!adminUser) return;
    renderTabDashboard();
    renderTabUpdate();
    renderTabBulk();
    renderTabJson();
    renderTabWallet();
    renderTabMarkets();
    renderTabUsers();
    renderTabWithdrawals();
    renderTabVideos();
    renderTabApi();
  });
}

function renderTabDashboard() {
  const users = store.get("matka.users", []);
  const requests = store.get("matka.requests", []);
  const withdrawals = store.get("matka.withdrawals", []);
  const tx = store.get("matka.wallet", []);
  const results = getResults();
  const announcedToday = Object.keys(results).filter((k) => {
    const r = results[k];
    return r.announced && r.date === todayKey();
  }).length;
  const totalWallet = tx.reduce((s, t) => s + (t.amount || 0), 0);
  const pendingTopups = requests.filter((r) => r.status === "pending");
  const pendingWd = withdrawals.filter((w) => w.status === "pending");

  $("#tab-dashboard").innerHTML = `
    <div class="admin-stats">
      <div class="stat-card"><div class="stat-num">${MARKETS.length}</div><div class="stat-label">Markets</div></div>
      <div class="stat-card stat-green"><div class="stat-num">${announcedToday}</div><div class="stat-label">Announced Today</div></div>
      <div class="stat-card stat-blue"><div class="stat-num">${users.length}</div><div class="stat-label">Users</div></div>
      <div class="stat-card stat-red"><div class="stat-num">${pendingTopups.length}</div><div class="stat-label">Pending Top-Ups</div></div>
      <div class="stat-card stat-red"><div class="stat-num">${pendingWd.length}</div><div class="stat-label">Pending Withdrawals</div></div>
      <div class="stat-card stat-green"><div class="stat-num">${totalWallet.toLocaleString(undefined, { minimumFractionDigits: 0 })}</div><div class="stat-label">Total Wallet</div></div>
    </div>
    <div class="quick-actions">
      <button type="button" class="chip" data-go="update">Update Result</button>
      <button type="button" class="chip" data-go="bulk">Bulk Entry</button>
      <button type="button" class="chip" data-go="json">JSON Import</button>
      <button type="button" class="chip" data-go="markets">Add Market</button>
      <button type="button" class="chip" data-go="wallet">Top-Up Requests</button>
      <button type="button" class="chip" data-go="withdrawals">Withdrawals</button>
      <button type="button" class="chip" data-go="videos">How to Play Videos</button>
    </div>
    <div class="card wide">
      <h3>Pending Actions</h3>
      ${pendingTopups.length || pendingWd.length ? `<div class="activity-list">
        ${pendingTopups.map((r) => `<div class="activity-row"><span><b>Top-Up</b> · ${r.userName} · ${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><button type="button" class="mini-del" data-go="wallet">Review</button></div>`).join("")}
        ${pendingWd.map((w) => `<div class="activity-row"><span><b>Withdrawal</b> · ${w.userName} · ${w.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span><button type="button" class="mini-del" data-go="withdrawals">Review</button></div>`).join("")}
      </div>` : `<p class="hint">No pending requests. All clear.</p>`}
    </div>
    <div class="card wide">
      <h3>Recent Users</h3>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Joined</th></tr></thead>
        <tbody>${users.slice(-5).reverse().map((u) => `<tr><td>${u.name}</td><td>${u.phone || "—"}</td><td>${u.email || "—"}</td><td>${u.joined}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>
    <div class="card wide">
      <h3>Recent Wallet Activity</h3>
      <div class="activity-list">
        ${tx.slice(0, 8).map((t) => `<div class="activity-row"><span>${t.date ? String(t.date).slice(0, 16) : ""} · ${t.userName}</span><span>${(t.amount || 0) >= 0 ? "+" : ""}₹ ${(t.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} · ${t.note || ""}</span></div>`).join("") || `<p class="hint">No wallet activity yet.</p>`}
      </div>
    </div>`;

  for (const b of document.querySelectorAll("#tab-dashboard [data-go]")) {
    b.onclick = () => switchTab(b.dataset.go);
  }
}

function renderTabUpdate() {
  const el = $("#tab-update");
  el.innerHTML = `
    <div class="card">
      <h3>Update Result</h3>
      <form id="upd-form">
        <div class="form-row">
          <label>Market <select id="upd-market"></select></label>
          <label>Date <input type="date" id="upd-date" value="${todayKey()}"></label>
        </div>
        <div class="form-row">
          <label>Open Panel (3 digits) <input id="upd-panel" maxlength="3" pattern="[0-9]{3}" value="${DEFAULT_PANEL}"></label>
          <label>Close Panel (3 digits) <input id="upd-panel2" maxlength="3" pattern="[0-9]{3}" value="${DEFAULT_PANEL}"></label>
        </div>
        <label class="check"><input type="checkbox" id="upd-announce" checked> Mark as announced</label>
        <button class="btn" type="submit">Save Result</button>
      </form>
    </div>
    <div class="card">
      <h3>Recent Results</h3>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Market</th><th>Date</th><th>Panel</th><th></th></tr></thead>
        <tbody id="recent-rows"></tbody>
      </table></div>
    </div>`;

  const sel = $("#upd-market");
  for (const m of MARKETS) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    sel.appendChild(opt);
  }

  $("#upd-form").onsubmit = (e) => {
    e.preventDefault();
    const p = $("#upd-panel").value.trim();
    const p2 = $("#upd-panel2").value.trim();
    if (!/^\d{3}$/.test(p) || !/^\d{3}$/.test(p2)) { alert("Panels must be 3 digits."); return; }
    setResult(sel.value, $("#upd-date").value, p, p2, $("#upd-announce").checked);
    alert("Result saved.");
    renderDashboard();
  };

  const results = getResults();
  const recent = Object.keys(results).sort().slice(-12).reverse();
  const recentBody = $("#recent-rows");
  recentBody.innerHTML = recent.length ? recent.map((key) => {
    const [mid, date] = key.split("|");
    const m = MARKETS.find((x) => x.id === mid);
    const r = results[key];
    return `<tr><td>${m ? m.name : mid}</td><td>${date}</td><td>${r.panel} / ${r.panel2}</td><td><button class="mini-del" data-key="${key}">Delete</button></td></tr>`;
  }).join("") : `<tr><td colspan="4" class="empty">No results yet.</td></tr>`;
  for (const btn of recentBody.querySelectorAll(".mini-del")) {
    btn.onclick = () => {
      if (confirm("Delete this result?")) {
        const [mid, date] = btn.dataset.key.split("|");
        deleteResult(mid, date);
        renderDashboard();
      }
    };
  }
}

function renderTabBulk() {
  $("#tab-bulk").innerHTML = `
    <div class="card">
      <h3>Bulk Entry</h3>
      <p class="hint">One line per result: <code>market|date|panel|panel2</code></p>
      <textarea id="bulk-input" rows="8" placeholder="kalyan-main|2026-08-16|456|789"></textarea>
      <button class="btn" id="bulk-btn">Save All Lines</button>
    </div>`;
  $("#bulk-btn").onclick = () => {
    const lines = $("#bulk-input").value.trim().split("\n").filter(Boolean);
    let ok = 0, bad = 0;
    for (const line of lines) {
      const parts = line.split("|").map((x) => x.trim());
      if (parts.length < 4) { bad++; continue; }
      const [mid, date, p, p2] = parts;
      const market = MARKETS.find((m) => m.id === mid);
      if (!market || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{3}$/.test(p) || !/^\d{3}$/.test(p2)) { bad++; continue; }
      setResult(mid, date, p, p2, true);
      ok++;
    }
    alert("Saved " + ok + " result(s)" + (bad ? ", skipped " + bad : "") + ".");
    renderDashboard();
  };
}

function renderTabJson() {
  $("#tab-json").innerHTML = `
    <div class="card">
      <h3>Data Import (JSON)</h3>
      <p class="hint">Paste JSON from your own data source. Format:</p>
      <pre class="json-example">[
  { "market": "kalyan-main", "date": "2026-08-16", "panel": "456", "panel2": "789" }
]</pre>
      <p class="hint">Keys accepted: <code>market</code>|<code>market_id</code>|<code>id</code>, <code>panel</code>|<code>panel1</code>|<code>open</code>, <code>panel2</code>|<code>close</code>.</p>
      <textarea id="json-input" rows="6" placeholder='[{ "market": "kalyan-main", "date": "2026-08-16", "panel": "456", "panel2": "789" }]'></textarea>
      <div class="card-actions">
        <button class="btn" id="json-btn">Import Data</button>
        <button class="btn ghost" id="json-example">Load Example</button>
      </div>
    </div>`;

  $("#json-example").onclick = () => {
    const sample = MARKETS.slice(0, 3).map((m, i) => ({
      market: m.id,
      date: todayKey(),
      panel: String(100 + i * 37).padStart(3, "0"),
      panel2: String(500 + i * 45).padStart(3, "0")
    }));
    $("#json-input").value = JSON.stringify(sample, null, 2);
  };

  $("#json-btn").onclick = () => {
    let rows;
    try {
      rows = JSON.parse($("#json-input").value);
      if (!Array.isArray(rows)) throw new Error("not an array");
    } catch (err) {
      alert("Invalid JSON: " + err.message);
      return;
    }
    let ok = 0, bad = 0;
    const errors = [];
    for (const row of rows) {
      const mid = row.market || row.market_id || row.id;
      const p = row.panel || row.panel1 || row.open;
      const p2 = row.panel2 || row.close;
      const date = row.date;
      if (!mid || !date || !p || !p2) { bad++; errors.push("missing fields"); continue; }
      const market = MARKETS.find((m) => m.id === String(mid).trim());
      if (!market) { bad++; errors.push("unknown market: " + mid); continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{3}$/.test(String(p)) || !/^\d{3}$/.test(String(p2))) { bad++; errors.push("bad value: " + mid + " / " + date); continue; }
      setResult(market.id, date, String(p), String(p2), true);
      ok++;
    }
    const detail = errors.length ? "\n" + errors.slice(0, 5).join("\n") : "";
    alert("Imported " + ok + " result(s)" + (bad ? ", skipped " + bad + detail : "") + ".");
    renderDashboard();
  };
}

function renderPayRows() {
  const pays = store.get("matka.payments", []);
  return pays.slice().reverse().map((p) => {
    const detail = p.type === "upi" ? p.upiId : p.type === "card" ? `•••• ${p.cardLast4} · ${p.cardName || ""} · exp ${p.cardExpiry || ""}` : `${p.bankName || ""} · •••• ${p.accLast4} · ${p.ifsc || ""}`;
    return `<tr><td>${new Date(p.date).toLocaleString()}</td><td>${p.userName || p.phone}</td><td>${p.type.toUpperCase()}</td><td>${detail}</td></tr>`;
  }).join("");
}

function renderTabWallet() {
  const users = store.get("matka.users", []);
  const tx = store.get("matka.wallet", []);
  const requests = store.get("matka.requests", []);
  const qr = store.get("matka.qr", null);
  $("#tab-wallet").innerHTML = `
    <div class="card wide">
      <h3>Pending Top-Up Requests</h3>
      <p class="hint">Confirm only after the payment is received. Balance is credited on confirmation.</p>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Method</th><th>UTR Ref</th><th></th></tr></thead>
        <tbody id="req-rows"></tbody>
      </table></div>
    </div>
    <div class="wallet-cols">
      <div class="card">
        <h3>Adjust Wallet</h3>
        <p class="hint">Demo currency only — no real value.</p>
        <form id="wallet-form">
          <label>User
            <select id="wallet-user" required>
              <option value="">Select user…</option>
              ${users.map((x) => `<option value="${x.phone || x.username}">${x.name} (${x.phone || x.username})</option>`).join("")}
            </select>
          </label>
          <div class="form-row">
            <label>Action
              <select id="wallet-action">
                <option value="credit">Credit (+)</option>
                <option value="debit">Debit (−)</option>
              </select>
            </label>
            <label>Amount <input id="wallet-amount" type="number" min="0.01" step="0.01" placeholder="100.00" required></label>
          </div>
          <label>Note <input id="wallet-note" placeholder="e.g. Bonus, correction…"></label>
          <button class="btn" type="submit">Apply</button>
        </form>
      </div>
      <div class="card">
        <h3>User Balances</h3>
        <p class="hint">Live balances from wallet entries.</p>
        <div class="table-wrap"><table class="result-table">
          <thead><tr><th>User</th><th>Phone</th><th>Balance</th></tr></thead>
          <tbody>
            ${users.map((x) => {
              const bal = tx.filter((t) => t.phone === (x.phone || x.username)).reduce((s, t) => s + (t.amount || 0), 0);
              return `<tr><td>${x.name}</td><td>${x.phone || x.username}</td><td class="${bal >= 0 ? "wallet-plus" : "wallet-minus"}">${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td></tr>`;
            }).join("") || `<tr><td colspan="3" class="empty">No users yet.</td></tr>`}
          </tbody>
        </table></div>
      </div>
    </div>
    <div class="card wide">
      <h3>Transaction History</h3>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Date</th><th>User</th><th>Amount</th><th>Note</th><th>By</th></tr></thead>
        <tbody>
          ${tx.slice().reverse().slice(0, 50).map((t) => `<tr><td>${new Date(t.date).toLocaleString()}</td><td>${t.userName || t.phone}</td><td class="${t.amount >= 0 ? "wallet-plus" : "wallet-minus"}">${t.amount >= 0 ? "+" : "−"}${Math.abs(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td><td>${t.note || "—"}</td><td>${t.by || "—"}</td></tr>`).join("") || `<tr><td colspan="5" class="empty">No transactions yet.</td></tr>`}
        </tbody>
      </table></div>
    </div>
    <div class="wallet-cols">
      <div class="card">
        <h3>Demo QR Code</h3>
        <p class="hint">Shown inside the user's Add Money box during top-up. Demo only.</p>
        <div id="qr-current"></div>
        <label>UPI ID (optional)
          <input id="qr-upi" placeholder="e.g. matkalive@upi" value="${qr?.upi || ""}">
        </label>
        <input type="file" id="qr-upload" accept="image/*">
        <div class="card-actions">
          <button class="btn" id="qr-save">Save QR</button>
          <button class="btn ghost" id="qr-remove">Remove QR</button>
        </div>
      </div>
      <div class="card">
        <h3>Demo Payment Methods</h3>
        <p class="hint">Entered by users for simulation only.</p>
        <div class="table-wrap"><table class="result-table">
          <thead><tr><th>Date</th><th>User</th><th>Type</th><th>Details</th></tr></thead>
          <tbody>
            ${renderPayRows() || `<tr><td colspan="4" class="empty">No payment methods saved yet.</td></tr>`}
          </tbody>
        </table></div>
      </div>
    </div>`;


  $("#wallet-form").onsubmit = (e) => {
    e.preventDefault();
    const key = $("#wallet-user").value;
    const amount = parseFloat($("#wallet-amount").value);
    const action = $("#wallet-action").value;
    if (!key || !amount || amount <= 0) { alert("Select a user and enter a valid amount."); return; }
    const user = users.find((x) => (x.phone || x.username) === key);
    const txList = store.get("matka.wallet", []);
    txList.push({
      phone: key,
      userName: user ? user.name : key,
      amount: action === "credit" ? amount : -amount,
      note: $("#wallet-note").value.trim(),
      by: adminUser.name,
      date: new Date().toISOString()
    });
    store.set("matka.wallet", txList);
    alert("Wallet " + action + " of " + amount.toFixed(2) + " applied to " + (user ? user.name : key) + ".");
    renderDashboard();
  };

  const reqRows = $("#req-rows");
  const pending = requests.filter((r) => r.status === "pending");
  const fmtReq = (r) => r.method === "Bank Transfer"
    ? `${r.bankName || "Bank"} · ${r.accName || ""} · ${r.accNo ? "•••• " + String(r.accNo).slice(-4) : ""} · ${r.ifsc || ""}`
    : r.method;
  reqRows.innerHTML = pending.length ? pending.map((r, i) => `<tr>
    <td>${new Date(r.date).toLocaleString()}</td>
    <td>${r.userName} (${r.phone})</td>
    <td class="wallet-plus">${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    <td>${fmtReq(r)}</td>
    <td>${r.ref}</td>
    <td><button class="mini-del req-ok" data-i="${i}">Confirm</button> <button class="mini-del req-no" data-i="${i}">Reject</button></td>
  </tr>`).join("") : `<tr><td colspan="6" class="empty">No pending requests.</td></tr>`;

  for (const btn of reqRows.querySelectorAll(".req-ok")) {
    btn.onclick = () => {
      if (!confirm("Confirm this payment and credit the wallet?")) return;
      const r = pending[Number(btn.dataset.i)];
      r.status = "confirmed";
      store.set("matka.requests", requests);
      const txList = store.get("matka.wallet", []);
      txList.push({
        phone: r.phone,
        userName: r.userName,
        amount: r.amount,
        note: "Top-up confirmed · " + r.method + " · Ref " + r.ref,
        by: adminUser.name,
        date: new Date().toISOString()
      });
      store.set("matka.wallet", txList);
      alert("Payment confirmed. " + r.amount.toFixed(2) + " credited to " + r.userName + ".");
      renderDashboard();
    };
  }

  for (const btn of reqRows.querySelectorAll(".req-no")) {
    btn.onclick = () => {
      if (!confirm("Reject this top-up request?")) return;
      const r = pending[Number(btn.dataset.i)];
      r.status = "rejected";
      store.set("matka.requests", requests);
      alert("Request rejected. No balance credited.");
      renderDashboard();
    };
  }

  const qrCurrent = $("#qr-current");
  qrCurrent.innerHTML = qr
    ? `<img class="qr-img" src="${qr.data}" alt="Demo QR"><p class="hint">Saved ${new Date(qr.date).toLocaleString()} · ${qr.name || ""}${qr.upi ? " · UPI " + qr.upi : ""}</p>`
    : `<p class="hint">No QR uploaded yet.</p>`;

  let pendingQr = null;
  $("#qr-upload").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { pendingQr = { data: reader.result, name: file.name, date: new Date().toISOString() }; };
    reader.readAsDataURL(file);
  };

  $("#qr-save").onclick = () => {
    if (!pendingQr) { alert("Choose an image first."); return; }
    pendingQr.upi = String($("#qr-upi").value || "").trim();
    store.set("matka.qr", pendingQr);
    alert("Demo QR saved. It now shows in the user's Add Money box.");
    renderDashboard();
  };

  $("#qr-remove").onclick = () => {
    if (confirm("Remove the demo QR?")) {
      localStorage.removeItem("matka.qr");
      renderDashboard();
    }
  };
}

function renderTabMarkets() {
  $("#tab-markets").innerHTML = `
    <div class="card">
      <h3>Add Market</h3>
      <form id="mk-form">
        <label>Name <input id="mk-name" required></label>
        <div class="form-row">
          <label>Open time (HH:MM) <input id="mk-open" placeholder="08:00" required></label>
          <label>Close time (HH:MM) <input id="mk-close" placeholder="10:00" required></label>
        </div>
        <label>Result time (HH:MM) <input id="mk-result" placeholder="10:30" required></label>
        <button class="btn" type="submit">Add Market</button>
      </form>
    </div>
    <div class="card">
      <h3>Existing Markets (${MARKETS.length})</h3>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Name</th><th>Open</th><th>Close</th><th>Result</th></tr></thead>
        <tbody>${MARKETS.map((m) => `<tr><td>${m.name}</td><td>${m.open}</td><td>${m.close}</td><td>${m.result}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>`;
  $("#mk-form").onsubmit = (e) => {
    e.preventDefault();
    const id = "custom-" + Date.now();
    MARKETS.push({ id, name: $("#mk-name").value.trim(), open: $("#mk-open").value, close: $("#mk-close").value, result: $("#mk-result").value, days: "All days", custom: true });
    alert("Market added: " + $("#mk-name").value.trim());
    renderDashboard();
  };
}

function renderTabUsers(results) {
  const users = store.get("matka.users", []);
  $("#tab-users").innerHTML = `
    <div class="card">
      <h3>Registered Users</h3>
      <p class="hint">Showing phone numbers & passwords for demo/management purposes.</p>
      <div class="table-wrap"><table class="result-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Password</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
        <tbody id="user-rows"></tbody>
      </table></div>
    </div>`;
  const tbody = $("#user-rows");
  tbody.innerHTML = users.length ? users.map((u) => `<tr><td>${u.name}</td><td>${u.phone || "—"}</td><td><code>${u.password}</code></td><td>${u.email || "—"}</td><td>${u.role}</td><td>${u.joined}</td></tr>`).join("") : `<tr><td colspan="6" class="empty">No users yet.</td></tr>`;
}

ensureAdmin();
window.__syncReady.then(() => {
  fetch("live_results.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no live file"))))
    .then((d) => {
      if (d && typeof d === "object" && Object.keys(d).length) {
        liveFileOverlay = d;
        if (adminUser) renderDashboard();
      }
    })
    .catch(() => {});
});
if (window.__syncReady instanceof Promise) {
  window.__syncReady.then(() => {
    ensureAdmin();
    if (adminUser) renderDashboard();
    else renderLogin();
  });
} else {
  if (adminUser) renderDashboard();
  else renderLogin();
}
