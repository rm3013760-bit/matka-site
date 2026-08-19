const CDPBin = "/Users/rajkumarmeena/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-x64/chrome-headless-shell";
const { spawn } = require("child_process");
const http = require("http");

const PORT = 9333;
const chrome = spawn(CDPBin, [
  "--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${PORT}`, "--user-data-dir=/tmp/cdp-profile",
  "about:blank"
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function main() {
  let tabs = null;
  for (let i = 0; i < 30; i++) {
    try {
      tabs = await getJson(`http://127.0.0.1:${PORT}/json`);
      if (tabs && tabs.length) break;
    } catch (e) {}
    await sleep(500);
  }
  if (!tabs) throw new Error("chrome not up");
  const page = tabs.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const pending = {};
  let id = 0;
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending[m.id]) { pending[m.id](m); delete pending[m.id]; }
    else if (m.method === "Runtime.consoleAPICalled") {
      const t = m.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      if (m.params.type === "error") console.log("[console.error]", t);
    } else if (m.method === "Runtime.exceptionThrown") {
      const d = m.params.exceptionDetails;
      console.log("[EXCEPTION]", d.exception?.description || d.text);
    } else if (m.method === "Runtime.executionContextCreated") {
    }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const mid = ++id;
    pending[mid] = res;
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  await new Promise((r) => (ws.onopen = r));
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: "https://rm3013760-bit.github.io/matka-site/" });
  await sleep(6000);
  const evalJs = async (expr) => (await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.result.value;
  const bodyTxt = await evalJs("document.body.innerText.slice(0,200)");
  console.log("[page]", bodyTxt.replace(/\n/g, " | ").slice(0, 150));
  const bootErr = await evalJs("document.getElementById('boot-err') ? document.getElementById('boot-err').textContent.slice(0,200) : null");
  if (bootErr) console.log("[BOOT-ERR]", bootErr);
  const hasNav = await evalJs("!!document.querySelector('[data-route]') || !!document.querySelector('.nav')");
  await evalJs("location.hash = '#/register'");
  await sleep(1500);
  const regBody = await evalJs("document.getElementById('page') ? document.getElementById('page').innerText.slice(0,120) : ''");
  console.log("[register page]", regBody.replace(/\n/g, " | ").slice(0, 120));
  const formOk = await evalJs(`(() => {
    const f = document.getElementById('reg-form');
    if (!f) return 'no form';
    f.querySelector('[name=name]').value = 'HeadTest';
    f.querySelector('[name=phone]').value = '9876500111';
    f.querySelector('[name=password]').value = 'testpass123';
    f.querySelector('[name=mpin]').value = '1234';
    f.querySelector('[name=email]').value = 'headtest@demo.com';
    return 'filled';
  })()`);
  console.log("[form]", formOk);
  await evalJs("document.getElementById('reg-form').requestSubmit()");
  await sleep(4000);
  const after = await evalJs(`(() => {
    const b = document.getElementById('boot-err');
    return JSON.stringify({ bootErr: b ? b.textContent.slice(0, 300) : null, hash: location.hash, user: localStorage.getItem('matka.user') });
  })()`);
  console.log("[after register]", after);
  await evalJs(`(() => {
    const u = JSON.parse(localStorage.getItem('matka.users') || '[]');
    const i = u.findIndex(x => x.phone === '9876500111');
    if (i >= 0) u.splice(i, 1);
    localStorage.setItem('matka.users', JSON.stringify(u));
    return 'cleaned';
  })()`);
  chrome.kill();
  process.exit(0);
}

main().catch((e) => { console.log("ERR", e); chrome.kill(); process.exit(1); });
setTimeout(() => { console.log("TIMEOUT"); chrome.kill(); process.exit(2); }, 90000);