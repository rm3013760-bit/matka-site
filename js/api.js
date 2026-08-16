/* ============================================================
   DEMO API LAYER — mirrors api.sara567official.site contract
   100% local (localStorage). No real server, no real money.
   Endpoint names, params and JSON shapes match the app build.
   ============================================================ */
(function () {
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
  };

  const ok = (data, message = "Success") => ({ success: true, message, data });
  const fail = (message) => ({ success: false, message });

  const todayKey = () => new Date().toISOString().slice(0, 10);
  const nowMins = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

  function marketStatus(open, close) {
    const o = Number(open.slice(0, 2)) * 60 + Number(open.slice(3, 5));
    const c = Number(close.slice(0, 2)) * 60 + Number(close.slice(3, 5));
    const n = nowMins();
    return { open_time: open, close_time: close, market_status: (n >= o && n < c) ? "open" : "closed" };
  }

  function resultFor(marketId, date) {
    const results = store.get("matka.results", {});
    const r = results[marketId + "|" + (date || todayKey())];
    if (!r) return null;
    return {
      market_name: r.market,
      open_patti: String(r.panel).padStart(3, "0"),
      close_patti: String(r.panel2).padStart(3, "0"),
      jodi_digit: r.jodi + r.jodi2,
      open_ank: String(r.panel).slice(-1),
      close_ank: String(r.panel2).slice(-1),
      result_status: r.announced ? "declared" : "pending",
      date: r.date
    };
  }

  function getPhone(user) { return String((user && user.phone) || "").replace(/\D/g, ""); }

  const ENDPOINTS = {
    /* ---------- settings ---------- */
    get_app_settings: (params) => {
      const k = params["key_name"] || "";
      if (k === "game_status") return ok({ key_name: "game_status", value: "1" });
      return ok({
        game_status: "1", app_name: "MatkaLive Demo", version: "1.0.0",
        support: store.get("matka.contact", { phone: "+91 9000000000", whatsapp: "" })
      });
    },
    get_flash_message_settings: () => ok({ flash_message: "Welcome to MatkaLive Demo — entertainment only." }),
    get_live_chat_status: () => ok({ live_chat_status: "0", crisp_website_id: "" }),
    update_lastseenstatus: () => ok({ updated: 1 }),

    /* ---------- games & rates ---------- */
    get_game_rates: () => ok({
      bid_amount: 10,
      games: GAMES.map((g) => ({
        game_name: g.name, game_type: g.id, range: g.range.replace(/\s/g, "").trim(), rate: g.odds.replace("x", ""), win_amount: (10 * parseFloat(g.odds)).toFixed(2)
      }))
    }),
    fetch_bid_settings: () => ok({ min_bid: 10, max_bid: 500000, bid_step: 10, bid_amount: 10 }),
    fetch_messages: () => ok({
      messages: store.get("matka.messages", []).map((m) => ({ id: m.id || 0, message: m.msg || m.message, date: m.date || todayKey() }))
    }),
    delete_message: (p) => {
      const msgs = store.get("matka.messages", []);
      store.set("matka.messages", msgs.filter((m, i) => String(i) !== String(p.id)));
      return ok({ deleted: 1 });
    },

    /* ---------- markets & results ---------- */
    fach_marketlist_main: () => ok({
      market_list: MARKETS.map((m) => ({ market_name: m.name, market_id: m.id, ...marketStatus(m.open, m.close), result_time: m.result }))
    }),
    fach_market_result: (p) => {
      const date = p.date || todayKey();
      return ok({
        date,
        market_list: MARKETS.map((m) => {
          const r = resultFor(m.id, date);
          return { market_name: m.name, market_id: m.id, ...marketStatus(m.open, m.close), ...(r || { open_patti: "", close_patti: "", jodi_digit: "", open_ank: "", close_ank: "", result_status: "pending", date: "" }) };
        })
      });
    },
    get_marketresult_deta: (p) => {
      const mkt = MARKETS.find((m) => m.name === p.market_name);
      if (!mkt) return fail("Market not found");
      const results = store.get("matka.results", {});
      return ok({
        market_name: mkt.name, open_time: mkt.open, close_time: mkt.close,
        history: Object.keys(results).filter((k) => k.startsWith(mkt.id + "|")).sort().slice(-14).reverse().map((k) => resultFor(mkt.id, k.split("|")[1]))
      });
    },
    check_starline_market: (p) => {
      const time = p.time || STARLINE_TIMES[nowMins() <= 0 ? 0 : Math.min(STARLINE_TIMES.length - 1, Math.floor((nowMins() - 600) / 60))];
      return ok({ time, market_status: "open" });
    },
    check_disawar_market: () => ok({ market_status: "open" }),

    /* ---------- starline & disawar ---------- */
    get_starline_data: () => ok({
      starline_markets: STARLINE_TIMES.map((t, i) => ({ market_id: "starline-" + t.replace(":", ""), market_name: "Starline " + t, time: t, market_status: "open", rates: STARLINE_RATES }))
    }),
    fach_starline_result: (p) => {
      const date = p.date || todayKey();
      return ok({
        date,
        market_list: STARLINE_TIMES.map((t) => {
          const r = resultFor("starline-" + t.replace(":", ""), date);
          return { market_name: "Starline " + t, time: t, ...(r || { open_patti: "", close_patti: "", jodi_digit: "", result_status: "pending", date: "" }) };
        })
      });
    },
    get_all_starline_results: () => {
      const results = store.get("matka.results", {});
      return ok({ market_list: Object.keys(results).filter((k) => k.startsWith("starline-")).sort().slice(-30).map((k) => ({ date: k.split("|")[1], market_name: k.split("|")[0], ...resultFor(k.split("|")[0], k.split("|")[1]) })) });
    },
    fach_dishwar_result: (p) => {
      const date = p.date || todayKey();
      return ok({ date, market_list: DISAWAR_MARKETS.map((n) => {
        const m = MARKETS.find((x) => x.name === n) || { id: "disawar", open: "08:00", close: "18:00", result: "18:00" };
        return { market_name: n, ...marketStatus(m.open, m.close), ...(resultFor(m.id, date) || { open_patti: "", close_patti: "", jodi_digit: "", result_status: "pending", date: "" }) };
      }) });
    },
    get_all_dishawar_results: () => {
      const results = store.get("matka.results", {});
      return ok({ market_list: Object.keys(results).filter((k) => k.startsWith("disawar|")).sort().slice(-30).map((k) => ({ date: k.split("|")[1], ...resultFor("disawar", k.split("|")[1]) })) });
    },

    /* ---------- auth ---------- */
    signupv1: (p) => {
      const users = store.get("matka.users", []);
      const phone = String(p.mobile || "").replace(/\D/g, "");
      if (phone.length < 10) return fail("Valid mobile number required");
      const email = String(p.email || "").toLowerCase();
      const username = String(p.name || "").toLowerCase();
      if (users.some((x) => getPhone(x) === phone)) return fail("Mobile number already registered");
      if (email && users.some((x) => String(x.email || "").toLowerCase() === email)) return fail("Email already registered");
      if (username && users.some((x) => String(x.username || x.name || "").toLowerCase() === username)) return fail("Username/name already taken");
      const u = { username: p.name, password: p.password, name: p.name, phone: p.mobile, email: p.email || "", role: "user", joined: todayKey(), dob: "", address: "", city: "" };
      users.push(u);
      store.set("matka.users", users);
      return ok({ user_id: phone, name: u.name, mobile: phone }, "Account created");
    },
    login: (p) => {
      const users = store.get("matka.users", []);
      const id = String(p.mobile || p.loginid || "").toLowerCase();
      const u = users.find((x) => x.username.toLowerCase() === id || getPhone(x) === id.replace(/\D/g, "") || (x.email || "").toLowerCase() === id);
      if (!u || u.password !== p.password) return fail("Invalid credentials");
      return ok({ user_id: getPhone(u), name: u.name, mobile: getPhone(u), role: u.role }, "Login successful");
    },
    request_otp: (p) => {
      const users = store.get("matka.users", []);
      const phone = String(p.mobile || "").replace(/\D/g, "");
      if (!users.some((x) => getPhone(x) === phone)) return fail("No account found for this mobile number");
      const code = String(Math.floor(100000 + Math.random() * 900000));
      store.set("matka.otp", { phone, code, expires: Date.now() + 5 * 60 * 1000 });
      return ok({ otp_sent: 1, demo_otp: code }, "OTP sent (demo)");
    },
    verify_otp: (p) => {
      const otp = store.get("matka.otp", null);
      const phone = String(p.mobile || "").replace(/\D/g, "");
      if (!otp || otp.phone !== phone || otp.expires < Date.now()) return fail("OTP expired. Request a new one");
      if (otp.code !== String(p.otp)) return fail("Incorrect OTP");
      const u = store.get("matka.users", []).find((x) => getPhone(x) === phone);
      store.set("matka.otp", null);
      return ok({ user_id: phone, name: u ? u.name : "Member", mobile: phone }, "OTP verified");
    },
    resend_otp: (p) => ENDPOINTS.request_otp(p),
    reset_password: (p) => {
      const users = store.get("matka.users", []);
      const phone = String(p.mobile || "").replace(/\D/g, "");
      const u = users.find((x) => getPhone(x) === phone);
      if (!u) return fail("No account found");
      u.password = p.new_password || p.password;
      store.set("matka.users", users);
      return ok({ updated: 1 }, "Password updated");
    },

    /* ---------- wallet / funds ---------- */
    get_balance: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      const tx = store.get("matka.wallet", []);
      return ok({ balance: tx.filter((t) => getPhone(t) === phone).reduce((s, t) => s + (t.amount || 0), 0) || 0 });
    },
    submit_offlinepayment_request: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      const users = store.get("matka.users", []);
      const u = users.find((x) => getPhone(x) === phone);
      if (!u) return fail("Account not found");
      const amount = parseFloat(p.amount);
      if (!amount || amount <= 0) return fail("Invalid amount");
      const requests = store.get("matka.requests", []);
      if (requests.some((r) => String(r.ref).toLowerCase() === String(p.ref || "").toLowerCase() && getPhone(r) === phone)) return fail("Reference already submitted");
      const method = p.method === "bank" ? "Bank Transfer" : p.method === "qr" ? "QR Code" : "UPI";
      requests.push({
        phone: u.phone, userName: u.name, amount, method,
        bankName: p.bank_name || "", accName: p.acc_name || "", accNo: p.acc_no || "", ifsc: p.ifsc || "",
        ref: p.ref || "", status: "pending", date: new Date().toISOString()
      });
      store.set("matka.requests", requests);
      return ok({ request_id: requests.length }, "Payment proof submitted");
    },
    auto_deposit_transactions: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      return ok({ transactions: store.get("matka.requests", []).filter((r) => getPhone(r) === phone).map((r) => ({ amount: r.amount, method: r.method, ref: r.ref, status: r.status, date: r.date })) });
    },
    submit_withdrawalv1: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      const users = store.get("matka.users", []);
      const u = users.find((x) => getPhone(x) === phone);
      if (!u) return fail("Account not found");
      const amount = parseFloat(p.amount);
      const balance = ENDPOINTS.get_balance(p).data.balance;
      if (!amount || amount <= 0) return fail("Invalid amount");
      if (amount > balance) return fail("Insufficient balance");
      const method = p.method === "bank" ? "bank" : "upi";
      if (method === "bank" && !(p.bank_name && p.acc_name && p.acc_no && p.ifsc)) return fail("Bank details required");
      if (method === "upi" && !p.upi_id) return fail("UPI ID required");
      const wd = store.get("matka.withdrawals", []);
      wd.push({
        phone: u.phone, userName: u.name, amount, method,
        upi: p.upi_id || "",
        bankName: p.bank_name || "", accName: p.acc_name || "", accNo: p.acc_no || "", ifsc: p.ifsc || "",
        status: "pending", date: new Date().toISOString()
      });
      store.set("matka.withdrawals", wd);
      return ok({ request_id: wd.length }, "Withdrawal request submitted");
    },
    withdrawal_history_new: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      return ok({ transactions: store.get("matka.withdrawals", []).filter((r) => getPhone(r) === phone).map((r) => ({ amount: r.amount, upi: r.upi, method: r.method, bank_name: r.bankName, acc_no: r.accNo, status: r.status, date: r.date })) });
    },
    combined_transaction_history_v2: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      return ok({ transactions: store.get("matka.wallet", []).filter((t) => getPhone(t) === phone).slice(0, 50).map((t) => ({ amount: t.amount, note: t.note, date: t.date })) });
    },
    get_upi_settings: () => ok({
      upi_id: store.get("matka.upi", { id: "" }).id,
      upi_name: store.get("matka.upi", { name: "" }).name,
      phonepe_status: "1", upi_status: "1", paytm_status: "1",
      upi_methods: [
        { upi_method: "UPI ID", upi_id: store.get("matka.upi", { id: "" }).id || "", upi_name: store.get("matka.upi", { name: "" }).name || "" },
        { upi_method: "PhonePe", phonepe_upi: store.get("matka.upi", { id: "" }).id || "" },
        { upi_method: "PayTM", paytm_upi: store.get("matka.upi", { id: "" }).id || "" }
      ]
    }),
    get_deposit_settings: () => ok({
      min_deposit: 100, max_deposit: 500000, method_labels: ["UPI / QR", "Card", "Net Banking", "PhonePe", "PayTM"],
      qr_enabled: !!store.get("matka.qr", null)
    }),
    get_withdrawal_settings: () => ok({ min_withdraw: 100, max_withdraw: 100000, mode: "UPI" }),
    get_withdrawal_terms: () => ok({ terms: ["Minimum withdrawal is 100", "One withdrawal per 24 hours", "24/7 service — fastest response"] }),

    /* ---------- bids ---------- */
    place_bid_atomicv1: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      const users = store.get("matka.users", []);
      const u = users.find((x) => getPhone(x) === phone);
      if (!u) return fail("Account not found");
      const g = GAMES.find((x) => x.id === p.game_type);
      if (!g) return fail("Invalid game type");
      const m = MARKETS.find((x) => x.id === p.market_id || x.name === p.market_name);
      if (!m) return fail("Invalid market");
      const stake = parseFloat(p.amount);
      const balance = ENDPOINTS.get_balance(p).data.balance;
      if (!stake || stake <= 0) return fail("Invalid amount");
      if (stake > balance) return fail("Insufficient balance");
      const bets = store.get("matka.bets", []);
      const numbers = {};
      const raw = String(p.number || "").replace(/\D/g, "");
      if (g.id === "family-pair" || g.id === "pana-family") numbers.num = p.number;
      else if (g.id === "half-sangam" || g.id === "half-sangam-b") { numbers.jodi = raw.slice(0, 2); numbers.patti = raw.slice(2, 5); }
      else if (g.id === "full-sangam") { numbers.patti1 = raw.slice(0, 3); numbers.patti2 = raw.slice(3, 6); }
      else numbers.num = p.number;
      bets.push({ id: Date.now(), phone: u.phone, userName: u.name, marketId: m.id, marketName: m.name, game: g.id, gameName: g.name, numbers, stake, odds: parseFloat(g.odds), status: "pending", style: p.style || g.id, date: new Date().toISOString() });
      store.set("matka.bets", bets);
      const tx = store.get("matka.wallet", []);
      tx.push({ phone: u.phone, userName: u.name, amount: -stake, note: "Bet: " + g.name + " · " + m.name, by: u.name + " (API)", date: new Date().toISOString() });
      store.set("matka.wallet", tx);
      return ok({ bet_id: bets[bets.length - 1].id, balance_after: balance - stake }, "Bid placed");
    },
    bid_history_simple: (p) => {
      const phone = String(p.mobile || "").replace(/\D/g, "");
      return ok({ bids: store.get("matka.bets", []).filter((b) => getPhone(b) === phone).slice().reverse().map((b) => ({ bet_id: b.id, market_name: b.marketName, game_name: b.gameName, number: b.game === "half-sangam" || b.game === "half-sangam-b" ? b.numbers.jodi + b.numbers.patti : b.game === "full-sangam" ? b.numbers.patti1 + b.numbers.patti2 : b.game === "family-pair" ? "F" + b.numbers.num : b.numbers.num, amount: b.stake, odds: b.odds, status: b.status, date: b.date })) });
    },
    starline_bid_history: (p) => ok({ bids: [] }),
    dishwar_bid_history: (p) => ok({ bids: [] }),

    /* ---------- misc ---------- */
    get_noticeboard: () => ok({ notices: store.get("matka.notices", []).map((n, i) => ({ id: i + 1, title: n.title, description: n.text, date: n.date || todayKey() })) }),
    get_latest_notice: () => {
      const n = store.get("matka.notices", []);
      return n.length ? ok({ title: n[n.length - 1].title, description: n[n.length - 1].text }) : ok({});
    },
    save_notification_prefs: () => ok({ saved: 1 }),
    get_notification_prefs: () => ok({ bids: 1, results: 1, funds: 1 }),
    mark_notification_read: () => ok({ read: 1 }),
    get_contact_info_for_contactuspage: () => {
      const c = store.get("matka.contact", { phone: "+91 9000000000", whatsapp: "", telegram: "", email: "support@demo.com" });
      return ok({ phone: c.phone, whatsapp: c.whatsapp, telegram: c.telegram, email: c.email });
    },
    get_contactwebsite_info: () => {
      const c = store.get("matka.contact", { phone: "+91 9000000000", whatsapp: "" });
      return ok({ whatsapp_number: (c.whatsapp || c.phone).replace(/\D/g, ""), whatsapp_message: "" });
    },
    get_payment_details: () => ok({ methods: [] }),
    submit_payment_details: () => ok({ saved: 1 }),
    check_mobile: (p) => ok({ exists: !!store.get("matka.users", []).find((x) => getPhone(x) === String(p.mobile || "").replace(/\D/g, "")) })
  };

  const META = [
    ["get_app_settings", "GET", ["key_name=game_status"]],
    ["get_game_rates", "GET", []],
    ["fetch_bid_settings", "GET", []],
    ["fach_marketlist_main", "GET", []],
    ["fach_market_result", "GET", ["date=YYYY-MM-DD"]],
    ["get_marketresult_deta", "GET", ["market_name=Kalyan Main"]],
    ["get_starline_data", "GET", []],
    ["fach_starline_result", "GET", ["date=YYYY-MM-DD"]],
    ["get_all_starline_results", "GET", []],
    ["check_starline_market", "GET", []],
    ["fach_dishwar_result", "GET", ["date=YYYY-MM-DD"]],
    ["get_all_dishawar_results", "GET", []],
    ["check_disawar_market", "GET", []],
    ["signupv1", "POST", ["name", "mobile", "password", "email"]],
    ["login", "POST", ["mobile", "password"]],
    ["request_otp", "POST", ["mobile"]],
    ["verify_otp", "POST", ["mobile", "otp"]],
    ["resend_otp", "POST", ["mobile"]],
    ["reset_password", "POST", ["mobile", "new_password"]],
    ["get_balance", "GET", ["mobile"]],
    ["place_bid_atomicv1", "POST", ["mobile", "market_id", "game_type", "number", "amount"]],
    ["bid_history_simple", "GET", ["mobile"]],
    ["starline_bid_history", "GET", ["mobile"]],
    ["dishwar_bid_history", "GET", ["mobile"]],
    ["submit_offlinepayment_request", "POST", ["mobile", "amount", "method", "ref"]],
    ["submit_withdrawalv1", "POST", ["mobile", "amount", "upi_id"]],
    ["combined_transaction_history_v2", "GET", ["mobile"]],
    ["withdrawal_history_new", "GET", ["mobile"]],
    ["auto_deposit_transactions", "GET", ["mobile"]],
    ["get_upi_settings", "GET", []],
    ["get_deposit_settings", "GET", []],
    ["get_withdrawal_settings", "GET", []],
    ["get_withdrawal_terms", "GET", []],
    ["get_noticeboard", "GET", []],
    ["get_latest_notice", "GET", []],
    ["fetch_messages", "GET", []],
    ["get_flash_message_settings", "GET", []],
    ["get_live_chat_status", "GET", []],
    ["get_contact_info_for_contactuspage", "GET", []],
    ["get_contactwebsite_info", "GET", []],
    ["check_mobile", "GET", ["mobile"]]
  ];

  globalThis.API = {
    call(name, params) {
      const fn = ENDPOINTS[name];
      if (!fn) return Promise.resolve(fail("Unknown endpoint: " + name));
      return new Promise((resolve) => setTimeout(() => resolve(fn(params || {})), 60));
    },
    endpoints: META.map(([name, method, params]) => ({ name: name + ".php", method, params }))
  };
})();