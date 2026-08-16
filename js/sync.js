const SERVER_URL = "http://localhost:8777";
const SYNC_TOKEN = "matka-demo-2026";
const SYNC_DEBOUNCE = 800;

const Sync = {
  timer: null,
  busy: false,
  pushedKeys: {},
  url() {
    const saved = localStorage.getItem("matka.server");
    return (saved ? saved.replace(/\/$/, "") : SERVER_URL).replace(/\/$/, "");
  },
  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), SYNC_DEBOUNCE);
  },
  push() {
    if (this.busy) return;
    const url = this.url();
    if (!url) return;
    this.busy = true;
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("matka.")) data[k] = localStorage.getItem(k);
    }
    fetch(url + "/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-sync-token": SYNC_TOKEN },
      body: JSON.stringify(data)
    })
      .then((r) => r.json())
      .then((res) => {
        this.pushedKeys = data;
        if (res && res.ok) this.lastPush = Date.now();
      })
      .catch(() => {})
      .finally(() => { this.busy = false; });
  },
  pull() {
    const url = this.url();
    if (!url) return Promise.resolve();
    return fetch(url + "/api/state")
      .then((r) => r.json())
      .then((res) => {
        if (res && res.ok && res.data) {
          for (const k of Object.keys(res.data)) {
            if (k.startsWith("matka.") && typeof res.data[k] === "string") {
              localStorage.setItem(k, res.data[k]);
            }
          }
        }
      })
      .catch(() => {});
  }
};

const origSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function (k, v) {
  origSetItem.call(this, k, v);
  if (Sync && typeof Sync.schedule === "function" ) {
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