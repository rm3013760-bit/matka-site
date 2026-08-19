const SERVER_URL = "http://localhost:8777";
const GIST_URL = "https://api.github.com/gists/f8de0471f8b496e10cc14a46e52f3667";
const GIST_TOKEN = "gho_m2ymEjY1fqkmYXbKigT4Z62ip4ou02FzLx4R";
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
  mode() {
    const saved = localStorage.getItem("matka.server");
    if (saved) return "local";
    return isLocal() ? "local" : "gist";
  },
  schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), SYNC_DEBOUNCE);
  },
  push() {
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
    const done = () => { this.pushedKeys = data; this.lastPush = Date.now(); this.busy = false; };
    const fail = () => { this.busy = false; };
    if (this.mode() === "local") {
      const url = localStorage.getItem("matka.server") || SERVER_URL;
      fetch(url.replace(/\/$/, "") + "/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-sync-token": SYNC_TOKEN },
        body: JSON.stringify(data)
      }).then((r) => r.json()).then((res) => { if (res && res.ok) done(); else fail(); }).catch(fail);
      return;
    }
    fetch(GIST_URL, {
      method: "PATCH",
      headers: { "Authorization": "Bearer " + GIST_TOKEN, "Content-Type": "application/json", "Accept": "application/vnd.github+json" },
      body: JSON.stringify({ files: { "matkalive.json": { content: JSON.stringify(data) } } })
    }).then((r) => r.json()).then((res) => { if (res && res.id) done(); else fail(); }).catch(fail);
  },
  pull() {
    if (this.mode() === "local") {
      const url = localStorage.getItem("matka.server") || SERVER_URL;
      return fetch(url.replace(/\/$/, "") + "/api/state")
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
    return     fetch(GIST_URL + "?t=" + Date.now(), { headers: { "Accept": "application/vnd.github+json" } })
      .then((r) => r.json())
      .then((res) => {
        const f = res && res.files && res.files["matkalive.json"];
        const content = f && f.content;
        if (!content) return;
        const data = JSON.parse(content);
        for (const k of Object.keys(data)) {
          if (k.startsWith("matka.") && typeof data[k] === "string" && localStorage.getItem(k) !== data[k]) {
            localStorage.setItem(k, data[k]);
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

setInterval(() => {
  if (!Sync.busy && Sync.mode() === "gist") Sync.pull();
}, 20000);