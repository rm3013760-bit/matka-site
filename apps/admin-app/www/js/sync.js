const SERVER_URL = "http://localhost:8777";
const SYNC_TOKEN = "matka-demo-2026";
const SYNC_DEBOUNCE = 800;

function isLocal() {
  const h = location.hostname;
  return h === "localhost" || h === "127.0.0.1" || /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

const Sync = {
  timer: null,
  busy: false,
  pushedKeys: {},
  base: null,
  baseTryAt: 0,
  mode() {
    const saved = localStorage.getItem("matka.server");
    if (saved) return "local";
    return isLocal() ? "local" : "remote";
  },
  serverBase() {
    if (this.mode() === "local") return (localStorage.getItem("matka.server") || SERVER_URL).replace(/\/$/, "");
    if (this.base) return this.base;
    return (localStorage.getItem("matka.server") || "").replace(/\/$/, "") || null;
  },
  discover: async () => {
    const ok = await fetch("server-url.json?t=" + Date.now(), { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (ok && ok.base) {
      Sync.base = ok.base.replace(/\/$/, "");
      return Sync.base;
    }
    return null;
  },
  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), SYNC_DEBOUNCE);
  },
  async push() {
    if (this.busy) return;
    this.busy = true;
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("matka.") && k !== "matka.live_results") data[k] = localStorage.getItem(k);
    }
    if (JSON.stringify(data) === JSON.stringify(this.pushedKeys)) {
      this.busy = false;
      return;
    }
    let base = this.serverBase();
    if (!base && this.mode() === "remote") {
      base = await this.discover();
      if (!base) {
        this.lastErr = "no server-url";
        this.busy = false;
        return;
      }
    }
    fetch(base + "/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-sync-token": SYNC_TOKEN },
      body: JSON.stringify(data)
    }).then((r) => r.json()).then((res) => {
      this.busy = false;
      if (res && res.ok) { this.pushedKeys = data; this.lastPush = Date.now(); window.dispatchEvent(new CustomEvent("sync-updated")); }
      else this.lastErr = String((res && res.message) || "push denied");
    }).catch((e) => { this.busy = false; this.lastErr = String(e.message || e); });
  },
  async pull() {
    let base = this.serverBase();
    if (!base && this.mode() === "remote") {
      if (!this.base && Date.now() - this.baseTryAt < 30000) return;
      base = await this.discover();
      this.baseTryAt = Date.now();
      if (!base) { this.lastErr = "no server-url"; return; }
    }
    try {
      const res = await fetch(base + "/api/state").then((r) => r.json());
      if (res && res.ok && res.data) {
        let changed = false;
        for (const k of Object.keys(res.data)) {
          if (k.startsWith("matka.") && typeof res.data[k] === "string" && localStorage.getItem(k) !== res.data[k]) {
            localStorage.setItem(k, res.data[k]);
            changed = true;
          }
        }
        if (changed) window.dispatchEvent(new CustomEvent("sync-updated"));
      }
    } catch (e) {
      this.lastErr = String(e.message || e);
    }
  }
};

const origSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (k, v) {
  origSetItem.call(this, k, v);
  if (Sync && typeof Sync.schedule === "function") {
    try { Sync.schedule(); } catch (e) {}
  }
};

const origRemoveItem = Storage.prototype.removeItem;
Storage.prototype.removeItem = function (k) {
  origRemoveItem.call(this, k);
  if (Sync && typeof Sync.schedule === "function") {
    try { Sync.schedule(); } catch (e) {}
  }
};

window.__syncReady = new Promise((resolve) => {
  Sync.pull().finally(() => resolve());
});

setInterval(() => {
  if (!Sync.busy) Sync.pull();
}, 20000);

setInterval(() => {
  if (!Sync.base && Sync.mode() === "remote") Sync.discover().then((b) => { if (b) Sync.pull(); });
}, 300000);